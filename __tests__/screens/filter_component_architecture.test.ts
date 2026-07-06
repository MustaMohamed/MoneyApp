import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const FILTER_COMPONENTS = [
  'src/components/ui/search_filter_row.tsx',
  'src/components/ui/filter_accordion.tsx',
  'src/modules/transactions/screens/transactions/filter/components/account_accordion.tsx',
  'src/modules/transactions/screens/transactions/filter/components/category_accordion.tsx',
  'src/modules/transactions/screens/transactions/filter/components/amount_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/account_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/category_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/amount_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/amount_type_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/recurrence_accordion.tsx',
];

const FORBIDDEN_DOMAIN_IMPORTS = [
  '../filter.helpers',
  '../filter.store',
  '../filter.hook',
  '@/modules/transactions/screens/transactions/filter/filter.helpers',
  '@/modules/commitments/screens/commitments/filter/filter.helpers',
];

describe('filter component architecture', () => {
  it('keeps filter components presentational without local React state or helper logic', () => {
    for (const path of FILTER_COMPONENTS) {
      const text = source(path);

      expect(text).not.toMatch(/\buse(?:Callback|Effect|Memo|Reducer|State)\b/);
      for (const forbiddenImport of FORBIDDEN_DOMAIN_IMPORTS) {
        expect(text).not.toContain(forbiddenImport);
      }
    }
  });
});
