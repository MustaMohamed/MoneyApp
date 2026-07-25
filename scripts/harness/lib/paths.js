const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const WINDOWS_DEVICE_BASENAME = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i;
const WINDOWS_INVALID_CHARACTERS = new Set(['<', '>', ':', '"', '|', '?', '*']);

function isPortableSegment(segment) {
  return (
    !Array.from(segment).some((character) => {
      const code = character.charCodeAt(0);
      return (
        code <= 31 || (code >= 127 && code <= 159) || WINDOWS_INVALID_CHARACTERS.has(character)
      );
    }) &&
    !WINDOWS_DEVICE_BASENAME.test(segment) &&
    !segment.endsWith('.') &&
    !segment.endsWith(' ')
  );
}

function assertSafeRelativePath(value) {
  const segments = typeof value === 'string' ? value.split('/') : [];
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\\') ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    /^[A-Za-z]:/.test(value) ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw new Error(`Path must be a normalized repository-relative POSIX path: ${String(value)}`);
  }
  if (value.normalize('NFC') !== value) {
    throw new Error(`Path must use NFC-normalized Unicode: ${value}`);
  }
  for (const segment of segments) {
    if (!isPortableSegment(segment)) {
      throw new Error(`Path contains non-portable path segment "${segment}": ${value}`);
    }
  }
  return value;
}

function pathIdentity(value) {
  return value.normalize('NFC').toUpperCase().normalize('NFC');
}

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function nearestExistingAncestor(target) {
  let candidate = target;
  while (!fs.existsSync(candidate)) {
    const parent = path.dirname(candidate);
    if (parent === candidate) return candidate;
    candidate = parent;
  }
  return candidate;
}

function assertExactExistingComponents(root, relativePath) {
  let candidate = root;
  for (const segment of relativePath.split('/')) {
    const segmentIdentity = pathIdentity(segment);
    const matches = fs
      .readdirSync(candidate)
      .filter((entry) => pathIdentity(entry) === segmentIdentity);
    if (matches.length === 0) return;
    if (matches.length !== 1 || matches[0] !== segment) {
      throw new Error(
        `Path has on-disk path alias for component "${segment}": ${matches
          .map((entry) => `"${entry}"`)
          .join(', ')}`,
      );
    }
    candidate = path.join(candidate, segment);
    const stats = fs.lstatSync(candidate);
    if (stats.isSymbolicLink()) {
      throw new Error(`Path contains symbolic-link component "${segment}": ${relativePath}`);
    }
  }
}

function resolveInside(root, relativePath) {
  assertSafeRelativePath(relativePath);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (!isInside(resolvedRoot, resolved)) {
    throw new Error(`Path escapes repository: ${relativePath}`);
  }

  assertExactExistingComponents(resolvedRoot, relativePath);
  const physicalRoot = fs.realpathSync(resolvedRoot);
  const physicalAncestor = fs.realpathSync(nearestExistingAncestor(resolved));
  if (!isInside(physicalRoot, physicalAncestor)) {
    throw new Error(`Path escapes repository: ${relativePath}`);
  }
  return resolved;
}

function writeFileAtomic(root, relativePath, content) {
  const target = resolveInside(root, relativePath);
  const nonce = crypto.randomBytes(16).toString('hex');
  const temp = `${target}.harness-${process.pid}-${nonce}.tmp`;
  let descriptor;
  let ownsTemp = false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    descriptor = fs.openSync(temp, 'wx');
    ownsTemp = true;
    fs.writeFileSync(descriptor, content, 'utf8');
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temp, target);
    ownsTemp = false;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (ownsTemp && fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

module.exports = { assertSafeRelativePath, pathIdentity, resolveInside, writeFileAtomic };
