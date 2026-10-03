import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const SCRIPT_REL = 'scripts/validate-structural-guards.js';
const LIB_REL = 'scripts/lib/strip-comments.js';

const BUDGET = 'src/modules/budget/screens/budget';
const TRANSACTIONS = 'src/modules/transactions/screens/transactions';
const COMMITMENTS = 'src/modules/commitments/screens/commitments';

const LAYOUT = 'src/app/_layout.tsx';
const SCREEN = 'src/components/ui/screen.tsx';
const FILTER_RAIL = 'src/components/ui/filter_rail.tsx';
const FILTER_ACCORDION = 'src/components/ui/filter_accordion.tsx';
const SUMMARY_CARD = `${BUDGET}/components/summary_card.tsx`;
const BUDGET_SKELETON = `${BUDGET}/components/budget_screen_skeleton.tsx`;
const CATEGORY_DETAIL_SKELETON = `${BUDGET}/category_detail/components/category_detail_skeleton.tsx`;
const BUDGET_INDEX = `${BUDGET}/index.tsx`;
const TRANSACTIONS_INDEX = `${TRANSACTIONS}/index.tsx`;
const DETAIL_INDEX = `${TRANSACTIONS}/detail/index.tsx`;
const BUDGET_PICKER = `${TRANSACTIONS}/transaction_form/components/budget_picker_sheet.tsx`;
const COMMITMENTS_INDEX = `${COMMITMENTS}/index.tsx`;
const DASHBOARD_INDEX = 'src/modules/dashboard/screens/dashboard/index.tsx';
const GOALS_INDEX = 'src/modules/goals/screens/goals/index.tsx';
const STATE_FILE = 'src/components/ui/month_filter.state.ts';
const UNNAMED_TEMPLATE = 'src/modules/accounts/screens/accounts/list/index.tsx';

const TAB_HEROUI_IMPORT = "import { Separator, Surface, Typography } from 'heroui-native';";
const DASHBOARD_HEROUI_IMPORT =
  "import { Button, Separator, Surface, Tabs, Typography } from 'heroui-native';";
const STYLESHEET_SEED = 'const seeded = StyleSheet.create({});';
const SHADOW_SEED = '<Card className="shadow-none" />';
const ASYNC_SEED = 'const seeded = async () => 1;';
const HOST = '<PortalHost />';
const NO_FILE = 'matches no file';

let fakeRoot = '';
const touched = new Set<string>();

function fakePath(rel: string): string {
  return path.join(fakeRoot, rel);
}

function read(rel: string): string {
  return fs.readFileSync(fakePath(rel), 'utf8');
}

function write(rel: string, content: string): void {
  touched.add(rel);
  fs.writeFileSync(fakePath(rel), content);
}

function remove(rel: string): void {
  if (!fs.existsSync(fakePath(rel))) throw new Error(`fixture removal target absent: ${rel}`);
  touched.add(rel);
  fs.rmSync(fakePath(rel));
}

function restore(rel: string): void {
  fs.rmSync(fakePath(rel), { recursive: true, force: true });
  const real = path.join(repoRoot, rel);
  if (fs.existsSync(real)) fs.copyFileSync(real, fakePath(rel));
}

function appendLine(rel: string, text: string): number {
  const source = read(rel);
  const base = source.endsWith('\n') ? source : `${source}\n`;
  write(rel, `${base}${text}\n`);
  return base.split('\n').length;
}

// Throws on an absent target: a silent no-op replace turns a seeded case back into the clean tree.
function replaceEvery(rel: string, search: string, replacement: string): void {
  const source = read(rel);
  if (!source.includes(search)) throw new Error(`fixture mutation target absent: ${search}`);
  write(rel, source.split(search).join(replacement));
}

function replaceOnce(rel: string, search: string, replacement: string): void {
  const source = read(rel);
  if (source.indexOf(search) !== source.lastIndexOf(search)) {
    throw new Error(`fixture mutation target not unique: ${search}`);
  }
  replaceEvery(rel, search, replacement);
}

