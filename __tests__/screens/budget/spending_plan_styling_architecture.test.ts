import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PRESENTATION_FILES = [
  'src/modules/budget/screens/budget/components/spending_plan_allocation_chip.tsx',
  'src/modules/budget/screens/budget/components/spending_plan_card.tsx',
  'src/modules/budget/screens/budget/components/spending_plan_category_chip.tsx',
  'src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx',
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
    const summaryParts = source(
      'src/modules/budget/screens/budget/components/budget_summary_parts.tsx',
    );

    expect(planCard).not.toContain('text-[7.5px]');
    expect(planSummary).not.toContain('text-[7.5px]');
    expect(planCard).toContain('text-[19px]');
    expect(summaryParts).toContain('fontSize: Type.summary');
    expect(summaryParts).toContain('fontSize: Type.bodyStrong');
    expect(summaryParts).toContain('fontSize: Type.detail');
    expect(summaryParts).toContain('fontSize: Type.meta');
    expect(summaryParts).toContain('letterSpacing: LetterSpacing.eyebrow');
    expect(planSummary).not.toMatch(/text-\[[\d.]+px\]/);
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

  it('uses the main plans summary card treatment on the detail summary', () => {
    const detailSummary = source(
      'src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_summary.tsx',
    );
    const detailSkeleton = source(
      'src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_skeleton.tsx',
    );

    expect(detailSummary).toContain("import { Card, Chip } from 'heroui-native'");
    expect(detailSummary).toContain(
      'className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0 shadow-none"',
    );
    expect(detailSummary).toContain('<Card.Body className="px-2 py-1.5">');
    expect(detailSummary).not.toContain('<Surface');
    expect(detailSkeleton).toContain(
      'className="bg-surface border-border mx-4 mt-3 rounded-xl border p-0 shadow-none"',
    );
  });

  it('matches loaded plan geometry in overview and detail skeletons', () => {
    const summary = source(
      'src/modules/budget/screens/budget/components/spending_plans_summary.tsx',
    );
    const summaryParts = source(
      'src/modules/budget/screens/budget/components/budget_summary_parts.tsx',
    );
    const overviewSkeleton = source(
      'src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx',
    );
    const detailSkeleton = source(
      'src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_skeleton.tsx',
    );

    expect(summaryParts).toContain('className="mt-1.5 flex-row items-center"');
    expect(summary).not.toContain('w-1/2');
    expect(overviewSkeleton).toContain("import { Card, SkeletonGroup } from 'heroui-native'");
    expect(overviewSkeleton).not.toContain('plansStyles');
    expect(overviewSkeleton.match(/testID="plan-card-action-skeleton"/g)).toHaveLength(1);
    expect(detailSkeleton.match(/testID="plan-detail-insight-skeleton"/g)).toHaveLength(1);
  });
});
