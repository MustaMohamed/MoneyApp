// Add `{ path, issue: <N> }` to temporarily allowlist a violation; the fixing PR must delete it.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const errors = [];

// No `g` flag (`test` carries `lastIndex`); matches on the paren since `new` is optional.
const CONSTRUCTOR = /(?<![\w.])Intl\.NumberFormat\s*\(/;

// ASCII ascending by path, matching `git ls-files` order.
const ALLOWLIST = [{ path: 'src/utils/format_amount.ts' }];

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
const constructorLineCache = new Map();

function firstConstructorLine(relPath) {
  if (constructorLineCache.has(relPath)) return constructorLineCache.get(relPath);
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) {
    constructorLineCache.set(relPath, undefined);
    return undefined;
  }
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  const index = stripComments(lines).findIndex((line) => CONSTRUCTOR.test(line));
  const result = index === -1 ? undefined : index + 1;
  constructorLineCache.set(relPath, result);
  return result;
}

// Lines are blanked, not dropped, so line numbers stay valid; backtick quote state spans lines.
function stripComments(lines) {
  let inBlockComment = false;
  let quote = null;
  return lines.map((line) => {
    let result = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inBlockComment) {
        if (ch === '*' && line[i + 1] === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }
      if (quote) {
        result += ch;
        if (ch === '\\' && i + 1 < line.length) {
          result += line[i + 1];
          i++;
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch;
        result += ch;
        continue;
      }
      if (ch === '/' && line[i + 1] === '/') break;
      if (ch === '/' && line[i + 1] === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      result += ch;
    }
    if (quote !== '`') quote = null;
    return result;
  });
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

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const cleanupCount = ALLOWLIST.filter((entry) => entry.issue !== undefined).length;
const sanctionedCount = ALLOWLIST.filter((entry) => entry.issue === undefined).length;
console.log(
  `Money formatting validated (${files.length} src files, ${cleanupCount} allowlisted for cleanup, ${sanctionedCount} sanctioned)`,
);
