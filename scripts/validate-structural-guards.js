// Structural guards from the deleted source-text suites (#621); a row fails when its file is gone.
const fs = require('fs');
const path = require('path');
const { stripComments } = require('./lib/strip-comments');

/** @typedef {{ found: (source: string) => boolean, missing: string }} Requirement */

const root = path.join(__dirname, '..');
const SCRIPT = path.relative(root, __filename);
const errors = [];

const UI = 'src/components/ui';
const BUDGET = 'src/modules/budget/screens/budget';
const TRANSACTIONS = 'src/modules/transactions/screens/transactions';
const COMMITMENTS = 'src/modules/commitments/screens/commitments';
const BUDGET_INDEX = `${BUDGET}/index.tsx`;
const TRANSACTIONS_INDEX = `${TRANSACTIONS}/index.tsx`;
const COMMITMENTS_INDEX = `${COMMITMENTS}/index.tsx`;
const DASHBOARD_INDEX = 'src/modules/dashboard/screens/dashboard/index.tsx';
const BUDGET_PICKER = `${TRANSACTIONS}/transaction_form/components/budget_picker_sheet.tsx`;
const LAYOUT = 'src/app/_layout.tsx';
const EMPTY_STATE = `${UI}/empty_state.tsx`;
const ERROR_STATE = `${UI}/error_state.tsx`;

function escapeRegExp(/** @type {string} */ text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// No `g` flag on a banned pattern: `exec` would carry `lastIndex` from one line to the next.
function literal(/** @type {string} */ text) {
  return new RegExp(escapeRegExp(text));
}

// The whole identifier, bare or reached through any object: `RN.StyleSheet` is `StyleSheet`.
function identifier(/** @type {string} */ name) {
  return new RegExp(`(?<![\\w$])${escapeRegExp(name)}(?![\\w$])`);
}

// `createMoneyAppSelectors` gives a store a `useState` accessor, so `x.useState.y()` is not the hook.
const USE_STATE = /(?<![\w$])useState(?![\w$])(?!(?<=\.useState)\s*\.)/;

/** @param {RegExp} pattern @param {string} missing @returns {Requirement} */
function holds(pattern, missing) {
  return { found: (source) => pattern.test(source), missing };
}

function tag(/** @type {string} */ name) {
  return holds(new RegExp(`<${name}(?![\\w$])`), `no \`<${name}\` element`);
}

/** @param {string} enumName @param {string[]} names */
function members(enumName, names) {
  return names.map((name) =>
    holds(identifier(`${enumName}.${name}`), `no \`${enumName}.${name}\``),
  );
}

// Matched against the joined source, so `[^}]*` spans a named-import list oxfmt wrapped.
/** @param {string} module @param {string} name @returns {Requirement} */
function namedImport(module, name) {
  const importFrom = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegExp(module)}['"]`,
    'g',
  );
  return {
    found: (source) =>
      [...source.matchAll(importFrom)].some((match) =>
        match[1].split(',').some((entry) => entry.trim().split(/\s+/)[0] === name),
      ),
    missing: `no named import of \`${name}\` from '${module}'`,
  };
}

function herouiImport(/** @type {string} */ name) {
  return namedImport('heroui-native', name);
}

