import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { SpendingPlanWithCategories } from '@/modules/budget/database/spending_plans';
import type { Category } from '@/modules/categories/entities/category.entity';
import { formatAmount } from '@/utils/format_amount';
import { formatMonthYear, formatShortDate } from '@/utils/format_date';

import {
  BUDGET_WARNING_THRESHOLD,
  budgetBandColor,
  remainingLabel,
  type BudgetStatus,
} from './budget.helpers';

const DAY_MS = 86_400_000;
const PACE_WARNING_THRESHOLD = 0.1;

export type SpendingPlanLifecycle = 'upcoming' | 'active' | 'completed';
export type SpendingPlanStatus = 'upcoming' | 'onTrack' | 'watch' | 'over';
export type SpendingPlanStatusTone = 'accent' | 'success' | 'warning' | 'danger';

export interface SpendingPlansSummaryStatusItemVM {
  key: 'onTrack' | 'watch' | 'over' | 'upcoming';
  icon: 'check-circle-outline' | 'alert-circle-outline' | 'alert-octagon-outline' | 'clock-outline';
  color: string;
  label: string;
}

export interface SpendingPlanTimingVM {
  lifecycle: SpendingPlanLifecycle;
  totalDays: number;
  elapsedDays: number;
  elapsedPct: number;
  daysValue: number;
}

export interface SpendingPlanDetailCategoryVM {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  spent: number;
  allocatedAmount?: number;
  left?: number;
  pct?: number;
  isOver: boolean;
  isWarning: boolean;
}

export interface SpendingPlanAllocationRowVM {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  allocatedAmount: number;
  spent: number;
  left: number;
  pct: number;
  isOver: boolean;
}

export interface SpendingPlanCategoryChipVM {
  id: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
}

export type SpendingPlanCardChipVM =
  | { type: 'allocation'; id: string; allocation: SpendingPlanAllocationRowVM }
  | { type: 'category'; id: string; category: SpendingPlanCategoryChipVM }
  | { type: 'more'; id: 'more'; count: number };

export interface SpendingPlanCardAllocationChipVM extends SpendingPlanAllocationRowVM {
  amountLabel: string;
  percentageLabel: string;
  bandColor: string;
  accessibilityLabel: string;
}

export interface SpendingPlanCardCategoryChipVM extends SpendingPlanCategoryChipVM {
  spent: number;
  amountLabel: string;
  accessibilityLabel: string;
}

export type SpendingPlanCardDisplayChipVM =
  | { type: 'allocation'; id: string; allocation: SpendingPlanCardAllocationChipVM }
  | { type: 'category'; id: string; category: SpendingPlanCardCategoryChipVM }
  | {
      type: 'more';
      id: 'more';
      count: number;
      label: string;
      accessibilityLabel: string;
    };

export interface SpendingPlanCardVM {
  openDetailsAccessibilityLabel: string;
  statusLabel: string;
  statusTone: SpendingPlanStatusTone;
  dateLabel: string;
  balanceAmountLabel: string;
  balanceMetaLabel: string;
  balanceAccessibilityLabel: string;
  balanceColor: string;
  spentLabel: string;
  percentageLabel: string;
  progressColor: string;
  progressStatus: BudgetStatus;
  elapsedMarkerPercentage?: number;
  elapsedMarkerColor?: string;
  paceLabel?: string;
  allocationFooterLabel?: string;
  allocationChips: SpendingPlanCardAllocationChipVM[];
  chips: SpendingPlanCardDisplayChipVM[];
}

export interface SpendingPlanRowVM {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  spent: number;
  left: number;
  pct: number;
  isOver: boolean;
  categoryCount: number;
  categoryChips: SpendingPlanCategoryChipVM[];
  allocationRows: SpendingPlanAllocationRowVM[];
  cardChips: SpendingPlanCardChipVM[];
  allocatedTotal: number;
  buffer: number;
  timing: SpendingPlanTimingVM;
  status: SpendingPlanStatus;
  paceDelta: number;
  detailCategoryRows: SpendingPlanDetailCategoryVM[];
  highestPressureCategory?: SpendingPlanDetailCategoryVM;
  card: SpendingPlanCardVM;
}

