import { CategoryType } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';

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

export interface BudgetDashboardSummaryVM extends OverallVM {
  categoryCount: number;
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

export type BudgetCopyStatus = 'new' | 'will-replace';

export interface BudgetCopyRowVM {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  status: BudgetCopyStatus;
}

// Exact monthly row. null = no budget for that month or an explicit removed budget.
export function resolveLimitForMonth(
  rows: Budget[],
  categoryId: string,
  yearMonth: string,
): number | null {
  for (const r of rows) {
    if (r.category_id !== categoryId) continue;
    if (r.effective_from !== yearMonth) continue;
    return r.limit_amount;
  }
  return null;
}

/**
 * Maps a spend percentage to a budget band colour token.
 * Uses Colors.dark — the codebase is dark-mode first for runtime colour refs.
 *
 * Boundary: pct === 1.0 (exactly 100%) → budgetNear (red), NOT budgetOver.
 * Only strictly pct > 1 → budgetOver (dark red).
 */
export function budgetBandColor(pct: number): string {
  if (pct > 1) return Colors.dark.budgetOver; // > 100%
  if (pct >= 0.9) return Colors.dark.budgetNear; // 90–100%
  if (pct >= 0.8) return Colors.dark.budgetWatch; // 80–90%
  if (pct >= 0.5) return Colors.dark.budgetSteady; // 50–80%
  return Colors.dark.budgetUnder; // < 50%
}

/**
 * Computes the remaining display from `limit - spent`.
 * Returns { magnitude: absolute value, label: 'left' | 'over' }.
 * The row renders: `{formatAmount(magnitude)} {label}`.
 */
export function remainingLabel(remaining: number): { magnitude: number; label: 'left' | 'over' } {
  if (remaining >= 0) return { magnitude: remaining, label: 'left' };
  return { magnitude: Math.abs(remaining), label: 'over' };
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

export function computeBudgetSummaryForMonth(
  rows: Budget[],
  spendByMonth: Record<string, Record<string, number>>,
  yearMonth: string,
): BudgetDashboardSummaryVM {
  let budgeted = 0;
  let spent = 0;
  let categoryCount = 0;
  const categoryIds = Array.from(new Set(rows.map((row) => row.category_id)));

  for (const categoryId of categoryIds) {
    const limit = resolveLimitForMonth(rows, categoryId, yearMonth);
    if (limit === null) continue;
    budgeted += limit;
    spent += spendByMonth[categoryId]?.[yearMonth] ?? 0;
    categoryCount++;
  }

  return {
    budgeted,
    spent,
    left: budgeted - spent,
    pct: budgeted > 0 ? spent / budgeted : 0,
    categoryCount,
  };
}

export function previousYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  return `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
}

export function nextYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

export function buildBudgetCopyRows({
  rows,
  categories,
  sourceMonth,
  targetMonth,
}: {
  rows: Budget[];
  categories: Category[];
  sourceMonth: string;
  targetMonth: string;
}): BudgetCopyRowVM[] {
  const out: BudgetCopyRowVM[] = [];

  for (const category of categories) {
    if (category.type !== CategoryType.Expense) continue;
    const sourceLimit = resolveLimitForMonth(rows, category.id, sourceMonth);
    if (sourceLimit === null) continue;
    const hasExplicitTargetLimit = rows.some(
      (row) =>
        row.category_id === category.id &&
        row.effective_from === targetMonth &&
        row.limit_amount !== null,
    );

    out.push({
      categoryId: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      amount: sourceLimit,
      status: hasExplicitTargetLimit ? 'will-replace' : 'new',
    });
  }

  return out;
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
