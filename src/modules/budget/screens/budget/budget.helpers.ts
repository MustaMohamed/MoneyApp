import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type {
  BudgetCategoriesSummaryVM,
  BudgetHealth,
  CategoryBudgetRowVM,
  NamedBudgetVM,
} from '@/modules/budget/screens/budget/budget_categories.types';
import type { Category } from '@/modules/categories/entities/category.entity';
import { formatAmount } from '@/utils/format_amount';

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
  lifecycle: 'completed' | 'provisional' | 'planned';
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
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  status: BudgetCopyStatus;
}

export type BudgetPresentation = 'coldLoading' | 'coldError' | 'content' | 'contentWithError';

export function resolveBudgetPresentation({
  hasMatchingSnapshot,
  loadError,
}: {
  hasMatchingSnapshot: boolean;
  loadError: boolean;
}): BudgetPresentation {
  if (!hasMatchingSnapshot) return loadError ? 'coldError' : 'coldLoading';
  return loadError ? 'contentWithError' : 'content';
}

export function getBudgetsForCategoryMonth(
  rows: Budget[],
  categoryId: string,
  yearMonth: string,
): Budget[] {
  return rows.filter((r) => r.category_id === categoryId && r.effective_from === yearMonth);
}

export function sumBudgetsForCategoryMonth(
  rows: Budget[],
  categoryId: string,
  yearMonth: string,
): number | null {
  const monthRows = getBudgetsForCategoryMonth(rows, categoryId, yearMonth);
  if (monthRows.length === 0) return null;
  return monthRows.reduce((total, row) => total + row.limit_amount, 0);
}

