import { BudgetGroup, CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { Category } from '@/database/entities/category.entity';
import type { Budget, BudgetMonthGroupMap } from '@/modules/budget/entities/budget.entity';
import {
  budgetBandColor,
  resolveLimitForMonth,
} from '@/modules/budget/screens/budget/budget.helpers';
import { formatAmount } from '@/utils/format_amount';
import { formatMonthYear } from '@/utils/format_date';

export type BudgetRuleLifecycle = 'completed' | 'current' | 'planned';

export type RuleBucketStatus =
  | 'income-needed'
  | 'no-plan'
  | 'within-cap'
  | 'over-cap'
  | 'target-met'
  | 'below-target';

export type RuleBucketChipColor = 'default' | 'success' | 'danger' | 'warning';
export type RuleBucketIcon = 'home-heart' | 'gamepad-variant-outline' | 'piggy-bank-outline';
export type RuleStatusIcon =
  | 'help-circle-outline'
  | 'circle-outline'
  | 'check-circle-outline'
  | 'alert-circle-outline'
  | 'target';

export interface BudgetRuleContributorPresentationVM {
  planShareLabel: string | undefined;
  progressRatio: number;
  ringColor: string;
  resultLabel: string;
  resultMetaLabel: string | undefined;
}

export interface BudgetRuleContributorVM {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  planned: number;
  spent: number | undefined;
  planShareRatio: number | undefined;
  isUnbudgeted: boolean;
  presentation: BudgetRuleContributorPresentationVM;
}

export interface RuleBucketPresentationVM {
  groupLabel: string;
  ruleLabel: string;
  icon: RuleBucketIcon;
  statusLabel: string;
  statusChipColor: RuleBucketChipColor;
  ringColor: string;
  targetLabel: string;
  actualLabel: string;
  varianceLabel: string;
  varianceMetaLabel: string;
  varianceColor: string;
  detailsLabel: string;
  insightLabel: string;
  insightIcon: 'alert-circle-outline' | 'lightbulb-outline';
  manageLabel: string;
  accessibilityLabel: string;
  metrics: Array<{ key: string; label: string; value: string }>;
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
  presentation: RuleBucketPresentationVM;
}

export interface BudgetRuleStatusItemVM {
  key: BudgetGroup;
  icon: RuleStatusIcon;
  color: string;
  label: string;
}

export interface BudgetRuleSummaryPresentationVM {
  eyebrowLabel: string;
  lifecycleLabel: string;
  primaryLabel: string;
  balanceLabel: string;
  balanceMetaLabel: string;
  balanceColor: string;
  emptyLabel: string;
  contextLabel: string;
  contextSpentLabel: string;
  contextConnectorLabel: string;
  contextPlannedLabel: string;
  progressLabel: string;
  progressValue: number;
  barStatus: 'under' | 'over';
  barColor: string;
  incomeMetricValue: string;
  plannedMetricValue: string;
  notGroupedMetricValue: string;
  statusItems: BudgetRuleStatusItemVM[];
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
  presentation: BudgetRuleSummaryPresentationVM;
}

export interface BudgetRuleNotGroupedVM {
  planned: number;
  spent: number;
  presentation: {
    titleLabel: string;
    bodyLabel: string;
    amountsLabel: string;
  };
}

export interface BudgetRuleLensVM {
  summary: BudgetRuleSummaryVM;
  buckets: RuleBucketVM[];
  notGrouped: BudgetRuleNotGroupedVM | undefined;
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
  contributors: Array<Omit<BudgetRuleContributorVM, 'presentation'>>;
}

const GROUP_RATIOS: Record<BudgetGroup, number> = {
  [BudgetGroup.Need]: 0.5,
  [BudgetGroup.Want]: 0.3,
  [BudgetGroup.Savings]: 0.2,
};

const GROUP_ORDER: BudgetGroup[] = [BudgetGroup.Need, BudgetGroup.Want, BudgetGroup.Savings];

export function hasBudgetRuleIncome(income: number | null): income is number {
  return income !== null && Number.isFinite(income) && income > 0;
}

export function resolveBudgetRuleGroup(
  category: Pick<Category, 'id' | 'budget_group'>,
  budgetGroupByCategoryId: BudgetMonthGroupMap,
  hasIncome: boolean,
): BudgetGroup | undefined {
  return (
    budgetGroupByCategoryId[category.id] ??
    (hasIncome ? undefined : (category.budget_group ?? undefined))
  );
}

const GROUP_PRESENTATION: Record<
  BudgetGroup,
  { label: string; ratioLabel: string; icon: RuleBucketIcon }
> = {
  [BudgetGroup.Need]: {
    label: Strings.budget5030NeedLabel,
    ratioLabel: Strings.budget5030NeedPct,
    icon: 'home-heart',
  },
  [BudgetGroup.Want]: {
    label: Strings.budget5030WantLabel,
    ratioLabel: Strings.budget5030WantPct,
    icon: 'gamepad-variant-outline',
  },
  [BudgetGroup.Savings]: {
    label: Strings.budget5030SavingsLabel,
    ratioLabel: Strings.budget5030SavingsPct,
    icon: 'piggy-bank-outline',
  },
};

const STATUS_PRESENTATION: Record<
  RuleBucketStatus,
  { label: string; chipColor: RuleBucketChipColor; icon: RuleStatusIcon; color: string }
> = {
  'income-needed': {
    label: Strings.budget5030StatusIncomeNeeded,
    chipColor: 'default',
    icon: 'help-circle-outline',
    color: Colors.dark.budgetUnder,
  },
  'no-plan': {
    label: Strings.budget5030StatusNoPlan,
    chipColor: 'default',
    icon: 'circle-outline',
    color: Colors.dark.budgetUnder,
  },
  'within-cap': {
    label: Strings.budget5030StatusWithinCap,
    chipColor: 'success',
    icon: 'check-circle-outline',
    color: Colors.dark.positive,
  },
  'over-cap': {
    label: Strings.budget5030StatusOverCap,
    chipColor: 'danger',
    icon: 'alert-circle-outline',
    color: Colors.dark.negative,
  },
  'target-met': {
    label: Strings.budget5030StatusTargetMet,
    chipColor: 'success',
    icon: 'check-circle-outline',
    color: Colors.dark.positive,
  },
  'below-target': {
    label: Strings.budget5030StatusBelowTarget,
    chipColor: 'warning',
    icon: 'target',
    color: Colors.dark.budgetWatch,
  },
};

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

function lifecycleLabel(lifecycle: BudgetRuleLifecycle, daysLeft: number | undefined): string {
  if (lifecycle === 'planned') return Strings.budget5030LifecyclePlanned;
  if (lifecycle === 'completed') return Strings.budget5030LifecycleComplete;
  return Strings.budget5030DaysLeft(daysLeft ?? 0);
}

function buildContributorPresentation(
  contributor: Omit<BudgetRuleContributorVM, 'presentation'>,
  group: BudgetGroup,
): BudgetRuleContributorPresentationVM {
  const groupLabel = GROUP_PRESENTATION[group].label;
  const progressRatio =
    group === BudgetGroup.Savings
      ? 0
      : contributor.planned > 0
        ? (contributor.spent ?? 0) / contributor.planned
        : contributor.isUnbudgeted
          ? 1
          : 0;
  const progressPresentation = {
    progressRatio,
    ringColor: budgetBandColor(progressRatio),
  };
  const planShareLabel =
    contributor.planShareRatio === undefined
      ? undefined
      : Strings.budget5030PlanShare(Math.round(contributor.planShareRatio * 100), groupLabel);

  if (group === BudgetGroup.Savings) {
    return {
      ...progressPresentation,
      planShareLabel,
      resultLabel: Strings.budget5030PlannedOnly(formatAmount(contributor.planned)),
      resultMetaLabel: Strings.budget5030ActualNotTracked,
    };
  }

  if (contributor.isUnbudgeted) {
    return {
      ...progressPresentation,
      planShareLabel,
      resultLabel: Strings.budget5030Spent(formatAmount(contributor.spent ?? 0)),
      resultMetaLabel: Strings.budget5030UnbudgetedMeta,
    };
  }

  return {
    ...progressPresentation,
    planShareLabel,
    resultLabel: Strings.budget5030SpentOfPlanned(
      formatAmount(contributor.spent ?? 0),
      formatAmount(contributor.planned),
    ),
    resultMetaLabel: undefined,
  };
}

function bucketInsight(
  bucket: Pick<RuleBucketVM, 'group' | 'planned' | 'actual' | 'variance' | 'status'>,
): string {
  const groupLabel = GROUP_PRESENTATION[bucket.group].label;
  const variance = formatAmount(Math.abs(bucket.variance ?? 0));
  switch (bucket.status) {
    case 'income-needed':
      return Strings.budget5030InsightIncomeNeeded;
    case 'no-plan':
      return Strings.budget5030InsightNoPlan(groupLabel);
    case 'within-cap': {
      const recordedVariance = bucket.planned - (bucket.actual ?? 0);
      const amount = formatAmount(Math.abs(recordedVariance));
      return recordedVariance >= 0
        ? Strings.budget5030InsightRecordedBelowPlan(groupLabel, amount)
        : Strings.budget5030InsightRecordedAbovePlan(groupLabel, amount);
    }
    case 'over-cap':
      return Strings.budget5030InsightOverCap(groupLabel, variance);
    case 'target-met':
      return bucket.variance === 0
        ? Strings.budget5030InsightTargetMatched
        : Strings.budget5030InsightTargetMet(variance);
    case 'below-target':
      return Strings.budget5030InsightBelowTarget(variance);
  }
}

function buildBucketPresentation(
  bucket: Pick<RuleBucketVM, 'group' | 'planned' | 'actual' | 'target' | 'variance' | 'status'>,
): RuleBucketPresentationVM {
  const group = GROUP_PRESENTATION[bucket.group];
  const status = STATUS_PRESENTATION[bucket.status];
  const isSavings = bucket.group === BudgetGroup.Savings;
  const targetLabel =
    bucket.target === undefined ? Strings.budget5030Unavailable : formatAmount(bucket.target);
  const actualLabel = isSavings
    ? Strings.budget5030ActualNotTracked
    : Strings.budget5030Spent(formatAmount(bucket.actual ?? 0));
  const varianceLabel =
    bucket.variance === undefined
      ? Strings.budget5030Unavailable
      : formatAmount(Math.abs(bucket.variance));
  const varianceMetaLabel =
    bucket.variance === undefined
      ? Strings.budget5030NotReady
      : bucket.variance < 0
        ? isSavings
          ? Strings.budget5030VarianceAbove
          : Strings.budget5030VarianceOver
        : isSavings
          ? Strings.budget5030VarianceShort
          : Strings.budget5030VarianceLeft;
  const detailsLabel = Strings.budget5030BucketSummary(
    formatAmount(bucket.planned),
    targetLabel,
    actualLabel,
  );

  return {
    groupLabel: group.label,
    ruleLabel: group.ratioLabel,
    icon: group.icon,
    statusLabel: status.label,
    statusChipColor: status.chipColor,
    ringColor: status.color,
    targetLabel,
    actualLabel,
    varianceLabel,
    varianceMetaLabel,
    varianceColor:
      bucket.status === 'over-cap'
        ? Colors.dark.negative
        : STATUS_PRESENTATION[bucket.status].color,
    detailsLabel,
    insightLabel: bucketInsight(bucket),
    insightIcon: bucket.status === 'over-cap' ? 'alert-circle-outline' : 'lightbulb-outline',
    manageLabel: Strings.budget5030ManageGroup(group.label),
    accessibilityLabel: Strings.budget5030BucketA11y(
      group.label,
      status.label,
      detailsLabel,
      `${varianceLabel} ${varianceMetaLabel}`,
    ),
    metrics: [
      { key: 'target', label: Strings.budget5030TargetMetric, value: targetLabel },
      {
        key: 'planned',
        label: Strings.budget5030PlannedMetric,
        value: formatAmount(bucket.planned),
      },
      {
        key: 'actual',
        label: isSavings ? Strings.budget5030ActualMetric : Strings.budget5030SpentMetric,
        value: isSavings ? Strings.budget5030ActualNotTracked : formatAmount(bucket.actual ?? 0),
      },
    ],
  };
}

function buildSummaryPresentation({
  selectedMonth,
  income,
  hasIncome,
  totalPlanned,
  notGroupedPlanned,
  leftToPlan,
  plannedRatio,
  lifecycle,
  daysLeft,
  buckets,
}: {
  selectedMonth: string;
  income: number | undefined;
  hasIncome: boolean;
  totalPlanned: number;
  notGroupedPlanned: number;
  leftToPlan: number | undefined;
  plannedRatio: number | undefined;
  lifecycle: BudgetRuleLifecycle;
  daysLeft: number | undefined;
  buckets: RuleBucketVM[];
}): BudgetRuleSummaryPresentationVM {
  const monthLabel = formatMonthYear(selectedMonth).split(' ')[0] ?? formatMonthYear(selectedMonth);
  const safeLeftToPlan = leftToPlan ?? 0;
  const isOver = safeLeftToPlan < 0;
  const percentage = Math.round((plannedRatio ?? 0) * 100);
  const balanceLabel = formatAmount(Math.abs(safeLeftToPlan));
  const balanceMetaLabel = isOver ? Strings.budget5030OverIncome : Strings.budget5030LeftToPlan;
  const emptyLabel = Strings.budget5030SetPlanningIncome;
  const contextLabel = !hasIncome
    ? Strings.budget5030IncomeNeeded
    : totalPlanned === 0
      ? Strings.budget5030NoBudgets(monthLabel)
      : Strings.budget5030PlannedOfIncome(formatAmount(totalPlanned), formatAmount(income ?? 0));
  const progressLabel = hasIncome
    ? Strings.budget5030PlannedPercentage(percentage)
    : Strings.budget5030NotReady;

  return {
    eyebrowLabel: Strings.budget5030SummaryEyebrow(monthLabel),
    lifecycleLabel: lifecycleLabel(lifecycle, daysLeft),
    primaryLabel: hasIncome ? `${balanceLabel} ${balanceMetaLabel}` : emptyLabel,
    balanceLabel,
    balanceMetaLabel,
    balanceColor: isOver ? Colors.dark.negative : Colors.dark.positive,
    emptyLabel,
    contextLabel,
    contextSpentLabel: hasIncome && totalPlanned > 0 ? formatAmount(totalPlanned) : contextLabel,
    contextConnectorLabel:
      hasIncome && totalPlanned > 0 ? Strings.budget5030PlannedOfConnector : '',
    contextPlannedLabel: hasIncome && totalPlanned > 0 ? formatAmount(income ?? 0) : '',
    progressLabel,
    progressValue: Math.min(percentage, 100),
    barStatus: isOver ? 'over' : 'under',
    barColor: isOver ? Colors.dark.negative : Colors.dark.positive,
    incomeMetricValue: hasIncome ? formatAmount(income ?? 0) : Strings.budget5030SetIncomeMetric,
    plannedMetricValue: formatAmount(totalPlanned),
    notGroupedMetricValue: formatAmount(notGroupedPlanned),
    statusItems: buckets.map((bucket) => ({
      key: bucket.group,
      icon: STATUS_PRESENTATION[bucket.status].icon,
      color: STATUS_PRESENTATION[bucket.status].color,
      label:
        bucket.status === 'income-needed'
          ? Strings.budget5030SummaryIncomeNeeded(GROUP_PRESENTATION[bucket.group].label)
          : bucket.status === 'no-plan'
            ? Strings.budget5030SummaryNoPlan(GROUP_PRESENTATION[bucket.group].label)
            : `${GROUP_PRESENTATION[bucket.group].label} ${STATUS_PRESENTATION[
                bucket.status
              ].label.toLowerCase()}`,
    })),
  };
}

function compareContributors(
  left: Omit<BudgetRuleContributorVM, 'presentation'>,
  right: Omit<BudgetRuleContributorVM, 'presentation'>,
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
  const hasIncome = hasBudgetRuleIncome(income);
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
    const group = resolveBudgetRuleGroup(category, budgetGroupByCategoryId, hasIncome);

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
    const contributorData = groupTotals.contributors
      .map((contributor) => ({
        ...contributor,
        planShareRatio:
          contributor.planned > 0 && groupTotals.planned > 0
            ? contributor.planned / groupTotals.planned
            : undefined,
      }))
      .sort(compareContributors);
    const contributors = contributorData.map((contributor) => ({
      ...contributor,
      presentation: buildContributorPresentation(contributor, group),
    }));
    const bucket = {
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
    return { ...bucket, presentation: buildBucketPresentation(bucket) };
  });

  const groupedPlanned = buckets.reduce((total, bucket) => total + bucket.planned, 0);
  const totalPlanned = groupedPlanned + notGroupedPlanned;
  const plannedRatio = availableIncome === undefined ? undefined : totalPlanned / availableIncome;
  const lifecycle = classifyLifecycle(selectedMonth, lifecycleDate);

  const leftToPlan = availableIncome === undefined ? undefined : availableIncome - totalPlanned;
  const summaryData = {
    income: availableIncome,
    hasIncome,
    groupedPlanned,
    notGroupedPlanned,
    totalPlanned,
    leftToPlan,
    plannedRatio,
    progressRatio: plannedRatio === undefined ? undefined : clampRatio(plannedRatio),
    ...lifecycle,
  };

  return {
    summary: {
      ...summaryData,
      presentation: buildSummaryPresentation({
        selectedMonth,
        ...summaryData,
        buckets,
      }),
    },
    buckets,
    notGrouped:
      notGroupedPlanned > 0 || notGroupedSpent > 0
        ? {
            planned: notGroupedPlanned,
            spent: notGroupedSpent,
            presentation: {
              titleLabel: Strings.budget5030NotGroupedTitle,
              bodyLabel: Strings.budget5030NotGroupedBody,
              amountsLabel: Strings.budget5030NotGroupedAmounts(
                formatAmount(notGroupedPlanned),
                formatAmount(notGroupedSpent),
              ),
            },
          }
        : undefined,
  };
}
