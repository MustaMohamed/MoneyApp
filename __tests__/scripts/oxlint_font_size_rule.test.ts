/**
 * CLI-driven contract tests for scripts/oxlint-plugin-moneyapp.js (W1D c2, #230).
 *
 * RuleTester cannot run under this repo's jest: oxlint is ESM and depends on
 * `import.meta.url` plus native (Rust) bindings jest's CJS transform cannot host — H1 at
 * P5. This suite instead drives the real `oxlint` CLI as a subprocess, over its
 * stdout/exit-code contract, the same way `npm run lint` runs it.
 *
 * Fixtures are written at test time, never tracked: a tracked fixture would enter
 * `npm run typecheck` (tsconfig's `**\/*.ts` has no exclude), `oxfmt --check`, and the
 * repo's own lint count. The first attempt at this suite put fixtures in a gitignored
 * `<repoRoot>/.w1d-rule-fixtures/`, mirroring `.ma017-guard-fixtures/`'s pattern
 * (`.gitignore:73`) — measured to fail: oxlint 1.77.0's file walker respects `.gitignore`
 * regardless of `--no-ignore` (confirmed by toggling the entry alone; `--help` documents
 * `--no-ignore` as covering only `.eslintignore` / `--ignore-path` / `--ignore-pattern`,
 * never VCS ignore files, and there is no flag that does). Fixtures instead live under a
 * fresh `os.tmpdir()` directory per test — outside the repo tree entirely, so nothing needs
 * ignoring and no walker exclusion applies — created `beforeEach`, removed `afterEach`,
 * exactly how this suite's sibling (validate_money_formatting.test.ts) already places its
 * ephemeral `git`-stub directories.
 *
 * One spawn over the whole fixture directory, `-c <fixture config> --no-ignore -f json
 * <fixtureRoot>`, asserts the EXACT set of `(filename, labels[0].span.line, code)` — the
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
// multi-line reflowed object (L6). Valid (4): the lineHeightFor pairing · the
// FIELD_MESSAGE_TEXT_LINE_HEIGHT carve-out (a) · a nav-option key object, carve-out (b) ·
// an object with no fontSize at all.
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
    name: 'nav_option_key.ts',
    content:
      "export const screenOptions = {\n  headerTitleStyle: { fontFamily: 'Sora', fontSize: 17 },\n};\n",
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
  const result = spawnSync('npx', ['oxlint', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 30000,
  });
  return JSON.parse(result.stdout) as OxlintJsonOutput;
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
      '--no-ignore',
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
      '--no-ignore',
      '-f',
      'json',
      path.join(fixtureRoot, 'inline_unpaired.ts'),
    ]);
    const diagnostic = output.diagnostics.find((d) => d.code === RULE_CODE);
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.severity).toBe('warning');
  });
});
