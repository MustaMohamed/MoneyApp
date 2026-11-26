import type { DetailHeroBadge, DetailHeroModel, DetailHeroText } from '@/components/ui/detail_hero';
import { DETAIL_HERO_BADGE_COLORS } from '@/components/ui/hero_gradient_badge';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { CategoryType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { mixHex, resolveBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import {
  contrastRatio,
  NON_TEXT_MIN_CONTRAST_RATIO,
} from '@/modules/accounts/constants/account_palette';
import { stepTowardText } from '@/modules/accounts/constants/account_tile_color';
import { normalizeNegativeZero } from '@/modules/accounts/domain/account_aggregation';
import { monthRange } from '@/modules/budget/database/spending_plans';
import type {
  SpendingPlanCategory,
  SpendingPlanWithCategories,
} from '@/modules/budget/entities/budget.entity';
import { formatPlanDailyAmount } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.helpers';
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
  SpendingPlanDetailCategoryVM,
  SpendingPlanDetailLimitRowVM,
  SpendingPlanDetailUnlimitedRowVM,
  SpendingPlanDetailVM,
  SpendingPlanLimitTagVM,
  SpendingPlanRowVM,
  SpendingPlanStatus,
  SpendingPlanStatusTone,
  SpendingPlanTimingVM,
} from '@/modules/budget/screens/budget/spending_plans.types';
import {
  LIMIT_TAG_FILL_SHARE,
  budgetHeroBar,
  budgetHeroFigure,
  heroStatusTag,
} from '@/modules/budget/utils/budget_hero';
import { rankedBy } from '@/modules/budget/utils/budget_row_order';
import { BUDGET_WARNING_PERCENT, budgetBandColor } from '@/modules/budget/utils/budget_summary';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  formatAmount,
  formatCurrencyAmount,
  formatDisplayAmountParts,
} from '@/utils/format_amount';
import { formatDateTileParts, formatShortDate, formatWeekdayDateRange } from '@/utils/format_date';
import {
  compareToPercent,
  exceedsToCent,
  ratioHeldAtTie,
  snapToZero,
  sumAllocations,
  wholePercent,
  wholePercentGap,
  wholePercentOf,
} from '@/utils/money';

import { remainingLabel, type BudgetStatus } from './budget.helpers';

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

type PlanTagStyleStatus = Exclude<SpendingPlanStatus, 'upcoming'>;

const PLAN_STATUS_TAG_STYLE = {
  onTrack: { icon: 'check-circle', tone: Colors.dark.positive },
  watch: { icon: 'trending-up', tone: Colors.dark.gold },
  over: { icon: 'alert-circle', tone: Colors.dark.negative },
} as const satisfies Record<
  PlanTagStyleStatus,
  { icon: DetailHeroBadge['badgeIcon']; tone: string }
>;

type LimitedCategory = SpendingPlanDetailCategoryVM &
  Record<'allocatedAmount' | 'left' | 'pct', number>;

// D2 `.cat-tile`: the category colour at alpha 0x26 over the card surface.
const CATEGORY_TILE_FILL_SHARE = 0x26 / 255;

/** `color` is a `#RRGGBB`; the glyph steps toward the text colour until it clears 3:1 on the tile. */
export function resolveCategoryTileColors(color: string): { tileFill: string; glyphColor: string } {
  const tileFill = mixHex(color, CoreTokens.surface, CATEGORY_TILE_FILL_SHARE);
  return {
    tileFill,
    glyphColor: stepTowardText(
      color,
      (c) => contrastRatio(c, tileFill) >= NON_TEXT_MIN_CONTRAST_RATIO,
    ),
  };
}

type LimitTagStatus = Extract<SpendingPlanStatus, 'watch' | 'over'>;

function limitTag(status: LimitTagStatus): SpendingPlanLimitTagVM {
  const { icon, tone } = PLAN_STATUS_TAG_STYLE[status];
  const { fill, foreground } = resolveBadgeColors({
    tone,
    backdrop: CoreTokens.surface,
    fillShare: LIMIT_TAG_FILL_SHARE,
    inkShare: 1,
  });
  return { label: PLAN_STATUS_PRESENTATION[status].label, icon, fill, foreground };
}