function lineOf(rel: string, needle: string, which: 'first' | 'last' = 'first'): number {
  const source = read(rel);
  const at = which === 'first' ? source.indexOf(needle) : source.lastIndexOf(needle);
  if (at === -1) throw new Error(`fixture line target absent: ${needle}`);
  return source.slice(0, at).split('\n').length;
}

function walk(rel: string): string[] {
  return fs.readdirSync(fakePath(rel), { withFileTypes: true }).flatMap((entry) => {
    const child = `${rel}/${entry.name}`;
    return entry.isDirectory() ? walk(child) : [child];
  });
}

function removeEvery(matches: (rel: string) => boolean): void {
  const targets = walk('src').filter(matches);
  if (targets.length === 0) throw new Error('fixture removal matched no file');
  for (const rel of targets) remove(rel);
}

// The script is copied after the seeds, so a seed that cannot apply fails before the run.
function runGuard(): SpawnSyncReturns<string> {
  fs.mkdirSync(fakePath('scripts/lib'), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, LIB_REL), fakePath(LIB_REL));
  fs.copyFileSync(path.join(repoRoot, SCRIPT_REL), fakePath(SCRIPT_REL));
  return spawnSync(process.execPath, [fakePath(SCRIPT_REL)], { encoding: 'utf8' });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineAt(rel: string, line: number, holds: string): RegExp {
  return new RegExp(`^${escapeRegExp(`${rel}:${line}: `)}.*${escapeRegExp(holds)}`);
}

function lineFor(rel: string, holds: string): RegExp {
  return new RegExp(`^${escapeRegExp(`${rel}: `)}.*${escapeRegExp(holds)}`);
}

function stderrLines(result: SpawnSyncReturns<string>): string[] {
  return result.stderr.split('\n').filter((line) => line !== '');
}

function expectReported(result: SpawnSyncReturns<string>, expected: RegExp[]): void {
  const lines = stderrLines(result);
  for (const pattern of expected) {
    expect(lines).toContainEqual(expect.stringMatching(pattern));
  }
  expect(result.status).toBe(1);
}

function expectClean(result: SpawnSyncReturns<string>): void {
  expect(result.stderr).toBe('');
  expect(result.stdout.split('\n').filter((line) => line !== '')).toEqual([
    expect.stringMatching(/^Structural guards validated/),
  ]);
  expect(result.status).toBe(0);
}

interface BannedSeed {
  row: string;
  rel: string;
  text: string;
  token: string;
}

interface RequiredSeed {
  row: string;
  rel: string;
  search: string;
  replacement: string;
  missing: string;
}

const NAMED_BANNED: BannedSeed[] = [
  { row: 'N1 StyleSheet', rel: SUMMARY_CARD, text: STYLESHEET_SEED, token: 'StyleSheet' },
  { row: 'N2 shadow-none', rel: CATEGORY_DETAIL_SKELETON, text: SHADOW_SEED, token: 'shadow-none' },
  {
    row: 'N3 React hook',
    rel: 'src/components/ui/search_filter_row.tsx',
    text: 'const seeded = useMemo(() => 1, []);',
    token: 'useMemo',
  },
  {
    row: 'N3 filter module specifier',
    rel: `${TRANSACTIONS}/filter/components/account_accordion.tsx`,
    text: "import { seeded } from '../filter.helpers';",
    token: 'filter.helpers',
  },
  {
    row: 'N3 Colors.dark',
    rel: `${COMMITMENTS}/filter/components/recurrence_accordion.tsx`,
    text: 'const seeded = Colors.dark.bg;',
    token: 'Colors.dark',
  },
  {
    row: 'N3 inline copy',
    rel: `${COMMITMENTS}/components/search_row.tsx`,
    text: "const seeded = 'Clear search';",
    token: "'Clear search'",
  },
  {
    row: 'N3 hook called as a React member',
    rel: FILTER_ACCORDION,
    text: 'const [seeded] = React.useState(0);',
    token: 'useState',
  },
  {
    row: 'N4 store import',
    rel: TRANSACTIONS_INDEX,
    text: 'const seeded = useTransactionStore();',
    token: 'useTransactionStore',
  },
  { row: 'N5 router call', rel: DETAIL_INDEX, text: 'router.back();', token: 'router.' },
  { row: 'N6 inline EGP', rel: BUDGET_PICKER, text: '<Text>{amount} EGP</Text>', token: '} EGP' },
  { row: 'N7 SafeAreaView', rel: SCREEN, text: '<SafeAreaView />', token: 'SafeAreaView' },
  {
    row: 'N9 CommitmentHeader',
    rel: COMMITMENTS_INDEX,
    text: '<CommitmentHeader />',
    token: 'CommitmentHeader',
  },
];

