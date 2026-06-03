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

const loadedBabelConfigModule = require('../babel.config.js') as unknown;
const loadedBabelCore = require('@babel/core') as unknown;

const isBabelConfigFactory = (value: unknown): value is BabelConfigFactory =>
  typeof value === 'function';
const isBabelCore = (value: unknown): value is BabelCore =>
  !!value && typeof value === 'object' && typeof Reflect.get(value, 'transformSync') === 'function';

if (!isBabelConfigFactory(loadedBabelConfigModule)) {
  throw new Error('Expected babel.config.js to export a config factory');
}

if (!isBabelCore(loadedBabelCore)) {
  throw new Error('Expected @babel/core to expose transformSync');
}

const loadBabelConfig = loadedBabelConfigModule;
const { transformSync } = loadedBabelCore;

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

describe('babel config', () => {
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