const LIMIT_TAGS: Record<LimitTagStatus, SpendingPlanLimitTagVM> = {
  watch: limitTag('watch'),
  over: limitTag('over'),
};

function planHeroTag(status: PlanTagStyleStatus): DetailHeroBadge {
  const { icon, tone } = PLAN_STATUS_TAG_STYLE[status];
  return heroStatusTag(PLAN_STATUS_PRESENTATION[status].label, icon, tone);
}

const PLAN_HERO_TAGS: Record<SpendingPlanStatus, DetailHeroBadge> = {
  upcoming: heroStatusTag(Strings.budgetPlansStatusUpcoming, 'calendar-outline', Colors.dark.text2),
  onTrack: planHeroTag('onTrack'),
  watch: planHeroTag('watch'),
  over: planHeroTag('over'),
};

const PLAN_WITHIN_LIMIT_HERO_TAG = heroStatusTag(
  Strings.budgetPlansHeroWithinLimit,
  'check-circle',
  Colors.dark.positive,
);

const compareLimitRows = rankedBy((row: LimitedCategory) => [
  row.allocatedAmount,
  row.spent,
  row.categoryName,
  row.categoryId,
]);

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
  if (timing.daysValue === 0) return Strings.budgetPlansEndsToday;
  if (timing.daysValue === 1) return Strings.budgetPlansEndsTomorrow;
  return Strings.budgetPlansDaysLeft(timing.daysValue);
}

function activePlanPaceLabel(pacePoints: number): string {
  if (pacePoints === 0) return Strings.budgetPlansPaceEven;
  return pacePoints > 0
    ? Strings.budgetPlansPaceAhead(pacePoints)
    : Strings.budgetPlansPaceUnder(Math.abs(pacePoints));
}

function planHeroPaceLine(pacePoints: number, timing: SpendingPlanTimingVM): DetailHeroText {
  const timingLabel = planLifecycleLabel(timing);
  if (pacePoints === 0) return Strings.budgetPlansHeroOnPace(timingLabel);
  return pacePoints > 0
    ? Strings.budgetPlansHeroPaceAhead(pacePoints, timingLabel)
    : Strings.budgetPlansHeroPaceUnder(Math.abs(pacePoints), timingLabel);
}

function buildSpendingPlanHero({
  name,
  startDate,
  endDate,
  totalAmount,
  spent,
  left,
  isOver,
  status,
  today,
  usedPercentage,
  pacePoints,
  timing,
  allocatedTotal,
  flexible,
}: {
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  spent: number;
  left: number;
  isOver: boolean;
  status: SpendingPlanStatus;
  today: string;
  usedPercentage: number;
  pacePoints: number;
  timing: SpendingPlanTimingVM;
  allocatedTotal: number;
  flexible: number;
}): DetailHeroModel {
  const shared = {
    title: name,
    tileDate: { ...formatDateTileParts(startDate), ink: Colors.shared.midnightBlue },
    tileColor: Colors.dark.gold,
    badgeLabel: formatWeekdayDateRange(startDate, endDate, today),
    badgeIcon: 'calendar-outline',
    badgeFill: DETAIL_HERO_BADGE_COLORS.fill,
    badgeForeground: DETAIL_HERO_BADGE_COLORS.foreground,
    amountCode: CURRENCY_CONFIG[Currency.EGP].code,
    figures: [
      { label: Strings.budgetPlansDetailAssigned, value: formatAmount(allocatedTotal) },
      { label: Strings.budgetPlansDetailFlexible, value: formatAmount(flexible) },
      { label: Strings.budgetPlansSummarySpent, value: formatAmount(spent) },
    ],
  } satisfies Partial<DetailHeroModel>;
  const balance = {
    overline: isOver
      ? Strings.budgetPlansHeroOverBy
      : Strings.budgetPlansHeroLeftOf(formatDisplayAmountParts(totalAmount, Currency.EGP).text),
    ...budgetHeroFigure(remainingLabel(left).magnitude, isOver),
  };
  switch (timing.lifecycle) {
    case 'upcoming':
      return {
        ...shared,
        tag: PLAN_HERO_TAGS.upcoming,
        overline: Strings.budgetPlansHeroPlanned,
        ...budgetHeroFigure(totalAmount, false),
        bar: { share: 0, color: Colors.dark.text2 },
        caption: Strings.budgetPlansHeroUpcomingLine(timing.totalDays, planLifecycleLabel(timing)),
        captionEnd: Strings.budgetPlansHeroPerDay(
          formatPlanDailyAmount(totalAmount, timing.totalDays),
        ),
      };
    case 'completed':
      return {
        ...shared,
        ...balance,
        tag: isOver ? PLAN_HERO_TAGS.over : PLAN_WITHIN_LIMIT_HERO_TAG,
        bar: budgetHeroBar(spent, totalAmount, isOver),
        caption: Strings.budgetPlansHeroEndedUsedLine(usedPercentage, timing.totalDays),
        captionEnd:
          timing.daysValue === 1
            ? Strings.budgetPlansHeroEndedYesterday
            : Strings.budgetPlansHeroEndedDaysAgo(timing.daysValue),
      };
    case 'active':
      return {
        ...shared,
        ...balance,
        tag: PLAN_HERO_TAGS[status],
        bar: {
          ...budgetHeroBar(spent, totalAmount, isOver),
          tickShare: timing.elapsedDays / timing.totalDays,
        },
        caption: Strings.budgetPlansHeroUsedLine(
          usedPercentage,
          timing.elapsedDays,
          timing.totalDays,
        ),
        captionEnd: planHeroPaceLine(pacePoints, timing),
      };
    default: {
      const unreachable: never = timing.lifecycle;
      throw new Error(`Unknown plan lifecycle: ${String(unreachable)}`);
    }
  }
}

