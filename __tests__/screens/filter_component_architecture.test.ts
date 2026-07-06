import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const FILTER_COMPONENTS = [
  'src/modules/transactions/screens/transactions/filter/components/account_accordion.tsx',
  'src/modules/transactions/screens/transactions/filter/components/category_accordion.tsx',
  'src/modules/transactions/screens/transactions/filter/components/amount_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/account_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/category_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/amount_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/amount_type_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/recurrence_accordion.tsx',
];

describe('filter component architecture', () => {
  it('keeps filter components presentational without local React state or helper logic', () => {
    for (const path of FILTER_COMPONENTS) {
      const text = source(path);

      expect(text).not.toMatch(/\buse(?:Callback|Effect|Memo|Reducer|State)\b/);
      expect(text).not.toContain('../filter.helpers');
    }
  });
});
