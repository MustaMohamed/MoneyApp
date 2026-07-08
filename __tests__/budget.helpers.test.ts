import { CategoryType } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import {
  BUDGET_WARNING_THRESHOLD,
  buildBudgetCopyRows,
  budgetBandColor,
  computeBudgetSummaryForMonth,
  computeCategoryHistory,
  computeCategoryRow,
  computeOverall,
  computeStatus,
  previousYearMonth,
  remainingLabel,
  resolveLimitForMonth,
  type MonthResultVM,
} from '@/modules/budget/screens/budget/budget.helpers';
import type { Category } from '@/modules/categories/entities/category.entity';

const NOW = '2026-05-01T00:00:00.000Z';
function row(category_id: string, limit_amount: number | null, effective_from: string): Budget {
  return {
    id: `${category_id}-${effective_from}`,
    category_id,
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
  const rows = [row('a', 3000, '2026-03'), row('a', 3500, '2026-05'), row('a', null, '2026-07')];
  it('returns null before the first effective_from', () => {
    expect(resolveLimitForMonth(rows, 'a', '2026-02')).toBeNull();
  });
  it('returns only the explicit limit for the requested month', () => {
    expect(resolveLimitForMonth(rows, 'a', '2026-03')).toBe(3000);
    expect(resolveLimitForMonth(rows, 'a', '2026-04')).toBeNull();
    expect(resolveLimitForMonth(rows, 'a', '2026-05')).toBe(3500);
    expect(resolveLimitForMonth(rows, 'a', '2026-06')).toBeNull();
  });
  it('returns null for an explicit tombstone month', () => {
    expect(resolveLimitForMonth(rows, 'a', '2026-07')).toBeNull();
  });
  it('returns null for an unknown category', () => {
    expect(resolveLimitForMonth(rows, 'z', '2026-05')).toBeNull();
  });
});

describe('computeBudgetSummaryForMonth', () => {
  it('does not carry previous-month budgets into an empty selected month', () => {
    const summary = computeBudgetSummaryForMonth(
      [row('food', 5000, '2026-07'), row('housing', 700, '2026-07')],
      {},
      '2026-08',
    );

    expect(summary).toEqual({ budgeted: 0, spent: 0, left: 0, pct: 0, categoryCount: 0 });
  });
});

describe('computeStatus', () => {
  it('over when spent > limit', () => expect(computeStatus(1650, 1500)).toBe('over'));
  it('warning at exactly the threshold', () =>
    expect(computeStatus(BUDGET_WARNING_THRESHOLD * 1000, 1000)).toBe('warning'));
  it('warning when spent == limit (not over)', () =>
    expect(computeStatus(1000, 1000)).toBe('warning'));
  it('under below the threshold', () => expect(computeStatus(500, 1000)).toBe('under'));
  it('under (guarded) when limit <= 0', () => expect(computeStatus(100, 0)).toBe('under'));
});

describe('computeCategoryRow', () => {
  it('computes available, pct, status', () => {
    const r = computeCategoryRow('a', 3000, 2400);
    expect(r).toEqual({
      categoryId: 'a',
      limit: 3000,
      spent: 2400,
      available: 600,
      pct: 0.8,
      status: 'warning',
    });
  });
  it('available goes negative when over', () => {
    expect(computeCategoryRow('a', 1500, 1650).available).toBe(-150);
  });
});