function withoutMember(row: string, rel: string, enumName: string, member: string): RequiredSeed {
  return {
    row: `${row} ${enumName}.${member}`,
    rel,
    search: `${enumName}.${member}`,
    replacement: `Seeded.${member}`,
    missing: member,
  };
}

function withoutTag(row: string, rel: string, tag: string): RequiredSeed {
  return { row: `${row} <${tag}`, rel, search: `<${tag}`, replacement: '<Seeded', missing: tag };
}

function withoutImport(row: string, rel: string, from: string, name: string): RequiredSeed {
  const kept = from.replace(`${name}, `, '').replace(`, ${name} }`, ' }');
  if (kept === from) throw new Error(`fixture import target absent: ${name}`);
  return { row: `${row} import of ${name}`, rel, search: from, replacement: kept, missing: name };
}

const NAMED_REQUIRED: RequiredSeed[] = [
  withoutTag('N4', TRANSACTIONS_INDEX, 'FilterRail'),
  ...['Income', 'Expense', 'Transfer', 'CCPayment'].map((member) =>
    withoutMember('N4', TRANSACTIONS_INDEX, 'TransactionType', member),
  ),
  {
    row: 'N6 Strings.currencyEgp',
    rel: BUDGET_PICKER,
    search: 'Strings.currencyEgp',
    replacement: 'Strings.seeded',
    missing: 'Strings.currencyEgp',
  },
  withoutTag('N8', FILTER_RAIL, 'MonthFilter'),
  withoutTag('N8', FILTER_RAIL, 'SegmentFilter'),
  withoutTag('N9', COMMITMENTS_INDEX, 'FilterRail'),
  ...['Overdue', 'Due', 'Upcoming', 'Paid', 'Skipped'].map((member) =>
    withoutMember('N9', COMMITMENTS_INDEX, 'CommitmentPaymentStatus', member),
  ),
  ...['Surface', 'Separator', 'Typography'].map((name) =>
    withoutImport('N10', GOALS_INDEX, TAB_HEROUI_IMPORT, name),
  ),
  withoutTag('N10', GOALS_INDEX, 'Surface'),
  withoutTag('N10', GOALS_INDEX, 'Separator'),
  withoutImport('N11', DASHBOARD_INDEX, DASHBOARD_HEROUI_IMPORT, 'Button'),
  withoutTag('N11', DASHBOARD_INDEX, 'Button'),
  withoutTag('N12', BUDGET_INDEX, 'BudgetToolRail'),
];

const TREE_BANNED: BannedSeed[] = [
  { row: 'T1 async in a .state.ts', rel: STATE_FILE, text: ASYNC_SEED, token: 'async' },
  {
    row: 'T2 useSharedValue in a screen template',
    rel: UNNAMED_TEMPLATE,
    text: 'const seeded = useSharedValue(0);',
    token: 'useSharedValue',
  },
];

const DELETED_PATHS = [
  { rel: `${BUDGET}/spending_plan_sheet/spending_plan_sheet.styles.ts`, folder: false },
  { rel: 'src/components/ui/tab_header.tsx', folder: false },
  { rel: `${TRANSACTIONS}/transaction_form_v2`, folder: true },
];

beforeAll(() => {
  fakeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ma135-structural-guards-'));
  fs.cpSync(path.join(repoRoot, 'src'), fakePath('src'), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'global.css'), fakePath('global.css'));
}, 30000);

afterEach(() => {
  for (const rel of touched) restore(rel);
  touched.clear();
});

