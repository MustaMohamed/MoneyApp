// Fixtures live under `os.tmpdir()`: oxlint's file walker respects `.gitignore` unconditionally.
// The fixture config turns `correctness` off; default rules fire on unused fixture bindings.
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
  // A plugin load error prints text to stdout and exits 1; only `JSON.parse` throwing sees it.
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

  it('is wired into the repo config at severity error (#324: backlog burned to zero)', () => {
    const output = runOxlint([
      '-c',
      repoConfigPath,
      '-f',
      'json',
      path.join(fixtureRoot, 'inline_unpaired.ts'),
    ]);
    const diagnostic = output.diagnostics.find((d) => d.code === RULE_CODE);
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.severity).toBe('error');
  });
});
