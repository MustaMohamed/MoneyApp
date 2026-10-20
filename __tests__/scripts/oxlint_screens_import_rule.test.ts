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
const RULE_CODE = 'moneyapp(screens-import-boundary)';

interface Fixture {
  /** Path under the fixture root; the rule reads the segments after the last `src/`. */
  name: string;
  content: string;
  /** 1-indexed line of the sole expected diagnostic; absent means the fixture must stay silent. */
  line?: number;
}

const OTHER = "'@/modules/transactions/screens/transactions/transactions.store'";

const FIXTURES: Fixture[] = [
  {
    name: 'src/modules/accounts/screens/a/value_import.ts',
    content: `import { useTransactionsStore } from ${OTHER};\nexport const a = useTransactionsStore;\n`,
    line: 1,
  },
  {
    name: 'src/modules/accounts/screens/a/type_import.ts',
    content: `import type { TransactionsStore } from ${OTHER};\nexport type A = TransactionsStore;\n`,
    line: 1,
  },
  {
    name: 'src/modules/accounts/screens/a/export_named_from.ts',
    content: `export { useTransactionsStore } from ${OTHER};\n`,
    line: 1,
  },
  {
    name: 'src/modules/accounts/screens/a/export_all_from.ts',
    content: `export * from ${OTHER};\n`,
    line: 1,
  },
  {
    name: 'src/modules/accounts/screens/a/import_expression.ts',
    content: `export const load = () => import(${OTHER});\n`,
    line: 1,
  },
  {
    name: 'src/modules/accounts/screens/a/ts_import_type.ts',
    content: `export type S = typeof import(${OTHER});\n`,
    line: 1,
  },
  {
    name: 'src/modules/accounts/screens/a/relative_other_module.ts',
    content:
      "import { useTransactionsStore } from '../../../transactions/screens/transactions/transactions.store';\nexport const a = useTransactionsStore;\n",
    line: 1,
  },
  {
    name: 'src/modules/accounts/screens/a/folder_import.ts',
    content:
      "import { useTransactionsStore } from '@/modules/transactions/screens';\nexport const a = useTransactionsStore;\n",
    line: 1,
  },
  {
    name: 'src/store/dashboard.store.ts',
    content:
      "export { useDashboardStore } from '@/modules/dashboard/screens/dashboard/dashboard.store';\n",
    line: 1,
  },
  {
    name: 'src/components/ui/shared_component.tsx',
    content: `import { useTransactionsStore } from ${OTHER};\nexport const a = useTransactionsStore;\n`,
    line: 1,
  },
  {
    name: 'src/components/sheets/compat_wrapper.tsx',
    content: `import { useTransactionsStore } from ${OTHER};\nexport const a = useTransactionsStore;\n`,
    line: 1,
  },
  {
    name: 'src/modules/accounts/components/own_screens.tsx',
    content:
      "import { useAccountDetail } from '@/modules/accounts/screens/accounts/detail/account_detail.hook';\nexport const a = useAccountDetail;\n",
    line: 1,
  },
  {
    name: 'src/modules/accounts/utils/relative_own_screens.ts',
    content:
      "import { useAccountDetail } from '../screens/accounts/detail/account_detail.hook';\nexport const a = useAccountDetail;\n",
    line: 1,
  },
  {
    name: 'src/modules/transactions/domain/own_screens.ts',
    content: `import { useTransactionsStore } from ${OTHER};\nexport const a = useTransactionsStore;\n`,
    line: 1,
  },
  {
    name: 'src/modules/budget/screens/budget/same_module.ts',
    content:
      "import { useBudgetSheet } from '@/modules/budget/screens/budget/budget_sheet.hook';\nexport const a = useBudgetSheet;\n",
  },
  {
    name: 'src/modules/transactions/store/same_module.ts',
    content: `import { useTransactionsStore } from ${OTHER};\nexport const a = useTransactionsStore;\n`,
  },
  {
    name: 'src/modules/dashboard/index.ts',
    content: "export { default as DashboardScreen } from './screens/dashboard';\n",
  },
  {
    name: 'src/modules/accounts/screens/a/other_module_store.ts',
    content:
      "import { useTransactionsStore } from '@/modules/transactions/store/transactions.store';\nexport const a = useTransactionsStore;\n",
  },
  {
    name: 'src/app/(app)/_layout.tsx',
    content: `export { useTransactionsStore } from ${OTHER};\n`,
  },
  {
    name: 'src/test_helpers/budget.ts',
    content: `export { useTransactionsStore } from ${OTHER};\n`,
  },
  {
    name: '__tests__/a.test.ts',
    content: `export { useTransactionsStore } from ${OTHER};\n`,
  },
  {
    name: 'src/x/__tests__/a.test.ts',
    content: `export { useTransactionsStore } from ${OTHER};\n`,
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
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'screens-import-rule-fixtures-'));
  const fixtureConfig = {
    categories: { correctness: 'off' },
    jsPlugins: [{ name: 'moneyapp', specifier: pluginPath }],
    rules: { 'moneyapp/screens-import-boundary': 'warn' },
  };
  fs.writeFileSync(
    path.join(fixtureRoot, 'oxlintrc.fixture.json'),
    JSON.stringify(fixtureConfig, null, 2),
  );
  for (const fixture of FIXTURES) {
    const file = path.join(fixtureRoot, fixture.name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, fixture.content);
  }
});

afterEach(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

describe('oxlint-plugin-moneyapp.js: screens-import-boundary', () => {
  it('reports each screens import from another module or a shared folder at its line, and stays silent on same-module, routing, test and test-helper imports', () => {
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
      path.join(fixtureRoot, 'src/modules/accounts/screens/a/value_import.ts'),
    ]);
    const diagnostic = output.diagnostics.find((d) => d.code === RULE_CODE);
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.severity).toBe('error');
  });
});
