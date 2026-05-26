import { BudgetGroup } from '@/constants/enums';
import { CategoryType } from '@/constants/enums';
import type { Budget } from '@/database/entities/budget.entity';
import type { Category } from '@/database/entities/category.entity';
import {
  computeBuckets,
  type BucketStatus,
  type BucketVM,
  type BucketsVM,
} from '@/screens/budget/budget_buckets.helpers';

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

// Case 1 — targets are 50/30/20 of income
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

// Case 6 — income = 0 / unset suppresses buckets
describe('computeBuckets — income guard', () => {
  it('returns hasIncome false when income <= 0', () => {
    const r0 = computeBuckets(0, [], [], {}, MONTH);
    expect(r0.hasIncome).toBe(false);
    expect(r0.buckets).toHaveLength(0);

    const rNeg = computeBuckets(-100, [], [], {}, MONTH);
    expect(rNeg.hasIncome).toBe(false);
  });
});

// Case 2 — allocated sums only budgeted, tagged categories
describe('computeBuckets — allocated', () => {
  const cats = [
    makeCategory('cat_housing', BudgetGroup.Need),
    makeCategory('cat_groceries', BudgetGroup.Need),
    makeCategory('cat_dining', BudgetGroup.Want),
    makeCategory('cat_untagged', null), // untagged — must not enter any bucket
  ];
  const budgets = [
    makeBudget('cat_housing', 5000),
    makeBudget('cat_groceries', 2500),
    makeBudget('cat_dining', 1500),
    makeBudget('cat_untagged', 800),
  ];

  it('sums allocated per group (tagged + budgeted only)', () => {
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    const want = result.buckets.find((b) => b.group === BudgetGroup.Want)!;
    expect(need.allocated).toBe(7500);
    expect(want.allocated).toBe(1500);
  });

  // Case 5 — untagged goes to ungrouped
  it('counts untagged budgeted categories in ungrouped, not in any bucket', () => {
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    expect(result.ungrouped).toBe(800);
    for (const b of result.buckets) {
      expect(b.allocated).not.toBe(800); // the untagged limit must not appear in any bucket
    }
  });
});

// Case 3 — spent sums same categories
describe('computeBuckets — spent', () => {
  it('sums spend for budgeted tagged categories only', () => {
    const cats = [
      makeCategory('cat_housing', BudgetGroup.Need),
      makeCategory('cat_groceries', BudgetGroup.Need),
    ];
    const budgets = [makeBudget('cat_housing', 5000), makeBudget('cat_groceries', 2500)];
    const spend = {
      cat_housing: { [MONTH]: 3000 },
      cat_groceries: { [MONTH]: 1500 },
    };
    const result = computeBuckets(20000, cats, budgets, spend, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.spent).toBe(4500);
  });
});

// Case 4 — unallocated: positive, zero, negative
describe('computeBuckets — unallocated', () => {
  it('positive unallocated when income > total allocated', () => {
    const cats = [makeCategory('cat_housing', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_housing', 5000)];
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    expect(result.unallocated).toBe(15000);
  });

  it('zero unallocated when fully allocated', () => {
    const cats = [
      makeCategory('cat_housing', BudgetGroup.Need),
      makeCategory('cat_dining', BudgetGroup.Want),
      makeCategory('cat_savings', BudgetGroup.Savings),
    ];
    const budgets = [
      makeBudget('cat_housing', 10000),
      makeBudget('cat_dining', 6000),
      makeBudget('cat_savings', 4000),
    ];
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    expect(result.unallocated).toBe(0);
  });

  it('negative unallocated (over-allocated)', () => {
    const cats = [makeCategory('cat_housing', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_housing', 25000)];
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    expect(result.unallocated).toBe(-5000);
  });
});

// Case 7 — allocated = 0 => spendFillPct = 0, no divide-by-zero
describe('computeBuckets — zero allocated guard', () => {
  it('spendFillPct is 0 when allocated is 0', () => {
    const cats = [makeCategory('cat_housing', BudgetGroup.Need)];
    // no budget row → allocated = 0
    const spend = { cat_housing: { [MONTH]: 500 } };
    const result = computeBuckets(20000, cats, [], spend, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.allocated).toBe(0);
    expect(need.spendFillPct).toBe(0);
  });
});

// Case 8 — Savings with spend=0 is valid; status ahead when allocated >= target
describe('computeBuckets — savings spend=0', () => {
  it('savings allocated >= target yields status ahead even with spend=0', () => {
    const cats = [makeCategory('cat_savings', BudgetGroup.Savings)];
    const budgets = [makeBudget('cat_savings', 4000)];
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const savings = result.buckets.find((b) => b.group === BudgetGroup.Savings)!;
    expect(savings.allocated).toBe(4000);
    expect(savings.spent).toBe(0);
    expect(savings.status).toBe('ahead');
  });
});

// Case 9 — per-group status rules
describe('computeBuckets — status per group', () => {
  it('Needs over target => over', () => {
    const cats = [makeCategory('cat_housing', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_housing', 12000)]; // > 50% of 20000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.status).toBe('over');
  });

  it('Needs on or under target => on-track', () => {
    const cats = [makeCategory('cat_housing', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_housing', 8000)]; // < 50% of 20000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.status).toBe('on-track');
  });

  it('Wants over target => over', () => {
    const cats = [makeCategory('cat_dining', BudgetGroup.Want)];
    const budgets = [makeBudget('cat_dining', 8000)]; // > 30% of 20000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const want = result.buckets.find((b) => b.group === BudgetGroup.Want)!;
    expect(want.status).toBe('over');
  });

  it('Savings under target => behind', () => {
    const cats = [makeCategory('cat_savings', BudgetGroup.Savings)];
    const budgets = [makeBudget('cat_savings', 2000)]; // < 20% of 20000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const sav = result.buckets.find((b) => b.group === BudgetGroup.Savings)!;
    expect(sav.status).toBe('behind');
  });

  it('Savings at exactly target => ahead (not behind)', () => {
    const cats = [makeCategory('cat_savings', BudgetGroup.Savings)];
    const budgets = [makeBudget('cat_savings', 4000)]; // == 20% of 20000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const sav = result.buckets.find((b) => b.group === BudgetGroup.Savings)!;
    expect(sav.status).toBe('ahead');
  });
});

// Case 10 — barPct clamps, spendFillPct clamps
describe('computeBuckets — bar clamping', () => {
  it('barPct clamps to 1 when allocated > target', () => {
    const cats = [makeCategory('cat_housing', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_housing', 15000)]; // way over need target
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.barPct).toBe(1);
  });

  it('spendFillPct clamps to 1 when spent > allocated', () => {
    const cats = [makeCategory('cat_housing', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_housing', 5000)];
    const spend = { cat_housing: { [MONTH]: 8000 } }; // overspent
    const result = computeBuckets(20000, cats, budgets, spend, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.spendFillPct).toBe(1);
  });
});
