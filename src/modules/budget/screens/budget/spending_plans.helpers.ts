import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { normalizeNegativeZero } from '@/modules/accounts/domain/account_aggregation';
import { monthRange } from '@/modules/budget/database/spending_plans';
import type {
  SpendingPlanCategory,
  SpendingPlanWithCategories,
} from '@/modules/budget/entities/budget.entity';
import {
  computePlanTiming,
  derivePlanStatus,
} from '@/modules/budget/screens/budget/spending_plan_timing.helpers';
import type {
  AllocationHelperVM,
  SpendingPlanAllocationRowVM,
  SpendingPlanCardAllocationChipVM,
  SpendingPlanCardCategoryChipVM,
  SpendingPlanCardChipVM,
  SpendingPlanCardDisplayChipVM,
  SpendingPlanCardVM,
  SpendingPlanCategoryChipVM,
  SpendingPlanDetailCategoryRowVM,
  SpendingPlanDetailCategoryVM,
  SpendingPlanDetailInsightVM,
  SpendingPlanDetailVM,
  SpendingPlanRowVM,
  SpendingPlanStatus,
  SpendingPlanStatusTone,
  SpendingPlanTimingVM,
} from '@/modules/budget/screens/budget/spending_plans.types';
import type { Category } from '@/modules/categories/entities/category.entity';
import { formatAmount } from '@/utils/format_amount';
import { formatShortDate } from '@/utils/format_date';
import { sumAllocations } from '@/utils/money';

import {
  BUDGET_WARNING_THRESHOLD,
  budgetBandColor,
  remainingLabel,
  type BudgetStatus,
} from './budget.helpers';

export type {
  AllocationHelperVM,
  SpendingPlanAllocationRowVM,
  SpendingPlanCardAllocationChipVM,
  SpendingPlanCardCategoryChipVM,
  SpendingPlanCardChipVM,
  SpendingPlanCardDisplayChipVM,
  SpendingPlanCardVM,
  SpendingPlanCategoryChipVM,
  SpendingPlanDetailCategoryRowVM,
  SpendingPlanDetailCategoryVM,
  SpendingPlanDetailInsightVM,
  SpendingPlanDetailVM,
  SpendingPlanLifecycle,
  SpendingPlanRowVM,
  SpendingPlansSummaryVM,
  SpendingPlanStatus,
  SpendingPlanStatusTone,
  SpendingPlanTimingVM,
} from '@/modules/budget/screens/budget/spending_plans.types';

export { computePlanTiming } from '@/modules/budget/screens/budget/spending_plan_timing.helpers';

const PLAN_STATUS_PRESENTATION: Record<
  SpendingPlanStatus,
  { label: string; tone: SpendingPlanStatusTone }
> = {
  upcoming: { label: Strings.budgetPlansStatusUpcoming, tone: 'accent' },
  onTrack: { label: Strings.budgetPlansStatusOnTrack, tone: 'success' },
  watch: { label: Strings.budgetPlansStatusWatch, tone: 'warning' },
  over: { label: Strings.budgetPlansStatusOver, tone: 'danger' },
};

function planLifecycleLabel(timing: SpendingPlanTimingVM): string {
  if (timing.lifecycle === 'upcoming') {
    return timing.daysValue === 1
      ? Strings.budgetPlansStartsTomorrow
      : Strings.budgetPlansStartsInDays(timing.daysValue);
  }
  if (timing.lifecycle === 'completed') {
    return timing.daysValue === 1
      ? Strings.budgetPlansEndedYesterday
      : Strings.budgetPlansEndedDaysAgo(timing.daysValue);
  }
  return timing.daysValue === 0
    ? Strings.budgetPlansEndsToday
    : Strings.budgetPlansDaysLeft(timing.daysValue);
}

function activePlanPaceLabel(paceDelta: number): string {
  const points = Math.round(Math.abs(paceDelta) * 100);
  if (points === 0) return Strings.budgetPlansPaceEven;
  return paceDelta > 0
    ? Strings.budgetPlansPaceAhead(points)
    : Strings.budgetPlansPaceUnder(points);
}

