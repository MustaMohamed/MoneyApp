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
const EMPTY_STATE = 'src/components/ui/empty_state.tsx';
const ERROR_STATE = 'src/components/ui/error_state.tsx';
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
const ACCOUNT_INFO_ROWS = 'src/modules/accounts/utils/account_info_rows.ts';
const VERSIONED_FILE = 'src/modules/transactions/seeded_surface.ts';

const STYLESHEET_SEED = 'const seeded = StyleSheet.create({});';
const SHADOW_SEED = '<Card className="shadow-none" />';
const ASYNC_SEED = 'const seeded = async () => 1;';
const NO_FILE = 'matches no file';
const OUTSIDE_PROVIDER = 'sits outside';

// A seed finds its target by the pattern the guard matches, so a reworded line in src/ fails no case.
function importFrom(module: string): RegExp {
  return new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegExp(module)}['"];`);
}
const HEROUI = 'heroui-native';
const GEOMETRY = '@/components/ui/state_screen.geometry';
const PROVIDER_OPEN = /<AppToastProvider\b[^>]*>/;
const HOST_TAG = /<PortalHost\b[^>]*\/>/;
const CSS_IMPORT_LINE = /^[ \t]*import\s+['"][^'"]*global\.css['"];?\n/m;
const CSS_SPECIFIER = /(?<=^[ \t]*import\s+['"])[^'"]*global\.css(?=['"])/m;

type Predicate = (rel: string) => boolean;

const isStateFile: Predicate = (rel) => rel.endsWith('.state.ts');
const isTemplate: Predicate = (rel) =>
  rel.startsWith('src/modules/') && rel.includes('/screens/') && rel.endsWith('/index.tsx');

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

