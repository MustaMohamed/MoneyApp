// Add `{ path, issue: <N> }` to temporarily allowlist a violation; the fixing PR must delete it.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { stripComments } = require('./lib/strip-comments');

const root = path.join(__dirname, '..');
const errors = [];

// No `g` flag (`test` carries `lastIndex`); matches on the paren since `new` is optional.
const CONSTRUCTOR = /(?<![\w.])Intl\.NumberFormat\s*\(/;

// ASCII ascending by path, matching `git ls-files` order.
const ALLOWLIST = [{ path: 'src/utils/format_amount.ts' }];

const MINUS_GLYPH = '(?:\\bMINUS_SIGN\\b|\'[-\u2212]\'|"[-\u2212]"|`[-\u2212]`)';
const EMPTY_STRING = '(?:\'\'|""|``)';
// A ternary whose branches are a minus glyph and an empty string; the match starts at its `?`.
const OWNED_SIGN = new RegExp(
  `(?<!\\?)\\?\\s*(?:${MINUS_GLYPH}\\s*:\\s*${EMPTY_STRING}|${EMPTY_STRING}\\s*:\\s*${MINUS_GLYPH})`,
  'g',
);

// Ascending by path; `name` narrows an entry to the value of the property with that key.
const OWNED_SIGN_ALLOWLIST = [
  {
    path: 'src/modules/transactions/screens/transactions/transactions.helpers.ts',
    name: 'leftOfIncome',
  },
  { path: 'src/utils/format_amount.ts' },
];

const listing = spawnSync(
  'git',
  ['-c', 'core.quotePath=false', 'ls-files', 'src/*.ts', 'src/*.tsx'],
  {
    cwd: root,
    encoding: 'utf8',
  },
);

// `spawnSync` returns `stdout: undefined` on failure, so this must precede the split below.
if (listing.error || listing.status !== 0) {
  errors.push(
    `git ls-files failed to run — run from a git checkout of MoneyApp (${listing.error?.message ?? `exit code ${String(listing.status)}`})`,
  );
  console.error(errors.join('\n'));
  process.exit(1);
}

const files = listing.stdout.split('\n').filter(Boolean);

// A broken pathspec would otherwise pass silently with zero files scanned.
if (files.length === 0) {
  errors.push('git ls-files returned no files — run from a git checkout of MoneyApp');
  console.error(errors.join('\n'));
  process.exit(1);
}

const fileSet = new Set(files);
const strippedLinesCache = new Map();

function strippedLines(relPath) {
  if (strippedLinesCache.has(relPath)) return strippedLinesCache.get(relPath);
  const abs = path.join(root, relPath);
  const result = fs.existsSync(abs)
    ? stripComments(fs.readFileSync(abs, 'utf8').split('\n'))
    : undefined;
  strippedLinesCache.set(relPath, result);
  return result;
}

function firstConstructorLine(relPath) {
  const index = strippedLines(relPath)?.findIndex((line) => CONSTRUCTOR.test(line)) ?? -1;
  return index === -1 ? undefined : index + 1;
}

// Text only, no syntax tree: a bracket, `,` or `;` inside a string literal counts as code.
function sitsInProperty(text, questionIndex, name) {
  const key = new RegExp(`(?<![\\w$.])${name}\\s*:`, 'g');
  const lastKey = [...text.slice(0, questionIndex).matchAll(key)].at(-1);
  if (lastKey === undefined) return false;
  let depth = 0;
  for (const ch of text.slice(lastKey.index + lastKey[0].length, questionIndex)) {
    if ('([{'.includes(ch)) {
      depth++;
    } else if (')]}'.includes(ch)) {
      if (depth === 0) return false;
      depth--;
    } else if (depth === 0 && (ch === ',' || ch === ';')) {
      return false;
    }
  }
  return true;
}

const allowlistPaths = new Set(ALLOWLIST.map((entry) => entry.path));

for (const file of files) {
  const line = firstConstructorLine(file);
  if (line !== undefined && !allowlistPaths.has(file)) {
    errors.push(
      `${file}:${line}: constructs an \`Intl.NumberFormat\` — use a formatter from src/utils/format_amount.ts instead (.claude/rules/review.md item 3)`,
    );
  }
}

// The disk check catches a tracked file deleted from the working tree but still in `ls-files`.
for (const entry of ALLOWLIST) {
  const isGone = !fileSet.has(entry.path) || !fs.existsSync(path.join(root, entry.path));
  if (isGone) {
    errors.push(
      `${entry.path}: allowlisted but is not a tracked src/ .ts/.tsx file — delete or update its allowlist entry in scripts/validate-money-formatting.js`,
    );
    continue;
  }
  if (firstConstructorLine(entry.path) === undefined) {
    if (entry.issue === undefined) {
      errors.push(
        `${entry.path}: allowlisted as the sanctioned formatter but no longer constructs an \`Intl.NumberFormat\` — the money surface moved; update scripts/validate-money-formatting.js`,
      );
    } else {
      errors.push(
        `${entry.path}: allowlisted for #${entry.issue} but no longer constructs an \`Intl.NumberFormat\` — delete its allowlist entry in scripts/validate-money-formatting.js`,
      );
    }
  }
}

const coveringEntries = new Set();

for (const file of files) {
  const text = strippedLines(file)?.join('\n');
  if (text === undefined) continue;
  const entries = OWNED_SIGN_ALLOWLIST.filter((entry) => entry.path === file);
  for (const match of text.matchAll(OWNED_SIGN)) {
    const cover = entries.find(
      (entry) => entry.name === undefined || sitsInProperty(text, match.index, entry.name),
    );
    if (cover !== undefined) {
      coveringEntries.add(cover);
      continue;
    }
    const line = text.slice(0, match.index).split('\n').length;
    errors.push(
      `${file}:${line}: builds an owned sign by hand — use \`formatOwnedAmountParts\` or \`formatAccountBalanceParts\` from src/utils/format_amount.ts instead (docs/adr/2026-10-06-account-balances-owned-composer.md)`,
    );
  }
}

for (const entry of OWNED_SIGN_ALLOWLIST) {
  const scope = entry.name === undefined ? '' : ` in the \`${entry.name}\` property`;
  const isGone = !fileSet.has(entry.path) || !fs.existsSync(path.join(root, entry.path));
  if (isGone) {
    errors.push(
      `${entry.path}: allowlisted for an owned sign${scope} but is not a tracked src/ .ts/.tsx file — delete or update its OWNED_SIGN_ALLOWLIST entry in scripts/validate-money-formatting.js`,
    );
  } else if (!coveringEntries.has(entry)) {
    errors.push(
      `${entry.path}: allowlisted for an owned sign${scope} but builds none there — delete or update its OWNED_SIGN_ALLOWLIST entry in scripts/validate-money-formatting.js`,
    );
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const cleanupCount = ALLOWLIST.filter((entry) => entry.issue !== undefined).length;
const sanctionedCount = ALLOWLIST.filter((entry) => entry.issue === undefined).length;
console.log(
  `Money formatting validated (${files.length} src files, ${cleanupCount} allowlisted for cleanup, ${sanctionedCount} sanctioned)`,
);
