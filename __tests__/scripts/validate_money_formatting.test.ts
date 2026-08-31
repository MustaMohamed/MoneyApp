/**
 * Subprocess contract tests for scripts/validate-money-formatting.js (MA-017 c2).
 *
 * The script is CLI-only: top-level `process.exit`, `spawnSync('git', …)` at module
 * scope, no `module.exports`. It is exercised the same way `npm run lint` runs it — as a
 * subprocess, over its stdout/stderr/exit-code contract, never via `require()`.
 *
 * Fixtures live under `<repoRoot>/.ma017-guard-fixtures/<pid>/` (gitignored), never an OS
 * temp dir. The script derives `root` from its own `__dirname` and reads
 * `path.join(root, relPath)` behind an `fs.existsSync` guard, so a fixture anywhere else
 * is invisible to it and pass 1 would silently find nothing. `src/` itself is never
 * mutated. The per-pid subdir keeps two concurrent test processes from racing each
 * other's fixture writes and cleanup. A `beforeAll` sweep clears any sibling `<pid>/`
 * dir a crashed run left behind (`process.kill(pid, 0)` throwing ESRCH means that pid
 * is dead) plus this process's own dir if a recycled pid left one stale. An `afterAll`
 * non-recursive `rmdirSync` then removes the gitignored `.ma017-guard-fixtures/` parent
 * only when this process is the last one out — `ENOTEMPTY` means a live sibling still
 * holds it, so the parent survives exactly when it must, without reintroducing the
 * cross-process race this layout exists to kill.
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
 * Two label schemes appear below, deliberately kept apart: `6a`-`6f` name the six original
 * subprocess-contract cases above (MA-017 spec §4 — git failure, git empty, planted
 * violation, bare `new`-less construction, stale allowlist, real-HEAD check), untouched by
 * this chunk. `(a)`-`(i)` name the comment-stripping fixture cases added by W1D c1 spec §2
 * and batched below.
 *
 * (c) and (g) deliberately exercise the same block-comment scanner branch: a JSDoc-style
 * continuation line and a plain multi-line paragraph are both interior lines of one open
 * block comment, so stripComments treats them identically. They stay two cases, not one,
 * because each replays a distinct row of #295's measured four-row blinding matrix — the
 * contract under test is that matrix, not the scanner's branch count.
 *
 * Case (h) reaches pass 2's "no longer constructs" branch
 * (validate-money-formatting.js:167-177) directly, without mutating
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
const fixtureRel = `.ma017-guard-fixtures/${process.pid}`;
const fixtureParent = path.join(repoRoot, '.ma017-guard-fixtures');
const fixtureRoot = path.join(repoRoot, fixtureRel);

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

// Shared by the batched (a)-(i) cases below: writes every fixture, stubs `git` to list the
// sanctioned entry plus all of them, and runs the guard once. Callers assert status/stderr
// against the returned relative paths — one spawn per exit-code outcome, not one per case.
type Fixture = { name: string; content: string };

function runGuardOverFixtures(fixtures: Fixture[]): {
  result: SpawnSyncReturns<string>;
  relPaths: string[];
} {
  const relPaths = fixtures.map(({ name, content }) => {
    fs.writeFileSync(path.join(fixtureRoot, name), content);
    return `${fixtureRel}/${name}`;
  });
  const stubDir = makeStubGit(
    `#!/bin/sh\necho 'src/utils/format_amount.ts'\n${relPaths.map((p) => `echo '${p}'`).join('\n')}\nexit 0\n`,
  );
  const result = runGuard(envWithStub(stubDir));
  return { result, relPaths };
}

// Orphan hygiene: a process that crashes mid-suite never reaches its own afterEach/afterAll,
// so its `<pid>/` dir is permanent — and oxfmt does not honour .gitignore, so a stray dir
// under `.ma017-guard-fixtures/` reds `format:check` with no diff. Sweep dead siblings
// before this run starts: a dir name that parses as a pid and fails `process.kill(pid, 0)`
// with ESRCH belongs to a process that no longer exists, so it's safe to remove; a dir
// matching this process's own pid (a recycled pid reusing a dead process's number) is
// cleared unconditionally, since it cannot belong to a still-running process by definition.
beforeAll(() => {
  if (!fs.existsSync(fixtureParent)) return;
  for (const entry of fs.readdirSync(fixtureParent)) {
    const pid = Number(entry);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    const entryPath = path.join(fixtureParent, entry);
    if (pid === process.pid) {
      fs.rmSync(entryPath, { recursive: true, force: true });
      continue;
    }
    try {
      process.kill(pid, 0);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ESRCH') {
        fs.rmSync(entryPath, { recursive: true, force: true });
      }
    }
  }
});

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

// Non-recursive on purpose: this only succeeds once this process's own afterEach has left
// the parent empty, i.e. this was the last process out. ENOTEMPTY means a concurrent
// process's pid dir is still under the parent — exactly the case where the parent must
// survive, so the removal is dropped rather than reintroducing the cross-process race
// this per-pid layout exists to kill. ENOENT means a sibling's afterAll won the same race
// a moment earlier and already removed the parent — also not this process's problem, so
// it's swallowed the same way; only an unexpected code still throws.
afterAll(() => {
  try {
    fs.rmdirSync(fixtureParent);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOTEMPTY' && code !== 'ENOENT') throw err;
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

  // §4 row 7, pass 1 (`:146-153`). The stub omits `src/utils/format_amount.ts`, so pass 2
  // also fires — stderr is asserted for the whole contiguous violation message as one
  // substring, never as three separate `toContain` calls, because pass 2's "gone" line
  // also contains `src/utils/format_amount.ts`.
  it('names the planted violation with file, line, and the sanctioned-formatter pointer', () => {
    const violationRel = `${fixtureRel}/violation.ts`;
    fs.writeFileSync(path.join(fixtureRoot, 'violation.ts'), "new Intl.NumberFormat('en-US');\n");
    const stubDir = makeStubGit(`#!/bin/sh\necho '${violationRel}'\nexit 0\n`);
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `${violationRel}:1: constructs an \`Intl.NumberFormat\` — use a formatter from src/utils/format_amount.ts instead (.claude/rules/review.md item 3)`,
    );
  });

  // Not in spec §4 rows 5-10 — kept because it pins the regex's own documented
  // invariant (script `:20-25`): the paren is load-bearing, not `new`.
  it('catches a bare Intl.NumberFormat construction with no `new`', () => {
    const violationRel = `${fixtureRel}/violation_bare.ts`;
    fs.writeFileSync(path.join(fixtureRoot, 'violation_bare.ts'), "Intl.NumberFormat('en-US');\n");
    const stubDir = makeStubGit(`#!/bin/sh\necho '${violationRel}'\nexit 0\n`);
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(violationRel);
  });

  // §4 row 8, pass 2's "gone" branch (`:161-166`). The stub lists only a clean fixture,
  // omitting `src/utils/format_amount.ts` entirely, so it reads as gone.
  it('flags a stale allowlist entry without flagging a violation', () => {
    const cleanRel = `${fixtureRel}/clean.ts`;
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

  // c1 spec §2 item 2, cases (a)-(d), (g), (i-silent) — one spawn over six fixtures, all of
  // which must stay silent. (a) full-line `//` comment (#295 row 1). (b) single-line block
  // comment (#295 row 2). (c) JSDoc-style ` * …` continuation line inside a real multi-line
  // block comment (#295 row 3 — shares its scanner branch with (g), deliberately: see file
  // header). (d) trailing `//` comment on unrelated code (#295 row 4). (g) a multi-line
  // block without a per-line `*` prefix, constructor text on an interior line. (i-silent)
  // the P8 false-positive: an escaped quote (`\'`) followed by a trailing comment — before
  // the escape fix this desynced the quote scanner and the comment was never truncated.
  it('does not report a constructor mentioned only in a comment (a-d, g, i-silent)', () => {
    const { result } = runGuardOverFixtures([
      {
        name: 'blinded_line_comment.ts',
        content: "// new Intl.NumberFormat('en-US');\nexport const nothingHere = 1;\n",
      },
      {
        name: 'blinded_block_comment.ts',
        content: "/* new Intl.NumberFormat('en-US'); */\nexport const nothingHere = 1;\n",
      },
      {
        name: 'blinded_jsdoc_comment.ts',
        content: "/**\n * new Intl.NumberFormat('en-US');\n */\nexport const nothingHere = 1;\n",
      },
      {
        name: 'blinded_trailing_comment.ts',
        content: "const x = 1; // new Intl.NumberFormat('en-US');\n",
      },
      {
        name: 'blinded_multiline_block.ts',
        content:
          "/*\nThis explains why new Intl.NumberFormat('en-US') must never appear\noutside format_amount.ts.\n*/\nexport const nothingHere = 1;\n",
      },
      {
        name: 'blinded_escaped_quote_comment.ts',
        content: "const x = 'a\\'b'; // new Intl.NumberFormat('en-US');\n",
      },
    ]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  // c1 spec §2 item 2, cases (e), (f), (i-reported), plus P8 cycle 1 item 8's two additions
  // — one spawn over five fixtures, all of which must still be reported; stripping must
  // never blank real code. (e) a real constructor with an unrelated trailing comment on the
  // same line. (f) the quote-state exerciser: a `//` inside a string literal (a URL) must
  // not truncate the real constructor that follows on the same line. (i-reported) an
  // escaped quote followed by a real constructor with no comment at all — the escape fix
  // must not eat the code after it. `template_interior_block_open` pins item 8's fix: a
  // `/*`-looking line INSIDE a multi-line template literal must not open real block-comment
  // state (pre-fix, quote state reset at every line start, so this line's `/*` was read as
  // a genuine comment-opener with no closing `*/` anywhere after it, blanking every line to
  // EOF — including the real constructor below — a silent false negative; post-fix, hoisted
  // backtick-persisting quote state keeps the whole template as string content throughout).
  // `backtick_regex_class_fp` pins the accepted trade the same fix makes on purpose: a
  // backtick this scanner cannot know is inside a regex character class (it has no concept
  // of regex literals — #295's own ruling declined a real parser for one pattern) opens
  // quote state that rides straight through a same-line `//`, so the trailing comment's
  // constructor mention is never truncated and gets reported — a LOUD false positive,
  // deliberately preferred over the silent false negative it replaced (P8 cycle 1 item 8,
  // deep-mode verifier CONFIRMED; zero live sites in `src/` match this shape today).
  it('reports a real constructor despite a trailing comment, a quoted `//`, an escaped quote, or being inside a multi-line template (e, f, i-reported, item-8 pair)', () => {
    const cases: Array<Fixture & { line: number }> = [
      {
        name: 'real_with_trailing_comment.ts',
        content: "new Intl.NumberFormat('en-US'); // formats a money string\n",
        line: 1,
      },
      {
        name: 'quote_state.ts',
        content: "const u = 'https://x'; new Intl.NumberFormat('en-US');\n",
        line: 1,
      },
      {
        name: 'escaped_quote_then_constructor.ts',
        content: "const x = 'a\\'b'; new Intl.NumberFormat('en-US');\n",
        line: 1,
      },
      {
        // Real constructor sits AFTER the template, at line 5, not line 1 like its siblings.
        name: 'template_interior_block_open.ts',
        content:
          "const template = `line one\n/* unterminated within this template\nline three`;\n\nnew Intl.NumberFormat('en-US');\n",
        line: 5,
      },
      {
        name: 'backtick_regex_class_fp.ts',
        content: 'const re = /[`]/; // new Intl.NumberFormat(\n',
        line: 1,
      },
    ];
    const { result, relPaths } = runGuardOverFixtures(cases);
    expect(result.status).toBe(1);
    cases.forEach((c, index) => {
      expect(result.stderr).toContain(
        `${relPaths[index]}:${c.line}: constructs an \`Intl.NumberFormat\` — use a formatter from src/utils/format_amount.ts instead (.claude/rules/review.md item 3)`,
      );
    });
  });

  // c1 spec §2 item 2, case (h) — proves pass 2's blinding directly
  // (validate-money-formatting.js:167-177) rather than transitively through
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
