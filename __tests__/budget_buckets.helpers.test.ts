import { BudgetGroup, CategoryType } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import type { Category } from '@/database/entities/category.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { buildBudgetRuleLens } from '@/modules/budget/screens/budget/budget_buckets.helpers';

const NOW = '2026-05-01T00:00:00.000Z';
const MONTH = '2026-05';
const TODAY = '2026-05-15';

function makeCategory(
  id: string,
  group: BudgetGroup | null,
  name = id,
  type: CategoryType = CategoryType.Expense,
): Category {
  return {
    id,
    name,
    type,
    icon: 'tag',
    color: '#fff',
    is_default: 0,
    sort_order: 0,
    budget_group: group,
    created_at: NOW,
    updated_at: NOW,
  };
}

function makeBudget(
  categoryId: string,
  limit: number,
  name = 'Budget',
  effectiveFrom = MONTH,
): Budget {
  return {
    id: `${categoryId}-${name}-${effectiveFrom}`,
    category_id: categoryId,
    name,
    limit_amount: limit,
    effective_from: effectiveFrom,
    created_at: NOW,
    updated_at: NOW,
  };
}

function build(
  overrides: Partial<Parameters<typeof buildBudgetRuleLens>[0]> = {},
): ReturnType<typeof buildBudgetRuleLens> {
  return buildBudgetRuleLens({
    income: 20_000,
    categories: [],
    budgets: [],
    budgetGroupByCategoryId: {},
    spendByMonth: {},
    selectedMonth: MONTH,
    lifecycleDate: TODAY,
    ...overrides,
  });
}

function bucket(result: ReturnType<typeof buildBudgetRuleLens>, group: BudgetGroup) {
  const match = result.buckets.find((item) => item.group === group);
  if (!match) throw new Error(`Missing ${group} bucket`);
  return match;
}

