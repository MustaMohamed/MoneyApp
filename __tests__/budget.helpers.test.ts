import type { Budget } from '@/database/entities/budget.entity';
import {
  BUDGET_WARNING_THRESHOLD,
  computeCategoryHistory,
  computeCategoryRow,
  computeOverall,
  computeStatus,
  resolveLimitForMonth,
  type MonthResultVM,
} from '@/screens/budget/budget.helpers';

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

describe('resolveLimitForMonth', () => {
  const rows = [row('a', 3000, '2026-03'), row('a', 3500, '2026-05'), row('a', null, '2026-07')];
  it('returns null before the first effective_from', () => {
    expect(resolveLimitForMonth(rows, 'a', '2026-02')).toBeNull();
  });
  it('returns the applicable (latest <= month) limit', () => {
    expect(resolveLimitForMonth(rows, 'a', '2026-03')).toBe(3000);
    expect(resolveLimitForMonth(rows, 'a', '2026-04')).toBe(3000);
    expect(resolveLimitForMonth(rows, 'a', '2026-06')).toBe(3500);
  });
  it('returns null after a tombstone', () => {
    expect(resolveLimitForMonth(rows, 'a', '2026-07')).toBeNull();
    expect(resolveLimitForMonth(rows, 'a', '2026-09')).toBeNull();
  });
  it('returns null for an unknown category', () => {
    expect(resolveLimitForMonth(rows, 'z', '2026-05')).toBeNull();
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
