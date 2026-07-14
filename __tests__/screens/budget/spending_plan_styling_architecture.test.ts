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

  it('keeps editing in the detail header instead of duplicating a bottom action', () => {
    const detailScreen = source('src/modules/budget/screens/budget/spending_plan_detail/index.tsx');
    const planCard = source('src/modules/budget/screens/budget/components/spending_plan_card.tsx');

    expect(detailScreen.match(/onPress=\{editPlan\}/g)).toHaveLength(1);
    expect(detailScreen).toContain('<StackHeader');
    expect(detailScreen).not.toContain('<BackButton');
    expect(planCard).not.toContain('pencil-outline');
    expect(planCard).not.toContain('onEdit');
  });

  it('keeps overview card information readable without tiny text', () => {
    const planCard = source('src/modules/budget/screens/budget/components/spending_plan_card.tsx');
    const planSummary = source(
      'src/modules/budget/screens/budget/components/spending_plans_summary.tsx',
    );

    expect(planCard).not.toContain('text-[7.5px]');
    expect(planSummary).not.toContain('text-[7.5px]');
    expect(planCard).toContain('text-[19px]');
    expect(planSummary).toContain('text-[31px]');
  });

  it('keeps detail typography aligned with the overview hierarchy', () => {
    const detailScreen = source('src/modules/budget/screens/budget/spending_plan_detail/index.tsx');
    const detailSummary = source(
      'src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_summary.tsx',
    );
    const detailCategoryRow = source(
      'src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_category_row.tsx',
    );

    expect(detailSummary).toContain('text-[31px]');
    expect(detailSummary).toContain('text-[15px]');
    expect(detailSummary).not.toContain('text-[7.5px]');
    expect(detailCategoryRow).toContain('text-[15px]');
    expect(detailCategoryRow).not.toContain('text-[7.5px]');
    expect(detailScreen).toContain('text-[13px]');
  });
});
