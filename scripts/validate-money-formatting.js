// Add `{ path, issue: <N> }` to temporarily allowlist a violation; the fixing PR must delete it.
const fs = require('fs');
const path = require('path');
const { listSrcFiles } = require('./lib/list-src-files');
const { stripComments } = require('./lib/strip-comments');

const root = path.join(__dirname, '..');
const errors = [];

// No `g` flag (`test` carries `lastIndex`); matches on the paren since `new` is optional.
const CONSTRUCTOR = /(?<![\w.])Intl\.NumberFormat\s*\(/;

// ASCII ascending by path, matching `git ls-files` order.
const ALLOWLIST = [{ path: 'src/utils/format_amount.ts' }];

const BALANCE_ADR = 'docs/adr/2026-10-06-account-balances-owned-composer.md';

// The minus as a character or as the escape a source file may spell U+2212 with.
const MINUS_CHARACTER = '(?:[-\u2212]|\\\\u2212)';
const MINUS_GLYPH = `(?:\\bMINUS_SIGN\\b|'${MINUS_CHARACTER}'|"${MINUS_CHARACTER}"|\`${MINUS_CHARACTER}\`)`;
const EMPTY_STRING = '(?:\'\'|""|``)';
// A branch may sit in parentheses, and the first may carry an `as <Type>` cast before its `:`.
const BRANCH_OPEN = '(?:\\(\\s*)*';
const BRANCH_CLOSE = '(?:\\s+as\\s+[\\w.]+)?(?:\\s*\\))*';
// A ternary whose branches are a minus glyph and an empty string; the match starts at its `?`.
const OWNED_SIGN = new RegExp(
  `(?<!\\?)\\?\\s*${BRANCH_OPEN}(?:${MINUS_GLYPH}${BRANCH_CLOSE}\\s*:\\s*${BRANCH_OPEN}${EMPTY_STRING}|${EMPTY_STRING}${BRANCH_CLOSE}\\s*:\\s*${BRANCH_OPEN}${MINUS_GLYPH})`,
  'g',
);
// The tail of a three-way flow sign: its `?` opens the false branch of a `? PLUS_SIGN :` ternary.
const AFTER_PLUS_BRANCH = /\?\s*PLUS_SIGN\s*:[^?:,;()[\]{}]*$/;

// A plain formatter whose first argument ends in a balance column; the match starts at the call.
const PLAIN_BALANCE =
  /\bformat(?:Amount|CurrencyAmount|CurrencyParts|DisplayAmount|DisplayAmountParts|DisplayMagnitude)\s*\([^,()]*\.(?:current|opening)_balance\s*[,)]/g;

// Ascending by path; `name` narrows an entry to the value of the property with that key.
const OWNED_SIGN_ALLOWLIST = [
  {
    path: 'src/modules/transactions/screens/transactions/transactions.helpers.ts',
    name: 'leftOfIncome',
  },
  { path: 'src/utils/format_amount.ts' },
];

const JOIN_ADR = 'docs/adr/2026-10-04-owned-owed-composers-shared-home.md';

// Two template slots one space apart, the second naming a code; the match starts at the first slot's `}`.
const HAND_JOIN = /\} \$\{[^}]*(?:code|Code|urrency)[^}]*\}/g;

// Ascending by path; `name` narrows an entry as it does in `OWNED_SIGN_ALLOWLIST`.
const HAND_JOIN_ALLOWLIST = [
  { path: 'src/constants/strings.ts', name: 'n4CaptionConverted' },
  { path: 'src/modules/commitments/screens/commitments/filter/filter.helpers.ts' },
  { path: 'src/utils/format_amount.ts' },
];

const files = listSrcFiles(root);

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

function lineAt(text, index) {
  return text.slice(0, index).split('\n').length;
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

// The disk check catches a tracked file deleted from the working tree but still in `ls-files`.
function isGone(entry) {
  return !fileSet.has(entry.path) || !fs.existsSync(path.join(root, entry.path));
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

for (const entry of ALLOWLIST) {
  if (isGone(entry)) {
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

// Marks the covering entry as used, so the stale check below does not report it.
function coverFor(allowlist, file, text, index) {
  const cover = allowlist.find(
    (entry) =>
      entry.path === file && (entry.name === undefined || sitsInProperty(text, index, entry.name)),
  );
  if (cover !== undefined) coveringEntries.add(cover);
  return cover;
}

for (const file of files) {
  const text = strippedLines(file)?.join('\n');
  if (text === undefined) continue;
  for (const match of text.matchAll(OWNED_SIGN)) {
    if (AFTER_PLUS_BRANCH.test(text.slice(0, match.index))) continue;
    if (coverFor(OWNED_SIGN_ALLOWLIST, file, text, match.index) !== undefined) continue;
    errors.push(
      `${file}:${lineAt(text, match.index)}: builds an owned sign by hand — use \`formatOwnedAmountParts\` or \`formatAccountBalanceParts\` from src/utils/format_amount.ts instead; a match that signs no money takes an OWNED_SIGN_ALLOWLIST entry in scripts/validate-money-formatting.js (${BALANCE_ADR})`,
    );
  }
  for (const match of text.matchAll(PLAIN_BALANCE)) {
    errors.push(
      `${file}:${lineAt(text, match.index)}: prints an account balance through a plain formatter — use \`formatAccountBalanceParts\` or \`formatAccountBalance\` from src/utils/format_amount.ts instead (${BALANCE_ADR})`,
    );
  }
  for (const match of text.matchAll(HAND_JOIN)) {
    if (coverFor(HAND_JOIN_ALLOWLIST, file, text, match.index) !== undefined) continue;
    errors.push(
      `${file}:${lineAt(text, match.index)}: joins an amount to a currency code by hand — use \`formatCurrencyAmount\`, \`formatDisplayAmount\`, \`formatOwnedAmount\`, \`formatLiabilityAmount\` or \`formatAccountBalance\` from src/utils/format_amount.ts instead; a match that joins no amount takes a HAND_JOIN_ALLOWLIST entry in scripts/validate-money-formatting.js (${JOIN_ADR})`,
    );
  }
}

function reportStaleEntries(allowlist, listName, what, does) {
  for (const entry of allowlist) {
    const scope = entry.name === undefined ? '' : ` in the \`${entry.name}\` property`;
    if (isGone(entry)) {
      errors.push(
        `${entry.path}: allowlisted for ${what}${scope} but is not a tracked src/ .ts/.tsx file — delete or update its ${listName} entry in scripts/validate-money-formatting.js`,
      );
    } else if (!coveringEntries.has(entry)) {
      errors.push(
        `${entry.path}: allowlisted for ${what}${scope} but ${does} none there — delete or update its ${listName} entry in scripts/validate-money-formatting.js`,
      );
    }
  }
}

reportStaleEntries(OWNED_SIGN_ALLOWLIST, 'OWNED_SIGN_ALLOWLIST', 'an owned sign', 'builds');
reportStaleEntries(HAND_JOIN_ALLOWLIST, 'HAND_JOIN_ALLOWLIST', 'a hand join', 'joins');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const cleanupCount = ALLOWLIST.filter((entry) => entry.issue !== undefined).length;
const sanctionedCount = ALLOWLIST.filter((entry) => entry.issue === undefined).length;
console.log(
  `Money formatting validated (${files.length} src files, ${cleanupCount} allowlisted for cleanup, ${sanctionedCount} sanctioned)`,
);