function buildSpendingPlanAllocationCardChip(
  allocation: SpendingPlanAllocationRowVM,
): SpendingPlanCardAllocationChipVM {
  const spentLabel = formatAmount(allocation.spent);
  const allocatedLabel = formatAmount(allocation.allocatedAmount);
  const percentage = Math.round(allocation.pct * 100);
  const percentageLabel =
    allocation.allocatedAmount === 0 && allocation.spent > 0
      ? PLAN_STATUS_PRESENTATION.over.label
      : `${percentage}%`;
  return {
    ...allocation,
    amountLabel: `${spentLabel}/${allocatedLabel}`,
    percentageLabel,
    bandColor: allocation.isOver ? Colors.dark.negative : budgetBandColor(allocation.pct),
    accessibilityLabel: Strings.budgetPlansAllocationChipA11y(
      allocation.categoryName,
      spentLabel,
      allocatedLabel,
      percentage,
    ),
  };
}

function buildSpendingPlanCategoryCardChip(
  category: SpendingPlanCategoryChipVM,
): SpendingPlanCardCategoryChipVM {
  const amountLabel = formatAmount(category.spent);
  return {
    ...category,
    accessibilityLabel: Strings.budgetPlansCategoryChipA11y(category.name, amountLabel),
  };
}

function buildSpendingPlanCardDisplayChips({
  chips,
  allocationChips,
  categoryChips,
}: {
  chips: SpendingPlanCardChipVM[];
  allocationChips: SpendingPlanCardAllocationChipVM[];
  categoryChips: SpendingPlanCardCategoryChipVM[];
}): SpendingPlanCardDisplayChipVM[] {
  const allocationById = new Map(
    allocationChips.map((allocation) => [allocation.categoryId, allocation]),
  );
  const categoryById = new Map(categoryChips.map((category) => [category.id, category]));
  return chips.map((chip) => {
    if (chip.type === 'allocation') {
      const allocation = allocationById.get(chip.id);
      if (allocation === undefined) throw new Error(`Missing allocation card chip: ${chip.id}`);
      return { ...chip, allocation };
    }
    if (chip.type === 'category') {
      const category = categoryById.get(chip.id);
      if (category === undefined) throw new Error(`Missing category card chip: ${chip.id}`);
      return { ...chip, category };
    }
    return {
      ...chip,
      label: Strings.budgetPlanMoreCategoriesCount(chip.count),
      accessibilityLabel: Strings.budgetPlansMoreCategoriesA11y(chip.count),
    };
  });
}

