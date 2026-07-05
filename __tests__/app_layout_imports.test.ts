import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('app root layout imports', () => {
  it('resolves the global CSS side-effect import from src/app/_layout.tsx', () => {
    const layoutPath = resolve(process.cwd(), 'src/app/_layout.tsx');
    const source = readFileSync(layoutPath, 'utf8');
    const cssImport = source.match(/^import\s+['"](.+global\.css)['"];/m)?.[1];

    expect(cssImport).toBeDefined();
    expect(existsSync(resolve(process.cwd(), 'src/app', cssImport!))).toBe(true);
  });

  it('seeds safe-area metrics before the first app layout frame', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/_layout.tsx'), 'utf8');

    expect(source).toContain('SafeAreaProvider');
    expect(source).toContain('initialWindowMetrics');
    expect(source).toContain('initialMetrics={initialWindowMetrics}');
  });
});
