import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import {
  buildBudgetCategoriesSummary,
  buildBudgetCopyRows,
  buildCategoryBudgetRows,
  computeBudgetHealth,
  computeCategoryHistory,
  computeStatus,
  previousYearMonth,
  remainingLabel,
  resolveBudgetPresentation,
  resolveLimitForMonth,
  type MonthResultVM,
} from '@/modules/budget/screens/budget/budget.helpers';
import { BUDGET_WARNING_PERCENT, budgetBandColor } from '@/modules/budget/utils/budget_summary';
import type { Category } from '@/modules/categories/entities/category.entity';

const NOW = '2026-05-01T00:00:00.000Z';
function row(
  category_id: string,
  limit_amount: number,
  effective_from: string,
  name = 'Budget',
  id = `${category_id}-${name}-${effective_from}`,
): Budget {
  return {
    id,
    category_id,
    name,
    limit_amount,
    effective_from,
    created_at: NOW,
    updated_at: NOW,
  };
}

function category(id: string, name: string, type = CategoryType.Expense): Category {
  return {
    id,
    name,
    type,
    icon: 'food',
    color: '#caa445',
    is_default: 0,
    sort_order: 0,
    budget_group: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

describe('resolveLimitForMonth', () => {
  const rows = [
    row('a', 3000, '2026-03', 'Monthly'),
    row('a', 3500, '2026-05', 'Monthly'),
    row('a', 1500, '2026-05', 'Trip'),
  ];
  it('returns null before the first effective_from', () => {
    expect(resolveLimitForMonth(rows, 'a', '2026-02')).toBeNull();
  });
  it('returns only the explicit total for the requested month', () => {
    expect(resolveLimitForMonth(rows, 'a', '2026-03')).toBe(3000);
    expect(resolveLimitForMonth(rows, 'a', '2026-04')).toBeNull();
    expect(resolveLimitForMonth(rows, 'a', '2026-05')).toBe(5000);
    expect(resolveLimitForMonth(rows, 'a', '2026-06')).toBeNull();
  });
  it('returns null for an unknown category', () => {
    expect(resolveLimitForMonth(rows, 'z', '2026-05')).toBeNull();
  });
});

describe('computeStatus', () => {
  it('over when spent > limit', () => expect(computeStatus(1650, 1500)).toBe('over'));
  it('warning at exactly the threshold', () =>
    expect(computeStatus(BUDGET_WARNING_PERCENT * 10, 1000)).toBe('warning'));
  it('warning when spent == limit (not over)', () =>
    expect(computeStatus(1000, 1000)).toBe('warning'));
  it('under below the threshold', () => expect(computeStatus(500, 1000)).toBe('under'));
  it('under (guarded) when limit <= 0', () => expect(computeStatus(100, 0)).toBe('under'));
});

describe('budget categories ledger view models', () => {
  it('builds parent and child values and reconciles unassigned spending', () => {
    const result = buildCategoryBudgetRows({
      categories: [category('food', 'Food & Dining')],
      budgets: [
        row('food', 2000, '2026-07', 'Monthly meals', 'meals'),
        row('food', 500, '2026-07', 'Dining out', 'dining'),
      ],
      spendByMonth: { food: { '2026-07': 1900 } },
      spendByBudgetId: { meals: 1400, dining: 300 },
      yearMonth: '2026-07',
    });

    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        planned: 2500,
        spent: 1900,
        left: 600,
        usedPct: 0.76,
        status: 'on-track',
        unassignedSpend: 200,
        unassignedSpendLabel: '200 EGP',
      }),
    );
    expect(result.rows[0].budgets).toEqual([
      expect.objectContaining({
        planned: 2000,
        spent: 1400,
        left: 600,
        shareLabel: Strings.budgetCategoriesShare(80),
      }),
      expect.objectContaining({
        planned: 500,
        spent: 300,
        left: 200,
        shareLabel: Strings.budgetCategoriesShare(20),
      }),
    ]);
    for (const budget of result.rows[0].budgets) {
      expect(budget).not.toHaveProperty('categorySharePct');
    }
    expect(result.rows[0].accessibilityLabel).toContain('76% used');
    expect(result.rows[0].budgets[0]?.accessibilityLabel).toContain('70% used');
  });

  it('describes an empty month without usage or status claims', () => {
    const result = buildBudgetCategoriesSummary({
      rows: [],
      expectedIncome: null,
      unbudgetedSpend: 0,
      selectedMonth: '2026-08',
      today: '2026-07-14',
    });

    expect(result.hasPlan).toBe(false);
    expect(result.emptyLabel).toBe('No budget set');
    expect(result.usedLabel).toBeUndefined();
    expect(result.statusItems).toEqual([]);
  });

  it.each([
    ['2026-06', 'Complete'],
    ['2026-07', '16 days left'],
    ['2026-08', 'Planned'],
  ])('labels %s with its month lifecycle', (selectedMonth, lifecycleLabel) => {
    const result = buildBudgetCategoriesSummary({
      rows: [],
      expectedIncome: null,
      unbudgetedSpend: 0,
      selectedMonth,
      today: '2026-07-15',
    });

    expect(result.lifecycleLabel).toBe(lifecycleLabel);
  });

  it.each([
    [799, 1000, 'on-track'],
    [800, 1000, 'watch'],
    [1000, 1000, 'watch'],
    [1001, 1000, 'over'],
  ] as const)('maps %s of %s to %s', (spent, planned, expected) => {
    expect(computeBudgetHealth(spent, planned)).toBe(expected);
  });

  it('separates unbudgeted spend and absent expected income', () => {
    const ledger = buildCategoryBudgetRows({
      categories: [category('food', 'Food & Dining'), category('car', 'Car')],
      budgets: [row('food', 2500, '2026-07', 'Monthly meals', 'meals')],
      spendByMonth: {
        food: { '2026-07': 1900 },
        car: { '2026-07': 450 },
      },
      spendByBudgetId: { meals: 1900 },
      yearMonth: '2026-07',
    });
    const result = buildBudgetCategoriesSummary({
      rows: ledger.rows,
      expectedIncome: null,
      unbudgetedSpend: ledger.unbudgetedSpend,
      selectedMonth: '2026-07',
      today: '2026-07-14',
    });

    expect(result).toEqual(
      expect.objectContaining({
        planned: 2500,
        spent: 1900,
        left: 600,
        usedPct: 0.76,
        unassignedIncome: undefined,
        unbudgetedSpend: 450,
        onTrackCount: 1,
        watchCount: 0,
        overCount: 0,
      }),
    );
  });
});

