import { BudgetGroup, CategoryType } from '@/constants/enums';
import type { Category } from '@/database/entities/category.entity';
import type { Budget, BudgetMonthGroupMap } from '@/modules/budget/entities/budget.entity';
import { resolveLimitForMonth } from '@/modules/budget/screens/budget/budget.helpers';

export type BudgetRuleLifecycle = 'completed' | 'current' | 'planned';

export type RuleBucketStatus =
  | 'income-needed'
  | 'no-plan'
  | 'within-cap'
  | 'over-cap'
  | 'target-met'
  | 'below-target';

export interface BudgetRuleContributorVM {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  planned: number;
  spent: number | undefined;
  planShareRatio: number | undefined;
  isUnbudgeted: boolean;
}

export interface RuleBucketVM {
  group: BudgetGroup;
  ruleRatio: number;
  target: number | undefined;
  planned: number;
  actual: number | undefined;
  variance: number | undefined;
  /** Truthful planned / target ratio. */
  planRatio: number | undefined;
  /** Visual planned / target ratio, clamped to 0–1. */
  progressRatio: number | undefined;
  status: RuleBucketStatus;
  contributors: BudgetRuleContributorVM[];
}

export interface BudgetRuleSummaryVM {
  income: number | undefined;
  hasIncome: boolean;
  groupedPlanned: number;
  notGroupedPlanned: number;
  totalPlanned: number;
  leftToPlan: number | undefined;
  /** Truthful total planned / income ratio. */
  plannedRatio: number | undefined;
  /** Visual total planned / income ratio, clamped to 0–1. */
  progressRatio: number | undefined;
  lifecycle: BudgetRuleLifecycle;
  daysLeft: number | undefined;
}

export interface BudgetRuleLensVM {
  summary: BudgetRuleSummaryVM;
  buckets: RuleBucketVM[];
  notGrouped: { planned: number; spent: number } | undefined;
}

export interface BuildBudgetRuleLensInput {
  income: number | null;
  categories: Category[];
  budgets: Budget[];
  budgetGroupByCategoryId: BudgetMonthGroupMap;
  spendByMonth: Record<string, Record<string, number>>;
  selectedMonth: string;
  lifecycleDate: string;
}

interface GroupTotals {
  planned: number;
  spent: number;
  contributors: BudgetRuleContributorVM[];
}

const GROUP_RATIOS: Record<BudgetGroup, number> = {
  [BudgetGroup.Need]: 0.5,
  [BudgetGroup.Want]: 0.3,
  [BudgetGroup.Savings]: 0.2,
};

const GROUP_ORDER: BudgetGroup[] = [BudgetGroup.Need, BudgetGroup.Want, BudgetGroup.Savings];

function clampRatio(ratio: number): number {
  return Math.min(Math.max(ratio, 0), 1);
}