describe('buildBudgetRuleLens', () => {
  it('classifies rule status using the same whole-EGP precision shown to the user', () => {
    const result = build({
      income: 10_000.01,
      categories: [makeCategory('housing', BudgetGroup.Need, 'Housing')],
      budgets: [makeBudget('housing', 5_000.01)],
      budgetGroupByCategoryId: { housing: BudgetGroup.Need },
    });
    const needs = bucket(result, BudgetGroup.Need);

    expect(needs).toMatchObject({
      target: 5_000,
      planned: 5_000,
      variance: 0,
      status: 'within-cap',
    });
    expect(needs.presentation.varianceLabel).toBe('0');
  });

  it('keeps rounded rule targets equal to the displayed income', () => {
    const result = build({ income: 3 });

    expect(result.buckets.reduce((sum, item) => sum + (item.target ?? 0), 0)).toBe(3);
  });

  it('builds the 50/30/20 summary, bucket totals, actuals, and reconciliation', () => {
    const categories = [
      makeCategory('housing', BudgetGroup.Need, 'Housing'),
      makeCategory('groceries', BudgetGroup.Need, 'Groceries'),
      makeCategory('dining', BudgetGroup.Want, 'Dining'),
      makeCategory('investing', BudgetGroup.Savings, 'Investing'),
      makeCategory('other', null, 'Other'),
      makeCategory('salary', BudgetGroup.Need, 'Salary', CategoryType.Income),
    ];
    const budgets = [
      makeBudget('housing', 5_000),
      makeBudget('groceries', 3_000),
      makeBudget('dining', 2_000),
      makeBudget('investing', 1_000),
      makeBudget('other', 1_000),
      makeBudget('salary', 99_000),
    ];

    const result = build({
      categories,
      budgets,
      budgetGroupByCategoryId: {
        housing: BudgetGroup.Need,
        groceries: BudgetGroup.Need,
        dining: BudgetGroup.Want,
        investing: BudgetGroup.Savings,
      },
      spendByMonth: {
        housing: { [MONTH]: 1_600 },
        groceries: { [MONTH]: 900 },
        dining: { [MONTH]: 700 },
        investing: { [MONTH]: 8_000 },
        other: { [MONTH]: 300 },
        salary: { [MONTH]: 50_000 },
      },
    });

    expect(result.summary).toMatchObject({
      income: 20_000,
      hasIncome: true,
      groupedPlanned: 11_000,
      notGroupedPlanned: 1_000,
      totalPlanned: 12_000,
      leftToPlan: 8_000,
      plannedRatio: 0.6,
      progressRatio: 0.6,
      lifecycle: 'current',
      daysLeft: 16,
    });
    expect(result.buckets.map((item) => item.group)).toEqual([
      BudgetGroup.Need,
      BudgetGroup.Want,
      BudgetGroup.Savings,
    ]);
    expect(bucket(result, BudgetGroup.Need)).toMatchObject({
      ruleRatio: 0.5,
      target: 10_000,
      planned: 8_000,
      actual: 2_500,
      variance: 2_000,
      planRatio: 0.8,
      progressRatio: 0.8,
      status: 'within-cap',
    });
    expect(
      bucket(result, BudgetGroup.Need).contributors.find((item) => item.categoryId === 'housing'),
    ).toMatchObject({
      presentation: {
        progressRatio: 0.32,
        ringColor: Colors.dark.budgetUnder,
        resultMetaLabel: undefined,
      },
    });
    expect(bucket(result, BudgetGroup.Want)).toMatchObject({
      ruleRatio: 0.3,
      target: 6_000,
      planned: 2_000,
      actual: 700,
      variance: 4_000,
      status: 'within-cap',
    });
    expect(bucket(result, BudgetGroup.Savings)).toMatchObject({
      ruleRatio: 0.2,
      target: 4_000,
      planned: 1_000,
      variance: 3_000,
      status: 'below-target',
    });
    expect(bucket(result, BudgetGroup.Savings).actual).toBeUndefined();
    expect(result.notGrouped).toMatchObject({
      planned: 1_000,
      spent: 300,
      presentation: {
        titleLabel: 'Not grouped',
        bodyLabel: 'Not counted in the rule breakdown',
        amountsLabel: '1,000 planned · 300 spent',
      },
    });
  });

  it('provides approved no-income summary presentation copy', () => {
    const result = build({
      income: null,
      categories: [makeCategory('housing', BudgetGroup.Need, 'Housing')],
      budgets: [makeBudget('housing', 5_000)],
      budgetGroupByCategoryId: { housing: BudgetGroup.Need },
    });

    expect(result.summary.presentation).toMatchObject({
      primaryLabel: 'Set monthly planning income',
      contextLabel: 'Income is needed to calculate rule targets',
      progressLabel: 'Not ready',
      incomeMetricValue: 'Set income',
    });
  });

  it('provides approved no-budget summary presentation copy', () => {
    const result = build();

    expect(result.summary.presentation).toMatchObject({
      primaryLabel: '20,000 EGP left to plan',
      contextLabel: 'No category budgets planned for May',
      progressLabel: '0% planned',
    });
  });

  it('compares recorded spending with the plan in a within-cap insight', () => {
    const result = build({
      categories: [makeCategory('housing', BudgetGroup.Need, 'Housing')],
      budgets: [makeBudget('housing', 8_000)],
      budgetGroupByCategoryId: { housing: BudgetGroup.Need },
      spendByMonth: { housing: { [MONTH]: 6_150 } },
    });

    expect(bucket(result, BudgetGroup.Need).presentation.insightLabel).toBe(
      'Recorded Needs spending is 1,850 EGP below the amount planned so far.',
    );
  });

  it('uses the selected-month snapshot and allows default fallback without configured income', () => {
    const result = build({
      income: null,
      categories: [
        makeCategory('snapshotted', BudgetGroup.Want, 'Snapshotted'),
        makeCategory('fallback', BudgetGroup.Want, 'Fallback'),
      ],
      budgets: [makeBudget('snapshotted', 1_000), makeBudget('fallback', 500)],
      budgetGroupByCategoryId: { snapshotted: BudgetGroup.Need },
      spendByMonth: {
        snapshotted: { [MONTH]: 200 },
        fallback: { [MONTH]: 100 },
      },
    });

    expect(bucket(result, BudgetGroup.Need)).toMatchObject({ planned: 1_000, actual: 200 });
    expect(bucket(result, BudgetGroup.Want)).toMatchObject({ planned: 500, actual: 100 });
    expect(result.notGrouped).toBeUndefined();
  });

  it('reconciles an absent snapshot as not grouped when income is configured', () => {
    const result = build({
      categories: [makeCategory('fallback', BudgetGroup.Want, 'Fallback')],
      budgets: [makeBudget('fallback', 500)],
      spendByMonth: { fallback: { [MONTH]: 100 } },
    });

    expect(bucket(result, BudgetGroup.Want)).toMatchObject({
      planned: 0,
      actual: 0,
      contributors: [],
    });
    expect(result.summary).toMatchObject({ groupedPlanned: 0, notGroupedPlanned: 500 });
    expect(result.notGrouped).toMatchObject({ planned: 500, spent: 100 });
  });

  it('sums every named monthly budget once while counting category spend once', () => {
    const result = build({
      categories: [makeCategory('housing', BudgetGroup.Need, 'Housing')],
      budgets: [
        makeBudget('housing', 5_000, 'Rent'),
        makeBudget('housing', 800, 'Maintenance'),
        makeBudget('housing', 10_000, 'Old rent', '2026-04'),
      ],
      budgetGroupByCategoryId: { housing: BudgetGroup.Need },
      spendByMonth: { housing: { [MONTH]: 1_600 } },
    });

    expect(bucket(result, BudgetGroup.Need)).toMatchObject({ planned: 5_800, actual: 1_600 });
    expect(bucket(result, BudgetGroup.Need).contributors).toEqual([
      expect.objectContaining({ categoryId: 'housing', planned: 5_800, spent: 1_600 }),
    ]);
  });

  it('includes unbudgeted grouped expense activity in actuals and contributors', () => {
    const result = build({
      categories: [makeCategory('health', BudgetGroup.Need, 'Health')],
      budgetGroupByCategoryId: { health: BudgetGroup.Need },
      spendByMonth: { health: { [MONTH]: 250 } },
    });
    const needs = bucket(result, BudgetGroup.Need);

    expect(needs).toMatchObject({ planned: 0, actual: 250, status: 'no-plan' });
    expect(needs.contributors.find((item) => item.categoryId === 'health')).toMatchObject({
      planned: 0,
      spent: 250,
      planShareRatio: undefined,
      isUnbudgeted: true,
      presentation: {
        progressRatio: 1,
        ringColor: Colors.dark.budgetNear,
        resultMetaLabel: 'unbudgeted',
      },
    });
  });

  it('keeps all rows but leaves targets, ratios, and variances unavailable without income', () => {
    const result = build({
      income: 0,
      categories: [
        makeCategory('housing', BudgetGroup.Need, 'Housing'),
        makeCategory('other', null, 'Other'),
      ],
      budgets: [makeBudget('housing', 2_000), makeBudget('other', 500)],
      budgetGroupByCategoryId: { housing: BudgetGroup.Need },
      spendByMonth: { housing: { [MONTH]: 700 }, other: { [MONTH]: 100 } },
    });

    expect(result.summary).toMatchObject({
      income: undefined,
      hasIncome: false,
      groupedPlanned: 2_000,
      notGroupedPlanned: 500,
      totalPlanned: 2_500,
      leftToPlan: undefined,
      plannedRatio: undefined,
      progressRatio: undefined,
    });
    expect(result.buckets).toHaveLength(3);
    for (const row of result.buckets) {
      expect(row).toMatchObject({
        target: undefined,
        variance: undefined,
        planRatio: undefined,
        progressRatio: undefined,
        status: 'income-needed',
      });
    }
    expect(bucket(result, BudgetGroup.Need).actual).toBe(700);
    expect(bucket(result, BudgetGroup.Savings).actual).toBeUndefined();
    expect(result.notGrouped).toMatchObject({ planned: 500, spent: 100 });
  });

  it('uses no-plan statuses with income and no budgets while retaining recorded activity', () => {
    const result = build({
      categories: [
        makeCategory('health', BudgetGroup.Need, 'Health'),
        makeCategory('fun', BudgetGroup.Want, 'Fun'),
      ],
      budgetGroupByCategoryId: { health: BudgetGroup.Need, fun: BudgetGroup.Want },
      spendByMonth: { health: { [MONTH]: 250 }, fun: { [MONTH]: 100 } },
    });

    expect(result.summary).toMatchObject({
      totalPlanned: 0,
      leftToPlan: 20_000,
      plannedRatio: 0,
      progressRatio: 0,
    });
    expect(result.buckets.map((item) => item.status)).toEqual(['no-plan', 'no-plan', 'no-plan']);
    expect(bucket(result, BudgetGroup.Need).actual).toBe(250);
    expect(bucket(result, BudgetGroup.Want).actual).toBe(100);
    expect(result.notGrouped).toBeUndefined();
  });

  it('retains true ratios while clamping visual progress for over-plan states', () => {
    const result = build({
      categories: [
        makeCategory('housing', BudgetGroup.Need, 'Housing'),
        makeCategory('investing', BudgetGroup.Savings, 'Investing'),
        makeCategory('other', null, 'Other'),
      ],
      budgets: [
        makeBudget('housing', 15_000),
        makeBudget('investing', 4_000),
        makeBudget('other', 7_000),
      ],
      budgetGroupByCategoryId: {
        housing: BudgetGroup.Need,
        investing: BudgetGroup.Savings,
      },
    });

    expect(result.summary).toMatchObject({
      totalPlanned: 26_000,
      leftToPlan: -6_000,
      plannedRatio: 1.3,
      progressRatio: 1,
    });
    expect(bucket(result, BudgetGroup.Need)).toMatchObject({
      planRatio: 1.5,
      progressRatio: 1,
      variance: -5_000,
      status: 'over-cap',
    });
    expect(bucket(result, BudgetGroup.Savings)).toMatchObject({
      planRatio: 1,
      progressRatio: 1,
      variance: 0,
      status: 'target-met',
    });
  });

  it('sorts contributors by planned, then spent, then name', () => {
    const categories = [
      makeCategory('zeta', BudgetGroup.Need, 'Zeta'),
      makeCategory('alpha', BudgetGroup.Need, 'Alpha'),
      makeCategory('beta', BudgetGroup.Need, 'Beta'),
      makeCategory('gamma', BudgetGroup.Need, 'Gamma'),
    ];
    const result = build({
      categories,
      budgets: [
        makeBudget('zeta', 1_000),
        makeBudget('alpha', 1_000),
        makeBudget('beta', 1_000),
        makeBudget('gamma', 2_000),
      ],
      budgetGroupByCategoryId: Object.fromEntries(
        categories.map((category) => [category.id, BudgetGroup.Need]),
      ),
      spendByMonth: {
        zeta: { [MONTH]: 200 },
        alpha: { [MONTH]: 300 },
        beta: { [MONTH]: 300 },
      },
    });

    expect(bucket(result, BudgetGroup.Need).contributors.map((item) => item.name)).toEqual([
      'Gamma',
      'Alpha',
      'Beta',
      'Zeta',
    ]);
  });

  it('uses category id as the final contributor sort tie-breaker', () => {
    const categories = [
      makeCategory('z-id', BudgetGroup.Need, 'Same'),
      makeCategory('a-id', BudgetGroup.Need, 'Same'),
    ];
    const result = build({
      categories,
      budgets: [makeBudget('z-id', 1_000), makeBudget('a-id', 1_000)],
      budgetGroupByCategoryId: {
        'z-id': BudgetGroup.Need,
        'a-id': BudgetGroup.Need,
      },
      spendByMonth: {
        'z-id': { [MONTH]: 300 },
        'a-id': { [MONTH]: 300 },
      },
    });

    expect(bucket(result, BudgetGroup.Need).contributors.map((item) => item.categoryId)).toEqual([
      'a-id',
      'z-id',
    ]);
  });

  it.each([
    ['negative', -500],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
  ])('normalizes %s budget and spend inputs to zero', (_label, invalidAmount) => {
    const result = build({
      categories: [
        makeCategory('needs', BudgetGroup.Need, 'Needs'),
        makeCategory('ungrouped', BudgetGroup.Want, 'Ungrouped'),
      ],
      budgets: [
        makeBudget('needs', 1_000, 'Valid'),
        makeBudget('needs', invalidAmount, 'Invalid'),
        makeBudget('ungrouped', invalidAmount, 'Invalid'),
      ],
      budgetGroupByCategoryId: { needs: BudgetGroup.Need },
      spendByMonth: {
        needs: { [MONTH]: invalidAmount },
        ungrouped: { [MONTH]: invalidAmount },
      },
    });
    const needs = bucket(result, BudgetGroup.Need);

    expect(result.summary).toMatchObject({
      groupedPlanned: 1_000,
      notGroupedPlanned: 0,
      totalPlanned: 1_000,
      leftToPlan: 19_000,
      plannedRatio: 0.05,
      progressRatio: 0.05,
    });
    expect(needs).toMatchObject({
      planned: 1_000,
      actual: 0,
      variance: 9_000,
      planRatio: 0.1,
      progressRatio: 0.1,
    });
    expect(needs.contributors).toEqual([
      expect.objectContaining({ planned: 1_000, spent: 0, planShareRatio: 1 }),
    ]);
    expect(result.notGrouped).toBeUndefined();
  });

  it('never derives Savings actuals or spend contributors', () => {
    const result = build({
      categories: [
        makeCategory('investing', BudgetGroup.Savings, 'Investing'),
        makeCategory('cash', BudgetGroup.Savings, 'Cash'),
      ],
      budgets: [makeBudget('investing', 2_000)],
      budgetGroupByCategoryId: {
        investing: BudgetGroup.Savings,
        cash: BudgetGroup.Savings,
      },
      spendByMonth: {
        investing: { [MONTH]: 900 },
        cash: { [MONTH]: 500 },
      },
    });
    const savings = bucket(result, BudgetGroup.Savings);

    expect(savings.actual).toBeUndefined();
    expect(savings.contributors).toEqual([
      expect.objectContaining({
        categoryId: 'investing',
        planned: 2_000,
        spent: undefined,
        isUnbudgeted: false,
      }),
    ]);
  });

  it.each([
    ['2026-04', 'completed', undefined],
    ['2026-05', 'current', 16],
    ['2026-06', 'planned', undefined],
  ] as const)('classifies %s lifecycle as %s', (selectedMonth, lifecycle, daysLeft) => {
    const result = build({ selectedMonth });

    expect(result.summary.lifecycle).toBe(lifecycle);
    expect(result.summary.daysLeft).toBe(daysLeft);
  });

  it.each([
    ['2028-02', '2028-02-28', 'current', 1],
    ['2028-02', '2028-02-29', 'current', 0],
    ['2026-04', '2026-04-30', 'current', 0],
    ['2026-12', '2026-12-31', 'current', 0],
    ['2027-01', '2027-01-01', 'current', 30],
    ['2026-12', '2027-01-01', 'completed', undefined],
    ['2027-01', '2026-12-31', 'planned', undefined],
  ] as const)(
    'handles lifecycle edge %s viewed on %s',
    (selectedMonth, lifecycleDate, lifecycle, daysLeft) => {
      const result = build({ selectedMonth, lifecycleDate });

      expect(result.summary.lifecycle).toBe(lifecycle);
      expect(result.summary.daysLeft).toBe(daysLeft);
    },
  );

  it('uses singular lifecycle copy when one day remains', () => {
    const result = build({ selectedMonth: '2028-02', lifecycleDate: '2028-02-28' });

    expect(result.summary.presentation.lifecycleLabel).toBe('1 day left');
  });

  it('does not mutate any input collection', () => {
    const input: Parameters<typeof buildBudgetRuleLens>[0] = {
      income: 20_000,
      categories: [makeCategory('housing', BudgetGroup.Need, 'Housing')],
      budgets: [makeBudget('housing', -500)],
      budgetGroupByCategoryId: { housing: BudgetGroup.Need },
      spendByMonth: { housing: { [MONTH]: -100 } },
      selectedMonth: MONTH,
      lifecycleDate: TODAY,
    };
    const before = JSON.stringify(input);

    buildBudgetRuleLens(input);

    expect(JSON.stringify(input)).toBe(before);
  });
});
