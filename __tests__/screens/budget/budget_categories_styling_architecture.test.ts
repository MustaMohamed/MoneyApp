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

    expect(
      source('src/modules/budget/screens/budget/components/budget_summary_parts.tsx'),
    ).toContain("import { Chip, PressableFeedback } from 'heroui-native'");
    expect(
      source('src/modules/budget/screens/budget/components/budget_summary_parts.tsx'),
    ).toContain("import { Text } from '@/components/ui/text'");
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

  it('uses one root income sheet and the shared HeroUI input composition', () => {
    const screen = source('src/modules/budget/screens/budget/index.tsx');
    const lens = source(
      'src/modules/budget/screens/budget/components/fifty_thirty_twenty_lens.tsx',
    );
    const incomeSheet = source('src/modules/budget/screens/budget/components/income_sheet.tsx');

    expect(screen.match(/<IncomeSheet/g)).toHaveLength(1);
    expect(screen).toContain('onEditIncome={openIncomeSheet}');
    expect(lens).toContain('onEditIncome: () => void');
    expect(lens).not.toContain('useIncomeSheetState');
    expect(lens).not.toContain('<IncomeSheet');
    expect(incomeSheet).toContain("import { Input } from '@/components/ui/input'");
    expect(incomeSheet).toContain('suffix=');
    expect(incomeSheet).toContain('errorMessage={state.errorMessage}');
    expect(incomeSheet).toContain('isDisabled={state.saving}');
    expect(incomeSheet).toContain('isDismissable={!state.saving}');
    expect(incomeSheet).toContain('accessibilityLabel={amountAccessibilityLabel}');
    expect(incomeSheet).toContain('`${amountLabel}, ${Strings.currencyEgp}`');
    expect(incomeSheet).toContain('accessibilityLiveRegion="assertive"');
    expect(incomeSheet).not.toContain('border-accent flex-row');
  });

  it('keeps lifecycle and save orchestration out of state stores', () => {
    const addSheetState = source(
      'src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.state.ts',
    );
    const addSheetHook = source(
      'src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.hook.ts',
    );
    const setBudgetState = source(
      'src/modules/budget/screens/budget/components/set_budget_sheet.state.ts',
    );
    const setBudgetHook = source(
      'src/modules/budget/screens/budget/components/set_budget_sheet.hook.ts',
    );

    expect(addSheetState).not.toMatch(/useEffect|setTimeout/);
    expect(addSheetHook).toMatch(/useEffect|setTimeout/);
    expect(setBudgetState).not.toMatch(/async|Promise|Strings/);
    expect(setBudgetHook).toContain('runSave');
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
    expect(parent).toContain('width: Size.budgetCategoryColumn');
    expect(child).toContain('width: Size.budgetCategoryColumn');
    expect(unassigned).toContain('width: Size.budgetCategoryColumn');
    expect(child).toContain('size={Size.budgetNamedRing}');
  });

  it('wraps long category and budget names without shrinking their metadata chips', () => {
    const parent = source('src/modules/budget/screens/budget/components/category_budget_row.tsx');
    const child = source('src/modules/budget/screens/budget/components/named_budget_row.tsx');

    expect(parent).toMatch(/numberOfLines=\{2\}/);
    expect(child).toMatch(/numberOfLines=\{2\}/);
    expect(parent).toContain('className="font-sora text-foreground flex-1 font-semibold"');
    expect(child).toContain('className="font-sora text-foreground flex-1 font-semibold"');
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
    expect(child).toContain('minHeight: TouchSize.min');
    expect(child).toContain('minWidth: TouchSize.min');
    expect(unassigned).toContain('Strings.budgetCategoriesUnassignedExplanation');
  });

  it('uses neutral styling for reconciliation and category detail rows', () => {
    const parent = source('src/modules/budget/screens/budget/components/category_budget_row.tsx');
    const unassigned = source(
      'src/modules/budget/screens/budget/components/unassigned_spending_row.tsx',
    );

    expect(unassigned).toContain('bg-default/30');
    expect(unassigned).toContain('border-border bg-default');
    expect(unassigned).toContain('text-foreground');
    expect(unassigned).not.toContain('warning');
    expect(parent).toContain('border-border bg-default');
    expect(parent).toContain('className="font-inter text-foreground flex-1 font-semibold"');
    expect(parent).not.toContain('text-accent');
    expect(parent).not.toContain('Colors.dark.gold');
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
    const plansSummary = source(
      'src/modules/budget/screens/budget/components/spending_plans_summary.tsx',
    );
    const summaryParts = source(
      'src/modules/budget/screens/budget/components/budget_summary_parts.tsx',
    );
    const skeleton = source(
      'src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx',
    );
    const plansLens = source(
      'src/modules/budget/screens/budget/components/spending_plans_lens.tsx',
    );

    expect(summary).toContain('<Card.Body className="px-2 py-1.5">');
    expect(summary).toContain('<BudgetSummaryMetricsRow');
    expect(summary).not.toMatch(/text-\[[\d.]+px\]/);
    expect(summary).not.toContain('const content = (');
    expect(summary).toContain('<BudgetSummaryHeader');
    expect(summary).toContain('<BudgetSummarySpentRow');
    expect(summary).toContain('<BudgetSummaryStatusRow');
    expect(summary).toContain('trailingLabel={summary.lifecycleLabel}');
    expect(plansSummary).toContain('<BudgetSummaryHeader');
    expect(plansSummary).toContain('<BudgetSummarySpentRow');
    expect(plansSummary).toContain('<BudgetSummaryStatusRow');
    expect(plansSummary).toContain('trailingChipLabel={');
    expect(summaryParts).toContain('fontSize: Type.bodyStrong');
    expect(summaryParts).toContain('fontSize: Type.detail');
    expect(summaryParts).toContain('fontSize: Type.meta');
    expect(summaryParts).toContain('fontSize: Type.summary');
    expect(summaryParts).toContain('letterSpacing: LetterSpacing.eyebrow');
    expect(summaryParts).toContain(
      'className="border-border mt-1.5 flex-row items-stretch border-t pt-1"',
    );
    expect(summaryParts).toContain('className="mt-1.5 flex-row items-center"');
    expect(summaryParts).toContain('const metricClassName =');
    expect(summaryParts).not.toContain('adjustsFontSizeToFit');
    expect(summaryParts).not.toContain('minimumFontScale');
    expect(skeleton).toContain('testID="categories-summary-skeleton"');
    expect(
      skeleton.match(
        /className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0 shadow-none"/g,
      ),
    ).toHaveLength(2);
    expect(plansLens).toContain('<View className="mt-3 px-4">');
  });

  it('only makes unassigned income actionable when income is not configured', () => {
    const summary = source('src/modules/budget/screens/budget/components/summary_card.tsx');

    expect(summary).toContain(
      'onPress: summary.unassignedIncome === undefined ? onSetIncome : undefined',
    );
    expect(summary).toMatch(/accessibilityLabel:\s*summary\.unassignedIncome === undefined/);
  });

  it('uses a stable cold-load viewport instead of guessed ledger row counts', () => {
    const skeleton = source(
      'src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx',
    );

    expect(skeleton).not.toContain('DEFAULT_CATEGORY_ROWS');
    expect(skeleton).not.toContain('DEFAULT_PLAN_ROWS');
    expect(skeleton).toContain('testID="budget-cold-content-skeleton"');
    expect(skeleton).toContain('minHeight: Size.budgetColdContentHeight');
  });

  it('keeps category expansion controlled and refresh skeleton geometry data-driven', () => {
    const parent = source('src/modules/budget/screens/budget/components/category_budget_row.tsx');
    const child = source('src/modules/budget/screens/budget/components/named_budget_row.tsx');
    const skeleton = source(
      'src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx',
    );

    expect(parent).toContain("value={props.isExpanded ? row.categoryId : ''}");
    expect(parent).toContain('props.onExpandedChange(');
    expect(child).toContain('onPress={() => onEdit(budget.id)}');
    expect(child).toContain('onPress={() => onDelete({ id: budget.id, name: budget.name })}');
    expect(skeleton).toContain('const renderedRows = hasKnownLayout ? categoryRows : []');
    expect(skeleton).toContain('categoryRow.budgets.map');
    expect(skeleton).toContain('rowCount={preserveLayout || planRowCount > 0');
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