function buildSpendingPlanCard({
  name,
  startDate,
  endDate,
  totalAmount,
  spent,
  left,
  pct,
  isOver,
  timing,
  status,
  paceDelta,
  allocatedTotal,
  buffer,
  chips,
  allocationRows,
  categoryChips,
}: {
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  spent: number;
  left: number;
  pct: number;
  isOver: boolean;
  timing: SpendingPlanTimingVM;
  status: SpendingPlanStatus;
  paceDelta: number;
  allocatedTotal: number;
  buffer: number;
  chips: SpendingPlanCardChipVM[];
  allocationRows: SpendingPlanAllocationRowVM[];
  categoryChips: SpendingPlanCategoryChipVM[];
}): SpendingPlanCardVM {
  const balance = remainingLabel(left);
  const statusPresentation = PLAN_STATUS_PRESENTATION[status];
  const percentage = Math.round(pct * 100);
  const dateRange = Strings.budgetPlansDateRange(
    formatShortDate(startDate),
    formatShortDate(endDate),
  );
  const progressStatus: BudgetStatus = isOver ? 'over' : 'under';
  const balanceMetaLabel = Strings.budgetPlansCardBalanceMeta(
    Strings.currencyEgp,
    balance.label === 'over' ? Strings.budgetPlansOverStatus : Strings.budgetPlansLeftStatus,
  );
  const paceLabel =
    timing.lifecycle === 'active'
      ? activePlanPaceLabel(paceDelta)
      : timing.lifecycle === 'completed'
        ? isOver
          ? Strings.budgetPlansFinishedOver(formatAmount(balance.magnitude))
          : Strings.budgetPlansFinishedLeft(formatAmount(balance.magnitude))
        : undefined;
  const allocationChips = allocationRows.map(buildSpendingPlanAllocationCardChip);
  const categoryCardChips = categoryChips.map(buildSpendingPlanCategoryCardChip);

  return {
    openDetailsAccessibilityLabel: Strings.budgetPlansOpenDetailsA11y(name),
    statusLabel: statusPresentation.label,
    statusTone: statusPresentation.tone,
    dateLabel: Strings.budgetPlansDateWithLifecycle(dateRange, planLifecycleLabel(timing)),
    balanceAmountLabel: formatAmount(balance.magnitude),
    balanceMetaLabel,
    balanceAccessibilityLabel: Strings.budgetPlansCardBalanceA11y(
      formatAmount(balance.magnitude),
      balanceMetaLabel,
    ),
    balanceColor: isOver ? Colors.dark.negative : Colors.dark.positive,
    spentLabel: Strings.budgetPlansCardSpentOf(formatAmount(spent), formatAmount(totalAmount)),
    percentageLabel: Strings.budgetPlansSummaryUsed(percentage),
    progressColor: isOver ? Colors.dark.negative : Colors.dark.gold,
    progressStatus,
    ...(timing.lifecycle === 'active'
      ? {
          elapsedMarkerPercentage: Math.round(Math.min(Math.max(timing.elapsedPct, 0), 1) * 100),
          elapsedMarkerColor: Colors.shared.transferBlue,
        }
      : {}),
    ...(paceLabel === undefined ? {} : { paceLabel }),
    allocationFooterLabel: Strings.budgetPlansCardAllocationFooter(
      formatAmount(allocatedTotal),
      formatAmount(buffer),
    ),
    allocationChips,
    chips: buildSpendingPlanCardDisplayChips({
      chips,
      allocationChips,
      categoryChips: categoryCardChips,
    }),
  };
}

function buildDetailCategoryRow(
  row: SpendingPlanDetailCategoryVM,
): SpendingPlanDetailCategoryRowVM {
  const spentLabel = formatAmount(row.spent);
  if (row.allocatedAmount === undefined || row.left === undefined || row.pct === undefined) {
    return {
      kind: 'unallocated',
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      icon: row.icon,
      color: row.color,
      amountLabel: Strings.budgetPlansDetailSpent(spentLabel),
      supportingLabel: Strings.budgetPlansDetailNoCategoryLimit,
      accessibilityLabel: Strings.budgetPlansDetailUnallocatedA11y(row.categoryName, spentLabel),
    };
  }

  const allocatedLabel = formatAmount(row.allocatedAmount);
  const percentage = Math.round(row.pct * 100);
  const percentageLabel =
    row.allocatedAmount === 0 && row.spent > 0
      ? PLAN_STATUS_PRESENTATION.over.label
      : `${percentage}%`;
  const balance = remainingLabel(row.left);
  const balanceLabel = Strings.budgetPlansDetailBalance(
    formatAmount(balance.magnitude),
    balance.label === 'over' ? Strings.budgetPlansOverStatus : Strings.budgetPlansLeftStatus,
  );
  const status = row.isOver
    ? PLAN_STATUS_PRESENTATION.over
    : row.isWarning
      ? PLAN_STATUS_PRESENTATION.watch
      : PLAN_STATUS_PRESENTATION.onTrack;
  return {
    kind: 'allocated',
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    icon: row.icon,
    color: row.color,
    pct: row.pct,
    amountLabel: `${spentLabel} / ${allocatedLabel}`,
    percentageLabel,
    supportingLabel: Strings.budgetPlansDetailCategoryStatus(percentage, status.label),
    balanceLabel,
    balanceColor: row.isOver ? Colors.dark.negative : Colors.dark.text2,
    statusLabel: status.label,
    statusTone: status.tone,
    progressColor: row.isOver ? Colors.dark.negative : budgetBandColor(row.pct),
    accessibilityLabel: Strings.budgetPlansDetailCategoryA11y(
      row.categoryName,
      spentLabel,
      allocatedLabel,
      percentage,
      balanceLabel,
      status.label,
    ),
  };
}