export interface SpendingPlansSummaryVM {
  planned: number;
  spent: number;
  left: number;
  pct: number;
  planCount: number;
  monthLabel: string;
  eyebrowLabel: string;
  usedPercentage: number;
  progressPercentage: number;
  itemizedAmount: number;
  itemizedPct: number;
  itemizedPercentage: number;
  balanceAmount: number;
  balanceStatus: 'left' | 'over';
  balanceColor: string;
  barColor: string;
  barStatus: BudgetStatus;
  activeCount: number;
  upcomingCount: number;
  onTrackCount: number;
  watchCount: number;
  overCount: number;
  needsAttentionCount: number;
  statusItems: SpendingPlansSummaryStatusItemVM[];
}

export interface AllocationHelperVM {
  allocated: number;
  buffer: number;
  isOver: boolean;
}

export interface PlanDraftValidationErrors {
  name?: string;
  dates?: string;
  amount?: string;
  categories?: string;
  allocations?: string;
}

function monthRange(yearMonth: string): { start: string; endExclusive: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start: `${yearMonth}-01`,
    endExclusive: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}

function isoDayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function computePlanTiming(
  startDate: string,
  endDate: string,
  today: string,
): SpendingPlanTimingVM {
  const start = isoDayNumber(startDate);
  const end = isoDayNumber(endDate);
  const current = isoDayNumber(today);
  const totalDays = end - start + 1;

  if (current < start) {
    return {
      lifecycle: 'upcoming',
      totalDays,
      elapsedDays: 0,
      elapsedPct: 0,
      daysValue: start - current,
    };
  }

  const elapsedDays = Math.min(totalDays, current - start + 1);
  return {
    lifecycle: current > end ? 'completed' : 'active',
    totalDays,
    elapsedDays,
    elapsedPct: elapsedDays / totalDays,
    daysValue: current > end ? current - end : end - current,
  };
}

function derivePlanStatus({
  lifecycle,
  isOver,
  paceDelta,
  hasCategoryPressure,
}: {
  lifecycle: SpendingPlanLifecycle;
  isOver: boolean;
  paceDelta: number;
  hasCategoryPressure: boolean;
}): SpendingPlanStatus {
  if (lifecycle === 'upcoming') return 'upcoming';
  if (isOver) return 'over';
  if (
    lifecycle === 'active' &&
    (paceDelta + Number.EPSILON >= PACE_WARNING_THRESHOLD || hasCategoryPressure)
  )
    return 'watch';
  return 'onTrack';
}

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
  return {
    ...allocation,
    amountLabel: `${spentLabel}/${allocatedLabel}`,
    percentageLabel: `${percentage}%`,
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
    amountLabel,
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
  hasAllocations,
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
  hasAllocations: boolean;
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
    progressColor: isOver ? Colors.dark.negative : budgetBandColor(pct),
    progressStatus,
    ...(timing.lifecycle === 'active'
      ? {
          elapsedMarkerPercentage: Math.round(Math.min(Math.max(timing.elapsedPct, 0), 1) * 100),
          elapsedMarkerColor: Colors.shared.transferBlue,
        }
      : {}),
    ...(paceLabel === undefined ? {} : { paceLabel }),
    ...(hasAllocations
      ? {
          allocationFooterLabel: Strings.budgetPlansCardAllocationFooter(
            formatAmount(allocatedTotal),
            formatAmount(buffer),
          ),
        }
      : {}),
    allocationChips,
    chips: buildSpendingPlanCardDisplayChips({
      chips,
      allocationChips,
      categoryChips: categoryCardChips,
    }),
  };
}

export function planIntersectsMonth(
  plan: Pick<SpendingPlanWithCategories, 'start_date' | 'end_date'>,
  yearMonth: string,
): boolean {
  const range = monthRange(yearMonth);
  return plan.start_date < range.endExclusive && plan.end_date >= range.start;
}

export function computeAllocationHelper(
  totalAmount: number,
  allocations: Record<string, number | undefined>,
): AllocationHelperVM {
  let allocated = 0;
  for (const amount of Object.values(allocations)) allocated += amount ?? 0;
  return { allocated, buffer: totalAmount - allocated, isOver: allocated > totalAmount };
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
        .filter((row) => row.allocated_amount !== null)
        .map((row) => {
          const category = categoryById.get(row.category_id);
          const allocatedAmount = row.allocated_amount ?? 0;
          const categorySpent = spend[row.category_id] ?? 0;
          const pct = allocatedAmount > 0 ? categorySpent / allocatedAmount : 0;
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

        const pct = row.allocated_amount > 0 ? categorySpent / row.allocated_amount : 0;
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
        hasAllocations: allocationRows.length > 0,
        chips: cardChips,
        allocationRows,
        categoryChips,
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
      };
    });
}