describe('previousYearMonth', () => {
  it('returns the previous month in the same year', () => {
    expect(previousYearMonth('2026-07')).toBe('2026-06');
  });

  it('wraps January to previous December', () => {
    expect(previousYearMonth('2026-01')).toBe('2025-12');
  });
});

describe('resolveBudgetPresentation', () => {
  it.each([
    [false, false, 'coldLoading'],
    [false, true, 'coldError'],
    [true, false, 'content'],
    [true, true, 'contentWithError'],
  ] as const)('maps matching=%s and error=%s to %s', (hasMatchingSnapshot, loadError, expected) => {
    expect(resolveBudgetPresentation({ hasMatchingSnapshot, loadError })).toBe(expected);
  });
});

describe('buildBudgetCopyRows', () => {
  const categories = [
    category('food', 'Food & Dining'),
    category('car', 'Car'),
    category('salary', 'Salary', CategoryType.Income),
    category('rent', 'Rent'),
  ];

  const rows = [
    row('food', 3000, '2026-05', 'Monthly Food', 'food-may'),
    row('food', 3500, '2026-06', 'Monthly Food', 'food-monthly-jun'),
    row('food', 1500, '2026-06', 'Alexandria Trip Food', 'food-trip-jun'),
    row('food', 4200, '2026-07', 'Monthly Food', 'food-monthly-jul'),
    row('car', 1200, '2026-06', 'Fuel', 'car-fuel-jun'),
    row('rent', 5000, '2026-05', 'Rent', 'rent-may'),
    row('salary', 10000, '2026-06', 'Salary', 'salary-jun'),
  ];

  it('builds copy rows from source-month expense budgets only', () => {
    const vm = buildBudgetCopyRows({
      rows,
      categories,
      sourceMonth: '2026-06',
      targetMonth: '2026-07',
    });

    expect(vm).toEqual([
      {
        id: 'food-monthly-jun',
        categoryId: 'food',
        categoryName: 'Food & Dining',
        name: 'Monthly Food',
        icon: 'food',
        color: '#caa445',
        amount: 3500,
        status: 'will-replace',
      },
      {
        id: 'food-trip-jun',
        categoryId: 'food',
        categoryName: 'Food & Dining',
        name: 'Alexandria Trip Food',
        icon: 'food',
        color: '#caa445',
        amount: 1500,
        status: 'new',
      },
      {
        id: 'car-fuel-jun',
        categoryId: 'car',
        categoryName: 'Car',
        name: 'Fuel',
        icon: 'food',
        color: '#caa445',
        amount: 1200,
        status: 'new',
      },
    ]);
  });

  it('returns an empty checklist when the source month has no active budgets', () => {
    expect(
      buildBudgetCopyRows({
        rows: [row('food', 3000, '2026-05', 'Monthly Food')],
        categories: [category('food', 'Food & Dining')],
        sourceMonth: '2026-06',
        targetMonth: '2026-07',
      }),
    ).toEqual([]);
  });

  it('copies only categories with explicit budgets in the source month', () => {
    const vm = buildBudgetCopyRows({
      rows,
      categories,
      sourceMonth: '2026-07',
      targetMonth: '2026-08',
    });

    expect(vm).toEqual([
      {
        id: 'food-monthly-jul',
        categoryId: 'food',
        categoryName: 'Food & Dining',
        name: 'Monthly Food',
        icon: 'food',
        color: '#caa445',
        amount: 4200,
        status: 'new',
      },
    ]);
  });
});

