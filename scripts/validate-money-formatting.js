// Invariant: no tracked src/ .ts/.tsx file outside the literal allowlist below constructs
// an `Intl.NumberFormat`, and every allowlist entry names a file that still does. The 12
// `issue: 270` entries are #270's cleanup register — every #270 PR that fixes one of these
// files must delete its entry in the same commit, or this check goes red on the stale half.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const errors = [];

// No `g` flag: with one, RegExp#test carries lastIndex between calls and silently skips
// roughly every other match. The paren is load-bearing, not `new` — `Intl.NumberFormat(...)`
// without `new` is legal and returns a working formatter, so a pattern anchored on `new`
// is evaded by deleting four characters. The negative lookbehind keeps `SomeIntl.NumberFormat(`
// from matching; see the two prose mentions this keeps out of the allowlist
// (account_aggregation.ts, dashboard.helpers.ts) — neither has a paren after the name.
const CONSTRUCTOR = /(?<![\w.])Intl\.NumberFormat\s*\(/;

// ASCII ascending by path — this is git ls-files order, so a reviewer can diff this against
// a fresh grep by eye, and #270's single-entry deletions stay single-line diffs. Entries with
// an `issue` may only ever be deleted, never added without a gate.
const ALLOWLIST = [
  // Sanctioned: the single legitimate constructor. No `issue` — this entry is permanent.
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

// Checked before any use of `stdout` — on the error path (git missing from PATH, cwd gone)
// spawnSync returns `{ status: null, stdout: undefined }` despite `stdout`'s non-nullable
// type with `encoding: 'utf8'`. Accessing `.split` on that path throws a TypeError stack
// instead of this message, so the status/error check must precede the split, not follow it.
if (listing.error || listing.status !== 0) {
  errors.push(
    `git ls-files failed to run — run from a git checkout of MoneyApp (${listing.error?.message ?? `exit code ${String(listing.status)}`})`,
  );
  console.error(errors.join('\n'));
  process.exit(1);
}

const files = listing.stdout.split('\n').filter(Boolean);

// A broken pathspec must not silently pass with zero files scanned — that is the failure
// mode this repo keeps shipping.
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
  const index = lines.findIndex((line) => CONSTRUCTOR.test(line));
  const result = index === -1 ? undefined : index + 1;
  constructorLineCache.set(relPath, result);
  return result;
}

const allowlistPaths = new Set(ALLOWLIST.map((entry) => entry.path));

// Pass 1 — violations: any scanned file that constructs and is not allowlisted.
for (const file of files) {
  const line = firstConstructorLine(file);
  if (line !== undefined && !allowlistPaths.has(file)) {
    errors.push(
      `${file}:${line}: constructs an \`Intl.NumberFormat\` — use a formatter from src/utils/format_amount.ts instead (.claude/rules/review.md item 3)`,
    );
  }
}

// Pass 2 — stale entries: symmetric to pass 1, so the allowlist cannot become a permanent
// amnesty. "gone" is checked by list membership plus a disk check (a tracked file removed
// from the working tree but not yet staged is still listed by git ls-files); "fixed" is
// whatever remains once "gone" is ruled out.
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