// The lookbehind keeps `items(` and `theme.ms(` out; the paren keeps a bare `ms` import out.
const RAW_SCALE = /(?<![\w.])ms\s*\(/;

/** @param {string} rel @param {'empty' | 'error'} kind */
function stateScreen(rel, kind) {
  return {
    files: [rel],
    banned: [RAW_SCALE],
    rule: 'is a raw scale call; state-screen geometry belongs in src/components/ui/state_screen.geometry.ts and other sizes in src/constants/theme.ts (#338)',
    required: [
      namedImport('@/components/ui/state_screen.geometry', 'resolveStateScreenLayout'),
      holds(
        new RegExp(`resolveStateScreenLayout\\(\\s*['"]${kind}['"]\\s*\\)`),
        `no \`resolveStateScreenLayout('${kind}')\` call`,
      ),
    ],
    needs: 'a state-screen component draws its layout from the shared resolver with its own kind',
  };
}

// `wholeSource` is regex source for the whole specifier, the string after `from`, `import` or `require(`.
function specifier(/** @type {string} */ wholeSource) {
  return new RegExp(`(?<=\\b(?:from|import|require)\\s*\\(?\\s*['"])${wholeSource}(?=['"])`);
}

const INLINE_FILTER_COPY = [
  "'Clear search'",
  "'Filter'",
  '"Amount currency"',
  '"Commitment amount currency"',
  ', account filter',
  ', category filter',
  ', commitment account filter',
  ', commitment category filter',
  ', commitment amount type filter',
  ', commitment recurrence filter',
  'placeholder="0"',
  'placeholder="∞"',
];

const NAMED_ROWS = [
  {
    files: [
      BUDGET_INDEX,
      `${BUDGET}/components/summary_card.tsx`,
      `${BUDGET}/components/budget_bar.tsx`,
      `${BUDGET}/components/budget_tool_rail.tsx`,
      `${BUDGET}/components/category_budget_row.tsx`,
      `${BUDGET}/components/named_budget_row.tsx`,
      `${BUDGET}/components/unassigned_spending_row.tsx`,
      `${BUDGET}/components/budget_screen_skeleton.tsx`,
      `${BUDGET}/components/income_sheet.tsx`,
      `${BUDGET}/components/set_budget_sheet.tsx`,
      `${BUDGET}/components/fifty_thirty_twenty/index.tsx`,
      `${BUDGET}/components/fifty_thirty_twenty/monthly_rule_summary.tsx`,
      `${BUDGET}/components/fifty_thirty_twenty/rule_ledger.tsx`,
      `${BUDGET}/components/fifty_thirty_twenty/rule_bucket_row.tsx`,
      `${BUDGET}/components/fifty_thirty_twenty/rule_contributor_row.tsx`,
      `${BUDGET}/components/fifty_thirty_twenty/not_grouped_row.tsx`,
      `${TRANSACTIONS}/transaction_form/index.tsx`,
      `${TRANSACTIONS}/transaction_form/transaction_form_body.tsx`,
      BUDGET_PICKER,
      `${BUDGET}/components/spending_plan_allocation_chip.tsx`,
      `${BUDGET}/components/spending_plan_card.tsx`,
      `${BUDGET}/components/spending_plan_category_chip.tsx`,
      `${BUDGET}/components/spending_plans_lens.tsx`,
      `${BUDGET}/components/spending_plans_summary.tsx`,
      `${BUDGET}/spending_plan_detail/index.tsx`,
      `${BUDGET}/spending_plan_detail/components/spending_plan_detail_category_row.tsx`,
      `${BUDGET}/spending_plan_detail/components/spending_plan_detail_skeleton.tsx`,
      `${BUDGET}/spending_plan_detail/components/spending_plan_detail_summary.tsx`,
      `${BUDGET}/spending_plan_sheet/index.tsx`,
      `${BUDGET}/spending_plan_sheet/components/spending_plan_allocations.tsx`,
      `${BUDGET}/spending_plan_sheet/components/spending_plan_category_selector.tsx`,
      `${BUDGET}/spending_plan_sheet/components/spending_plan_date_range.tsx`,
      `${BUDGET}/spending_plan_sheet/components/spending_plan_sheet_fields.tsx`,
    ],
    banned: [identifier('StyleSheet')],
    rule: 'in a budget or transaction-form presentation file; style it with HeroUI and Uniwind classes',
  },
  {
    files: [
      `${BUDGET}/components/summary_card.tsx`,
      `${BUDGET}/components/spending_plans_summary.tsx`,
      `${BUDGET}/components/budget_screen_skeleton.tsx`,
      `${BUDGET}/components/fifty_thirty_twenty/monthly_rule_summary.tsx`,
      `${BUDGET}/components/fifty_thirty_twenty/rule_ledger.tsx`,
      `${BUDGET}/category_detail/components/category_detail_skeleton.tsx`,
      `${BUDGET}/spending_plan_detail/components/spending_plan_detail_summary.tsx`,
      `${BUDGET}/spending_plan_detail/components/spending_plan_detail_skeleton.tsx`,
    ],
    banned: [literal('shadow-none')],
    rule: "on a Budget Card; only `boxShadow: 'none'` beats HeroUI's --surface-shadow (#339)",
  },
  {
    files: [
      `${UI}/search_filter_row.tsx`,
      `${UI}/filter_accordion.tsx`,
      `${TRANSACTIONS}/components/search_row.tsx`,
      `${COMMITMENTS}/components/search_row.tsx`,
      `${TRANSACTIONS}/filter/components/account_accordion.tsx`,
      `${TRANSACTIONS}/filter/components/category_accordion.tsx`,
      `${TRANSACTIONS}/filter/components/amount_accordion.tsx`,
      `${COMMITMENTS}/filter/components/account_accordion.tsx`,
      `${COMMITMENTS}/filter/components/category_accordion.tsx`,
      `${COMMITMENTS}/filter/components/amount_accordion.tsx`,
      `${COMMITMENTS}/filter/components/amount_type_accordion.tsx`,
      `${COMMITMENTS}/filter/components/recurrence_accordion.tsx`,
    ],
    banned: [
      ...['useCallback', 'useEffect', 'useMemo', 'useReducer'].map(identifier),
      USE_STATE,
      specifier(`[^'"]*filter\\.(?:helpers|store|hook)`),
      identifier('Colors.dark'),
      ...INLINE_FILTER_COPY.map(literal),
    ],
    rule: 'in a filter component; it holds no React hook, no filter helper, store or hook import, no `Colors.dark` and no inline copy',
  },
  {
    files: [TRANSACTIONS_INDEX],
    banned: ['useConfirmAction', 'useTransactionFormState', 'useTransactionStore'].map(identifier),
    rule: 'in the transactions template; its hook owns confirm, form and store access',
    required: [
      tag('FilterRail'),
      ...members('TransactionType', ['Income', 'Expense', 'Transfer', 'CCPayment']),
    ],
    needs: 'the transactions screen filters through `FilterRail` over every `TransactionType`',
  },
  {
    files: [`${TRANSACTIONS}/detail/index.tsx`],
    banned: [/(?<![\w$])router\./, identifier('useTransactionFormState')],
    rule: 'in the transaction detail template; its hook owns navigation and the form state',
  },
  {
    files: [BUDGET_PICKER],
    banned: [literal('} EGP')],
    rule: 'is an inline currency label; render `Strings.currencyEgp`',
    required: [holds(identifier('Strings.currencyEgp'), 'no `Strings.currencyEgp`')],
    needs: 'the budget picker labels its amounts from strings',
  },
  {
    files: [`${UI}/screen.tsx`],
    banned: [identifier('SafeAreaView')],
    rule: 'in `Screen`; `SafeAreaView` collapses the flex chain on Android Fabric',
  },
  {
    files: [`${UI}/filter_rail.tsx`],
    required: [tag('MonthFilter'), tag('SegmentFilter')],
    needs: '`FilterRail` composes `MonthFilter` and `SegmentFilter`',
  },
  {
    files: [COMMITMENTS_INDEX],
    banned: [identifier('CommitmentHeader')],
    rule: 'in the commitments screen; its header is the HeroUI tab header',
    required: [
      tag('FilterRail'),
      ...members('CommitmentPaymentStatus', ['Overdue', 'Due', 'Upcoming', 'Paid', 'Skipped']),
    ],
    needs: 'the commitments screen filters through `FilterRail` over every payment status',
  },
  {
    files: [
      DASHBOARD_INDEX,
      BUDGET_INDEX,
      TRANSACTIONS_INDEX,
      COMMITMENTS_INDEX,
      'src/modules/goals/screens/goals/index.tsx',
    ],
    required: [
      ...['Surface', 'Separator', 'Typography'].map(herouiImport),
      tag('Surface'),
      tag('Separator'),
    ],
    needs: 'a tab screen composes its header from HeroUI `Surface`, `Separator` and `Typography`',
  },
  {
    files: [DASHBOARD_INDEX],
    required: [herouiImport('Button'), tag('Button')],
    needs: 'the dashboard header action is a HeroUI `Button`',
  },
  {
    files: [BUDGET_INDEX],
    required: [tag('BudgetToolRail')],
    needs: 'budget actions go through `BudgetToolRail`',
  },
  {
    files: [LAYOUT],
    banned: [specifier('heroui-native/provider')],
    rule: 'is the full HeroUI provider; the root layout mounts its own toast provider and portal host',
    required: [
      holds(specifier('heroui-native/provider-raw'), 'no import from `heroui-native/provider-raw`'),
      holds(
        /<SafeAreaProvider\b[^>]*\binitialMetrics=\{initialWindowMetrics\}/,
        'no `initialMetrics={initialWindowMetrics}` on `<SafeAreaProvider`',
      ),
    ],
    needs: 'the root layout mounts the raw HeroUI provider inside a seeded `SafeAreaProvider`',
  },
  stateScreen(EMPTY_STATE, 'empty'),
  stateScreen(ERROR_STATE, 'error'),
];

const TREE_ROWS = [
  {
    name: 'T1, every *.state.ts under src/',
    matches: (/** @type {string} */ rel) => rel.endsWith('.state.ts'),
    banned: ['useEffect', 'setTimeout', 'async', 'Promise'].map(identifier),
    rule: 'in a `.state.ts`; UI state holds no effect, timer or async work',
  },
  {
    name: 'T2, every index.tsx below a screens/ folder under src/modules/',
    matches: (/** @type {string} */ rel) =>
      rel.startsWith('src/modules/') && rel.includes('/screens/') && rel.endsWith('/index.tsx'),
    banned: [USE_STATE, identifier('useSharedValue')],
    rule: 'in a screen template; state lives in its `.state.ts` and shared values in its `.anim.ts`',
  },
  {
    name: 'T3, every .ts and .tsx under src/',
    matches: () => true,
    banned: [literal('transaction_form_v2'), literal('TransactionFormV2')],
    rule: 'names a versioned transaction form; `transaction_form` is the one canonical module',
  },
];

const CSS_IMPORT = /^\s*import\s+['"]([^'"]*global\.css)['"]/;
const ONE_MOUNT = 'the root layout mounts exactly one';

const DELETED_PATHS = [
  `${BUDGET}/spending_plan_sheet/spending_plan_sheet.styles.ts`,
  `${UI}/tab_header.tsx`,
  `${TRANSACTIONS}/transaction_form_v2`,
];

/** @param {string} rel @returns {string[]} */
function walk(rel) {
  return fs.readdirSync(path.join(root, rel), { withFileTypes: true }).flatMap((entry) => {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) return walk(child);
    return /\.tsx?$/.test(entry.name) ? [child] : [];
  });
}

