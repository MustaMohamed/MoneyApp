import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const screenFiles = [
  'src/modules/dashboard/screens/dashboard/index.tsx',
  'src/modules/budget/screens/budget/index.tsx',
  'src/modules/transactions/screens/transactions/index.tsx',
  'src/modules/commitments/screens/commitments/index.tsx',
  'src/modules/goals/screens/goals/index.tsx',
];

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function herouiImport(path: string) {
  const match = source(path).match(/^import\s+\{([^}]+)\}\s+from 'heroui-native';/m);
  return match?.[1] ?? '';
}

describe('tab screen headers', () => {
  it.each(screenFiles)('%s composes its top header from HeroUI primitives', (path) => {
    const text = source(path);
    const imports = herouiImport(path);

    expect(imports).toMatch(/\bSurface\b/);
    expect(imports).toMatch(/\bSeparator\b/);
    expect(imports).toMatch(/\bText\b/);
    expect(text).toContain('<Surface');
    expect(text).toContain('<Separator');
  });

  it('dashboard uses HeroUI Button for its header action', () => {
    const path = 'src/modules/dashboard/screens/dashboard/index.tsx';
    expect(herouiImport(path)).toMatch(/\bButton\b/);
    expect(source(path)).toContain('<Button');
  });

  it('budget routes actions through the monthly tool rail', () => {
    const text = source('src/modules/budget/screens/budget/index.tsx');
    expect(text).toContain('BudgetToolRail');
    expect(text).not.toContain('budgetAddCategory}');
  });

  it('commitments top-level screen does not use the custom CommitmentHeader', () => {
    const text = source('src/modules/commitments/screens/commitments/index.tsx');

    expect(text).not.toContain('CommitmentHeader');
  });

  it('does not keep the unused custom TabHeader wrapper', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/ui/tab_header.tsx'))).toBe(false);
  });
});