describe('computeCategoryHistory', () => {
  const results: MonthResultVM[] = [
    {
      yearMonth: '2026-02',
      limit: 3000,
      spent: 2400,
      delta: 600,
      status: 'warning',
      isProvisional: false,
      lifecycle: 'completed',
    },
    {
      yearMonth: '2026-03',
      limit: 3000,
      spent: 3200,
      delta: -200,
      status: 'over',
      isProvisional: false,
      lifecycle: 'completed',
    },
    {
      yearMonth: '2026-04',
      limit: 3000,
      spent: 2750,
      delta: 250,
      status: 'warning',
      isProvisional: false,
      lifecycle: 'completed',
    },
    {
      yearMonth: '2026-05',
      limit: 3000,
      spent: 2400,
      delta: 600,
      status: 'warning',
      isProvisional: true,
      lifecycle: 'provisional',
    },
    {
      yearMonth: '2026-06',
      limit: 3000,
      spent: 0,
      delta: 3000,
      status: 'under',
      isProvisional: false,
      lifecycle: 'planned',
    },
  ];
  it('includes the provisional current month but excludes planned future months', () => {
    const h = computeCategoryHistory(results);
    expect(h.results).toHaveLength(4);
    expect(h.netBanked).toBe(1250);
    expect(h.avgPerMonth).toBe((2400 + 3200 + 2750 + 2400) / 4);
    expect(h.monthsUnder).toBe(3);
    expect(h.monthsTotal).toBe(4);
  });
  it('zero-safe with no months', () => {
    const h = computeCategoryHistory([]);
    expect(h).toEqual({
      results: [],
      netBanked: 0,
      avgPerMonth: 0,
      monthsUnder: 0,
      monthsTotal: 0,
    });
  });
});

describe('budgetBandColor', () => {
  it('0 and 49 of 100 → budgetUnder, 50 → budgetSteady (exactly 50%)', () => {
    expect(budgetBandColor(0, 100)).toBe(Colors.dark.budgetUnder);
    expect(budgetBandColor(49, 100)).toBe(Colors.dark.budgetUnder);
    expect(budgetBandColor(50, 100)).toBe(Colors.dark.budgetSteady);
  });
  it('79 of 100 → budgetSteady, 80 → budgetWatch (exactly 80%)', () => {
    expect(budgetBandColor(79, 100)).toBe(Colors.dark.budgetSteady);
    expect(budgetBandColor(80, 100)).toBe(Colors.dark.budgetWatch);
  });
  it('89 of 100 → budgetWatch, 90 → budgetNear (exactly 90%)', () => {
    expect(budgetBandColor(89, 100)).toBe(Colors.dark.budgetWatch);
    expect(budgetBandColor(90, 100)).toBe(Colors.dark.budgetNear);
  });
  it('100 of 100 → budgetNear (exactly 100% — boundary: near, NOT over), 101 and 500 → budgetOver', () => {
    expect(budgetBandColor(100, 100)).toBe(Colors.dark.budgetNear);
    expect(budgetBandColor(101, 100)).toBe(Colors.dark.budgetOver);
    expect(budgetBandColor(500, 100)).toBe(Colors.dark.budgetOver);
  });
});

