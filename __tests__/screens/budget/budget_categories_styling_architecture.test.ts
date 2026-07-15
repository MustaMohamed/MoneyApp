import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PRESENTATION_FILES = [
  'src/modules/budget/screens/budget/index.tsx',
  'src/modules/budget/screens/budget/components/summary_card.tsx',
  'src/modules/budget/screens/budget/components/budget_bar.tsx',
  'src/modules/budget/screens/budget/components/budget_tool_rail.tsx',
  'src/modules/budget/screens/budget/components/category_budget_row.tsx',
  'src/modules/budget/screens/budget/components/named_budget_row.tsx',
  'src/modules/budget/screens/budget/components/unassigned_spending_row.tsx',
  'src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx',
  'src/modules/budget/screens/budget/components/income_sheet.tsx',
  'src/modules/transactions/screens/transactions/transaction_form/index.tsx',
  'src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx',
  'src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx',
];

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('budget categories presentation architecture', () => {
  it('uses HeroUI and Uniwind instead of feature-level StyleSheets', () => {
    for (const path of PRESENTATION_FILES) {
      const text = source(path);
      expect(text).not.toContain('StyleSheet');
    }

    expect(source('src/modules/budget/screens/budget/components/summary_card.tsx')).toContain(
      "import { Card, PressableFeedback } from 'heroui-native'",
    );
    expect(source('src/modules/budget/screens/budget/components/summary_card.tsx')).toContain(
      "import { Text } from '@/components/ui/text'",
    );
    expect(
      source('src/modules/budget/screens/budget/components/category_budget_row.tsx'),
    ).toContain(
      "import { Accordion, Chip, PressableFeedback, Text as HeroText } from 'heroui-native'",
    );
  });

  it('keeps route templates free of hook-local UI state', () => {
    expect(source('src/modules/budget/screens/budget/index.tsx')).not.toMatch(
      /useState|useSharedValue/,
    );
    expect(
      source('src/modules/transactions/screens/transactions/transaction_form/index.tsx'),
    ).not.toMatch(/useState|useSharedValue/);
    expect(
      source('src/modules/budget/screens/budget/category_detail/category_detail.hook.ts'),
    ).not.toMatch(/\buseState\(/);
  });

  it('keeps parent progress circular and child rows aligned', () => {
    const parent = source('src/modules/budget/screens/budget/components/category_budget_row.tsx');
    const child = source('src/modules/budget/screens/budget/components/named_budget_row.tsx');
    const unassigned = source(
      'src/modules/budget/screens/budget/components/unassigned_spending_row.tsx',
    );

    expect(parent).toContain('<BudgetRing');
    expect(parent).not.toContain('<BudgetBar');
    expect(parent).not.toContain('w-[46px]');
    expect(child).not.toContain('w-[46px]');
    expect(unassigned).not.toContain('w-[46px]');
    expect(parent).toContain('width: ms(46)');
    expect(child).toContain('width: ms(46)');
    expect(unassigned).toContain('width: ms(46)');
    expect(child).toContain('size={ms(34)}');
  });

  it('keeps ledger controls accessible and explains unassigned spending', () => {
    const parent = source('src/modules/budget/screens/budget/components/category_budget_row.tsx');
    const child = source('src/modules/budget/screens/budget/components/named_budget_row.tsx');
    const unassigned = source(
      'src/modules/budget/screens/budget/components/unassigned_spending_row.tsx',
    );

    expect(parent).toContain('accessibilityState={{ expanded: props.isExpanded }}');
    expect(child).not.toMatch(/return \(\s*<View\s+accessible/);
    expect(child).toContain('accessibilityLabel={budget.accessibilityLabel}');
    expect(child).toContain('minHeight: ms(44)');
    expect(child).toContain('minWidth: ms(44)');
    expect(unassigned).toContain('Strings.budgetCategoriesUnassignedExplanation');
  });

  it('anchors named budget actions below the trailing trigger', () => {
    const child = source('src/modules/budget/screens/budget/components/named_budget_row.tsx');

    expect(child).toContain('presentation="popover"');
    expect(child).toContain('placement="bottom"');
    expect(child).toContain('align="end"');
    expect(child).toContain('width={Size.budgetActionMenuWidth}');
    expect(child).toContain(
      'className="bg-surface border-border shadow-overlay rounded-lg border px-1 py-1"',
    );
    expect(child).not.toContain('width={ms(180)}');
  });

  it('matches the plans summary hierarchy in loaded and loading states', () => {
    const summary = source('src/modules/budget/screens/budget/components/summary_card.tsx');
    const skeleton = source(
      'src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx',
    );
    const plansLens = source(
      'src/modules/budget/screens/budget/components/spending_plans_lens.tsx',
    );

    expect(summary).toContain('<Card.Body className="px-2 py-1.5">');
    expect(summary).toContain('text-[13px] font-semibold tracking-[0.3px] uppercase');
    expect(summary).toContain('text-[31px] font-bold');
    expect(summary).toContain('text-[15px] font-semibold');
    expect(summary).toContain(
      'className="border-border mt-1.5 flex-row items-stretch border-t pt-1"',
    );
    expect(summary).toContain('className="mt-1.5 flex-row items-center"');
    expect(summary).not.toContain('text-[9px]');
    expect(summary).not.toContain('const content = (');
    expect(summary).toContain('const metricClassName =');
    expect(skeleton).toContain('testID="categories-summary-skeleton"');
    expect(
      skeleton.match(
        /className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0 shadow-none"/g,
      ),
    ).toHaveLength(2);
    expect(plansLens).toContain('<View className="mt-3 px-4">');
  });

  it('uses the centralized EGP label in transaction budget presentation', () => {
    const picker = source(
      'src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx',
    );

    expect(picker).toContain('Strings.currencyEgp');
    expect(picker).not.toMatch(/\} EGP/);
  });

  it('scales transaction form geometry passed through style and icon props', () => {
    const form = source(
      'src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx',
    );

    expect(form).not.toMatch(/size=\{18\}|gap: 8|padding: 16|paddingBottom: 24/);
    expect(form).toContain('size={ms(18)}');
    expect(form).toContain('gap: ms(8)');
  });
});