/** Over is decided once, to the cent; an allocation of 0 has ratio 1 when over, else 0. */
function allocationRatio(spent: number, allocated: number): { isOver: boolean; pct: number } {
  const isOver = exceedsToCent(spent, allocated);
  if (allocated > 0) return { isOver, pct: ratioHeldAtTie(spent, allocated) };
  return { isOver, pct: isOver ? 1 : 0 };
}

/** The whole percent beside `allocationRatio`, which alone decides what an allocation of 0 reads. */
function allocationPercentage(spent: number, allocated: number): number {
  if (allocated > 0) return wholePercent(spent, allocated);
  return allocationRatio(spent, allocated).pct * 100;
}

function buildSpendingPlanAllocationCardChip(
  allocation: SpendingPlanAllocationRowVM,
): SpendingPlanCardAllocationChipVM {
  const spentLabel = formatAmount(allocation.spent);
  const allocatedLabel = formatAmount(allocation.allocatedAmount);
  const percentage = allocationPercentage(allocation.spent, allocation.allocatedAmount);
  const percentageLabel =
    allocation.allocatedAmount === 0 && allocation.isOver
      ? PLAN_STATUS_PRESENTATION.over.label
      : `${percentage}%`;
  return {
    ...allocation,
    amountLabel: `${spentLabel}/${allocatedLabel}`,
    percentageLabel,
    bandColor: allocation.isOver
      ? Colors.dark.negative
      : budgetBandColor(allocation.spent, allocation.allocatedAmount),
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
  usedPercentage,
  elapsedPercentage,
  pacePoints,
  isOver,
  timing,
  status,
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
  usedPercentage: number;
  elapsedPercentage: number;
  pacePoints: number;
  isOver: boolean;
  timing: SpendingPlanTimingVM;
  status: SpendingPlanStatus;
  allocatedTotal: number;
  buffer: number;
  chips: SpendingPlanCardChipVM[];
  allocationRows: SpendingPlanAllocationRowVM[];
  categoryChips: SpendingPlanCategoryChipVM[];
}): SpendingPlanCardVM {
  const balance = remainingLabel(left);
  const statusPresentation = PLAN_STATUS_PRESENTATION[status];
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
      ? activePlanPaceLabel(pacePoints)
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
    percentageLabel: Strings.budgetPlansSummaryUsed(usedPercentage),
    progressColor: isOver ? Colors.dark.negative : Colors.dark.gold,
    progressStatus,
    ...(timing.lifecycle === 'active'
      ? {
          elapsedMarkerPercentage: elapsedPercentage,
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

function buildUnlimitedRow(row: SpendingPlanDetailCategoryVM): SpendingPlanDetailUnlimitedRowVM {
  const spentLabel = formatAmount(row.spent);
  return {
    kind: 'unallocated',
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    icon: row.icon,
    amountLabel: spentLabel,
    amountCode: CURRENCY_CONFIG[Currency.EGP].code,
    supportingLabel: Strings.budgetPlansDetailNoCategoryLimit,
    balanceLabel: Strings.budgetPlansSpentStatus,
    balanceColor: Colors.dark.text2,
    ...resolveCategoryTileColors(row.color),
    accessibilityLabel: Strings.budgetPlansDetailUnallocatedA11y(row.categoryName, spentLabel),
  };
}

const compareUnlimitedRows = rankedBy((row: SpendingPlanDetailCategoryVM) => [
  row.spent,
  0,
  row.categoryName,
  row.categoryId,
]);

function buildFlexibleCard(
  flexible: number,
  unlimited: SpendingPlanDetailCategoryVM[],
  lifecycle: SpendingPlanTimingVM['lifecycle'],
): SpendingPlanDetailVM['flexibleCard'] {
  if (unlimited.length === 0 && flexible <= 0) return undefined;
  const rows = [...unlimited].sort(compareUnlimitedRows).map(buildUnlimitedRow);
  const card = { amountLabel: formatCurrencyAmount(flexible, Currency.EGP), rows };
  if (lifecycle === 'upcoming' && unlimited.length > 0) return card;
  const unlimitedSpent = unlimited.reduce((total, row) => total + row.spent, 0);
  const over = exceedsToCent(unlimitedSpent, flexible);
  return {
    ...card,
    footer: {
      label: over ? Strings.budgetPlansDetailFlexibleOver : Strings.budgetPlansDetailFlexibleLeft,
      amountLabel: formatAmount(remainingLabel(flexible - unlimitedSpent).magnitude),
      amountColor: over ? Colors.dark.negative : CoreTokens.text1,
    },
  };
}

function buildDetailCategoryRow(
  row: LimitedCategory,
  active: boolean,
): SpendingPlanDetailLimitRowVM {
  const supportingLabel = Strings.budgetPlansDetailLimitSpentOf(
    formatAmount(row.spent),
    formatAmount(row.allocatedAmount),
  );
  const balance = remainingLabel(row.left);
  const amountLabel = formatAmount(balance.magnitude);
  const balanceLabel =
    balance.label === 'over' ? Strings.budgetPlansOverStatus : Strings.budgetPlansLeftStatus;
  const tag = row.isOver ? LIMIT_TAGS.over : row.isWarning && active ? LIMIT_TAGS.watch : undefined;
  return {
    kind: 'allocated',
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    icon: row.icon,
    pct: row.pct,
    amountLabel,
    amountCode: CURRENCY_CONFIG[Currency.EGP].code,
    supportingLabel,
    balanceLabel,
    balanceColor: row.isOver ? Colors.dark.negative : Colors.dark.text2,
    progressColor: row.isOver
      ? Colors.dark.budgetOver
      : budgetBandColor(row.spent, row.allocatedAmount),
    ...resolveCategoryTileColors(row.color),
    ...(tag === undefined ? {} : { tag }),
    accessibilityLabel: Strings.budgetPlansDetailCategoryA11y(
      row.categoryName,
      supportingLabel,
      Strings.budgetPlansDetailBalance(amountLabel, balanceLabel),
      tag?.label,
    ),
  };
}

const hasLimit = (row: SpendingPlanDetailCategoryVM): row is LimitedCategory =>
  row.allocatedAmount !== undefined && row.left !== undefined && row.pct !== undefined;

function buildSpendingPlanDetail({
  hero,
  card,
  timing,
  allocatedTotal,
  flexible,
  detailCategoryRows,
}: {
  hero: DetailHeroModel;
  card: SpendingPlanCardVM;
  timing: SpendingPlanTimingVM;
  allocatedTotal: number;
  flexible: number;
  detailCategoryRows: SpendingPlanDetailCategoryVM[];
}): SpendingPlanDetailVM {
  const limitRows = detailCategoryRows
    .filter(hasLimit)
    .sort(compareLimitRows)
    .map((row) => buildDetailCategoryRow(row, timing.lifecycle === 'active'));
  const flexibleCard = buildFlexibleCard(
    flexible,
    detailCategoryRows.filter((row) => !hasLimit(row)),
    timing.lifecycle,
  );

  return {
    hero,
    ...(limitRows.length === 0
      ? {}
      : {
          limitsCard: {
            assignedLabel: Strings.budgetPlansDetailLimitsAssigned(formatAmount(allocatedTotal)),
            ...(card.elapsedMarkerPercentage !== undefined
              ? { tickPercentage: card.elapsedMarkerPercentage }
              : {}),
            rows: limitRows,
          },
        }),
    ...(flexibleCard === undefined ? {} : { flexibleCard }),
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
  const { allocated, buffer, isOver, hasCents } = sumAllocations(amounts, totalAmount);
  return {
    allocated,
    // Normalise here: the formatter leaves an exact -0 on screen rather than laundering it.
    buffer: buffer === undefined ? undefined : normalizeNegativeZero(buffer),
    isOver,
    hasCents,
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
    .map((plan): SpendingPlanRowVM => {
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
          const { isOver, pct } = allocationRatio(categorySpent, allocatedAmount);
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

        const { isOver, pct } = allocationRatio(categorySpent, row.allocated_amount);
        return {
          ...shared,
          allocatedAmount: row.allocated_amount,
          left: row.allocated_amount - categorySpent,
          pct,
          isOver,
          isWarning:
            !isOver &&
            compareToPercent(categorySpent, row.allocated_amount, BUDGET_WARNING_PERCENT) >= 0,
        };
      });
      const allocatedDetailRows = detailCategoryRows.filter(
        (row): row is SpendingPlanDetailCategoryVM & { allocatedAmount: number; pct: number } =>
          row.allocatedAmount !== undefined && row.pct !== undefined,
      );
      const left = plan.total_amount - spent;
      const pct = plan.total_amount > 0 ? spent / plan.total_amount : 0;
      const isOver = exceedsToCent(spent, plan.total_amount);
      const timing = computePlanTiming(plan.start_date, plan.end_date, today);
      const usedPercentage = wholePercent(spent, plan.total_amount);
      const elapsedPercentage = Math.min(
        Math.max(wholePercentOf(timing.elapsedDays, timing.totalDays), 0),
        100,
      );
      const pacePoints = wholePercentGap({
        part: spent,
        whole: plan.total_amount,
        elapsed: timing.elapsedDays,
        span: timing.totalDays,
      });
      const status = derivePlanStatus({
        lifecycle: timing.lifecycle,
        isOver,
        spent,
        totalAmount: plan.total_amount,
        elapsedDays: timing.elapsedDays,
        totalDays: timing.totalDays,
        hasCategoryPressure: allocatedDetailRows.some((row) => row.isOver || row.isWarning),
      });
      const cardChips = buildSpendingPlanCardChips({ allocationRows, categoryChips });
      const buffer = snapToZero(plan.total_amount - allocatedTotal);
      const flexible = Math.max(buffer, 0);
      const card = buildSpendingPlanCard({
        name: plan.name,
        startDate: plan.start_date,
        endDate: plan.end_date,
        totalAmount: plan.total_amount,
        spent,
        left,
        usedPercentage,
        elapsedPercentage,
        pacePoints,
        isOver,
        timing,
        status,
        allocatedTotal,
        buffer,
        chips: cardChips,
        allocationRows,
        categoryChips,
      });
      const hero = buildSpendingPlanHero({
        name: plan.name,
        startDate: plan.start_date,
        endDate: plan.end_date,
        totalAmount: plan.total_amount,
        spent,
        left,
        isOver,
        status,
        today,
        usedPercentage,
        pacePoints,
        timing,
        allocatedTotal,
        flexible,
      });
      const detail = buildSpendingPlanDetail({
        hero,
        card,
        timing,
        allocatedTotal,
        flexible,
        detailCategoryRows,
      });
      return {
        id: plan.id,
        name: plan.name,
        startDate: plan.start_date,
        endDate: plan.end_date,
        totalAmount: plan.total_amount,
        spent,
        left,
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
        detailCategoryRows,
        card,
        detail,
      };
    });
}
