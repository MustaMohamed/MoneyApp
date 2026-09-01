// Fixtures must live under the repo root: the script only scans paths under its own `__dirname`.
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

// oxfmt does not honour `.gitignore`, so a stray fixture dir reds `format:check`; sweep dead pids.
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

beforeEach(() => {
  fs.mkdirSync(fixtureRoot, { recursive: true });
});

afterEach(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  for (const dir of stubDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Non-recursive on purpose: `ENOTEMPTY` means a concurrent process still holds the parent.
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

  // Whole-stderr match on purpose: `toContain` would still pass if this exit were deleted.
  it('exits 1 with the exact message when git fails to run', () => {
    const stubDir = makeStubGit('#!/bin/sh\nexit 1\n');
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe(
      'git ls-files failed to run — run from a git checkout of MoneyApp (exit code 1)',
    );
  });

  // Whole-stderr match on purpose: `toContain` would still pass if this exit were deleted.
  it('exits 1 with the exact message when git returns nothing', () => {
    const stubDir = makeStubGit('#!/bin/sh\nexit 0\n');
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe(
      'git ls-files returned no files — run from a git checkout of MoneyApp',
    );
  });

  // One substring, not three `toContain`: pass 2's "gone" line also names the same file.
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

  // Pins the guard regex invariant: the paren is load-bearing, not `new`.
  it('catches a bare Intl.NumberFormat construction with no `new`', () => {
    const violationRel = `${fixtureRel}/violation_bare.ts`;
    fs.writeFileSync(path.join(fixtureRoot, 'violation_bare.ts'), "Intl.NumberFormat('en-US');\n");
    const stubDir = makeStubGit(`#!/bin/sh\necho '${violationRel}'\nexit 0\n`);
    const result = runGuard(envWithStub(stubDir));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(violationRel);
  });

  // The stub omits `src/utils/format_amount.ts`, so pass 2 reads the allowlisted file as gone.
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

  // Count asserted non-zero only; a literal count would red on every future `src/` addition.
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

  // `backtick_regex_class_fp` is a deliberate false positive: the scanner has no regex concept.
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

  // The script derives `root` from `__dirname`, so the copy in `fakeroot/` scans there instead.
  it('reaches pass 2 blinding directly through a copied script and a comment-only allowlisted fixture', () => {
    const fakeRoot = path.join(fixtureRoot, 'fakeroot');
    const fakeScriptsDir = path.join(fakeRoot, 'scripts');
    const fakeLibDir = path.join(fakeScriptsDir, 'lib');
    const fakeUtilsDir = path.join(fakeRoot, 'src', 'utils');
    fs.mkdirSync(fakeScriptsDir, { recursive: true });
    fs.mkdirSync(fakeLibDir, { recursive: true });
    fs.mkdirSync(fakeUtilsDir, { recursive: true });
    const copiedScriptPath = path.join(fakeScriptsDir, 'validate-money-formatting.js');
    fs.copyFileSync(scriptPath, copiedScriptPath);
    // `require('./lib/strip-comments')` resolves beside the copy; without it this MODULE_NOT_FOUNDs.
    fs.copyFileSync(
      path.join(repoRoot, 'scripts', 'lib', 'strip-comments.js'),
      path.join(fakeLibDir, 'strip-comments.js'),
    );
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