function restoreTouched(): void {
  for (const rel of touched) restore(rel);
  touched.clear();
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

// Edits the first match, and throws on an absent target or an edit that changes nothing.
function replacePattern(rel: string, pattern: RegExp, replacement: string): void {
  const source = read(rel);
  const next = source.replace(pattern, () => replacement);
  if (next === source) throw new Error(`fixture mutation changed nothing: ${String(pattern)}`);
  write(rel, next);
}

function importedNames(rel: string, module: string): string[] {
  const list = importFrom(module).exec(read(rel))?.[1];
  if (list === undefined) throw new Error(`fixture import statement absent: ${rel}`);
  return list
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');
}

function dropImport(rel: string, module: string, name: string): void {
  const names = importedNames(rel, module);
  const kept = names.filter((entry) => entry.split(/\s+/)[0] !== name);
  if (kept.length === names.length) throw new Error(`fixture import target absent: ${name}`);
  replacePattern(rel, importFrom(module), `import { ${kept.join(', ')} } from '${module}';`);
}

function hostTag(): string {
  const tag = HOST_TAG.exec(read(LAYOUT))?.[0];
  if (tag === undefined) throw new Error('fixture host tag absent');
  return tag;
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

// A tree-row seed lands on the first file the row's own predicate matches in the fakeroot.
function locate(matches: Predicate): string {
  const rel = walk('src').sort().find(matches);
  if (rel === undefined) throw new Error('fixture target matched no file');
  return rel;
}

function removeEvery(matches: Predicate): void {
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
  guard: string;
  target: string | Predicate;
  text: string;
  token: string;
}

interface RequiredSeed {
  guard: string;
  rel: string;
  seed: () => void;
  words: string;
}

const BANNED: BannedSeed[] = [
  {
    guard: 'StyleSheet in a budget presentation file',
    target: SUMMARY_CARD,
    text: STYLESHEET_SEED,
    token: 'StyleSheet',
  },
  {
    guard: 'StyleSheet reached through a namespace in a budget presentation file',
    target: SUMMARY_CARD,
    text: 'const s = RN.StyleSheet.create({});',
    token: 'StyleSheet',
  },
  {
    guard: 'shadow-none on a Budget Card',
    target: CATEGORY_DETAIL_SKELETON,
    text: SHADOW_SEED,
    token: 'shadow-none',
  },
  {
    guard: 'a React hook in a filter component',
    target: 'src/components/ui/search_filter_row.tsx',
    text: 'const seeded = useMemo(() => 1, []);',
    token: 'useMemo',
  },
  {
    guard: 'a filter module import in a filter component',
    target: `${TRANSACTIONS}/filter/components/account_accordion.tsx`,
    text: "import { seeded } from '../filter.helpers';",
    token: 'filter.helpers',
  },
  {
    guard: 'Colors.dark in a filter component',
    target: `${COMMITMENTS}/filter/components/recurrence_accordion.tsx`,
    text: 'const seeded = Colors.dark.bg;',
    token: 'Colors.dark',
  },
  {
    guard: 'inline copy in a filter component',
    target: `${COMMITMENTS}/components/search_row.tsx`,
    text: "const seeded = 'Clear search';",
    token: "'Clear search'",
  },
  {
    guard: 'a hook called as a React member in a filter component',
    target: FILTER_ACCORDION,
    text: 'const [seeded] = React.useState(0);',
    token: 'useState',
  },
  {
    guard: 'a store hook in the transactions template',
    target: TRANSACTIONS_INDEX,
    text: 'const seeded = useTransactionStore();',
    token: 'useTransactionStore',
  },
  {
    guard: 'a router call in the transaction detail template',
    target: DETAIL_INDEX,
    text: 'router.back();',
    token: 'router.',
  },
  {
    guard: 'a router call through props in the transaction detail template',
    target: DETAIL_INDEX,
    text: 'props.router.push(x)',
    token: 'router.',
  },
  {
    guard: 'an inline EGP label in the budget picker',
    target: BUDGET_PICKER,
    text: '<Text>{amount} EGP</Text>',
    token: '} EGP',
  },
  {
    guard: 'SafeAreaView in Screen',
    target: SCREEN,
    text: '<SafeAreaView />',
    token: 'SafeAreaView',
  },
  {
    guard: 'SafeAreaView reached through a namespace in Screen',
    target: SCREEN,
    text: '<RN.SafeAreaView>',
    token: 'SafeAreaView',
  },
  {
    guard: 'CommitmentHeader in the commitments screen',
    target: COMMITMENTS_INDEX,
    text: '<CommitmentHeader />',
    token: 'CommitmentHeader',
  },
  {
    guard: 'a raw ms() call in EmptyState',
    target: EMPTY_STATE,
    text: 'const seeded = ms(80);',
    token: 'ms(',
  },
  { guard: 'T1: async in a .state.ts', target: isStateFile, text: ASYNC_SEED, token: 'async' },
  {
    guard: 'T1: setTimeout reached through globalThis in a .state.ts',
    target: isStateFile,
    text: 'globalThis.setTimeout(() => set({ open: false }), 300);',
    token: 'setTimeout',
  },
  {
    guard: 'T2: useSharedValue in a screen template',
    target: isTemplate,
    text: 'const seeded = useSharedValue(0);',
    token: 'useSharedValue',
  },
  {
    guard: 'T2: useSharedValue reached through a namespace in a screen template',
    target: isTemplate,
    text: 'const v = Reanimated.useSharedValue(0);',
    token: 'useSharedValue',
  },
  {
    guard: 'T2: useState reached through a namespace in a screen template',
    target: isTemplate,
    text: 'const [a] = R.useState(0);',
    token: 'useState',
  },
  {
    guard: 'convertCurrency in the account info rows',
    target: ACCOUNT_INFO_ROWS,
    text: 'const seeded = convertCurrency(input);',
    token: 'convertCurrency',
  },
  {
    guard: 'roundMoney in the account info rows',
    target: ACCOUNT_INFO_ROWS,
    text: 'const seeded = roundMoney(1.005);',
    token: 'roundMoney',
  },
  {
    guard: 'Math in the account info rows',
    target: ACCOUNT_INFO_ROWS,
    text: 'const seeded = Math.max(0, 1);',
    token: 'Math',
  },
];

function withoutTag(rel: string, tag: string, where: string): RequiredSeed {
  return {
    guard: `<${tag} in ${where}`,
    rel,
    seed: () => replaceEvery(rel, `<${tag}`, '<Seeded'),
    words: `no \`<${tag}\` element`,
  };
}

function withoutMember(rel: string, enumName: string, member: string): RequiredSeed {
  return {
    guard: `${enumName}.${member} in the screen's filter table`,
    rel,
    seed: () => replaceEvery(rel, `${enumName}.${member}`, `Seeded.${member}`),
    words: `no \`${enumName}.${member}\``,
  };
}

function withoutImport(rel: string, module: string, name: string, where: string): RequiredSeed {
  return {
    guard: `a ${module} import of ${name} in ${where}`,
    rel,
    seed: () => dropImport(rel, module, name),
    words: `no named import of \`${name}\``,
  };
}

function withoutKind(rel: string, kind: string, swapped: string): RequiredSeed {
  const call = (which: string): string => `resolveStateScreenLayout('${which}')`;
  return {
    guard: `the ${call(kind)} call in ${rel}`,
    rel,
    seed: () => replaceEvery(rel, call(kind), call(swapped)),
    words: `no \`${call(kind)}\``,
  };
}

// The import seeds and the tag seeds are spread over the tab screens, so no two edit the same text.
const REQUIRED: RequiredSeed[] = [
  withoutTag(TRANSACTIONS_INDEX, 'FilterRail', 'the transactions screen'),
  ...['Income', 'Expense', 'Transfer', 'CCPayment'].map((member) =>
    withoutMember(TRANSACTIONS_INDEX, 'TransactionType', member),
  ),
  // The import stays, so only a row that requires the call reports this seed.
  {
    guard: 'a formatCurrencyAmount call in the budget picker, with its import kept',
    rel: BUDGET_PICKER,
    seed: () => replaceEvery(BUDGET_PICKER, 'formatCurrencyAmount(', 'formatSeeded('),
    words: 'no `formatCurrencyAmount` call',
  },
  withoutTag(FILTER_RAIL, 'MonthFilter', 'FilterRail'),
  withoutTag(FILTER_RAIL, 'SegmentFilter', 'FilterRail'),
  withoutTag(COMMITMENTS_INDEX, 'FilterRail', 'the commitments screen'),
  ...['Overdue', 'Due', 'Upcoming', 'Paid', 'Skipped'].map((member) =>
    withoutMember(COMMITMENTS_INDEX, 'CommitmentPaymentStatus', member),
  ),
  withoutImport(GOALS_INDEX, HEROUI, 'Surface', 'the goals tab screen'),
  withoutImport(BUDGET_INDEX, HEROUI, 'Separator', 'the budget tab screen'),
  withoutImport(COMMITMENTS_INDEX, HEROUI, 'Typography', 'the commitments tab screen'),
  withoutTag(TRANSACTIONS_INDEX, 'Surface', 'the transactions tab header'),
  withoutTag(GOALS_INDEX, 'Separator', 'the goals tab header'),
  withoutImport(DASHBOARD_INDEX, HEROUI, 'Button', 'the dashboard screen'),
  withoutTag(DASHBOARD_INDEX, 'Button', 'the dashboard header'),
  withoutTag(BUDGET_INDEX, 'BudgetToolRail', 'the budget screen'),
  withoutImport(EMPTY_STATE, GEOMETRY, 'resolveStateScreenLayout', 'EmptyState'),
  withoutKind(EMPTY_STATE, 'empty', 'error'),
  withoutImport(ERROR_STATE, GEOMETRY, 'resolveStateScreenLayout', 'ErrorState'),
  withoutKind(ERROR_STATE, 'error', 'empty'),
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

afterEach(restoreTouched);

afterAll(() => {
  fs.rmSync(fakeRoot, { recursive: true, force: true });
});

describe('validate-structural-guards.js, banned tokens seeded together in one run', () => {
  const seeded = new Map<string, { rel: string; line: number }>();
  let result: SpawnSyncReturns<string>;

  function seededAt(guard: string): { rel: string; line: number } {
    const at = seeded.get(guard);
    if (at === undefined) throw new Error(`seed not applied: ${guard}`);
    return at;
  }

  beforeAll(() => {
    for (const { guard, target, text } of BANNED) {
      const rel = typeof target === 'string' ? target : locate(target);
      seeded.set(guard, { rel, line: appendLine(rel, text) });
    }
    write(VERSIONED_FILE, 'export const TransactionFormV2 = 1;\n');
    result = runGuard();
    restoreTouched();
  });

  it.each(BANNED)('$guard: reports the banned token at its line', ({ guard, token }) => {
    const { rel, line } = seededAt(guard);

    expectReported(result, [lineAt(rel, line, token)]);
  });

  it('T3: reports TransactionFormV2 in a new file under src/', () => {
    expectReported(result, [lineAt(VERSIONED_FILE, 1, 'TransactionFormV2')]);
  });

  it('ends stderr with one line that names the script and counts the violations', () => {
    const lines = stderrLines(result);

    expect(lines[lines.length - 1]).toBe(`${SCRIPT_REL}: ${lines.length - 1} violation(s)`);
  });
});

describe('validate-structural-guards.js, required tokens removed together in one run', () => {
  let result: SpawnSyncReturns<string>;

  beforeAll(() => {
    for (const { seed } of REQUIRED) seed();
    result = runGuard();
    restoreTouched();
  });

  it.each(REQUIRED)('$guard: reports the required token as missing', ({ rel, words }) => {
    expectReported(result, [lineFor(rel, words)]);
  });
});

describe('validate-structural-guards.js, named files', () => {
  it('exits 0 with one stdout line on the unseeded tree', () => {
    expectClean(runGuard());
  });

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

  it.each([SCREEN, LAYOUT, EMPTY_STATE])(
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

  it('names every raw ms() line in a state-screen component', () => {
    const firstLine = appendLine(ERROR_STATE, 'const a = ms(11);');
    const secondLine = appendLine(ERROR_STATE, 'const b = ms(22);');

    expectReported(runGuard(), [
      lineAt(ERROR_STATE, firstLine, 'ms('),
      lineAt(ERROR_STATE, secondLine, 'ms('),
    ]);
  });

  it('exits 0 on `items(` and a member `.ms(` in a state-screen component', () => {
    appendLine(EMPTY_STATE, 'const seeded = items(1) + theme.ms(2);');

    expectClean(runGuard());
  });

  it('exits 0 on a heroui-native import wrapped over three lines', () => {
    const names = importedNames(DASHBOARD_INDEX, HEROUI);
    replacePattern(
      DASHBOARD_INDEX,
      importFrom(HEROUI),
      `import {\n  ${names.join(', ')},\n} from 'heroui-native';`,
    );

    expectClean(runGuard());
  });
});

describe('validate-structural-guards.js, tree rows and deleted paths', () => {
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
    removeEvery(isStateFile);

    const result = runGuard();

    expect(stderrLines(result).filter((line) => line.includes(NO_FILE))).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  it('T2: reports the row as matching no file when every screen template is gone', () => {
    removeEvery(isTemplate);

    const result = runGuard();

    expect(stderrLines(result).filter((line) => line.includes(NO_FILE))).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  it('exits 0 on a store accessor named useState in a screen template', () => {
    appendLine(locate(isTemplate), 'useFooState.useState.bar();');

    expectClean(runGuard());
  });
});

describe('validate-structural-guards.js, root layout', () => {
  it('reports a second AppToastProvider at its line', () => {
    const host = hostTag();
    replaceOnce(LAYOUT, host, `<AppToastProvider>\n${host}\n</AppToastProvider>`);
    const line = lineOf(LAYOUT, '<AppToastProvider', 'last');

    expectReported(runGuard(), [lineAt(LAYOUT, line, 'a second `<AppToastProvider`')]);
  });

  it('reports the missing AppToastProvider when both tags are removed', () => {
    replacePattern(LAYOUT, PROVIDER_OPEN, '<>');
    replaceOnce(LAYOUT, '</AppToastProvider>', '</>');

    expectReported(runGuard(), [lineFor(LAYOUT, 'no `<AppToastProvider` element')]);
  });

  it('reports the missing PortalHost when it is removed', () => {
    replaceOnce(LAYOUT, hostTag(), '');

    expectReported(runGuard(), [lineFor(LAYOUT, 'no `<PortalHost` element')]);
  });

  it('reports a PortalHost below the closing AppToastProvider tag at the host line', () => {
    const host = hostTag();
    replaceOnce(LAYOUT, host, '');
    replaceOnce(LAYOUT, '</AppToastProvider>', `</AppToastProvider>\n${host}`);
    const line = lineOf(LAYOUT, host);

    expectReported(runGuard(), [lineAt(LAYOUT, line, OUTSIDE_PROVIDER)]);
  });

  it('reports a PortalHost above the opening AppToastProvider tag at the host line', () => {
    const host = hostTag();
    replaceOnce(LAYOUT, host, '');
    replacePattern(LAYOUT, /<AppToastProvider\b/, `${host}\n<AppToastProvider`);
    const line = lineOf(LAYOUT, host);

    expectReported(runGuard(), [lineAt(LAYOUT, line, OUTSIDE_PROVIDER)]);
  });

  it('reports a second PortalHost at its line', () => {
    const host = hostTag();
    replaceOnce(LAYOUT, host, `${host}\n${host}`);
    const line = lineOf(LAYOUT, host, 'last');

    expectReported(runGuard(), [lineAt(LAYOUT, line, 'a second `<PortalHost`')]);
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
    replacePattern(LAYOUT, CSS_SPECIFIER, './seeded/global.css');
    const line = lineOf(LAYOUT, './seeded/global.css');

    expectReported(runGuard(), [lineAt(LAYOUT, line, 'resolves to no file')]);
  });

  it('reports the missing global.css import', () => {
    replacePattern(LAYOUT, CSS_IMPORT_LINE, '');

    expectReported(runGuard(), [lineFor(LAYOUT, 'no side-effect import of `global.css`')]);
  });

  it('lists a named-file row, a tree row and a layout violation in one run', () => {
    const stateFile = locate(isStateFile);
    const sheetLine = appendLine(SUMMARY_CARD, STYLESHEET_SEED);
    const asyncLine = appendLine(stateFile, ASYNC_SEED);
    const host = hostTag();
    replaceOnce(LAYOUT, host, `${host}\n${host}`);
    const hostLine = lineOf(LAYOUT, host, 'last');

    expectReported(runGuard(), [
      lineAt(SUMMARY_CARD, sheetLine, 'StyleSheet'),
      lineAt(stateFile, asyncLine, 'async'),
      lineAt(LAYOUT, hostLine, 'PortalHost'),
    ]);
  });
});

describe('npm run lint', () => {
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