afterAll(() => {
  fs.rmSync(fakeRoot, { recursive: true, force: true });
});

describe('validate-structural-guards.js, named-file rows (step 1)', () => {
  it('exits 0 with one stdout line on the unseeded tree', () => {
    expectClean(runGuard());
  });

  it.each(NAMED_BANNED)('$row: reports the banned token at its line', ({ rel, text, token }) => {
    const line = appendLine(rel, text);

    expectReported(runGuard(), [lineAt(rel, line, token)]);
  });

  it.each(NAMED_REQUIRED)(
    '$row: reports the required token as missing',
    ({ rel, search, replacement, missing }) => {
      replaceEvery(rel, search, replacement);

      expectReported(runGuard(), [lineFor(rel, missing)]);
    },
  );

  it('lists three violations across two files in one run', () => {
    const sheetLine = appendLine(BUDGET_SKELETON, STYLESHEET_SEED);
    const shadowLine = appendLine(BUDGET_SKELETON, SHADOW_SEED);
    const safeAreaLine = appendLine(SCREEN, '<SafeAreaView />');

    expectReported(runGuard(), [
      lineAt(BUDGET_SKELETON, sheetLine, 'StyleSheet'),
      lineAt(BUDGET_SKELETON, shadowLine, 'shadow-none'),
      lineAt(SCREEN, safeAreaLine, 'SafeAreaView'),
    ]);
  });

  it.each([SCREEN, LAYOUT])(
    'reports %s as not in the tree when it is gone, and still lists another file',
    (rel) => {
      remove(rel);
      const sheetLine = appendLine(SUMMARY_CARD, STYLESHEET_SEED);

      expectReported(runGuard(), [
        lineFor(rel, 'not in the tree'),
        lineAt(SUMMARY_CARD, sheetLine, 'StyleSheet'),
      ]);
    },
  );

  it.each([
    { kind: 'a line comment', text: '// StyleSheet and shadow-none stay out of this file' },
    { kind: 'a JSX comment', text: '{/* StyleSheet and shadow-none stay out of this file */}' },
  ])('exits 0 on a banned token inside $kind', ({ text }) => {
    appendLine(BUDGET_SKELETON, text);

    expectClean(runGuard());
  });

  it('exits 0 on a heroui-native import wrapped over three lines', () => {
    replaceOnce(
      DASHBOARD_INDEX,
      DASHBOARD_HEROUI_IMPORT,
      "import {\n  Button, Separator, Surface, Tabs, Typography,\n} from 'heroui-native';",
    );

    expectClean(runGuard());
  });
});