// 2399.2 / 2999 is 0.7999999999999999 and 1110.6 / 1234 is 0.8999999999999999: one float step under the boundary.
describe('colour steps and the 80% warning change exactly on their boundary (MA-112)', () => {
  it.each([
    ['80%', 2399.2, 2399.19, 2999, Colors.dark.budgetWatch, Colors.dark.budgetSteady],
    ['90%', 1110.6, 1110.59, 1234, Colors.dark.budgetNear, Colors.dark.budgetWatch],
    ['50%', 500, 499.99, 1000, Colors.dark.budgetSteady, Colors.dark.budgetUnder],
  ] as const)(
    'budgetBandColor opens the %s step at %p and not at %p of %p',
    (_step, onBoundary, oneCentUnder, limit, opened, below) => {
      expect({
        onBoundary: budgetBandColor(onBoundary, limit),
        oneCentUnder: budgetBandColor(oneCentUnder, limit),
      }).toEqual({ onBoundary: opened, oneCentUnder: below });
    },
  );

  it('budgetBandColor reads a spend that ties its limit to the cent as near, and one cent past it as over', () => {
    expect({
      tie: budgetBandColor(1000, 1000),
      floatTie: budgetBandColor(0.1 + 0.2, 0.3),
      oneCentOver: budgetBandColor(1000.01, 1000),
    }).toEqual({
      tie: Colors.dark.budgetNear,
      floatTie: Colors.dark.budgetNear,
      oneCentOver: Colors.dark.budgetOver,
    });
  });

  it('budgetBandColor keeps budgetUnder with nothing to divide by', () => {
    expect(budgetBandColor(5, 0)).toBe(Colors.dark.budgetUnder);
  });

  it('computeStatus reads warning at 2,399.20 of 2,999 and under one cent below', () => {
    expect({
      onBoundary: computeStatus(2399.2, 2999),
      oneCentUnder: computeStatus(2399.19, 2999),
    }).toEqual({ onBoundary: 'warning', oneCentUnder: 'under' });
  });

  // 79.96 + 0.02 + 0.02 is 79.99999999999999, a sum that prints 80 and is 80 to the cent.
  it('computeBudgetHealth reads watch at 2,399.20 of 2,999 and at a float sum of 80 on 100, and on-track one cent below', () => {
    expect({
      onBoundary: computeBudgetHealth(2399.2, 2999),
      floatSum: computeBudgetHealth(79.96 + 0.02 + 0.02, 100),
      oneCentUnder: computeBudgetHealth(2399.19, 2999),
    }).toEqual({ onBoundary: 'watch', floatSum: 'watch', oneCentUnder: 'on-track' });
  });

  const summaryOf = (limit: number, spend: number) => {
    const { rows, unbudgetedSpend } = buildCategoryBudgetRows({
      categories: [category('food', 'Food & Dining')],
      budgets: [row('food', limit, '2026-07', 'Monthly meals', 'meals')],
      spendByMonth: { food: { '2026-07': spend } },
      spendByBudgetId: { meals: spend },
      yearMonth: '2026-07',
    });
    const { usedLabel, barColor } = buildBudgetCategoriesSummary({
      rows,
      expectedIncome: null,
      unbudgetedSpend,
      selectedMonth: '2026-07',
      today: '2026-07-14',
    });
    return { usedLabel, barColor };
  };

  it('the summary bar prints 80% used in the 80% colour from exactly 80%, and in the 50 to 79% colour from 79.5%', () => {
    const usedLabel = Strings.budgetCategoriesSummaryUsed(80);

    expect({
      at795Of1000: summaryOf(1000, 795),
      at800Of1000: summaryOf(1000, 800),
      onFloatBoundary: summaryOf(2999, 2399.2),
    }).toEqual({
      at795Of1000: { usedLabel, barColor: Colors.dark.budgetSteady },
      at800Of1000: { usedLabel, barColor: Colors.dark.budgetWatch },
      onFloatBoundary: { usedLabel, barColor: Colors.dark.budgetWatch },
    });
  });
});