/** @type {Map<string, string[] | undefined>} */
const sources = new Map();

// Comments are blanked, not dropped, so a reported line is the line on disk; strings are kept.
function load(/** @type {string} */ rel) {
  if (!sources.has(rel)) {
    const abs = path.join(root, rel);
    const isFile = fs.statSync(abs, { throwIfNoEntry: false })?.isFile() ?? false;
    sources.set(rel, isFile ? stripComments(fs.readFileSync(abs, 'utf8').split('\n')) : undefined);
  }
  return sources.get(rel);
}

/** @param {string} rel @param {string[]} lines @param {RegExp[]} banned @param {string} [rule] */
function reportBanned(rel, lines, banned, rule) {
  lines.forEach((line, index) => {
    for (const pattern of banned) {
      const match = pattern.exec(line);
      if (match) errors.push(`${rel}:${index + 1}: \`${match[0]}\` ${rule}`);
    }
  });
}

function reportLayout(/** @type {string[]} */ lines) {
  const source = lines.join('\n');
  const at = (/** @type {number} */ offset) =>
    `${LAYOUT}:${source.slice(0, offset).split('\n').length}`;
  const openingTags = (/** @type {string} */ name) => {
    const offsets = [...source.matchAll(new RegExp(`<${name}(?![\\w$])`, 'g'))].map(
      (match) => match.index,
    );
    if (offsets.length === 0) errors.push(`${LAYOUT}: no \`<${name}\` element; ${ONE_MOUNT}`);
    for (const offset of offsets.slice(1)) {
      errors.push(`${at(offset)}: a second \`<${name}\`; ${ONE_MOUNT}`);
    }
    return offsets;
  };
  const providers = openingTags('AppToastProvider');
  const close = source.lastIndexOf('</AppToastProvider');
  for (const host of openingTags('PortalHost')) {
    if (providers.length > 0 && (host < providers[0] || host > close)) {
      errors.push(
        `${at(host)}: \`<PortalHost\` sits outside \`<AppToastProvider>\`; an overlay at the portal may call \`useToast\``,
      );
    }
  }

  const cssImports = lines.flatMap((line, index) => {
    const match = CSS_IMPORT.exec(line);
    return match ? [{ cssPath: match[1], line: index + 1 }] : [];
  });
  if (cssImports.length === 0) errors.push(`${LAYOUT}: no side-effect import of \`global.css\``);
  for (const { cssPath, line } of cssImports) {
    if (!fs.existsSync(path.resolve(root, path.dirname(LAYOUT), cssPath))) {
      errors.push(`${LAYOUT}:${line}: \`${cssPath}\` resolves to no file from src/app/`);
    }
  }
}

