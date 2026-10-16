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
const RULE_CODE = 'moneyapp(no-literal-a11y-text)';

interface Fixture {
  name: string;
  content: string;
  /** 1-indexed line of the sole expected diagnostic; absent means the fixture must stay silent. */
  line?: number;
}

// An empty string holds no words, so `label ?? ''` passes.
const FIXTURES: Fixture[] = [
  {
    name: 'quoted_label.tsx',
    content: 'export const A = () => <View accessibilityLabel="Go back" />;\n',
    line: 1,
  },
  {
    name: 'braced_hint.tsx',
    content: "export const A = () => <View accessibilityHint={'Opens the sheet'} />;\n",
    line: 1,
  },
  {
    name: 'prefixed_label.tsx',
    content: "export const A = () => <FilterRail filterAccessibilityLabel={'Status'} />;\n",
    line: 1,
  },
  {
    name: 'plain_backtick.tsx',
    content: 'export const A = () => <View accessibilityLabel={`Go back`} />;\n',
    line: 1,
  },
  {
    name: 'ternary_branch.tsx',
    content:
      "export const A = ({ on }: { on: boolean }) => (\n  <View accessibilityLabel={on ? 'On' : Strings.off} />\n);\n",
    line: 2,
  },
  {
    name: 'logical_branch.tsx',
    content:
      "export const A = ({ name }: { name?: string }) => (\n  <View accessibilityLabel={name || 'Unnamed'} />\n);\n",
    line: 2,
  },
  {
    name: 'value_on_next_line.tsx',
    content:
      "export const A = () => (\n  <View\n    accessibilityLabel={\n      'Go back'\n    }\n  />\n);\n",
    line: 3,
  },
  {
    name: 'object_label.ts',
    content: "export const options = { accessibilityLabel: 'Home' };\n",
    line: 1,
  },
  {
    name: 'object_prefixed_label.ts',
    content: "export const options = {\n  tabBarAccessibilityLabel: 'Home',\n};\n",
    line: 2,
  },
  {
    name: 'concatenated_literals.tsx',
    content: "export const A = () => <View accessibilityLabel={'Go ' + 'back'} />;\n",
    line: 1,
  },
  {
    name: 'literal_plus_name.tsx',
    content:
      "export const A = ({ name }: { name: string }) => (\n  <View accessibilityLabel={'Go ' + name} />\n);\n",
    line: 2,
  },
  {
    name: 'strings_member.tsx',
    content: 'export const A = () => <View accessibilityLabel={Strings.goBackAccessibility} />;\n',
  },
  {
    name: 'composed_template.tsx',
    content:
      'export const A = ({ name }: { name: string }) => (\n  <View accessibilityLabel={`${Strings.a} ${name}`} />\n);\n',
  },
  {
    name: 'item_label.tsx',
    content:
      'export const A = ({ item }: { item: { label: string } }) => (\n  <View accessibilityLabel={item.label} />\n);\n',
  },
  {
    name: 'nullish_empty.tsx',
    content:
      "export const A = ({ label }: { label?: string }) => (\n  <View accessibilityLabel={label ?? ''} />\n);\n",
  },
  {
    name: 'object_strings.ts',
    content: 'export const options = { accessibilityLabel: Strings.home };\n',
  },
  {
    name: 'strings_plus_name.tsx',
    content:
      'export const A = ({ name }: { name: string }) => (\n  <View accessibilityLabel={Strings.a + name} />\n);\n',
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
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-text-rule-fixtures-'));
  const fixtureConfig = {
    categories: { correctness: 'off' },
    jsPlugins: [{ name: 'moneyapp', specifier: pluginPath }],
    rules: { 'moneyapp/no-literal-a11y-text': 'warn' },
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

describe('oxlint-plugin-moneyapp.js: no-literal-a11y-text', () => {
  it('reports each literal label or hint at its line, and stays silent on words read from the strings file', () => {
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

  it('is wired into the repo config at severity error', () => {
    const output = runOxlint([
      '-c',
      repoConfigPath,
      '-f',
      'json',
      path.join(fixtureRoot, 'quoted_label.tsx'),
    ]);
    const diagnostic = output.diagnostics.find((d) => d.code === RULE_CODE);
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.severity).toBe('error');
  });
});
