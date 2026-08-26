/**
 * CLI-driven contract tests for scripts/oxlint-plugin-moneyapp.js (W1D c2, #230).
 *
 * RuleTester cannot run under this repo's jest: oxlint is ESM and depends on
 * `import.meta.url` plus native (Rust) bindings jest's CJS transform cannot host — H1 at
 * P5. This suite instead drives the real `oxlint` binary as a subprocess, over its
 * stdout/exit-code contract — `node_modules/.bin/oxlint` directly, the same binary
 * `npm run lint` invokes (measured: going through `npx oxlint` instead costs +322ms/spawn
 * for a resolve this repo's own lint script never pays).
 *
 * Fixtures are written at test time, never tracked: a tracked fixture would enter
 * `npm run typecheck` (tsconfig's `**\/*.ts` has no exclude), `oxfmt --check`, and the
 * repo's own lint count. The first attempt at this suite put fixtures in a gitignored
 * `<repoRoot>/.w1d-rule-fixtures/`, mirroring `.ma017-guard-fixtures/`'s pattern
 * (`.gitignore:73`) — measured to fail: oxlint 1.77.0's file walker respects `.gitignore`
 * unconditionally (confirmed by toggling the entry alone; `--help` documents `--no-ignore`
 * as covering only `.eslintignore` / `--ignore-path` / `--ignore-pattern`, never VCS ignore
 * files, and there is no flag that does — so `--no-ignore` is dropped below too, it never
 * did anything for a tmpdir target). Fixtures instead live under a fresh `os.tmpdir()`
 * directory per test, precisely BECAUSE that walker respects `.gitignore` unconditionally:
 * a directory outside the repo has no `.gitignore` ancestry to be subject to it at all —
 * created `beforeEach`, removed `afterEach`, exactly how this suite's sibling
 * (validate_money_formatting.test.ts) already places its ephemeral `git`-stub directories.
 *
 * One spawn over the whole fixture directory, `-c <fixture config> -f json <fixtureRoot>`,
 * asserts the EXACT set of `(filename, labels[0].span.line, code)` — the
 * `-f json` diagnostic shape measured directly: `code` is `moneyapp(font-size-pairs-
 * line-height)` (oxlint's `plugin(rule)` form, not the config's `plugin/rule` slash form),
 * and the reported line is `labels[0].span.line`. `number_of_files` is asserted equal to
 * the fixture count in the same spawn, so a lint-nothing run (the exact failure mode this
 * design replaced) reds on both counts, and the valid fixtures' silence is proven by the
 * same run rather than a separate, vacuous one. The fixture config sets `categories:
 * { correctness: "off" }` so only this one plugin rule is active — oxlint's default
 * category set (e.g. `no-unused-vars`) would otherwise fire on unused fixture bindings and
 * break the exact-set assertion; measured: with categories left at their default, a plain
 * two-line fixture file produced two additional `eslint(no-unused-vars)` diagnostics.
 *
 * Config-drift pin (L8b): `--print-config` resolves ZERO external-plugin rules regardless
 * of how many are configured (measured: `npx oxlint --print-config -c .oxlintrc.json`
 * against this repo returns 168 rules and none of the 3 configured `expo/*` ones) — so it
 * cannot pin that this rule is actually wired into the repo's own `.oxlintrc.json`. A
 * second spawn instead lints one invalid fixture with the repo's real config (`-c`
 * pointing at `.oxlintrc.json` explicitly, never relying on cwd-based discovery) and
 * asserts the diagnostic's `severity` field reads `"warning"` — proving plugin load, rule
 * id, and configured severity together, red if anyone deletes the rule from either the
 * plugin or `.oxlintrc.json`.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const oxlintBin = path.join(repoRoot, 'node_modules', '.bin', 'oxlint');
const pluginPath = path.join(repoRoot, 'scripts', 'oxlint-plugin-moneyapp.js');
const repoConfigPath = path.join(repoRoot, '.oxlintrc.json');
const RULE_CODE = 'moneyapp(font-size-pairs-line-height)';

interface Fixture {
  name: string;
  content: string;
  /** 1-indexed line of the sole expected diagnostic; absent means the fixture must stay silent. */
  line?: number;
}