describe('computeOverall', () => {
  it('sums budgeted categories only', () => {
    const o = computeOverall([
      computeCategoryRow('a', 3000, 2400),
      computeCategoryRow('b', 1500, 1650),
      computeCategoryRow('c', 800, 420),
    ]);
    expect(o.budgeted).toBe(5300);
    expect(o.spent).toBe(4470);
    expect(o.left).toBe(830);
    expect(o.pct).toBeCloseTo(4470 / 5300);
  });
  it('zero-safe with no rows', () => {
    expect(computeOverall([])).toEqual({ budgeted: 0, spent: 0, left: 0, pct: 0 });
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

describe('buildBudgetCopyRows', () => {
  const categories = [
    category('food', 'Food & Dining'),
    category('car', 'Car'),
    category('salary', 'Salary', CategoryType.Income),
    category('rent', 'Rent'),
  ];

  const rows = [
    row('food', 3000, '2026-05'),
    row('food', 3500, '2026-06'),
    row('food', 4200, '2026-07'),
    row('car', 1200, '2026-06'),
    row('rent', 5000, '2026-05'),
    row('rent', null, '2026-06'),
    row('salary', 10000, '2026-06'),
  ];

  it('builds copy rows from source-month active expense budgets only', () => {
    const vm = buildBudgetCopyRows({
      rows,
      categories,
      sourceMonth: '2026-06',
      targetMonth: '2026-07',
    });

    expect(vm).toEqual([
      {
        categoryId: 'food',
        name: 'Food & Dining',
        icon: 'food',
        color: '#caa445',
        amount: 3500,
        status: 'will-replace',
      },
      {
        categoryId: 'car',
        name: 'Car',
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
        rows: [row('food', null, '2026-06')],
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
        categoryId: 'food',
        name: 'Food & Dining',
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
    },
    {
      yearMonth: '2026-03',
      limit: 3000,
      spent: 3200,
      delta: -200,
      status: 'over',
      isProvisional: false,
    },
    {
      yearMonth: '2026-04',
      limit: 3000,
      spent: 2750,
      delta: 250,
      status: 'warning',
      isProvisional: false,
    },
    {
      yearMonth: '2026-05',
      limit: 3000,
      spent: 2400,
      delta: 600,
      status: 'warning',
      isProvisional: true,
    },
  ];
  it('nets the deltas, averages spend, and computes hit-rate', () => {
    const h = computeCategoryHistory(results);
    expect(h.netBanked).toBe(1250);
    expect(h.avgPerMonth).toBe((2400 + 3200 + 2750 + 2400) / 4);
    expect(h.monthsUnder).toBe(3); // Feb, Apr, May under-or-equal; Mar over
    expect(h.monthsTotal).toBe(4);
    expect(h.hitRate).toBeCloseTo(3 / 4);
  });
  it('zero-safe with no months', () => {
    const h = computeCategoryHistory([]);
    expect(h).toEqual({
      results: [],
      netBanked: 0,
      avgPerMonth: 0,
      hitRate: 0,
      monthsUnder: 0,
      monthsTotal: 0,
    });
  });
});

describe('budgetBandColor', () => {
  it('pct=0 → budgetUnder (< 50%)', () => {
    expect(budgetBandColor(0)).toBe(Colors.dark.budgetUnder);
  });
  it('pct=0.49 → budgetUnder (just under 50%)', () => {
    expect(budgetBandColor(0.49)).toBe(Colors.dark.budgetUnder);
  });
  it('pct=0.5 → budgetSteady (exactly 50%)', () => {
    expect(budgetBandColor(0.5)).toBe(Colors.dark.budgetSteady);
  });
  it('pct=0.79 → budgetSteady (just under 80%)', () => {
    expect(budgetBandColor(0.79)).toBe(Colors.dark.budgetSteady);
  });
  it('pct=0.8 → budgetWatch (exactly 80%)', () => {
    expect(budgetBandColor(0.8)).toBe(Colors.dark.budgetWatch);
  });
  it('pct=0.89 → budgetWatch (just under 90%)', () => {
    expect(budgetBandColor(0.89)).toBe(Colors.dark.budgetWatch);
  });
  it('pct=0.9 → budgetNear (exactly 90%)', () => {
    expect(budgetBandColor(0.9)).toBe(Colors.dark.budgetNear);
  });
  it('pct=1.0 → budgetNear (exactly 100% — boundary: near, NOT over)', () => {
    expect(budgetBandColor(1.0)).toBe(Colors.dark.budgetNear);
  });
  it('pct=1.01 → budgetOver (strictly over 100%)', () => {
    expect(budgetBandColor(1.01)).toBe(Colors.dark.budgetOver);
  });
  it('pct=5.0 → budgetOver (large overspend)', () => {
    expect(budgetBandColor(5.0)).toBe(Colors.dark.budgetOver);
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
});
