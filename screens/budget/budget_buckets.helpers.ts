import { BudgetGroup } from '@/constants/enums';
import type { Budget } from '@/database/entities/budget.entity';
import type { Category } from '@/database/entities/category.entity';
import { resolveLimitForMonth } from '@/screens/budget/budget.helpers';

export type BucketStatus = 'on-track' | 'over' | 'ahead' | 'behind';

export interface BucketVM {
  group: BudgetGroup;
  target: number;
  allocated: number;
  spent: number;
  /** Clamped 0–1 for bar width. True pct = allocated/target (shown in text). */
  barPct: number;
  /** Clamped 0–1 for spend fill width. True pct = spent/allocated (shown in text). */
  spendFillPct: number;
  status: BucketStatus;
}

export interface BucketsVM {
  income: number;
  hasIncome: boolean;
  buckets: BucketVM[];
  /** Sum of limits for budgeted categories with null budget_group. */
  ungrouped: number;
  /** income − (Σ allocated across all groups + ungrouped). Negative = over-allocated. */
  unallocated: number;
}

const GROUP_PCTS: Record<BudgetGroup, number> = {
  [BudgetGroup.Need]: 0.5,
  [BudgetGroup.Want]: 0.3,
  [BudgetGroup.Savings]: 0.2,
};

const GROUP_ORDER = [BudgetGroup.Need, BudgetGroup.Want, BudgetGroup.Savings];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeGroupStatus(group: BudgetGroup, allocated: number, target: number): BucketStatus {
  if (group === BudgetGroup.Savings) {
    return allocated >= target ? 'ahead' : 'behind';
  }
  // Need and Want
  return allocated > target ? 'over' : 'on-track';
}

export function computeBuckets(
  income: number,
  categories: Category[],
  rows: Budget[],
  spendByMonth: Record<string, Record<string, number>>,
  month: string,
): BucketsVM {
  if (income <= 0) {
    return { income, hasIncome: false, buckets: [], ungrouped: 0, unallocated: 0 };
  }

  const totals: Record<BudgetGroup, { allocated: number; spent: number }> = {
    [BudgetGroup.Need]: { allocated: 0, spent: 0 },
    [BudgetGroup.Want]: { allocated: 0, spent: 0 },
    [BudgetGroup.Savings]: { allocated: 0, spent: 0 },
  };
  let ungrouped = 0;

  for (const cat of categories) {
    const limit = resolveLimitForMonth(rows, cat.id, month);
    if (limit === null) continue; // unbudgeted — skip entirely
    const spent = spendByMonth[cat.id]?.[month] ?? 0;
    if (cat.budget_group === null) {
      ungrouped += limit;
    } else {
      totals[cat.budget_group].allocated += limit;
      totals[cat.budget_group].spent += spent;
    }
  }

  const buckets: BucketVM[] = GROUP_ORDER.map((group) => {
    const target = GROUP_PCTS[group] * income;
    const { allocated, spent } = totals[group];
    return {
      group,
      target,
      allocated,
      spent,
      barPct: clamp(allocated / target, 0, 1),
      spendFillPct: clamp(allocated > 0 ? spent / allocated : 0, 0, 1),
      status: computeGroupStatus(group, allocated, target),
    };
  });

  const allocatedTotal = buckets.reduce((s, b) => s + b.allocated, 0) + ungrouped;
  const unallocated = income - allocatedTotal;

  return { income, hasIncome: true, buckets, ungrouped, unallocated };
}