function buildSpendingPlanDetail({
  card,
  pct,
  timing,
  paceDelta,
  allocatedTotal,
  buffer,
  detailCategoryRows,
  highestPressureCategory,
  totalSpent,
}: {
  card: SpendingPlanCardVM;
  pct: number;
  timing: SpendingPlanTimingVM;
  paceDelta: number;
  allocatedTotal: number;
  buffer: number;
  detailCategoryRows: SpendingPlanDetailCategoryVM[];
  highestPressureCategory?: SpendingPlanDetailCategoryVM;
  totalSpent: number;
}): SpendingPlanDetailVM {
  const usedPercentage = Math.round(pct * 100);
  const elapsedPercentage = Math.round(Math.min(Math.max(timing.elapsedPct, 0), 1) * 100);
  const insights: SpendingPlanDetailInsightVM[] = [];

  if (card.paceLabel !== undefined) {
    const isFinal = timing.lifecycle === 'completed';
    insights.push({
      key: isFinal ? 'final' : 'pace',
      icon: isFinal ? 'flag-checkered' : 'speedometer',
      color:
        isFinal && card.progressStatus === 'over'
          ? Colors.dark.negative
          : !isFinal && paceDelta > 0
            ? Colors.dark.warning
            : Colors.dark.positive,
      label: card.paceLabel,
    });
  }

  if (
    highestPressureCategory?.allocatedAmount !== undefined &&
    highestPressureCategory.pct !== undefined &&
    (highestPressureCategory.isOver || highestPressureCategory.isWarning)
  ) {
    const overAmount = Math.max(
      0,
      highestPressureCategory.spent - highestPressureCategory.allocatedAmount,
    );
    insights.push({
      key: 'category',
      icon: highestPressureCategory.isOver ? 'alert-octagon-outline' : 'alert-circle-outline',
      color: highestPressureCategory.isOver ? Colors.dark.negative : Colors.dark.warning,
      label: highestPressureCategory.isOver
        ? Strings.budgetPlansDetailCategoryOver(
            highestPressureCategory.categoryName,
            formatAmount(overAmount),
          )
        : Strings.budgetPlansDetailCategoryPressure(
            highestPressureCategory.categoryName,
            Math.round(highestPressureCategory.pct * 100),
          ),
    });
  }

  return {
    pct,
    progressPercentage: Math.min(Math.max(usedPercentage, 0), 100),
    dateLabel: card.dateLabel,
    balanceAmountLabel: card.balanceAmountLabel,
    balanceMetaLabel: card.balanceMetaLabel,
    balanceAccessibilityLabel: card.balanceAccessibilityLabel,
    balanceColor: card.balanceColor,
    statusLabel: card.statusLabel,
    statusTone: card.statusTone,
    spentLabel: card.spentLabel,
    percentageLabel: card.percentageLabel,
    totalSpentLabel: Strings.budgetPlansDetailTotalSpent(formatAmount(totalSpent)),
    progressColor: card.progressColor,
    progressStatus: card.progressStatus,
    ...(card.elapsedMarkerPercentage === undefined || card.elapsedMarkerColor === undefined
      ? {}
      : {
          elapsedMarkerPercentage: card.elapsedMarkerPercentage,
          elapsedMarkerColor: card.elapsedMarkerColor,
        }),
    metrics: [
      { label: Strings.budgetPlansDetailBudgetUsed, value: `${usedPercentage}%` },
      { label: Strings.budgetPlansDetailTimeElapsed, value: `${elapsedPercentage}%` },
      { label: Strings.budgetPlansDetailAssigned, value: formatAmount(allocatedTotal) },
      { label: Strings.budgetPlansDetailFlexible, value: formatAmount(Math.max(buffer, 0)) },
    ],
    insights: insights.slice(0, 2),
    categoryRows: detailCategoryRows.map(buildDetailCategoryRow),
    ...(buffer > 0
      ? {
          flexibleRow: {
            label: Strings.budgetPlansDetailFlexible,
            amountLabel: `${formatAmount(buffer)} ${Strings.currencyEgp}`,
            supportingLabel: Strings.budgetPlansDetailUnassigned,
          },
        }
      : {}),
  };
}