// (145 / 1000) * 100 is 14.499999999999998: a half that a float quotient rounds down.
describe('the Categories lens prints whole percents with a half rounded up (MA-112)', () => {
  const ledger = (budgets: Budget[], spendByBudgetId: Record<string, number>, spend: number) => {
    const { rows, unbudgetedSpend } = buildCategoryBudgetRows({
      categories: [category('food', 'Food & Dining')],
      budgets,
      spendByMonth: { food: { '2026-07': spend } },
      spendByBudgetId,
      yearMonth: '2026-07',
    });
    const summary = buildBudgetCategoriesSummary({
      rows,
      expectedIncome: null,
      unbudgetedSpend,
      selectedMonth: '2026-07',
      today: '2026-07-14',
    });
    return { row: rows[0], summary };
  };

  it('a budget of 1,000 with 145 spent reads 15% on the named budget, on its category row and in both accessibility labels', () => {
    const { row: categoryRow } = ledger(
      [row('food', 1000, '2026-07', 'Monthly meals', 'meals')],
      { meals: 145 },
      145,
    );

    expect(categoryRow).toMatchObject({
      spentPlannedUsedLabel: Strings.budgetCategoriesSpentPlannedUsed('145', '1,000', 15),
      accessibilityLabel: Strings.budgetCategoriesCategoryA11y(
        'Food & Dining',
        '145',
        '1,000',
        15,
        '855',
        'left',
        Strings.budgetCategoriesStatusOnTrack,
      ),
      budgets: [
        {
          usedLabel: '15%',
          accessibilityLabel: Strings.budgetCategoriesBudgetA11y(
            'Monthly meals',
            '145',
            '1,000',
            15,
            '855',
            'left',
          ),
        },
      ],
    });
  });

  it('a budget of 1,000 with 145 spent reads 15% used in the summary', () => {
    const { summary } = ledger(
      [row('food', 1000, '2026-07', 'Monthly meals', 'meals')],
      { meals: 145 },
      145,
    );

    expect(summary.usedLabel).toBe(Strings.budgetCategoriesSummaryUsed(15));
  });

  it('budgets of 145 and 855 in one category give the first 15% of category', () => {
    const { row: categoryRow } = ledger(
      [
        row('food', 145, '2026-07', 'Dining out', 'dining'),
        row('food', 855, '2026-07', 'Monthly meals', 'meals'),
      ],
      {},
      0,
    );

    expect(categoryRow.budgets.find((budget) => budget.id === 'dining')?.shareLabel).toBe(
      Strings.budgetCategoriesShare(15),
    );
  });
});

describe('remainingLabel', () => {
  it('positive remaining → { magnitude, label: "left" }', () => {
    expect(remainingLabel(1800)).toEqual({ magnitude: 1800, label: 'left' });
  });
  it('zero remaining → { magnitude: 0, label: "left" }', () => {
    expect(remainingLabel(0)).toEqual({ magnitude: 0, label: 'left' });
  });
  it('negative remaining → { magnitude: 350, label: "over" }', () => {
    expect(remainingLabel(-350)).toEqual({ magnitude: 350, label: 'over' });
  });
  it('large negative → absolute magnitude', () => {
    expect(remainingLabel(-10000)).toEqual({ magnitude: 10000, label: 'over' });
  });
  it('under half a cent on either side of zero → { magnitude: 0, label: "left" }, and 0.3 over stays over', () => {
    expect(remainingLabel(-0.3)).toEqual({ magnitude: 0.3, label: 'over' });
    expect(remainingLabel(0.1 + 0.2 - 0.3)).toEqual({ magnitude: 0, label: 'left' });
    expect(remainingLabel(0.3 - (0.1 + 0.2))).toEqual({ magnitude: 0, label: 'left' });
  });
});

