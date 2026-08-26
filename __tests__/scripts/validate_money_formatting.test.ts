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
 * Case (h) reaches pass 2's "no longer constructs" branch
 * (validate-money-formatting.js:108-118) directly, without mutating
 * `src/utils/format_amount.ts`: the shipped script is copied to a throwaway `fakeroot/`
 * so its own `__dirname`-derived `root` resolves there instead of the real repo, and a
 * `fakeroot/src/utils/format_amount.ts` fixture stands in for the real allowlisted file.
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

function runGuardAt(
  guardPath: string,
  env: NodeJS.ProcessEnv,
  timeout?: number,
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [guardPath], { encoding: 'utf8', env, timeout });
}

function runGuard(env: NodeJS.ProcessEnv, timeout?: number): SpawnSyncReturns<string> {
  return runGuardAt(scriptPath, env, timeout);
}

// One cleanup lifetime for the whole fixture surface: the fixture root and the stub `git`
// dirs are both per-case (beforeEach/afterEach), so a crashed case leaves nothing behind
// for the next one to trip over — the reason the `.gitignore` line for this dir exists.
beforeEach(() => {
  fs.mkdirSync(fixtureRoot, { recursive: true });
});

afterEach(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
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

  // c1 spec §2 item 2, case (a) — #295's row 1: a full-line `//` comment is the only
  // mention of the constructor. stripComments blanks it before matching, so it must not
  // be reported.
  it('does not report a constructor mentioned only in a line comment', () => {
    const violationRel = '.ma017-guard-fixtures/blinded_line_comment.ts';
    fs.writeFileSync(
      path.join(fixtureRoot, 'blinded_line_comment.ts'),
      "// new Intl.NumberFormat('en-US');\nexport const nothingHere = 1;\n",
    );
    const stubDir = makeStubGit(
      `#!/bin/sh\necho 'src/utils/format_amount.ts'\necho '${violationRel}'\nexit 0\n`,
    );
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  // c1 spec §2 item 2, case (b) — #295's row 2: a single-line `/* … */` block comment is
  // the only mention of the constructor.
  it('does not report a constructor mentioned only in a single-line block comment', () => {
    const violationRel = '.ma017-guard-fixtures/blinded_block_comment.ts';
    fs.writeFileSync(
      path.join(fixtureRoot, 'blinded_block_comment.ts'),
      "/* new Intl.NumberFormat('en-US'); */\nexport const nothingHere = 1;\n",
    );
    const stubDir = makeStubGit(
      `#!/bin/sh\necho 'src/utils/format_amount.ts'\necho '${violationRel}'\nexit 0\n`,
    );
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  // c1 spec §2 item 2, case (c) — #295's row 3: a JSDoc-style ` * …` continuation line is
  // the only mention of the constructor, inside a real multi-line block comment.
  it('does not report a constructor mentioned only in a JSDoc continuation line', () => {
    const violationRel = '.ma017-guard-fixtures/blinded_jsdoc_comment.ts';
    fs.writeFileSync(
      path.join(fixtureRoot, 'blinded_jsdoc_comment.ts'),
      "/**\n * new Intl.NumberFormat('en-US');\n */\nexport const nothingHere = 1;\n",
    );
    const stubDir = makeStubGit(
      `#!/bin/sh\necho 'src/utils/format_amount.ts'\necho '${violationRel}'\nexit 0\n`,
    );
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  // c1 spec §2 item 2, case (d) — #295's row 4: a trailing `//` comment on an unrelated
  // code line is the only mention of the constructor.
  it('does not report a constructor mentioned only in a trailing comment on unrelated code', () => {
    const violationRel = '.ma017-guard-fixtures/blinded_trailing_comment.ts';
    fs.writeFileSync(
      path.join(fixtureRoot, 'blinded_trailing_comment.ts'),
      "const x = 1; // new Intl.NumberFormat('en-US');\n",
    );
    const stubDir = makeStubGit(
      `#!/bin/sh\necho 'src/utils/format_amount.ts'\necho '${violationRel}'\nexit 0\n`,
    );
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  // c1 spec §2 item 2, case (e) — a real constructor with an unrelated trailing comment on
  // the same line must still be reported; stripping the comment must not blank the code
  // that precedes it.
  it('reports a real constructor even with a trailing comment on the same line', () => {
    const violationRel = '.ma017-guard-fixtures/real_with_trailing_comment.ts';
    fs.writeFileSync(
      path.join(fixtureRoot, 'real_with_trailing_comment.ts'),
      "new Intl.NumberFormat('en-US'); // formats a money string\n",
    );
    const stubDir = makeStubGit(
      `#!/bin/sh\necho 'src/utils/format_amount.ts'\necho '${violationRel}'\nexit 0\n`,
    );
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `${violationRel}:1: constructs an \`Intl.NumberFormat\` — use a formatter from src/utils/format_amount.ts instead (.claude/rules/review.md item 3)`,
    );
  });

  // c1 spec §2 item 2, case (f) — the quote-state exerciser: a `//` inside a string
  // literal (a URL) must not truncate the real constructor call that follows it on the
  // same line.
  it('reports a real constructor after a string literal containing `//`', () => {
    const violationRel = '.ma017-guard-fixtures/quote_state.ts';
    fs.writeFileSync(
      path.join(fixtureRoot, 'quote_state.ts'),
      "const u = 'https://x'; new Intl.NumberFormat('en-US');\n",
    );
    const stubDir = makeStubGit(
      `#!/bin/sh\necho 'src/utils/format_amount.ts'\necho '${violationRel}'\nexit 0\n`,
    );
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `${violationRel}:1: constructs an \`Intl.NumberFormat\` — use a formatter from src/utils/format_amount.ts instead (.claude/rules/review.md item 3)`,
    );
  });

  // c1 spec §2 item 2, case (g) — a multi-line `/* … */` block, without a per-line `*`
  // prefix, carrying the constructor text across an interior line must stay silent.
  it('does not report a constructor mentioned inside a multi-line block comment', () => {
    const violationRel = '.ma017-guard-fixtures/blinded_multiline_block.ts';
    fs.writeFileSync(
      path.join(fixtureRoot, 'blinded_multiline_block.ts'),
      "/*\nThis explains why new Intl.NumberFormat('en-US') must never appear\noutside format_amount.ts.\n*/\nexport const nothingHere = 1;\n",
    );
    const stubDir = makeStubGit(
      `#!/bin/sh\necho 'src/utils/format_amount.ts'\necho '${violationRel}'\nexit 0\n`,
    );
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  // c1 spec §2 item 2, case (h) — proves pass 2's blinding directly
  // (validate-money-formatting.js:108-118) rather than transitively through
  // src/utils/format_amount.ts. The shipped script is copied to a throwaway fakeroot so
  // its own `__dirname`-derived `root` (script `:17`) resolves there, and a
  // fakeroot/src/utils/format_amount.ts fixture — whose only constructor text is a
  // comment — stands in for the real allowlisted file. Pre-fix this exits 0 blind, the
  // guard's headline defect (#294 P8); post-fix it reaches "no longer constructs".
  it('reaches pass 2 blinding directly through a copied script and a comment-only allowlisted fixture', () => {
    const fakeRoot = path.join(fixtureRoot, 'fakeroot');
    const fakeScriptsDir = path.join(fakeRoot, 'scripts');
    const fakeUtilsDir = path.join(fakeRoot, 'src', 'utils');
    fs.mkdirSync(fakeScriptsDir, { recursive: true });
    fs.mkdirSync(fakeUtilsDir, { recursive: true });
    const copiedScriptPath = path.join(fakeScriptsDir, 'validate-money-formatting.js');
    fs.copyFileSync(scriptPath, copiedScriptPath);
    fs.writeFileSync(
      path.join(fakeUtilsDir, 'format_amount.ts'),
      "// new Intl.NumberFormat('en-US') lives here in prose only.\nexport const nothingHere = 1;\n",
    );
    const stubDir = makeStubGit("#!/bin/sh\necho 'src/utils/format_amount.ts'\nexit 0\n");
    const result = runGuardAt(copiedScriptPath, envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no longer constructs');
  });
});