export function planIntersectsMonth(
  plan: Pick<SpendingPlanWithCategories, 'start_date' | 'end_date'>,
  yearMonth: string,
): boolean {
  const range = monthRange(yearMonth);
  return plan.start_date < range.endExclusive && plan.end_date >= range.start;
}

/** Takes plain amounts, not a per-category record, so a deselected category cannot count. */
export function computeAllocationHelper(
  totalAmount: number | undefined,
  amounts: readonly (number | undefined)[],
): AllocationHelperVM {
  const { allocated, buffer, isOver } = sumAllocations(amounts, totalAmount);
  return {
    allocated,
    // Normalise here: the formatter leaves an exact -0 on screen rather than laundering it.
    buffer: buffer === undefined ? undefined : normalizeNegativeZero(buffer),
    isOver,
  };
}

export function buildSpendingPlanCardChips({
  allocationRows,
  categoryChips,
}: {
  allocationRows: SpendingPlanAllocationRowVM[];
  categoryChips: SpendingPlanCategoryChipVM[];
}): SpendingPlanCardChipVM[] {
  const allocatedCategoryIds = new Set(allocationRows.map((allocation) => allocation.categoryId));
  const plainCategoryChips = categoryChips.filter(
    (category) => !allocatedCategoryIds.has(category.id),
  );
  const visibleAllocationChips = allocationRows.slice(0, 3);
  const visiblePlainChips = plainCategoryChips.slice(
    0,
    Math.max(0, 3 - visibleAllocationChips.length),
  );
  const hiddenChipCount = Math.max(
    0,
    allocationRows.length +
      plainCategoryChips.length -
      visibleAllocationChips.length -
      visiblePlainChips.length,
  );
  const chips: SpendingPlanCardChipVM[] = [
    ...visibleAllocationChips.map((allocation) => ({
      type: 'allocation' as const,
      id: allocation.categoryId,
      allocation,
    })),
    ...visiblePlainChips.map((category) => ({
      type: 'category' as const,
      id: category.id,
      category,
    })),
  ];
  if (hiddenChipCount > 0) chips.push({ type: 'more', id: 'more', count: hiddenChipCount });
  return chips;
}