// 0.1 + 0.2 is 0.30000000000000004: a spend one float step past a limit of 0.3, a tie to the cent.
describe('figures under half a cent and spends that tie their limit to the cent (MA-158)', () => {
  it('computeStatus reads warning at the tie and over 0.01 past it', () => {
    expect(computeStatus(0.31, 0.3)).toBe('over');
    expect(computeStatus(0.1 + 0.2, 0.3)).toBe('warning');
  });

  it('computeBudgetHealth reads watch at the tie and over 0.01 past it', () => {
    expect(computeBudgetHealth(0.31, 0.3)).toBe('over');
    expect(computeBudgetHealth(0.1 + 0.2, 0.3)).toBe('watch');
  });

  const ledger = (spend: number) => {
    const { rows, unbudgetedSpend } = buildCategoryBudgetRows({
      categories: [category('food', 'Food & Dining')],
      budgets: [row('food', 0.3, '2026-07', 'Monthly meals', 'meals')],
      spendByMonth: { food: { '2026-07': spend } },
      spendByBudgetId: { meals: spend },
      yearMonth: '2026-07',
    });
    const summary = buildBudgetCategoriesSummary({
      rows,
      expectedIncome: null,
      unbudgetedSpend,
      selectedMonth: '2026-07',
      today: '2026-07-14',
    });
    return { row: rows[0], budget: rows[0]?.budgets[0], summary };
  };

  it('the category row, its named budget and the summary read left at the tie and over 0.01 past it', () => {
    const leftMeta = Strings.budgetCategoriesBalanceMeta('left');
    const overMeta = Strings.budgetCategoriesBalanceMeta('over');

    const over = ledger(0.31);
    expect(over.row).toMatchObject({
      status: 'over',
      statusChipColor: 'danger',
      balanceMetaLabel: overMeta,
    });
    expect(over.budget).toMatchObject({
      balanceMetaLabel: overMeta,
      ringColor: Colors.dark.budgetOver,
    });
    expect(over.summary).toMatchObject({
      balanceMetaLabel: overMeta,
      balanceColor: Colors.dark.negative,
      barColor: Colors.dark.budgetOver,
      overCount: 1,
    });

    const tie = ledger(0.1 + 0.2);
    expect(tie.row).toMatchObject({
      status: 'watch',
      statusChipColor: 'default',
      balanceMetaLabel: leftMeta,
    });
    expect(tie.budget).toMatchObject({
      balanceMetaLabel: leftMeta,
      ringColor: Colors.dark.budgetNear,
    });
    expect(tie.summary).toMatchObject({
      balanceMetaLabel: leftMeta,
      balanceColor: Colors.dark.positive,
      barColor: Colors.dark.budgetNear,
      overCount: 0,
    });
  });

  it('no unassigned spend shows for a leftover under half a cent, and 0.01 unassigned is kept', () => {
    const unassigned = (categorySpend: number): number | undefined =>
      buildCategoryBudgetRows({
        categories: [category('food', 'Food & Dining')],
        budgets: [row('food', 1, '2026-07', 'Monthly meals', 'meals')],
        spendByMonth: { food: { '2026-07': categorySpend } },
        spendByBudgetId: { meals: 0.3 },
        yearMonth: '2026-07',
      }).rows[0]?.unassignedSpend;

    expect(unassigned(0.31)).toBeCloseTo(0.01);
    expect(unassigned(0.1 + 0.2)).toBe(0);
  });

  it('the summary returns an unbudgeted spend under half a cent as 0, and 0.3 as 0.3', () => {
    const unbudgeted = (unbudgetedSpend: number): number =>
      buildBudgetCategoriesSummary({
        rows: [],
        expectedIncome: null,
        unbudgetedSpend,
        selectedMonth: '2026-07',
        today: '2026-07-14',
      }).unbudgetedSpend;

    expect(unbudgeted(0.3)).toBe(0.3);
    expect(unbudgeted(0.1 + 0.2 - 0.3)).toBe(0);
  });

  const historyMonth = (limit: number, spent: number, delta: number): MonthResultVM => ({
    yearMonth: '2026-02',
    limit,
    spent,
    delta,
    status: 'warning',
    isProvisional: false,
    lifecycle: 'completed',
  });

  it('computeCategoryHistory counts a month that ties its limit as under with a zero delta, and 0.01 past it as over', () => {
    const over = computeCategoryHistory([historyMonth(0.3, 0.31, 0.3 - 0.31)]);
    expect(over.monthsUnder).toBe(0);
    expect(over.results[0]?.delta).toBe(0.3 - 0.31);

    const tie = computeCategoryHistory([historyMonth(0.3, 0.1 + 0.2, 0.3 - (0.1 + 0.2))]);
    expect(tie.results[0]?.delta).toBe(0);
    expect(tie.monthsUnder).toBe(1);
    expect(tie.netBanked).toBe(0);
  });

  it('computeCategoryHistory reads positive zero where two named budgets sum one float step past the spend', () => {
    const history = computeCategoryHistory([historyMonth(0.1 + 0.2, 0.3, 0.1 + 0.2 - 0.3)]);
    expect(Object.is(history.results[0]?.delta, 0)).toBe(true);
    expect(Object.is(history.netBanked, 0)).toBe(true);
    expect(history.monthsUnder).toBe(1);
  });

  it('computeCategoryHistory banks 0 when deltas of 0.3, -0.1 and -0.2 leave a float leftover', () => {
    const history = computeCategoryHistory([
      historyMonth(1, 0.7, 0.3),
      historyMonth(1, 1.1, -0.1),
      historyMonth(1, 1.2, -0.2),
    ]);
    expect(history.netBanked).toBe(0);
  });

  it('computeCategoryHistory returns a spend under half a cent as 0', () => {
    expect(computeCategoryHistory([historyMonth(0.3, 5.5e-17, 0.3)]).results[0]?.spent).toBe(0);
  });
});
