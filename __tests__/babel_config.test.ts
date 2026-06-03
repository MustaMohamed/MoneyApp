type BabelConfig = {
  plugins?: unknown[];
  presets?: unknown[];
};

type BabelConfigFactory = (api: { cache: (enabled: boolean) => void }) => BabelConfig;
type BabelCore = {
  transformSync: (
    code: string,
    options: {
      babelrc: boolean;
      configFile: boolean;
      filename: string;
      plugins?: unknown[];
      presets?: unknown[];
    },
  ) => { code?: string | null } | null;
};
type Fs = {
  readFileSync: (path: string, encoding: 'utf8') => string;
};

const loadedBabelConfigModule = require('../babel.config.js') as unknown;
const loadedBabelCore = require('@babel/core') as unknown;
const loadedFs = require('fs') as unknown;

const isBabelConfigFactory = (value: unknown): value is BabelConfigFactory =>
  typeof value === 'function';
const isBabelCore = (value: unknown): value is BabelCore =>
  !!value && typeof value === 'object' && typeof Reflect.get(value, 'transformSync') === 'function';
const isFs = (value: unknown): value is Fs =>
  !!value && typeof value === 'object' && typeof Reflect.get(value, 'readFileSync') === 'function';

if (!isBabelConfigFactory(loadedBabelConfigModule)) {
  throw new Error('Expected babel.config.js to export a config factory');
}

if (!isBabelCore(loadedBabelCore)) {
  throw new Error('Expected @babel/core to expose transformSync');
}

if (!isFs(loadedFs)) {
  throw new Error('Expected fs to expose readFileSync');
}

const loadBabelConfig = loadedBabelConfigModule;
const { transformSync } = loadedBabelCore;
const { readFileSync } = loadedFs;

const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

const hasStringName = (value: unknown): value is { name: string } => {
  if (!value || typeof value !== 'object' || !('name' in value)) return false;
  return typeof Reflect.get(value, 'name') === 'string';
};

const pluginName = (plugin: unknown): unknown => {
  const candidate = isUnknownArray(plugin) ? plugin[0] : plugin;

  if (hasStringName(candidate)) {
    return candidate.name;
  }

  return candidate;
};

const manualSignalTrackingFiles = [
  'src/app/_layout.tsx',
  'src/modules/accounts/screens/accounts/detail/account_detail.hook.ts',
  'src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.tsx',
  'src/modules/accounts/screens/accounts/detail/index.tsx',
  'src/modules/budget/screens/budget/budget.hook.ts',
  'src/modules/budget/screens/budget/components/income_sheet.tsx',
  'src/modules/budget/screens/budget/components/set_budget_sheet.tsx',
  'src/modules/categories/screens/settings/categories/categories.hook.ts',
  'src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx',
  'src/modules/categories/screens/settings/categories/components/reassign_category_sheet.tsx',
  'src/modules/categories/screens/settings/categories/index.tsx',
  'src/modules/commitments/screens/commitments/add_commitment/add_commitment.hook.ts',
  'src/modules/commitments/screens/commitments/commitments.hook.ts',
  'src/modules/commitments/screens/commitments/components/commitment_form_body.tsx',
  'src/modules/commitments/screens/commitments/components/decimal_amount_input.tsx',
  'src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts',
  'src/modules/commitments/screens/commitments/detail/detail.hook.ts',
  'src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts',
  'src/modules/currency/screens/currency/index.tsx',
  'src/modules/dashboard/screens/dashboard/dashboard.hook.ts',
  'src/modules/onboarding/screens/onboarding/ready/index.tsx',
  'src/modules/onboarding/screens/onboarding/ready/ready.hook.ts',
  'src/modules/onboarding/screens/onboarding/welcome/index.tsx',
  'src/modules/onboarding/screens/onboarding/welcome/welcome.hook.ts',
  'src/modules/transactions/screens/transactions/detail/detail.hook.ts',
  'src/modules/transactions/screens/transactions/detail/index.tsx',
  'src/modules/transactions/screens/transactions/filter/filter.hook.ts',
  'src/modules/transactions/screens/transactions/index.tsx',
  'src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts',
  'src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts',
  'src/modules/transactions/screens/transactions/transactions.hook.ts',
  'src/utils/use_async.hook.ts',
];

describe('babel config', () => {
  it('keeps the Signals transform in manual mode', () => {
    const config = loadBabelConfig({ cache: jest.fn() });
    const signalsPlugin = (config.plugins ?? []).find(
      (plugin) => pluginName(plugin) === 'module:@preact/signals-react-transform',
    );

    expect(Array.isArray(signalsPlugin) ? signalsPlugin[1] : undefined).toMatchObject({
      mode: 'manual',
    });
  });

  it('does not auto-inject Signals tracking for unannotated signal reads', () => {
    const config = loadBabelConfig({ cache: jest.fn() });
    const result = transformSync(
      'export function Sample({ s }) { return <Text>{s.value}</Text>; }',
      {
        babelrc: false,
        configFile: false,
        filename: `${process.cwd()}/src/sample.tsx`,
        plugins: config.plugins,
        presets: config.presets,
      },
    );

    expect(result?.code).not.toContain('@preact/signals-react/runtime');
    expect(result?.code).not.toContain('useSignals');
  });

  it.each(manualSignalTrackingFiles)('uses manual Signals tracking in %s', (file) => {
    const source = readFileSync(`${process.cwd()}/${file}`, 'utf8');

    expect(source).toContain("from '@preact/signals-react/runtime'");
    expect(source).toContain('useSignals();');
  });

  it('runs the MobX auto-observer transform before the Worklets plugin', () => {
    const config = loadBabelConfig({ cache: jest.fn() });
    const plugins = (config.plugins ?? []).map(pluginName);
    const mobxPlugin = (config.plugins ?? []).find(
      (plugin) => pluginName(plugin) === 'wrap-with-observer',
    );

    expect(plugins).toContain('wrap-with-observer');
    expect(Array.isArray(mobxPlugin) ? mobxPlugin[1] : undefined).toMatchObject({
      importPath: 'mobx-react-observer',
    });
    expect(plugins.indexOf('wrap-with-observer')).toBeLessThan(
      plugins.indexOf('react-native-worklets/plugin'),
    );
    expect(plugins[plugins.length - 1]).toBe('react-native-worklets/plugin');
  });

  it('injects observer around project components that return JSX', () => {
    const config = loadBabelConfig({ cache: jest.fn() });
    const result = transformSync('export default function SampleScreen() { return <View />; }', {
      babelrc: false,
      configFile: false,
      filename: `${process.cwd()}/src/sample.tsx`,
      plugins: config.plugins,
      presets: config.presets,
    });

    expect(result?.code).toContain('require("mobx-react-observer")');
    expect(result?.code).toContain('observer)(function SampleScreen');
  });
});
