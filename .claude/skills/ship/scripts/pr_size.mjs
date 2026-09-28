#!/usr/bin/env node
// Prints a PR's delivered size as splitting.md § Size gate counts it: `pr_size.mjs <pr>`, or `--stdin` with the REST files array.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const TESTS = /^(?:__tests__\/|__mocks__\/|src\/test_helpers\/|jest\.setup\.js$)/;
const GENERATED = /^(?:package-lock|skills-lock)\.json$/;

/** @param {{ filename: string, additions: number }[]} files @returns {string} */
function delivered(files) {
  let outsideFiles = 0;
  let outside = 0;
  let tests = 0;
  for (const f of files) {
    if (TESTS.test(f.filename)) tests += f.additions;
    else if (!GENERATED.test(f.filename)) {
      outsideFiles += 1;
      outside += f.additions;
    }
  }
  return `Delivered: ${outsideFiles} files outside tests, ${outside} lines, ${tests} lines in tests`;
}

const arg = process.argv[2] ?? '';
if (arg === '--stdin') {
  console.log(delivered(JSON.parse(readFileSync(0, 'utf8'))));
} else if (/^\d+$/.test(arg)) {
  // REST pages past 100 files; `gh pr view --json files` stops at 100.
  const pages = JSON.parse(
    execFileSync('gh', ['api', '--paginate', '--slurp', `repos/{owner}/{repo}/pulls/${arg}/files`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
  );
  console.log(delivered(pages.flat()));
} else {
  console.error('usage: pr_size.mjs <pr-number> | --stdin');
  process.exit(2);
}
