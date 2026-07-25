const fs = require('node:fs');
const path = require('node:path');

const { assertSafeRelativePath, pathIdentity } = require('../paths');

const WINDOWS_DEVICE_BASENAME = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i;
const INVALID_GLOB_CHARACTERS = /[\u0000-\u001f\u007f-\u009f<>:"|?[\]{}]/u;

function validateSegment(segment, scope) {
  if (
    segment.length === 0 ||
    segment === '.' ||
    segment === '..' ||
    INVALID_GLOB_CHARACTERS.test(segment) ||
    segment.endsWith('.') ||
    segment.endsWith(' ')
  ) {
    throw new Error(`Path scope contains a nonportable segment "${segment}": ${scope}`);
  }
  if (segment === '**') return { type: 'many' };
  if (segment.includes('**')) {
    throw new Error(`Path scope uses malformed double-star glob "${segment}": ${scope}`);
  }
  if (!segment.includes('*') && WINDOWS_DEVICE_BASENAME.test(segment)) {
    throw new Error(`Path scope contains a nonportable segment "${segment}": ${scope}`);
  }
  return segment.includes('*')
    ? { type: 'pattern', value: segment }
    : { type: 'literal', value: segment };
}

function parsePathScope(scope) {
  if (
    typeof scope !== 'string' ||
    scope.length === 0 ||
    scope.includes('\\') ||
    path.posix.isAbsolute(scope) ||
    path.win32.isAbsolute(scope) ||
    /^[A-Za-z]:/u.test(scope)
  ) {
    throw new Error(
      `Path scope must be a normalized repository-relative POSIX glob: ${String(scope)}`,
    );
  }
  if (scope.normalize('NFC') !== scope) {
    throw new Error(`Path scope must use NFC-normalized Unicode: ${scope}`);
  }
  return scope.split('/').map((segment) => validateSegment(segment, scope));
}

function segmentMatches(value, pattern) {
  let source = '^';
  for (const character of pattern) {
    source += character === '*' ? '.*' : character.replace(/[.+^${}()|[\]\\]/gu, '\\$&');
  }
  return new RegExp(`${source}$`, 'u').test(value);
}

function matchesTokens(pathSegments, tokens, pathIndex = 0, tokenIndex = 0, memo = new Map()) {
  const key = `${pathIndex}:${tokenIndex}`;
  if (memo.has(key)) return memo.get(key);
  let result;
  if (tokenIndex === tokens.length) {
    result = pathIndex === pathSegments.length;
  } else if (tokens[tokenIndex].type === 'many') {
    result =
      matchesTokens(pathSegments, tokens, pathIndex, tokenIndex + 1, memo) ||
      (pathIndex < pathSegments.length &&
        matchesTokens(pathSegments, tokens, pathIndex + 1, tokenIndex, memo));
  } else if (pathIndex === pathSegments.length) {
    result = false;
  } else {
    const token = tokens[tokenIndex];
    const matches =
      token.type === 'literal'
        ? pathSegments[pathIndex] === token.value
        : segmentMatches(pathSegments[pathIndex], token.value);
    result = matches && matchesTokens(pathSegments, tokens, pathIndex + 1, tokenIndex + 1, memo);
  }
  memo.set(key, result);
  return result;
}

function matchesScope(relativePath, scope) {
  assertSafeRelativePath(relativePath);
  return matchesTokens(relativePath.split('/'), parsePathScope(scope));
}

function characterMove(pattern, index) {
  if (index >= pattern.length) return undefined;
  if (pattern[index] === '*') return { any: true, next: index };
  return { any: false, character: pattern[index], next: index + 1 };
}

function segmentPatternsOverlap(left, right) {
  const queue = [[0, 0, false]];
  const visited = new Set();
  while (queue.length > 0) {
    const [leftIndex, rightIndex, consumed] = queue.shift();
    const key = `${leftIndex}:${rightIndex}:${consumed ? 1 : 0}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (leftIndex === left.length && rightIndex === right.length && consumed) return true;
    if (left[leftIndex] === '*') queue.push([leftIndex + 1, rightIndex, consumed]);
    if (right[rightIndex] === '*') queue.push([leftIndex, rightIndex + 1, consumed]);
    const leftMove = characterMove(left, leftIndex);
    const rightMove = characterMove(right, rightIndex);
    if (
      leftMove &&
      rightMove &&
      (leftMove.any || rightMove.any || leftMove.character === rightMove.character)
    ) {
      queue.push([leftMove.next, rightMove.next, true]);
    }
  }
  return false;
}

function tokenSegmentPattern(token) {
  return token.type === 'literal' || token.type === 'pattern' ? token.value : undefined;
}

function scopesOverlap(leftScope, rightScope) {
  const left = parsePathScope(leftScope);
  const right = parsePathScope(rightScope);
  const queue = [[0, 0, false]];
  const visited = new Set();
  while (queue.length > 0) {
    const [leftIndex, rightIndex, consumed] = queue.shift();
    const key = `${leftIndex}:${rightIndex}:${consumed ? 1 : 0}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (leftIndex === left.length && rightIndex === right.length && consumed) return true;
    const leftEnded = leftIndex === left.length;
    const rightEnded = rightIndex === right.length;
    if (!leftEnded && left[leftIndex].type === 'many') {
      queue.push([leftIndex + 1, rightIndex, consumed]);
    }
    if (!rightEnded && right[rightIndex].type === 'many') {
      queue.push([leftIndex, rightIndex + 1, consumed]);
    }
    if (leftEnded || rightEnded) continue;

    const leftToken = left[leftIndex];
    const rightToken = right[rightIndex];
    const canShareSegment =
      leftToken.type === 'many' ||
      rightToken.type === 'many' ||
      segmentPatternsOverlap(tokenSegmentPattern(leftToken), tokenSegmentPattern(rightToken));
    if (canShareSegment) {
      queue.push([
        leftToken.type === 'many' ? leftIndex : leftIndex + 1,
        rightToken.type === 'many' ? rightIndex : rightIndex + 1,
        true,
      ]);
    }
  }
  return false;
}

function assertScopeResolvesInside(root, scope) {
  const tokens = parsePathScope(scope);
  let current = path.resolve(root);
  if (fs.realpathSync(current) !== current) {
    throw new Error('Repository root must be a canonical physical path');
  }
  for (const token of tokens) {
    if (token.type !== 'literal') break;
    const matches = fs
      .readdirSync(current)
      .filter((entry) => pathIdentity(entry) === pathIdentity(token.value));
    if (matches.length === 0) return scope;
    if (matches.length !== 1 || matches[0] !== token.value) {
      throw new Error(`Path scope has an on-disk alias for component "${token.value}"`);
    }
    current = path.join(current, token.value);
    const stats = fs.lstatSync(current);
    if (stats.isSymbolicLink()) {
      throw new Error(`Path scope contains symbolic-link component "${token.value}"`);
    }
    if (!stats.isDirectory()) break;
  }
  return scope;
}

module.exports = {
  assertScopeResolvesInside,
  matchesScope,
  parsePathScope,
  scopesOverlap,
};