function normalizeAmount(amount: number): number {
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function classifyLifecycle(
  selectedMonth: string,
  lifecycleDate: string,
): { lifecycle: BudgetRuleLifecycle; daysLeft: number | undefined } {
  const currentMonth = lifecycleDate.slice(0, 7);
  if (selectedMonth < currentMonth) return { lifecycle: 'completed', daysLeft: undefined };
  if (selectedMonth > currentMonth) return { lifecycle: 'planned', daysLeft: undefined };

  const [year, month] = selectedMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const currentDay = Number(lifecycleDate.slice(8, 10));
  return { lifecycle: 'current', daysLeft: Math.max(lastDay - currentDay, 0) };
}

function bucketStatus(
  group: BudgetGroup,
  planned: number,
  target: number | undefined,
): RuleBucketStatus {
  if (target === undefined) return 'income-needed';
  if (planned === 0) return 'no-plan';
  if (group === BudgetGroup.Savings) {
    return planned >= target ? 'target-met' : 'below-target';
  }
  return planned > target ? 'over-cap' : 'within-cap';
}

function compareContributors(
  left: BudgetRuleContributorVM,
  right: BudgetRuleContributorVM,
): number {
  if (left.planned !== right.planned) return right.planned - left.planned;
  if ((left.spent ?? 0) !== (right.spent ?? 0)) return (right.spent ?? 0) - (left.spent ?? 0);
  if (left.name < right.name) return -1;
  if (left.name > right.name) return 1;
  if (left.categoryId < right.categoryId) return -1;
  if (left.categoryId > right.categoryId) return 1;
  return 0;
}

export function buildBudgetRuleLens({
  income,
  categories,
  budgets,
  budgetGroupByCategoryId,
  spendByMonth,
  selectedMonth,
  lifecycleDate,
}: BuildBudgetRuleLensInput): BudgetRuleLensVM {
  const hasIncome = income !== null && Number.isFinite(income) && income > 0;
  const availableIncome = hasIncome ? income : undefined;
  const totals: Record<BudgetGroup, GroupTotals> = {
    [BudgetGroup.Need]: { planned: 0, spent: 0, contributors: [] },
    [BudgetGroup.Want]: { planned: 0, spent: 0, contributors: [] },
    [BudgetGroup.Savings]: { planned: 0, spent: 0, contributors: [] },
  };
  const normalizedBudgets = budgets.map((budget) => ({
    ...budget,
    limit_amount: normalizeAmount(budget.limit_amount),
  }));
  let notGroupedPlanned = 0;
  let notGroupedSpent = 0;

  for (const category of categories) {
    if (category.type !== CategoryType.Expense) continue;

    const planned = resolveLimitForMonth(normalizedBudgets, category.id, selectedMonth) ?? 0;
    const group =
      budgetGroupByCategoryId[category.id] ??
      (hasIncome ? undefined : (category.budget_group ?? undefined));

    if (group === undefined) {
      notGroupedPlanned += planned;
      notGroupedSpent += normalizeAmount(spendByMonth[category.id]?.[selectedMonth] ?? 0);
      continue;
    }

    const groupTotals = totals[group];
    groupTotals.planned += planned;

    if (group === BudgetGroup.Savings) {
      if (planned > 0) {
        groupTotals.contributors.push({
          categoryId: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          planned,
          spent: undefined,
          planShareRatio: undefined,
          isUnbudgeted: false,
        });
      }
      continue;
    }

    const spent = normalizeAmount(spendByMonth[category.id]?.[selectedMonth] ?? 0);
    groupTotals.spent += spent;
    if (planned > 0 || spent > 0) {
      groupTotals.contributors.push({
        categoryId: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        planned,
        spent,
        planShareRatio: undefined,
        isUnbudgeted: planned === 0 && spent > 0,
      });
    }
  }

  const buckets = GROUP_ORDER.map((group): RuleBucketVM => {
    const groupTotals = totals[group];
    const target =
      availableIncome === undefined ? undefined : availableIncome * GROUP_RATIOS[group];
    const planRatio = target === undefined ? undefined : groupTotals.planned / target;
    const contributors = groupTotals.contributors
      .map((contributor) => ({
        ...contributor,
        planShareRatio:
          contributor.planned > 0 && groupTotals.planned > 0
            ? contributor.planned / groupTotals.planned
            : undefined,
      }))
      .sort(compareContributors);

    return {
      group,
      ruleRatio: GROUP_RATIOS[group],
      target,
      planned: groupTotals.planned,
      actual: group === BudgetGroup.Savings ? undefined : groupTotals.spent,
      variance: target === undefined ? undefined : target - groupTotals.planned,
      planRatio,
      progressRatio: planRatio === undefined ? undefined : clampRatio(planRatio),
      status: bucketStatus(group, groupTotals.planned, target),
      contributors,
    };
  });

  const groupedPlanned = buckets.reduce((total, bucket) => total + bucket.planned, 0);
  const totalPlanned = groupedPlanned + notGroupedPlanned;
  const plannedRatio = availableIncome === undefined ? undefined : totalPlanned / availableIncome;
  const lifecycle = classifyLifecycle(selectedMonth, lifecycleDate);

  return {
    summary: {
      income: availableIncome,
      hasIncome,
      groupedPlanned,
      notGroupedPlanned,
      totalPlanned,
      leftToPlan: availableIncome === undefined ? undefined : availableIncome - totalPlanned,
      plannedRatio,
      progressRatio: plannedRatio === undefined ? undefined : clampRatio(plannedRatio),
      ...lifecycle,
    },
    buckets,
    notGrouped:
      notGroupedPlanned > 0 || notGroupedSpent > 0
        ? { planned: notGroupedPlanned, spent: notGroupedSpent }
        : undefined,
  };
}
