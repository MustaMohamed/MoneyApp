import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PRESENTATION_FILES = [
  'src/modules/budget/screens/budget/components/spending_plan_allocation_chip.tsx',
  'src/modules/budget/screens/budget/components/spending_plan_card.tsx',
  'src/modules/budget/screens/budget/components/spending_plan_category_chip.tsx',
  'src/modules/budget/screens/budget/components/spending_plans_lens.tsx',
  'src/modules/budget/screens/budget/components/spending_plans_summary.tsx',
  'src/modules/budget/screens/budget/spending_plan_detail/index.tsx',
  'src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_category_row.tsx',
  'src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_skeleton.tsx',
  'src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_summary.tsx',
  'src/modules/budget/screens/budget/spending_plan_sheet/index.tsx',
  'src/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_allocations.tsx',
  'src/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_category_selector.tsx',
  'src/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_date_range.tsx',
  'src/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_sheet_fields.tsx',
];

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('spending plan presentation styling', () => {
  it('uses HeroUI and Uniwind classes instead of feature-level StyleSheets', () => {
    for (const path of PRESENTATION_FILES) {
      const text = source(path);

      expect(text).not.toContain('StyleSheet');
      expect(text).not.toContain('spending_plan_sheet.styles');
      expect(text).toContain('className=');
    }

    expect(
      existsSync(
        resolve(
          process.cwd(),
          'src/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.styles.ts',
        ),
      ),
    ).toBe(false);
  });
});