export function computeSpendingPlansSummary(
  rows: SpendingPlanRowVM[],
  selectedMonth: string,
): SpendingPlansSummaryVM {
  const planned = rows.reduce((total, row) => total + row.totalAmount, 0);
  const spent = rows.reduce((total, row) => total + row.spent, 0);
  const left = planned - spent;
  const pct = planned > 0 ? spent / planned : 0;
  const itemizedAmount = rows.reduce((total, row) => total + row.allocatedTotal, 0);
  const itemizedPct = planned > 0 ? itemizedAmount / planned : 0;
  const usedPercentage = Math.round(pct * 100);
  const balance = remainingLabel(left);
  const isOver = balance.label === 'over';
  const activeCount = rows.filter((row) => row.timing.lifecycle === 'active').length;
  const upcomingCount = rows.filter((row) => row.timing.lifecycle === 'upcoming').length;
  const onTrackCount = rows.filter((row) => row.status === 'onTrack').length;
  const watchCount = rows.filter((row) => row.status === 'watch').length;
  const overCount = rows.filter((row) => row.status === 'over').length;
  const planCount = rows.length;
  const monthLabel = formatMonthYear(selectedMonth);
  return {
    planned,
    spent,
    left,
    pct,
    planCount,
    monthLabel,
    eyebrowLabel: Strings.budgetPlansSummaryEyebrow(planCount, monthLabel),
    usedPercentage,
    progressPercentage: Math.min(Math.max(usedPercentage, 0), 100),
    itemizedAmount,
    itemizedPct,
    itemizedPercentage: Math.round(itemizedPct * 100),
    balanceAmount: balance.magnitude,
    balanceStatus: balance.label,
    balanceColor: isOver ? Colors.dark.negative : Colors.dark.positive,
    barColor: isOver ? Colors.dark.negative : budgetBandColor(pct),
    barStatus: isOver ? 'over' : 'under',
    activeCount,
    upcomingCount,
    onTrackCount,
    watchCount,
    overCount,
    needsAttentionCount: watchCount + overCount,
    statusItems: [
      {
        key: 'onTrack',
        icon: 'check-circle-outline',
        color: Colors.dark.positive,
        label: Strings.budgetPlansSummaryOnTrackCount(onTrackCount),
      },
      {
        key: 'watch',
        icon: 'alert-circle-outline',
        color: Colors.dark.warning,
        label: Strings.budgetPlansSummaryWatchCount(watchCount),
      },
      {
        key: 'over',
        icon: 'alert-octagon-outline',
        color: Colors.dark.negative,
        label: Strings.budgetPlansSummaryOverCount(overCount),
      },
      {
        key: 'upcoming',
        icon: 'clock-outline',
        color: Colors.shared.transferBlue,
        label: Strings.budgetPlansSummaryUpcomingCount(upcomingCount),
      },
    ],
  };
}

export function validatePlanDraft({
  name,
  startDate,
  endDate,
  totalAmount,
  categoryIds,
  allocations,
}: {
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  categoryIds: string[];
  allocations: Record<string, number | undefined>;
}): PlanDraftValidationErrors {
  const errors: PlanDraftValidationErrors = {};
  if (name.trim().length === 0) errors.name = Strings.budgetPlanNameRequired;
  if (endDate < startDate) errors.dates = Strings.budgetPlanDateInvalid;
  if (!Number.isFinite(totalAmount) || totalAmount <= 0)
    errors.amount = Strings.budgetPlanAmountRequired;
  if (categoryIds.length === 0) errors.categories = Strings.budgetPlanCategoryRequired;
  if (
    Object.values(allocations).some(
      (amount) => amount !== undefined && (!Number.isFinite(amount) || amount < 0),
    )
  ) {
    errors.allocations = Strings.budgetPlanAllocationInvalid;
  }
  if (computeAllocationHelper(totalAmount, allocations).isOver) {
    errors.allocations = Strings.budgetPlanAllocationOver;
  }
  return errors;
}