// Invalid (7): inline unpaired · array-with-identifier (Decision 1: array members never
// satisfy pairing) · module-level constant unpaired · numeric lineHeight · ms() lineHeight
// · fontSize line carrying a trailing comment (L6, proves AST detection over raw text) · a
// multi-line reflowed object (L6). Valid (6): the lineHeightFor pairing · the
// FIELD_MESSAGE_TEXT_LINE_HEIGHT carve-out (a) · carve-out (b), one fixture per kept
// NAV_OPTION_STYLE_KEYS entry (headerTitleStyle, headerLargeTitleStyle, tabBarLabelStyle —
// P8 trimmed the set to these three TextStyle-capable keys) · an object with no fontSize
// at all.
const FIXTURES: Fixture[] = [
  {
    name: 'inline_unpaired.ts',
    content: "export const style = { color: 'red', fontSize: 14 };\n",
    line: 1,
  },
  {
    name: 'array_with_identifier.ts',
    content:
      "export const valueStyle = { color: 'blue' };\nexport const style = [{ fontSize: 14 }, valueStyle];\n",
    line: 2,
  },
  {
    name: 'module_level_const_unpaired.ts',
    content:
      "const styles = {\n  label: { fontFamily: 'Inter', fontSize: 12, color: 'gray' },\n};\nexport default styles;\n",
    line: 2,
  },
  {
    name: 'numeric_line_height.ts',
    content: 'export const style = { fontSize: 14, lineHeight: 18 };\n',
    line: 1,
  },
  {
    name: 'ms_line_height.ts',
    content: 'export const style = { fontSize: 14, lineHeight: ms(18) };\n',
    line: 1,
  },
  {
    name: 'trailing_comment.ts',
    content: 'export const style = { fontSize: 14 }; // a note, not a lineHeight\n',
    line: 1,
  },
  {
    name: 'reflowed_object.ts',
    content: "export const style = {\n  color: 'red',\n  fontSize: 14,\n  fontWeight: '600',\n};\n",
    line: 3,
  },
  {
    name: 'line_height_for_pairing.ts',
    content: 'export const style = { fontSize: 14, lineHeight: lineHeightFor(14) };\n',
  },
  {
    name: 'field_message_identifier.ts',
    content: 'export const style = { fontSize: 14, lineHeight: FIELD_MESSAGE_TEXT_LINE_HEIGHT };\n',
  },
  {
    name: 'nav_option_header_title_style.ts',
    content:
      "export const screenOptions = {\n  headerTitleStyle: { fontFamily: 'Sora', fontSize: 17 },\n};\n",
  },
  {
    name: 'nav_option_header_large_title_style.ts',
    content:
      "export const screenOptions = {\n  headerLargeTitleStyle: { fontFamily: 'Sora', fontSize: 24 },\n};\n",
  },
  {
    name: 'nav_option_tab_bar_label_style.ts',
    content:
      "export const screenOptions = {\n  tabBarLabelStyle: { fontFamily: 'Inter', fontSize: 11 },\n};\n",
  },
  {
    name: 'no_font_size.ts',
    content: "export const style = { color: 'red', lineHeight: 20 };\n",
  },
];

interface OxlintDiagnostic {
  code: string;
  severity: string;
  filename: string;
  labels: Array<{ span: { line: number } }>;
}

interface OxlintJsonOutput {
  diagnostics: OxlintDiagnostic[];
  number_of_files: number;
}

function runOxlint(args: string[]): OxlintJsonOutput {
  const result = spawnSync(oxlintBin, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 30000,
  });
  // `result.error` only covers the child process failing to spawn at all (bad binary path,
  // permissions) — not the failure this guards, which is a real spawn that runs and exits
  // non-JSON. Measured: a plugin syntax error makes oxlint print "Failed to load JS
  // plugin: ..." plus the underlying SyntaxError and stack to STDOUT as plain text (not
  // stderr, and not `-f json`'s shape) and exit 1; `result.stdout` is non-empty, so a bare
  // `!result.stdout` check would not catch it either. `JSON.parse` throwing is the only
  // reliable signal — wrap it and surface both streams, so a failure here reads as
  // oxlint's real message instead of jest's opaque `Unexpected token ... is not valid
  // JSON`. Mirrors scripts/validate-money-formatting.js:45-52's own
  // error-before-`stdout`-use guard, adapted to a failure mode measured on THIS binary.
  if (result.error) {
    throw new Error(`oxlint failed to spawn: ${result.error.message}`);
  }
  try {
    return JSON.parse(result.stdout) as OxlintJsonOutput;
  } catch (cause) {
    throw new Error(
      `oxlint did not return valid JSON (exit ${String(result.status)}).\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      { cause },
    );
  }
}

let fixtureRoot: string;

beforeEach(() => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'w1d-rule-fixtures-'));
  const fixtureConfig = {
    categories: { correctness: 'off' },
    jsPlugins: [{ name: 'moneyapp', specifier: pluginPath }],
    rules: { 'moneyapp/font-size-pairs-line-height': 'warn' },
  };
  fs.writeFileSync(
    path.join(fixtureRoot, 'oxlintrc.fixture.json'),
    JSON.stringify(fixtureConfig, null, 2),
  );
  for (const fixture of FIXTURES) {
    fs.writeFileSync(path.join(fixtureRoot, fixture.name), fixture.content);
  }
});

afterEach(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

describe('oxlint-plugin-moneyapp.js — font-size-pairs-line-height (W1D c2, #230)', () => {
  it('reports exactly the invalid fixtures at their fontSize line, and stays silent on the valid ones', () => {
    const output = runOxlint([
      '-c',
      path.join(fixtureRoot, 'oxlintrc.fixture.json'),
      '-f',
      'json',
      fixtureRoot,
    ]);

    expect(output.number_of_files).toBe(FIXTURES.length);

    const actual = new Set(
      output.diagnostics.map((d) => `${d.filename}:${d.labels[0]?.span.line}:${d.code}`),
    );
    const expected = new Set(
      FIXTURES.filter((f): f is Fixture & { line: number } => f.line !== undefined).map(
        (f) => `${path.join(fixtureRoot, f.name)}:${f.line}:${RULE_CODE}`,
      ),
    );
    expect(actual).toEqual(expected);
  });

  it('is wired into the repo config at severity warning', () => {
    const output = runOxlint([
      '-c',
      repoConfigPath,
      '-f',
      'json',
      path.join(fixtureRoot, 'inline_unpaired.ts'),
    ]);
    const diagnostic = output.diagnostics.find((d) => d.code === RULE_CODE);
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.severity).toBe('warning');
  });
});
