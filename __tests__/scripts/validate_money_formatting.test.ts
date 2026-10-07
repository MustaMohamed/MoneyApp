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
const transactionsHelpersRel =
  'src/modules/transactions/screens/transactions/transactions.helpers.ts';
const stringsRel = 'src/constants/strings.ts';
const commitmentFilterHelpersRel =
  'src/modules/commitments/screens/commitments/filter/filter.helpers.ts';
// Every path an allowlist in the script names, in `git ls-files` order.
const allowlistedRels = [
  stringsRel,
  commitmentFilterHelpersRel,
  transactionsHelpersRel,
  'src/utils/format_amount.ts',
];

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
    `#!/bin/sh\n${[...allowlistedRels, ...relPaths].map((p) => `echo '${p}'`).join('\n')}\nexit 0\n`,
  );
  const result = runGuard(envWithStub(stubDir));
  return { result, relPaths };
}

const OWNED_SIGN_REPORT = 'builds an owned sign by hand';

function ownedSignReport(relPath: string, line: number): string {
  return `${relPath}:${line}: ${OWNED_SIGN_REPORT}`;
}

const PLAIN_BALANCE_REPORT = 'prints an account balance through a plain formatter';

function plainBalanceReport(relPath: string, line: number): string {
  return `${relPath}:${line}: ${PLAIN_BALANCE_REPORT}`;
}

const HAND_JOIN_REPORT = 'joins an amount to a currency code by hand';
const HAND_JOIN_ADR = 'docs/adr/2026-10-04-owned-owed-composers-shared-home.md';
const JOINED_FORMATTERS = [
  'formatCurrencyAmount',
  'formatDisplayAmount',
  'formatOwnedAmount',
  'formatLiabilityAmount',
  'formatAccountBalance',
];

function handJoinReport(relPath: string, line: number): string {
  return `${relPath}:${line}: ${HAND_JOIN_REPORT}`;
}

function isHandJoinReport(entry: string): boolean {
  return new RegExp(`^[^:]+:\\d+: ${HAND_JOIN_REPORT}`).test(entry);
}

// The opening of the strings entry's stale line; `state` is the half that differs by cause.
function staleStringsEntry(state: string): string {
  return `${stringsRel}: allowlisted for a hand join in the \`n4CaptionConverted\` property but ${state}`;
}

// A stand-in composer file with nothing stale in it: one constructor and one covered sign.
const fakeComposerSource =
  "export const formatter = new Intl.NumberFormat('en-US');\nexport const sign = (value: number): string => (value < 0 ? MINUS_SIGN : '');\n";