export function buildSpendingPlanRows({
  plans,
  categories,
  spendByPlanId,
  selectedMonth,
  today,
}: {
  plans: SpendingPlanWithCategories[];
  categories: Category[];
  spendByPlanId: Record<string, Record<string, number>>;
  selectedMonth: string;
  today: string;
}): SpendingPlanRowVM[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  return plans
    .filter((plan) => planIntersectsMonth(plan, selectedMonth))
    .map((plan) => {
      const spend = spendByPlanId[plan.id] ?? {};
      const categoryChips = plan.categories
        .map((row) => categoryById.get(row.category_id))
        .filter(
          (category): category is Category =>
            category !== undefined && category.type === CategoryType.Expense,
        )
        .map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          spent: spend[category.id] ?? 0,
        }));
      const spent = plan.categories.reduce(
        (total, row) => total + (spend[row.category_id] ?? 0),
        0,
      );
      const allocationRows = plan.categories
        // Type predicate, not a bare filter: `?? 0` below is then unreachable, not load-bearing.
        .filter(
          (row): row is SpendingPlanCategory & { allocated_amount: number } =>
            row.allocated_amount !== null,
        )
        .map((row) => {
          const category = categoryById.get(row.category_id);
          const allocatedAmount = row.allocated_amount;
          const categorySpent = spend[row.category_id] ?? 0;
          const pct =
            allocatedAmount > 0 ? categorySpent / allocatedAmount : categorySpent > 0 ? 1 : 0;
          const isOver = categorySpent > allocatedAmount;
          return {
            categoryId: row.category_id,
            categoryName: category?.name ?? row.category_id,
            icon: category?.icon ?? 'tag',
            color: category?.color ?? Colors.dark.text1,
            allocatedAmount,
            spent: categorySpent,
            left: allocatedAmount - categorySpent,
            pct,
            isOver,
          };
        });
      const allocatedTotal = plan.categories.reduce(
        (total, row) => total + (row.allocated_amount ?? 0),
        0,
      );
      const detailCategoryRows: SpendingPlanDetailCategoryVM[] = plan.categories.map((row) => {
        const category = categoryById.get(row.category_id);
        const categorySpent = spend[row.category_id] ?? 0;
        const shared = {
          categoryId: row.category_id,
          categoryName: category?.name ?? row.category_id,
          icon: category?.icon ?? 'tag',
          color: category?.color ?? Colors.dark.text1,
          spent: categorySpent,
        };

        if (row.allocated_amount === null) {
          return { ...shared, isOver: false, isWarning: false };
        }

        const pct =
          row.allocated_amount > 0
            ? categorySpent / row.allocated_amount
            : categorySpent > 0
              ? 1
              : 0;
        const isOver = categorySpent > row.allocated_amount;
        return {
          ...shared,
          allocatedAmount: row.allocated_amount,
          left: row.allocated_amount - categorySpent,
          pct,
          isOver,
          isWarning: !isOver && pct >= BUDGET_WARNING_THRESHOLD,
        };
      });
      const allocatedDetailRows = detailCategoryRows.filter(
        (row): row is SpendingPlanDetailCategoryVM & { allocatedAmount: number; pct: number } =>
          row.allocatedAmount !== undefined && row.pct !== undefined,
      );
      const highestPressureCategory = allocatedDetailRows.reduce<
        (SpendingPlanDetailCategoryVM & { allocatedAmount: number; pct: number }) | undefined
      >((highest, row) => {
        if (highest === undefined) return row;
        const rowHasZeroAllocationOverage = row.isOver && row.allocatedAmount === 0;
        const highestHasZeroAllocationOverage = highest.isOver && highest.allocatedAmount === 0;
        if (rowHasZeroAllocationOverage !== highestHasZeroAllocationOverage) {
          return rowHasZeroAllocationOverage ? row : highest;
        }
        if (row.isOver !== highest.isOver) return row.isOver ? row : highest;
        if (row.isWarning !== highest.isWarning) return row.isWarning ? row : highest;
        return row.pct > highest.pct ? row : highest;
      }, undefined);
      const pct = plan.total_amount > 0 ? spent / plan.total_amount : 0;
      const isOver = spent > plan.total_amount;
      const timing = computePlanTiming(plan.start_date, plan.end_date, today);
      const paceDelta = pct - timing.elapsedPct;
      const status = derivePlanStatus({
        lifecycle: timing.lifecycle,
        isOver,
        paceDelta,
        hasCategoryPressure: allocatedDetailRows.some((row) => row.isOver || row.isWarning),
      });
      const cardChips = buildSpendingPlanCardChips({ allocationRows, categoryChips });
      const buffer = plan.total_amount - allocatedTotal;
      const card = buildSpendingPlanCard({
        name: plan.name,
        startDate: plan.start_date,
        endDate: plan.end_date,
        totalAmount: plan.total_amount,
        spent,
        left: plan.total_amount - spent,
        pct,
        isOver,
        timing,
        status,
        paceDelta,
        allocatedTotal,
        buffer,
        chips: cardChips,
        allocationRows,
        categoryChips,
      });
      const detail = buildSpendingPlanDetail({
        card,
        pct,
        timing,
        paceDelta,
        allocatedTotal,
        buffer,
        detailCategoryRows,
        highestPressureCategory,
        totalSpent: spent,
      });
      return {
        id: plan.id,
        name: plan.name,
        startDate: plan.start_date,
        endDate: plan.end_date,
        totalAmount: plan.total_amount,
        spent,
        left: plan.total_amount - spent,
        pct,
        isOver,
        categoryCount: plan.categories.length,
        categoryChips,
        allocationRows,
        cardChips,
        allocatedTotal,
        buffer,
        timing,
        status,
        paceDelta,
        detailCategoryRows,
        highestPressureCategory,
        card,
        detail,
      };
    });
}