describe('validate-structural-guards.js, tree rows and deleted paths (step 2)', () => {
  it.each(TREE_BANNED)('$row: reports the banned token at its line', ({ rel, text, token }) => {
    const line = appendLine(rel, text);

    expectReported(runGuard(), [lineAt(rel, line, token)]);
  });

  it('T3: reports TransactionFormV2 in a new file under src/', () => {
    const rel = 'src/modules/transactions/seeded_surface.ts';
    write(rel, 'export const TransactionFormV2 = 1;\n');

    expectReported(runGuard(), [lineAt(rel, 1, 'TransactionFormV2')]);
  });

  it.each(DELETED_PATHS)('reports $rel when it is back', ({ rel, folder }) => {
    if (folder) {
      touched.add(rel);
      fs.mkdirSync(fakePath(rel));
    } else {
      write(rel, 'export {};\n');
    }

    expectReported(runGuard(), [lineFor(rel, 'must not exist')]);
  });

  it('T1: reports the row as matching no file when every .state.ts is gone', () => {
    removeEvery((rel) => rel.endsWith('.state.ts'));

    const result = runGuard();

    expect(stderrLines(result).filter((line) => line.includes(NO_FILE))).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  it('T2: reports the row as matching no file when every screen template is gone', () => {
    removeEvery(
      (rel) =>
        rel.startsWith('src/modules/') && rel.includes('/screens/') && rel.endsWith('/index.tsx'),
    );

    const result = runGuard();

    expect(stderrLines(result).filter((line) => line.includes(NO_FILE))).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  it('exits 0 on a store accessor named useState in a screen template', () => {
    appendLine(UNNAMED_TEMPLATE, 'useFooState.useState.bar();');

    expectClean(runGuard());
  });
});

describe('validate-structural-guards.js, root layout (step 3)', () => {
  it('reports a second AppToastProvider at its line', () => {
    replaceOnce(LAYOUT, HOST, `<AppToastProvider>\n${HOST}\n</AppToastProvider>`);
    const line = lineOf(LAYOUT, '<AppToastProvider>', 'last');

    expectReported(runGuard(), [lineAt(LAYOUT, line, 'AppToastProvider')]);
  });

  it('reports the missing AppToastProvider when both tags are removed', () => {
    replaceOnce(LAYOUT, '<AppToastProvider>', '<>');
    replaceOnce(LAYOUT, '</AppToastProvider>', '</>');

    expectReported(runGuard(), [lineFor(LAYOUT, 'AppToastProvider')]);
  });

  it('reports the missing PortalHost when it is removed', () => {
    replaceOnce(LAYOUT, HOST, '');

    expectReported(runGuard(), [lineFor(LAYOUT, 'PortalHost')]);
  });

  it('reports a PortalHost below the closing AppToastProvider tag at the host line', () => {
    replaceOnce(LAYOUT, HOST, '');
    replaceOnce(LAYOUT, '</AppToastProvider>', `</AppToastProvider>\n${HOST}`);
    const line = lineOf(LAYOUT, HOST);

    expectReported(runGuard(), [lineAt(LAYOUT, line, 'PortalHost')]);
  });

  it('reports a second PortalHost at its line', () => {
    replaceOnce(LAYOUT, HOST, `${HOST}\n${HOST}`);
    const line = lineOf(LAYOUT, HOST, 'last');

    expectReported(runGuard(), [lineAt(LAYOUT, line, 'PortalHost')]);
  });

  it('reports heroui-native/provider at its import line and the missing provider-raw import', () => {
    replaceOnce(LAYOUT, "'heroui-native/provider-raw'", "'heroui-native/provider'");
    const line = lineOf(LAYOUT, "'heroui-native/provider'");

    expectReported(runGuard(), [
      lineAt(LAYOUT, line, 'heroui-native/provider'),
      lineFor(LAYOUT, 'provider-raw'),
    ]);
  });

  it('reports the missing initialMetrics seed on SafeAreaProvider', () => {
    replaceOnce(LAYOUT, ' initialMetrics={initialWindowMetrics}', '');

    expectReported(runGuard(), [lineFor(LAYOUT, 'initialMetrics')]);
  });

  it('reports a global.css import that resolves to no file at the import line', () => {
    replaceOnce(LAYOUT, "'../../global.css'", "'../global.css'");
    const line = lineOf(LAYOUT, "'../global.css'");

    expectReported(runGuard(), [lineAt(LAYOUT, line, 'global.css')]);
  });

  it('reports the missing global.css import', () => {
    replaceOnce(LAYOUT, "import '../../global.css';\n", '');

    expectReported(runGuard(), [lineFor(LAYOUT, 'global.css')]);
  });

  it('lists a named-file row, a tree row and a layout violation in one run', () => {
    const sheetLine = appendLine(SUMMARY_CARD, STYLESHEET_SEED);
    const asyncLine = appendLine(STATE_FILE, ASYNC_SEED);
    replaceOnce(LAYOUT, HOST, `${HOST}\n${HOST}`);
    const hostLine = lineOf(LAYOUT, HOST, 'last');

    expectReported(runGuard(), [
      lineAt(SUMMARY_CARD, sheetLine, 'StyleSheet'),
      lineAt(STATE_FILE, asyncLine, 'async'),
      lineAt(LAYOUT, hostLine, 'PortalHost'),
    ]);
  });
});

describe('npm run lint (step 4)', () => {
  it('runs the structural guards check', () => {
    const manifest: unknown = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
    );

    expect(manifest).toHaveProperty(
      'scripts.lint',
      expect.stringContaining('node scripts/validate-structural-guards.js'),
    );
  });
});
