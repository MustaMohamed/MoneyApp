/**
 * Subprocess contract tests for scripts/validate-money-formatting.js (MA-017 c2).
 *
 * The script is CLI-only: top-level `process.exit`, `spawnSync('git', …)` at module
 * scope, no `module.exports`. It is exercised the same way `npm run lint` runs it — as a
 * subprocess, over its stdout/stderr/exit-code contract, never via `require()`.
 *
 * Fixtures live under `<repoRoot>/.ma017-guard-fixtures/` (gitignored), never an OS temp
 * dir. The script derives `root` from its own `__dirname` and reads
 * `path.join(root, relPath)` behind an `fs.existsSync` guard, so a fixture anywhere else
 * is invisible to it and pass 1 would silently find nothing. `src/` itself is never
 * mutated.
 *
 * `git` is stubbed via PATH injection — one throwaway stub directory per scenario, so
 * stubs cannot leak between cases. The script's own `spawnSync('git', …)` always runs
 * with `cwd: root`, so the *cwd* of this test's own subprocess is irrelevant; only the
 * child `PATH` decides which `git` runs.
 *
 * Two assertion styles, deliberately different:
 *   - 6a/6b assert the WHOLE of stderr. Both exits fire before pass 1 or pass 2 can run,
 *     so the stream is deterministically one line. `toContain` here would not discriminate
 *     a guard whose exit was deleted — see the header note on each case.
 *   - 6c/6d/6e assert only a substring of stderr, because a stub listing that omits
 *     `src/utils/format_amount.ts` makes pass 2's "gone" branch co-fire with pass 1, so
 *     stderr legitimately carries two lines and both mention `src/utils/format_amount.ts`.
 *
 * 6f is the only case coupled to the real tree: it runs the real `git` against the real
 * checkout, which is the actual `npm run lint` contract. If MA-018 removes the
 * constructor from `src/utils/format_amount.ts`, 6f goes red — that is MA-018's hazard
 * (spec §11), not a defect in this suite.
 *
 * Not covered, deliberately: pass 2's "no longer constructs" branch
 * (validate-money-formatting.js:108-118). Reaching it needs an allowlisted file that
 * still exists but no longer constructs — that means either mutating
 * `src/utils/format_amount.ts` (MA-018 owns it) or refactoring the script to accept an
 * injected allowlist, and both are out of scope (spec §3.2 — the script gets zero diff).
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'validate-money-formatting.js');
const fixtureRoot = path.join(repoRoot, '.ma017-guard-fixtures');

const stubDirs: string[] = [];

function makeStubGit(script: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma017-git-stub-'));
  stubDirs.push(dir);
  const gitPath = path.join(dir, 'git');
  fs.writeFileSync(gitPath, script);
  fs.chmodSync(gitPath, 0o755);
  return dir;
}

function envWithStub(stubDir: string): NodeJS.ProcessEnv {
  return { ...process.env, PATH: `${stubDir}${path.delimiter}${String(process.env.PATH)}` };
}

function runGuard(env: NodeJS.ProcessEnv, timeout?: number): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [scriptPath], { encoding: 'utf8', env, timeout });
}

beforeAll(() => {
  fs.mkdirSync(fixtureRoot, { recursive: true });
});

afterAll(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

afterEach(() => {
  for (const dir of stubDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('validate-money-formatting.js — subprocess CLI contract (MA-017 c2)', () => {
  it('exists at the path this suite exercises', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  // §4 row 5. `:54` is the only exit reached here — deleting it lets the run fall
  // through into the zero-match exit, which still exits 1 and still reprints this
  // message via `errors.join('\n')`. Only the exact whole-stderr match catches that.
  it('exits 1 with the exact message when git fails to run', () => {
    const stubDir = makeStubGit('#!/bin/sh\nexit 1\n');
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe(
      'git ls-files failed to run — run from a git checkout of MoneyApp (exit code 1)',
    );
  });

  // §4 row 6. `:64` is the only exit reached here — deleting it lets the run fall
  // through into pass 2's "gone" branch, which still exits 1 and still reprints this
  // message. Only the exact whole-stderr match catches that.
  it('exits 1 with the exact message when git returns nothing', () => {
    const stubDir = makeStubGit('#!/bin/sh\nexit 0\n');
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe(
      'git ls-files returned no files — run from a git checkout of MoneyApp',
    );
  });

  // §4 row 7, pass 1 (`:87-94`). The stub omits `src/utils/format_amount.ts`, so pass 2
  // also fires — stderr is asserted for the whole contiguous violation message as one
  // substring, never as three separate `toContain` calls, because pass 2's "gone" line
  // also contains `src/utils/format_amount.ts`.
  it('names the planted violation with file, line, and the sanctioned-formatter pointer', () => {
    const violationRel = '.ma017-guard-fixtures/violation.ts';
    fs.writeFileSync(path.join(fixtureRoot, 'violation.ts'), "new Intl.NumberFormat('en-US');\n");
    const stubDir = makeStubGit(`#!/bin/sh\necho '${violationRel}'\nexit 0\n`);
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '.ma017-guard-fixtures/violation.ts:1: constructs an `Intl.NumberFormat` — use a formatter from src/utils/format_amount.ts instead (.claude/rules/review.md item 3)',
    );
  });

  // Not in spec §4 rows 5-10 — kept because it pins the regex's own documented
  // invariant (script `:20-25`): the paren is load-bearing, not `new`.
  it('catches a bare Intl.NumberFormat construction with no `new`', () => {
    const violationRel = '.ma017-guard-fixtures/violation_bare.ts';
    fs.writeFileSync(path.join(fixtureRoot, 'violation_bare.ts'), "Intl.NumberFormat('en-US');\n");
    const stubDir = makeStubGit(`#!/bin/sh\necho '${violationRel}'\nexit 0\n`);
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(violationRel);
  });

  // §4 row 8, pass 2's "gone" branch (`:100-107`). The stub lists only a clean fixture,
  // omitting `src/utils/format_amount.ts` entirely, so it reads as gone.
  it('flags a stale allowlist entry without flagging a violation', () => {
    const cleanRel = '.ma017-guard-fixtures/clean.ts';
    fs.writeFileSync(path.join(fixtureRoot, 'clean.ts'), 'export const nothingHere = 1;\n');
    const stubDir = makeStubGit(`#!/bin/sh\necho '${cleanRel}'\nexit 0\n`);
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'src/utils/format_amount.ts: allowlisted but is not a tracked src/ .ts/.tsx file',
    );
    expect(result.stderr).not.toContain('constructs an');
  });

  // §4 row 10. No stub — real `git`, real tree, exactly what `npm run lint` runs. The
  // file count is asserted non-zero only; a literal count reds this suite on every
  // future src/ addition.
  it('validates clean at HEAD with no stub — the real CLI contract', () => {
    const result = runGuard({ ...process.env }, 15000);
    expect(result.status).toBe(0);
    const match =
      /^Money formatting validated \((\d+) src files, 0 allowlisted for cleanup, 1 sanctioned\)$/m.exec(
        result.stdout,
      );
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeGreaterThan(0);
  }, 15000);

  // Not in spec §4 rows 5-10 — MA-018 B1 regression. `firstConstructorLine` (`:70-82`)
  // resolves with `lines.findIndex`, so the FIRST line matching `CONSTRUCTOR` wins,
  // comment or not. `format_amount.ts` carries prose above the real constructor
  // explaining why the constructor call must stay on one line — MA-018 shipped a
  // version of that prose that itself matched `CONSTRUCTOR`, so the header comment
  // resolved before the executable constructor and pass 2 (`:108-118`, the check that
  // reds when the sanctioned entry stops constructing) went permanently dead: it read
  // the comment's line number forever, never noticing the real constructor disappear.
  //
  // The pattern is read out of the script's own source rather than re-declared here —
  // a hand-copied literal would silently stop tracking `CONSTRUCTOR` if the script's
  // regex ever changed, which is exactly the kind of drift this suite exists to catch.
  // This does not exercise pass 2 itself (still out of scope per the file header above);
  // it pins the narrower, cheaper invariant that a regression here would break: exactly
  // one line of the sanctioned file matches, and it is the constructor, not a comment.
  it('the CONSTRUCTOR pattern matches exactly one line of format_amount.ts, and it is not a comment', () => {
    const scriptSource = fs.readFileSync(scriptPath, 'utf8');
    const patternLiteral = /^const CONSTRUCTOR = \/(.+)\/;$/m.exec(scriptSource);
    expect(patternLiteral).not.toBeNull();
    const CONSTRUCTOR = new RegExp(patternLiteral?.[1] ?? '');

    const formatAmountPath = path.join(repoRoot, 'src', 'utils', 'format_amount.ts');
    const lines = fs.readFileSync(formatAmountPath, 'utf8').split('\n');
    const matchingLines = lines
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => CONSTRUCTOR.test(line));

    expect(matchingLines).toHaveLength(1);
    expect(matchingLines[0]?.line.trim().startsWith('//')).toBe(false);
    expect(matchingLines[0]?.line).toContain('new Intl.NumberFormat(');
  });
});