// Exact monthly total. null = no budget for that category/month.
export function resolveLimitForMonth(
  rows: Budget[],
  categoryId: string,
  yearMonth: string,
): number | null {
  return sumBudgetsForCategoryMonth(rows, categoryId, yearMonth);
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

export function computeBudgetHealth(spent: number, planned: number): BudgetHealth {
  if (spent > planned) return 'over';
  if (planned > 0 && spent / planned >= BUDGET_WARNING_THRESHOLD) return 'watch';
  return 'on-track';
}

function healthLabel(health: BudgetHealth): string {
  if (health === 'over') return Strings.budgetCategoriesStatusOver;
  if (health === 'watch') return Strings.budgetCategoriesStatusWatch;
  return Strings.budgetCategoriesStatusOnTrack;
}

function healthColor(health: BudgetHealth): string {
  if (health === 'over') return Colors.dark.negative;
  if (health === 'watch') return Colors.dark.budgetWatch;
  return Colors.dark.positive;
}

function percentage(value: number | undefined): number {
  return Math.round((value ?? 0) * 100);
}

export interface CategoryLedgerInput {
  categories: Category[];
  budgets: Budget[];
  spendByMonth: Record<string, Record<string, number>>;
  spendByBudgetId: Record<string, number>;
  yearMonth: string;
}

export function buildCategoryBudgetRows({
  categories,
  budgets,
  spendByMonth,
  spendByBudgetId,
  yearMonth,
}: CategoryLedgerInput): { rows: CategoryBudgetRowVM[]; unbudgetedSpend: number } {
  const rows: CategoryBudgetRowVM[] = [];
  let unbudgetedSpend = 0;

  for (const category of categories) {
    if (category.type !== CategoryType.Expense) continue;
    const categoryBudgets = getBudgetsForCategoryMonth(budgets, category.id, yearMonth);
    const categorySpend = spendByMonth[category.id]?.[yearMonth] ?? 0;
    if (categoryBudgets.length === 0) {
      unbudgetedSpend += categorySpend;
      continue;
    }

    const planned = categoryBudgets.reduce((total, budget) => total + budget.limit_amount, 0);
    const spent = categorySpend;
    const left = planned - spent;
    const usedPct = planned > 0 ? spent / planned : 0;
    const status = computeBudgetHealth(spent, planned);
    const balance = remainingLabel(left);

    const namedBudgets: NamedBudgetVM[] = categoryBudgets.map((budget) => {
      const budgetSpent = spendByBudgetId[budget.id] ?? 0;
      const budgetLeft = budget.limit_amount - budgetSpent;
      const budgetUsedPct = budget.limit_amount > 0 ? budgetSpent / budget.limit_amount : undefined;
      const categorySharePct = planned > 0 ? budget.limit_amount / planned : undefined;
      const budgetBalance = remainingLabel(budgetLeft);
      const spentLabel = formatAmount(budgetSpent);
      const plannedLabel = formatAmount(budget.limit_amount);
      const balanceLabel = formatAmount(budgetBalance.magnitude);

      return {
        id: budget.id,
        name: budget.name,
        planned: budget.limit_amount,
        spent: budgetSpent,
        left: budgetLeft,
        usedPct: budgetUsedPct,
        categorySharePct,
        usedLabel: `${percentage(budgetUsedPct)}%`,
        shareLabel: Strings.budgetCategoriesShare(percentage(categorySharePct)),
        spentPlannedLabel: Strings.budgetCategoriesSpentPlanned(spentLabel, plannedLabel),
        balanceAmountLabel: balanceLabel,
        balanceMetaLabel: Strings.budgetCategoriesBalanceMeta(budgetBalance.label),
        ringColor: budgetBandColor(budgetUsedPct ?? 0),
        accessibilityLabel: Strings.budgetCategoriesBudgetA11y(
          budget.name,
          spentLabel,
          plannedLabel,
          percentage(budgetUsedPct),
          balanceLabel,
          budgetBalance.label,
        ),
        menuAccessibilityLabel: Strings.budgetCategoriesBudgetMenuA11y(budget.name),
      };
    });

    const assignedSpend = namedBudgets.reduce((total, budget) => total + budget.spent, 0);
    const unassignedSpend = Math.max(spent - assignedSpend, 0);
    const spentLabel = formatAmount(spent);
    const plannedLabel = formatAmount(planned);
    const balanceLabel = formatAmount(balance.magnitude);

    rows.push({
      categoryId: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      planned,
      spent,
      left,
      usedPct,
      status,
      statusLabel: healthLabel(status),
      statusChipColor: status === 'over' ? 'danger' : 'default',
      spentPlannedUsedLabel: Strings.budgetCategoriesSpentPlannedUsed(
        spentLabel,
        plannedLabel,
        percentage(usedPct),
      ),
      balanceAmountLabel: balanceLabel,
      balanceMetaLabel: Strings.budgetCategoriesBalanceMeta(balance.label),
      ringColor: healthColor(status),
      unassignedSpend,
      unassignedSpendLabel: Strings.budgetCategoriesUnassignedAmount(formatAmount(unassignedSpend)),
      budgets: namedBudgets,
      accessibilityLabel: Strings.budgetCategoriesCategoryA11y(
        category.name,
        spentLabel,
        plannedLabel,
        percentage(usedPct),
        balanceLabel,
        balance.label,
        healthLabel(status),
      ),
    });
  }

  return { rows, unbudgetedSpend };
}

export interface BudgetCategoriesSummaryInput {
  rows: CategoryBudgetRowVM[];
  expectedIncome: number | null;
  unbudgetedSpend: number;
  selectedMonth: string;
  today: string;
}

function summaryLifecycle(selectedMonth: string, today: string): string {
  const currentMonth = today.slice(0, 7);
  if (selectedMonth > currentMonth) return Strings.budgetCategoriesLifecyclePlanned;
  if (selectedMonth < currentMonth) return Strings.budgetCategoriesLifecycleComplete;
  const [year, month] = selectedMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return Strings.budgetCategoriesDaysLeft(Math.max(0, lastDay - Number(today.slice(8, 10))));
}

export function buildBudgetCategoriesSummary({
  rows,
  expectedIncome,
  unbudgetedSpend,
  selectedMonth,
  today,
}: BudgetCategoriesSummaryInput): BudgetCategoriesSummaryVM {
  const planned = rows.reduce((total, row) => total + row.planned, 0);
  const spent = rows.reduce((total, row) => total + row.spent, 0);
  const left = planned - spent;
  const balance = remainingLabel(left);
  const usedPct = planned > 0 ? spent / planned : undefined;
  const unassignedIncome =
    expectedIncome === null ? undefined : Math.max(expectedIncome - planned, 0);
  const onTrackCount = rows.filter((row) => row.status === 'on-track').length;
  const watchCount = rows.filter((row) => row.status === 'watch').length;
  const overCount = rows.filter((row) => row.status === 'over').length;
  const monthLabel = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
  });

  return {
    hasPlan: planned > 0,
    emptyLabel: planned > 0 ? undefined : Strings.budgetCategoriesNoBudgetSet,
    planned,
    spent,
    left,
    usedPct,
    unassignedIncome,
    unbudgetedSpend,
    eyebrowLabel: Strings.budgetCategoriesSummaryEyebrow(rows.length, monthLabel),
    categoryCountLabel: Strings.budgetCategoryCountLabel(rows.length),
    balanceAmountLabel: formatAmount(balance.magnitude),
    balanceMetaLabel: Strings.budgetCategoriesBalanceMeta(balance.label),
    balanceColor: left < 0 ? Colors.dark.negative : Colors.dark.positive,
    barColor: budgetBandColor(usedPct ?? 0),
    spentPlannedLabel: Strings.budgetCategoriesSummarySpentOf(
      formatAmount(spent),
      formatAmount(planned),
    ),
    usedLabel:
      usedPct === undefined ? undefined : Strings.budgetCategoriesSummaryUsed(percentage(usedPct)),
    plannedLabel: formatAmount(planned),
    unassignedIncomeLabel:
      unassignedIncome === undefined
        ? Strings.budgetCategoriesSetIncome
        : formatAmount(unassignedIncome),
    unbudgetedSpendLabel: formatAmount(unbudgetedSpend),
    lifecycleLabel: summaryLifecycle(selectedMonth, today),
    onTrackCount,
    watchCount,
    overCount,
    statusItems:
      planned > 0
        ? [
            {
              key: 'on-track',
              label: Strings.budgetCategoriesStatusCount(
                onTrackCount,
                Strings.budgetCategoriesStatusOnTrack.toLowerCase(),
              ),
              icon: 'check-circle-outline',
              color: Colors.dark.positive,
            },
            {
              key: 'watch',
              label: Strings.budgetCategoriesStatusCount(
                watchCount,
                Strings.budgetCategoriesStatusWatch.toLowerCase(),
              ),
              icon: 'alert-circle-outline',
              color: Colors.dark.budgetWatch,
            },
            {
              key: 'over',
              label: Strings.budgetCategoriesStatusCount(
                overCount,
                Strings.budgetCategoriesStatusOver.toLowerCase(),
              ),
              icon: 'alert-octagon-outline',
              color: Colors.dark.negative,
            },
          ]
        : [],
  };
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
    const sourceRows = rows.filter(
      (row) => row.category_id === category.id && row.effective_from === sourceMonth,
    );

    for (const sourceRow of sourceRows) {
      const hasExplicitTargetLimit = rows.some(
        (row) =>
          row.category_id === category.id &&
          row.effective_from === targetMonth &&
          row.name.toLowerCase() === sourceRow.name.toLowerCase(),
      );

      out.push({
        id: sourceRow.id,
        categoryId: category.id,
        categoryName: category.name,
        name: sourceRow.name,
        icon: category.icon,
        color: category.color,
        amount: sourceRow.limit_amount,
        status: hasExplicitTargetLimit ? 'will-replace' : 'new',
      });
    }
  }

  return out;
}

export function computeCategoryHistory(results: MonthResultVM[]): CategoryHistoryVM {
  const historicalResults = results.filter((result) => result.lifecycle !== 'planned');
  let netBanked = 0;
  let totalSpent = 0;
  let monthsUnder = 0;
  for (const r of historicalResults) {
    netBanked += r.delta;
    totalSpent += r.spent;
    if (r.spent <= r.limit) monthsUnder += 1;
  }
  const monthsTotal = historicalResults.length;
  return {
    results: historicalResults,
    netBanked,
    avgPerMonth: monthsTotal > 0 ? totalSpent / monthsTotal : 0,
    hitRate: monthsTotal > 0 ? monthsUnder / monthsTotal : 0,
    monthsUnder,
    monthsTotal,
  };
}
