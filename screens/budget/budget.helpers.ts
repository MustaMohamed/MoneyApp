import type { Budget } from '@/database/entities/budget.entity';

export const BUDGET_WARNING_THRESHOLD = 0.8;

export type BudgetStatus = 'under' | 'warning' | 'over';

export interface CategoryBudgetVM {
  categoryId: string;
  limit: number;
  spent: number;
  available: number;
  pct: number;
  status: BudgetStatus;
}

export interface OverallVM {
  budgeted: number;
  spent: number;
  left: number;
  pct: number;
}

export interface MonthResultVM {
  yearMonth: string;
  limit: number;
  spent: number;
  delta: number;
  status: BudgetStatus;
  isProvisional: boolean;
}

export interface CategoryHistoryVM {
  results: MonthResultVM[];
  netBanked: number;
  avgPerMonth: number;
  hitRate: number;
  monthsUnder: number;
  monthsTotal: number;
}

// Latest effective-dated row whose effective_from <= yearMonth. null = no/removed budget.
export function resolveLimitForMonth(
  rows: Budget[],
  categoryId: string,
  yearMonth: string,
): number | null {
  let best: Budget | null = null;
  for (const r of rows) {
    if (r.category_id !== categoryId) continue;
    if (r.effective_from > yearMonth) continue;
    if (best === null || r.effective_from > best.effective_from) best = r;
  }
  return best ? best.limit_amount : null;
}

export function computeStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) return 'under';
  if (spent > limit) return 'over';
  if (spent / limit >= BUDGET_WARNING_THRESHOLD) return 'warning';
  return 'under';
}

export function computeCategoryRow(
  categoryId: string,
  limit: number,
  spent: number,
): CategoryBudgetVM {
  return {
    categoryId,
    limit,
    spent,
    available: limit - spent,
    pct: limit > 0 ? spent / limit : 0,
    status: computeStatus(spent, limit),
  };
}

export function computeOverall(rows: CategoryBudgetVM[]): OverallVM {
  let budgeted = 0;
  let spent = 0;
  for (const r of rows) {
    budgeted += r.limit;
    spent += r.spent;
  }
  return { budgeted, spent, left: budgeted - spent, pct: budgeted > 0 ? spent / budgeted : 0 };
}

export function computeCategoryHistory(results: MonthResultVM[]): CategoryHistoryVM {
  let netBanked = 0;
  let totalSpent = 0;
  let monthsUnder = 0;
  for (const r of results) {
    netBanked += r.delta;
    totalSpent += r.spent;
    if (r.spent <= r.limit) monthsUnder += 1;
  }
  const monthsTotal = results.length;
  return {
    results,
    netBanked,
    avgPerMonth: monthsTotal > 0 ? totalSpent / monthsTotal : 0,
    hitRate: monthsTotal > 0 ? monthsUnder / monthsTotal : 0,
    monthsUnder,
    monthsTotal,
  };
}
