import { readFileSync } from 'fs';
import path from 'path';

type TransformSync = (
  code: string,
  options: Record<string, unknown>,
) => { code?: string | null } | null;

// Neither babel package is declared: @babel/core is the peer of babel-preset-expo's plugins, the syntax plugin a dependency of its TypeScript transform.
const PRESET_DIR = path.dirname(require.resolve('babel-preset-expo/package.json'));
const TS_TRANSFORM_DIR = path.dirname(
  require.resolve('@babel/plugin-transform-typescript/package.json', { paths: [PRESET_DIR] }),
);
const { transformSync } = jest.requireActual<{ transformSync: TransformSync }>(
  require.resolve('@babel/core', { paths: [PRESET_DIR] }),
);
const SYNTAX_TYPESCRIPT = require.resolve('@babel/plugin-syntax-typescript', {
  paths: [TS_TRANSFORM_DIR],
});

const ANIM_FILE = path.resolve(
  __dirname,
  '../../../src/modules/dashboard/screens/dashboard/dashboard.anim.ts',
);

// A hook the compiler memoizes, so a configuration that compiles nothing cannot pass as a skip.
const COMPILABLE_HOOK = [
  "import { useState } from 'react';",
  'export function useCount() {',
  '  const [count] = useState(0);',
  '  return { count, next: () => count + 1 };',
  '}',
].join('\n');

// The plugin and target babel-preset-expo use when `app.json` turns the compiler on; Jest's own transform never runs it.
function compile(source: string, filename: string): string {
  const output = transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    plugins: [SYNTAX_TYPESCRIPT, ['babel-plugin-react-compiler', { target: '19' }]],
  });
  return output?.code ?? '';
}

describe('useDashboardAnim — the React Compiler leaves the opening-render gate uncompiled (MA-195)', () => {
  it('compiles a plain hook, so the plugin runs in this configuration', () => {
    const code = compile(COMPILABLE_HOOK, 'use_count.ts');

    expect(code).toContain('react/compiler-runtime');
  });

  it('skips useDashboardAnim, whose memoized return would keep the hero entrance past the opening render', () => {
    const code = compile(readFileSync(ANIM_FILE, 'utf8'), ANIM_FILE);

    expect(code).not.toContain('react/compiler-runtime');
    expect(code).not.toMatch(/\b_c\(/);
  });
});