// The script derives `root` from `__dirname`, so the copy scans the fake `src/` beside it.
function runGuardInFakeRoot(
  composerSource: string,
  transactionsHelpersSource?: string,
  stringsSource?: string,
): SpawnSyncReturns<string> {
  const fakeRoot = path.join(fixtureRoot, 'fakeroot');
  const fakeLibDir = path.join(fakeRoot, 'scripts', 'lib');
  fs.mkdirSync(fakeLibDir, { recursive: true });
  const copiedScriptPath = path.join(fakeRoot, 'scripts', 'validate-money-formatting.js');
  fs.copyFileSync(scriptPath, copiedScriptPath);
  // `require('./lib/strip-comments')` resolves beside the copy; without it this MODULE_NOT_FOUNDs.
  fs.copyFileSync(
    path.join(repoRoot, 'scripts', 'lib', 'strip-comments.js'),
    path.join(fakeLibDir, 'strip-comments.js'),
  );
  const sources = [{ rel: 'src/utils/format_amount.ts', content: composerSource }];
  if (transactionsHelpersSource !== undefined) {
    sources.unshift({ rel: transactionsHelpersRel, content: transactionsHelpersSource });
  }
  if (stringsSource !== undefined) {
    sources.unshift({ rel: stringsRel, content: stringsSource });
  }
  for (const { rel, content } of sources) {
    const abs = path.join(fakeRoot, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  const stubDir = makeStubGit(
    `#!/bin/sh\n${sources.map(({ rel }) => `echo '${rel}'`).join('\n')}\nexit 0\n`,
  );
  return runGuardAt(copiedScriptPath, envWithStub(stubDir));
}

// Properties start at line 3 of the source this returns.
function heroSource(properties: string[]): string {
  return [
    'export function resolveHero(left: number | undefined, net: number) {',
    '  return {',
    ...properties,
    '  };',
    '}',
    '',
  ].join('\n');
}

// Properties start at line 2 of the source this returns.
function stringsSource(properties: string[]): string {
  return ['export const Strings = {', ...properties, '};', ''].join('\n');
}

function isOwnedSignReport(entry: string): boolean {
  return new RegExp(`^[^:]+:\\d+: ${OWNED_SIGN_REPORT}`).test(entry);
}

// The second run adds a file that fires, so a quiet result is not the scan being absent.
function expectQuietBeside(quietFixture: Fixture, control: Fixture, controlReport: string): void {
  const alone = runGuardOverFixtures([quietFixture]).result;
  expect(alone.stderr).toBe('');
  expect(alone.status).toBe(0);

  const beside = runGuardOverFixtures([quietFixture, control]).result;
  expect(beside.stderr).toContain(controlReport);
  expect(beside.stderr).not.toContain(`${fixtureRel}/${quietFixture.name}`);
  expect(beside.status).toBe(1);
}

// A stale line has no line number, so its wording is free to reuse the report's phrase.
function staleLeftOfIncomeLine(stderr: string): string | undefined {
  return stderr
    .split('\n')
    .find(
      (entry) =>
        entry.startsWith(`${transactionsHelpersRel}:`) &&
        entry.includes('leftOfIncome') &&
        !isOwnedSignReport(entry),
    );
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
    expect(result.stderr).toBe('');
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
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
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

  it('reaches pass 2 blinding directly through a copied script and a comment-only allowlisted fixture', () => {
    const result = runGuardInFakeRoot(
      "// new Intl.NumberFormat('en-US') lives here in prose only.\nexport const nothingHere = 1;\n",
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no longer constructs');
  });
});

describe('validate-money-formatting.js — hand-built owned signs (MA-156)', () => {
  const handBuilt: Array<Fixture & { shape: string; line: number }> = [
    {
      shape: 'a ternary on MINUS_SIGN and an empty string',
      name: 'owned_sign_constant.ts',
      content: "export const sign = (value: number): string => (value < 0 ? MINUS_SIGN : '');\n",
      line: 1,
    },
    {
      shape: 'a quoted hyphen inside a template',
      name: 'owned_sign_template.ts',
      content:
        "export const signed = (v: number, text: string): string => `${v < 0 ? '-' : ''}${text}`;\n",
      line: 1,
    },
    {
      shape: 'the two branches in reverse order',
      name: 'owned_sign_reversed.ts',
      content: "export const sign = (v: number): string => (v >= 0 ? '' : MINUS_SIGN);\n",
      line: 1,
    },
    {
      shape: 'a ternary wrapped across lines, at the line of its `?`',
      name: 'owned_sign_wrapped.ts',
      content:
        "export const sign = (value: number): string =>\n  value < 0\n    ? MINUS_SIGN\n    : '';\n",
      line: 3,
    },
    {
      shape: 'the U+2212 character in single quotes',
      name: 'owned_sign_minus_character.ts',
      content: "export const sign = (value: number): string => (value < 0 ? '−' : '');\n",
      line: 1,
    },
    {
      shape: 'a double-quoted hyphen against a double-quoted empty string',
      name: 'owned_sign_double_quoted.ts',
      content: 'export const sign = (value: number): string => (value < 0 ? "-" : "");\n',
      line: 1,
    },
    {
      shape: 'a backtick hyphen against a backtick empty string',
      name: 'owned_sign_backtick.ts',
      content: 'export const sign = (value: number): string => (value < 0 ? `-` : ``);\n',
      line: 1,
    },
    {
      shape: 'the minus written as its six-character escape',
      name: 'owned_sign_escape.ts',
      content: "export const sign = (value: number): string => (value < 0 ? '\\u2212' : '');\n",
      line: 1,
    },
    {
      shape: 'a glyph branch wrapped in parentheses',
      name: 'owned_sign_parenthesised.ts',
      content: "export const sign = (value: number): string => (value < 0 ? (MINUS_SIGN) : '');\n",
      line: 1,
    },
    {
      shape: 'an empty branch carrying a cast',
      name: 'owned_sign_cast.ts',
      content:
        "export const sign = (value: number): AmountSign =>\n  value < 0 ? MINUS_SIGN : ('' as AmountSign);\n",
      line: 2,
    },
    {
      shape: 'a cast on the branch ahead of the `:`',
      name: 'owned_sign_cast_first.ts',
      content:
        "export const sign = (v: number): AmountSign => (v >= 0 ? ('' as AmountSign) : MINUS_SIGN);\n",
      line: 1,
    },
    {
      shape: 'a quoted hyphen that signs no money',
      name: 'owned_sign_separator.ts',
      content: "const sep = hasSuffix ? '-' : '';\n",
      line: 1,
    },
  ];

  it.each(handBuilt)('fails $shape', ({ name, content, line }) => {
    const { result } = runGuardOverFixtures([{ name, content }]);
    const expected = ownedSignReport(`${fixtureRel}/${name}`, line);
    expect(result.stderr).toContain(expected);
    const report = result.stderr.split('\n').find((entry) => entry.startsWith(expected));
    expect(report).toContain('formatOwnedAmountParts');
    expect(report).toContain('formatAccountBalanceParts');
    expect(report).toContain('OWNED_SIGN_ALLOWLIST');
    expect(result.status).toBe(1);
  });

  const control: Fixture = { name: 'owned_sign_control.ts', content: handBuilt[0].content };

  const quiet: Array<Fixture & { shape: string }> = [
    {
      shape: 'the composer',
      name: 'quiet_composer.ts',
      content:
        'export const text = (value: number, currency: Currency): string =>\n  formatOwnedAmountParts(value, currency).value;\n',
    },
    {
      shape: 'a flow sign that picks between PLUS_SIGN and MINUS_SIGN',
      name: 'quiet_flow_sign.ts',
      content:
        'export const sign = (positive: boolean): string => (positive ? PLUS_SIGN : MINUS_SIGN);\n',
    },
    {
      shape: 'signAmountText handed MINUS_SIGN outright',
      name: 'quiet_sign_amount_text.ts',
      content:
        'export const signed = (text: string): string => signAmountText(text, MINUS_SIGN);\n',
    },
    {
      shape: 'the pattern inside a comment',
      name: 'quiet_comment.ts',
      content: "// value < 0 ? MINUS_SIGN : ''\nexport const nothingHere = 1;\n",
    },
    {
      shape: 'a hyphen that stands for an unset date',
      name: 'quiet_unset_date.ts',
      content:
        "export const label = (date?: string): string => (date ? formatShortDate(date) : '-');\n",
    },
    {
      shape: 'the tail of a three-way flow sign whose true branch is PLUS_SIGN',
      name: 'quiet_three_way_flow_sign.ts',
      content:
        "export const sign = (delta: number): string =>\n  delta > 0 ? PLUS_SIGN : delta < 0 ? MINUS_SIGN : '';\n",
    },
  ];

  it.each(quiet)('stays quiet on $shape', ({ name, content }) => {
    expectQuietBeside(
      { name, content },
      control,
      ownedSignReport(`${fixtureRel}/${control.name}`, 1),
    );
  });

  describe('the leftOfIncome entry, through a copied script', () => {
    const coveredSign = [
      '    leftOfIncome:',
      '      left === undefined',
      "        ? 'n/a'",
      "        : signAmountText(`${Math.abs(left)}%`, left < 0 ? MINUS_SIGN : ''),",
    ];
    const uncoveredSign = "    net: `${net < 0 ? MINUS_SIGN : ''}${Math.abs(net)}`,";
    const signlessLeftOfIncome =
      "    leftOfIncome: left === undefined ? 'n/a' : `${Math.abs(left)}%`,";

    it('fails a second sign below the property, at that line, and passes the one inside it', () => {
      const result = runGuardInFakeRoot(
        fakeComposerSource,
        heroSource([...coveredSign, uncoveredSign]),
      );
      expect(result.stderr).toContain(ownedSignReport(transactionsHelpersRel, 7));
      expect(result.stderr).not.toContain(`${transactionsHelpersRel}:6:`);
      expect(result.status).toBe(1);
    });

    it('fails a sign above the property, at that line, and passes the one inside it', () => {
      const result = runGuardInFakeRoot(
        fakeComposerSource,
        heroSource([uncoveredSign, ...coveredSign]),
      );
      expect(result.stderr).toContain(ownedSignReport(transactionsHelpersRel, 3));
      expect(result.stderr).not.toContain(`${transactionsHelpersRel}:7:`);
      expect(result.status).toBe(1);
    });

    it('fails a file whose only sign is outside the property, at that line and as stale', () => {
      const result = runGuardInFakeRoot(
        fakeComposerSource,
        heroSource([signlessLeftOfIncome, uncoveredSign]),
      );
      expect(result.stderr).toContain(ownedSignReport(transactionsHelpersRel, 4));
      expect(result.stderr.split('\n').filter(isOwnedSignReport)).toHaveLength(1);
      const stale = staleLeftOfIncomeLine(result.stderr);
      expect(stale).toBeDefined();
      expect(stale).not.toContain('constructs an');
      expect(result.status).toBe(1);
    });

    it('fails a file with no sign as stale, and reports no hand-built sign', () => {
      const result = runGuardInFakeRoot(fakeComposerSource, heroSource([signlessLeftOfIncome]));
      const stale = staleLeftOfIncomeLine(result.stderr);
      expect(stale).toBeDefined();
      expect(stale).not.toContain('constructs an');
      expect(result.stderr.split('\n').filter(isOwnedSignReport)).toEqual([]);
      expect(result.status).toBe(1);
    });
  });
});

describe('validate-money-formatting.js — a plain formatter on a balance column (MA-156)', () => {
  const plainBalance: Array<Fixture & { shape: string; line: number }> = [
    {
      shape: 'formatCurrencyAmount on current_balance',
      name: 'plain_balance_amount.ts',
      content:
        'export const line = (account: Account): string =>\n  formatCurrencyAmount(account.current_balance, account.currency);\n',
      line: 2,
    },
    {
      shape: 'formatCurrencyParts on opening_balance wrapped across lines, at the line of the call',
      name: 'plain_balance_wrapped.ts',
      content:
        'export const parts = (account: Account) =>\n  formatCurrencyParts(\n    account.opening_balance,\n    account.currency,\n  );\n',
      line: 2,
    },
    {
      shape: 'formatAmount on opening_balance',
      name: 'plain_balance_bare.ts',
      content:
        'export const text = (account: Account, decimals: number): string =>\n  formatAmount(account.opening_balance, decimals);\n',
      line: 2,
    },
    {
      shape: 'a balance read through optional chaining',
      name: 'plain_balance_optional.ts',
      content:
        'export const line = (account?: Account): string =>\n  formatCurrencyAmount(account?.current_balance, Currency.EGP);\n',
      line: 2,
    },
    {
      shape: 'formatDisplayAmount on current_balance',
      name: 'plain_balance_display_amount.ts',
      content:
        'export const line = (account: Account): string =>\n  formatDisplayAmount(account.current_balance, account.currency);\n',
      line: 2,
    },
    {
      shape: 'formatDisplayAmountParts on opening_balance',
      name: 'plain_balance_display_parts.ts',
      content:
        'export const parts = (account: Account) =>\n  formatDisplayAmountParts(account.opening_balance, account.currency);\n',
      line: 2,
    },
    {
      shape: 'formatDisplayMagnitude on opening_balance',
      name: 'plain_balance_display_magnitude.ts',
      content:
        'export const magnitude = (account: Account) =>\n  formatDisplayMagnitude(account.opening_balance, account.currency);\n',
      line: 2,
    },
  ];

  it.each(plainBalance)('fails $shape', ({ name, content, line }) => {
    const { result } = runGuardOverFixtures([{ name, content }]);
    const expected = plainBalanceReport(`${fixtureRel}/${name}`, line);
    expect(result.stderr).toContain(expected);
    const report = result.stderr.split('\n').find((entry) => entry.startsWith(expected));
    expect(report).toContain('`formatAccountBalanceParts`');
    expect(report).toContain('`formatAccountBalance`');
    expect(report).toContain('docs/adr/2026-10-06-account-balances-owned-composer.md');
    expect(report).not.toContain('constructs an');
    expect(report).not.toContain(OWNED_SIGN_REPORT);
    expect(result.status).toBe(1);
  });

  const control: Fixture = { name: 'plain_balance_control.ts', content: plainBalance[0].content };

  const quiet: Array<Fixture & { shape: string }> = [
    {
      shape: 'the account balance composer on the same column',
      name: 'quiet_balance_composer.ts',
      content:
        'export const line = (account: Account): string =>\n  formatAccountBalance(account.current_balance, account.currency);\n',
    },
    {
      shape: 'a plain formatter on an amount that is no balance column',
      name: 'quiet_plain_total.ts',
      content:
        'export const line = (total: number, currency: Currency): string =>\n  formatCurrencyAmount(total, currency);\n',
    },
  ];

  it.each(quiet)('stays quiet on $shape', ({ name, content }) => {
    expectQuietBeside(
      { name, content },
      control,
      plainBalanceReport(`${fixtureRel}/${control.name}`, 2),
    );
  });
});

describe('validate-money-formatting.js — an amount joined to its code by hand (MA-164)', () => {
  const handJoined: Array<Fixture & { shape: string; line: number }> = [
    {
      shape: 'a magnitude beside CURRENCY_CONFIG[currency].code',
      name: 'hand_join_config_code.ts',
      content:
        'export const line = (value: number, currency: Currency): string =>\n  `${formatDisplayMagnitude(value, currency).text} ${CURRENCY_CONFIG[currency].code}`;\n',
      line: 2,
    },
    {
      shape: 'the two parts of formatOwnedAmountParts joined by the caller',
      name: 'hand_join_owned_parts.ts',
      content:
        'export const line = (value: number, currency: Currency): string => {\n  const parts = formatOwnedAmountParts(value, currency);\n  return `${parts.value} ${parts.code}`;\n};\n',
      line: 3,
    },
    {
      shape:
        'formatAmount beside Strings.currencyEgp with the second slot wrapped over three lines, at the line the first slot closes',
      name: 'hand_join_wrapped.ts',
      content:
        'export const label = (limit: number): string =>\n  `${formatAmount(limit)} ${\n    Strings.currencyEgp\n  }`;\n',
      line: 2,
    },
    {
      shape: 'a string template that takes amount and currency apart and joins them',
      name: 'hand_join_template.ts',
      content:
        'export const opening = (amount: string, currency: string): string =>\n  `Opening ${amount} ${currency}`;\n',
      line: 2,
    },
  ];

  it.each(handJoined)('fails $shape', ({ name, content, line }) => {
    const { result } = runGuardOverFixtures([{ name, content }]);
    const expected = handJoinReport(`${fixtureRel}/${name}`, line);
    expect(result.stderr).toContain(expected);
    const report = result.stderr.split('\n').find((entry) => entry.startsWith(expected));
    for (const formatter of JOINED_FORMATTERS) {
      expect(report).toContain(`\`${formatter}\``);
    }
    expect(report).toContain('HAND_JOIN_ALLOWLIST');
    expect(report).toContain(HAND_JOIN_ADR);
    expect(result.stderr.split('\n').filter(isHandJoinReport)).toHaveLength(1);
    expect(result.stderr).not.toContain(OWNED_SIGN_REPORT);
    expect(result.stderr).not.toContain(PLAIN_BALANCE_REPORT);
    expect(result.status).toBe(1);
  });

  const control: Fixture = { name: 'hand_join_control.ts', content: handJoined[0].content };

  const quiet: Array<Fixture & { shape: string }> = [
    {
      shape: 'a formatDisplayAmount call',
      name: 'quiet_display_amount.ts',
      content:
        'export const line = (value: number, currency: Currency): string =>\n  formatDisplayAmount(value, currency);\n',
    },
    {
      shape: 'a dash beside a code',
      name: 'quiet_dash_code.ts',
      content: 'export const unavailable = (code: string): string => `— ${code}`;\n',
    },
    {
      shape: 'two slots that name no code',
      name: 'quiet_count_label.ts',
      content:
        'export const tally = (count: number, label: string): string => `${count} ${label}`;\n',
    },
    {
      shape: 'the join inside a comment',
      name: 'quiet_join_comment.ts',
      content: '// `${amount} ${currency}`\nexport const nothingHere = 1;\n',
    },
  ];

  it.each(quiet)('stays quiet on $shape', ({ name, content }) => {
    expectQuietBeside(
      { name, content },
      control,
      handJoinReport(`${fixtureRel}/${control.name}`, 2),
    );
  });

  // In the form of the stale ALLOWLIST case above: the stub lists one clean file and no other.
  it('flags the strings entry as not tracked when the listing omits the file, and reports no hand join', () => {
    const cleanRel = `${fixtureRel}/clean.ts`;
    fs.writeFileSync(path.join(fixtureRoot, 'clean.ts'), 'export const nothingHere = 1;\n');
    const stubDir = makeStubGit(`#!/bin/sh\necho '${cleanRel}'\nexit 0\n`);
    const result = runGuard(envWithStub(stubDir));
    const expected = staleStringsEntry('is not a tracked src/ .ts/.tsx file');
    expect(result.stderr).toContain(expected);
    const stale = result.stderr.split('\n').find((entry) => entry.startsWith(expected));
    expect(stale).toContain('HAND_JOIN_ALLOWLIST');
    expect(result.stderr).not.toContain(HAND_JOIN_REPORT);
    expect(result.status).toBe(1);
  });

  describe('the n4CaptionConverted entry, through a copied script', () => {
    const countJoin = [
      '  n4CaptionConverted: (n: number, code: string) =>',
      "    `Includes ${n} ${code} account${n === 1 ? '' : 's'}, converted using your saved rate.`,",
    ];
    const amountJoin =
      '  seededBalance: (amount: string, code: string) => `Balance ${amount} ${code}`,';
    const joinlessCaption =
      '  n4CaptionConverted: (n: number) => `Includes ${n} converted accounts.`,';

    it('fails an amount joined under the next key, at that line alone, and passes the count join', () => {
      const result = runGuardInFakeRoot(
        fakeComposerSource,
        undefined,
        stringsSource([...countJoin, amountJoin]),
      );
      expect(result.stderr).toContain(handJoinReport(stringsRel, 4));
      expect(result.stderr).not.toContain(`${stringsRel}:3:`);
      expect(result.stderr.split('\n').filter(isHandJoinReport)).toHaveLength(1);
      expect(result.stderr).not.toContain(staleStringsEntry('joins none there'));
      expect(result.status).toBe(1);
    });

    it('fails a file with no join under the key as stale, naming the key, and reports no hand join', () => {
      const result = runGuardInFakeRoot(
        fakeComposerSource,
        undefined,
        stringsSource([joinlessCaption]),
      );
      const expected = staleStringsEntry('joins none there');
      expect(result.stderr).toContain(expected);
      const stale = result.stderr.split('\n').find((entry) => entry.startsWith(expected));
      expect(stale).toContain('HAND_JOIN_ALLOWLIST');
      expect(result.stderr.split('\n').filter(isHandJoinReport)).toEqual([]);
      expect(result.status).toBe(1);
    });
  });
});
