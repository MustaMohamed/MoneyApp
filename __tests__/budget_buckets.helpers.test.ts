import { BudgetGroup, CategoryType } from '@/constants/enums';
import type { Category } from '@/database/entities/category.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { computeBuckets } from '@/modules/budget/screens/budget/budget_buckets.helpers';

const NOW = '2026-05-01T00:00:00.000Z';
const MONTH = '2026-05';

function makeCategory(
  id: string,
  group: BudgetGroup | null,
  type: CategoryType = CategoryType.Expense,
): Category {
  return {
    id,
    name: id,
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

function makeBudget(categoryId: string, limit: number, effectiveFrom = '2026-01'): Budget {
  return {
    id: `${categoryId}-${effectiveFrom}`,
    category_id: categoryId,
    limit_amount: limit,
    effective_from: effectiveFrom,
    created_at: NOW,
    updated_at: NOW,
  };
}

describe('computeBuckets — targets', () => {
  it('computes targets at 50/30/20 of income', () => {
    const result = computeBuckets(20000, [], [], {}, MONTH);
    expect(result.hasIncome).toBe(true);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    const want = result.buckets.find((b) => b.group === BudgetGroup.Want)!;
    const savings = result.buckets.find((b) => b.group === BudgetGroup.Savings)!;
    expect(need.target).toBe(10000);
    expect(want.target).toBe(6000);
    expect(savings.target).toBe(4000);
  });
});

describe('computeBuckets — income guard', () => {
  it('returns hasIncome false when income <= 0', () => {
    const r0 = computeBuckets(0, [], [], {}, MONTH);
    expect(r0.hasIncome).toBe(false);
    expect(r0.buckets).toHaveLength(0);

    const rNeg = computeBuckets(-100, [], [], {}, MONTH);
    expect(rNeg.hasIncome).toBe(false);
  });
});

describe('computeBuckets — allocated', () => {
  const cats = [
    makeCategory('cat_housing', BudgetGroup.Need),
    makeCategory('cat_groceries', BudgetGroup.Need),
    makeCategory('cat_dining', BudgetGroup.Want),
    makeCategory('cat_untagged', null),
  ];
  const budgets = [
    makeBudget('cat_housing', 5000),
    makeBudget('cat_groceries', 3000),
    makeBudget('cat_dining', 2000),
    makeBudget('cat_untagged', 1000),
  ];

  it('sums budgeted tagged categories into their group', () => {
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    const want = result.buckets.find((b) => b.group === BudgetGroup.Want)!;
    expect(need.allocated).toBe(8000);
    expect(want.allocated).toBe(2000);
  });

  it('accumulates untagged budgets into ungrouped', () => {
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    expect(result.ungrouped).toBe(1000);
  });

  it('unallocated = income − (allocated + ungrouped)', () => {
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    // need=8000 + want=2000 + savings=0 + ungrouped=1000 = 11000
    // unallocated = 20000 − 11000 = 9000
    expect(result.unallocated).toBe(9000);
  });
});

describe('computeBuckets — status', () => {
  it('need/want: on-track when allocated <= target', () => {
    const cats = [makeCategory('cat_h', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_h', 5000)]; // target = 10000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.status).toBe('on-track');
  });

  it('need/want: over when allocated > target', () => {
    const cats = [makeCategory('cat_h', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_h', 15000)]; // target = 10000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.status).toBe('over');
  });

  it('savings: ahead when allocated >= target', () => {
    const cats = [makeCategory('cat_s', BudgetGroup.Savings)];
    const budgets = [makeBudget('cat_s', 4000)]; // target = 4000 (exactly)
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const sav = result.buckets.find((b) => b.group === BudgetGroup.Savings)!;
    expect(sav.status).toBe('ahead');
  });

  it('savings: behind when allocated < target', () => {
    const cats = [makeCategory('cat_s', BudgetGroup.Savings)];
    const budgets = [makeBudget('cat_s', 1000)]; // target = 4000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const sav = result.buckets.find((b) => b.group === BudgetGroup.Savings)!;
    expect(sav.status).toBe('behind');
  });
});

describe('computeBuckets — barPct clamped', () => {
  it('barPct is clamped at 1 when over-allocated', () => {
    const cats = [makeCategory('cat_h', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_h', 25000)]; // target = 10000 → ratio = 2.5
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.barPct).toBe(1);
  });

  it('barPct is 0 when nothing allocated', () => {
    const result = computeBuckets(20000, [], [], {}, MONTH);
    for (const b of result.buckets) {
      expect(b.barPct).toBe(0);
    }
  });
});