const namedFiles = [...new Set(NAMED_ROWS.flatMap((row) => row.files))];

for (const rel of namedFiles.filter((named) => !load(named))) {
  errors.push(`${rel}: not in the tree; move its rows in ${SCRIPT}`);
}

for (const row of NAMED_ROWS) {
  for (const rel of row.files) {
    const lines = load(rel);
    if (!lines) continue;
    reportBanned(rel, lines, row.banned ?? [], row.rule);
    const source = lines.join('\n');
    for (const { found, missing } of row.required ?? []) {
      if (!found(source)) errors.push(`${rel}: ${missing}; ${row.needs}`);
    }
  }
}

const layout = load(LAYOUT);
if (layout) reportLayout(layout);

const srcFiles = fs.existsSync(path.join(root, 'src')) ? walk('src').sort() : [];

for (const row of TREE_ROWS) {
  const files = srcFiles.filter(row.matches);
  // A row over zero files would pass with its guard gone.
  if (files.length === 0) errors.push(`${row.name}: matches no file`);
  for (const rel of files) reportBanned(rel, load(rel) ?? [], row.banned, row.rule);
}

for (const rel of DELETED_PATHS) {
  if (fs.existsSync(path.join(root, rel))) {
    errors.push(`${rel}: must not exist; it was deleted and nothing may bring it back`);
  }
}

if (errors.length > 0) {
  console.error([...errors, `${SCRIPT}: ${errors.length} violation(s)`].join('\n'));
  process.exit(1);
}

console.log(
  `Structural guards validated (${namedFiles.length} named files, ${srcFiles.length} src files)`,
);
