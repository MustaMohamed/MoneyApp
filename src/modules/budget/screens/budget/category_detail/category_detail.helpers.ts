import type { DetailHeroBadge, DetailHeroModel } from '@/components/ui/detail_hero';
import type { DetailLoadErrorCopy } from '@/components/ui/detail_load_error.helpers';
import { DETAIL_HERO_BADGE_COLORS } from '@/components/ui/hero_gradient_badge';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { type BudgetGroup, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { resolveBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import {
  type MonthResultVM,
  buildCategoryBudgetRows,
  computeBudgetHealth,
  remainingLabel,
} from '@/modules/budget/screens/budget/budget.helpers';
import type {
  BudgetHealth,
  NamedBudgetVM,
} from '@/modules/budget/screens/budget/budget_categories.types';
import { resolveBudgetGroupRowValue } from '@/modules/budget/screens/budget/components/set_budget_sheet.helpers';
import type { SpendingPlanLimitTagVM } from '@/modules/budget/screens/budget/spending_plans.types';
import {
  LIMIT_TAG_FILL_SHARE,
  budgetHeroBar,
  budgetHeroFigure,
  heroStatusTag,
} from '@/modules/budget/utils/budget_hero';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  resolveCategoryGlyph,
  resolveHeroTileGlyphColor,
} from '@/modules/transactions/components/transaction_row.helpers';
import { formatAmount } from '@/utils/format_amount';
import { wholePercent } from '@/utils/money';
import { daysLeftInMonth, fullMonthName, lastDayOfMonth } from '@/utils/year_month';

export type CategoryDetailViewState =
  | 'loading'
  | 'notFound'
  | 'firstLoadError'
  | 'refreshErrorWithData'
  | 'ready';

interface CategoryDetailViewStateInput {
  hasLoaded: boolean;
  hasCategory: boolean;
  loadError: boolean;
}

export function resolveCategoryDetailViewState({
  hasLoaded,
  hasCategory,
  loadError,
}: CategoryDetailViewStateInput): CategoryDetailViewState {
  if (!hasLoaded) return loadError ? 'firstLoadError' : 'loading';
  // An error with nothing to show draws flat, as the commitment detail does.
  if (!hasCategory) return loadError ? 'firstLoadError' : 'notFound';
  return loadError ? 'refreshErrorWithData' : 'ready';
}

export function categoryDetailShowsBody(viewState: CategoryDetailViewState): boolean {
  return viewState === 'ready' || viewState === 'refreshErrorWithData';
}

export const BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY: DetailLoadErrorCopy = {
  loadTitle: Strings.budgetCategoryDetailLoadErrorTitle,
  refreshTitle: Strings.budgetCategoryDetailRefreshErrorTitle,
  description: Strings.budgetCategoryDetailLoadErrorDescription,
  retryLabel: Strings.budgetLoadRetry,
};

export const BUDGET_CATEGORY_DETAIL_LOAD_ERROR_TEST_ID = 'budget-category-detail-load-error';

export const BUDGET_CATEGORY_DETAIL_NOT_FOUND_TEST_ID = 'budget-category-detail-not-found';

export const BUDGET_CATEGORY_DETAIL_HERO_TEST_ID = 'budget-category-detail-hero';

export const BUDGET_CATEGORY_DETAIL_BUDGETS_CARD_TEST_ID = 'budget-category-detail-budgets-card';

const HERO_TAGS = {
  onTrack: heroStatusTag(
    Strings.budgetCategoriesStatusOnTrack,
    'check-circle',
    Colors.dark.positive,
  ),
  withinLimit: heroStatusTag(
    Strings.budgetCategoryDetailStatusWithinLimit,
    'check-circle',
    Colors.dark.positive,
  ),
  watch: heroStatusTag(Strings.budgetCategoriesStatusWatch, 'trending-up', Colors.dark.gold),
  over: heroStatusTag(Strings.budgetCategoriesStatusOver, 'alert-circle', Colors.dark.negative),
} as const;

type MonthLifecycle = MonthResultVM['lifecycle'];

export function resolveMonthLifecycle(yearMonth: string, currentMonth: string): MonthLifecycle {
  if (yearMonth < currentMonth) return 'completed';
  return yearMonth === currentMonth ? 'provisional' : 'planned';
}

const LEFT_OVERLINE: Record<MonthLifecycle, string> = {
  completed: Strings.budgetHeroLeftUnspent,
  provisional: Strings.budgetHeroLeftThisMonth,
  planned: Strings.budgetHeroLeftToSpend,
};

export interface CategoryDetailHeroInput {
  category: Category;
  /** The month's budgets summed; `undefined` with no budget in the month. */
  limit: number | undefined;
  /** All the category's spending in the month, unassigned included. */
  spent: number;
  /** The selected month, `YYYY-MM`. */
  month: string;
  /** The local calendar date, `YYYY-MM-DD`. */
  today: string;
  group: BudgetGroup | undefined;
}

export function buildCategoryDetailHero({
  category,
  limit,
  spent,
  month,
  today,
  group,
}: CategoryDetailHeroInput): DetailHeroModel {
  const { glyphName, glyphColor } = resolveCategoryGlyph(category);
  const base = {
    title: category.name,
    badgeLabel: resolveBudgetGroupRowValue(group, Strings.budget5030NotGroupedTitle),
    badgeFill: DETAIL_HERO_BADGE_COLORS.fill,
    badgeForeground: DETAIL_HERO_BADGE_COLORS.foreground,
    tileColor: glyphColor,
    tileGlyph: glyphName,
    tileGlyphColor: resolveHeroTileGlyphColor(glyphColor),
  };

  if (limit === undefined) {
    return {
      ...base,
      amountValue: Strings.budgetCategoryDetailHeroNoBudget,
      amountColor: CoreTokens.text1,
      amountAccessibilityLabel: Strings.budgetCategoryDetailHeroNoBudget,
      overline: false,
      caption: Strings.budgetCategoryDetailHeroSpent(formatAmount(spent)),
    };
  }

  const lifecycle = resolveMonthLifecycle(month, today.slice(0, 7));
  const health = computeBudgetHealth(spent, limit);
  const over = health === 'over';
  const code = CURRENCY_CONFIG[Currency.EGP].code;
  const daysLeft = daysLeftInMonth(month, today);

  return {
    ...base,
    ...budgetHeroFigure(remainingLabel(limit - spent).magnitude, over),
    amountCode: over ? Strings.budgetCategoryDetailHeroOverCode(code) : code,
    overline: over ? false : LEFT_OVERLINE[lifecycle],
    tag: resolveHeroTag(health, lifecycle),
    bar: {
      ...budgetHeroBar(spent, limit, over),
      tickShare:
        lifecycle === 'provisional'
          ? Number(today.slice(8, 10)) / lastDayOfMonth(month)
          : undefined,
    },
    caption: Strings.budgetCategoryDetailHeroCaption(
      formatAmount(spent),
      formatAmount(limit),
      wholePercent(spent, limit),
      daysLeft === undefined ? undefined : Strings.budgetCategoriesDaysLeft(daysLeft),
    ),
  };
}

function resolveHeroTag(health: BudgetHealth, lifecycle: MonthLifecycle): DetailHeroBadge {
  if (health === 'over') return HERO_TAGS.over;
  if (lifecycle === 'completed') return HERO_TAGS.withinLimit;
  return health === 'watch' ? HERO_TAGS.watch : HERO_TAGS.onTrack;
}

function budgetRowTag(
  label: string,
  icon: SpendingPlanLimitTagVM['icon'],
  tone: string,
): SpendingPlanLimitTagVM {
  const { fill, foreground } = resolveBadgeColors({
    tone,
    backdrop: CoreTokens.surface,
    fillShare: LIMIT_TAG_FILL_SHARE,
    inkShare: 1,
  });
  return { label, icon, fill, foreground };
}

const BUDGET_ROW_TAGS = {
  watch: budgetRowTag(Strings.budgetCategoriesStatusWatch, 'trending-up', Colors.dark.gold),
  over: budgetRowTag(Strings.budgetCategoriesStatusOver, 'alert-circle', Colors.dark.negative),
} as const;

export interface CategoryBudgetRingRowVM {
  id: string;
  name: string;
  ringShare: number;
  ringColor: string;
  usedLabel: string;
  caption: string;
  amountLabel: string;
  amountCode: string;
  amountWord: string;
  amountWordColor: string;
  tag?: SpendingPlanLimitTagVM;
  accessibilityLabel: string;
}

export interface CategoryBudgetsCardVM {
  count: number;
  rows: CategoryBudgetRingRowVM[];
  /** Set only when `rows` is empty. */
  emptyLine: string | undefined;
}

interface CategoryBudgetsCardInput {
  category: Category;
  budgets: Budget[];
  spendByMonth: Record<string, Record<string, number>>;
  spendByBudgetId: Record<string, number>;
  /** The selected month, `YYYY-MM`. */
  month: string;
  /** The local month, `YYYY-MM`. */
  currentMonth: string;
}

export function buildCategoryBudgetsCard({
  category,
  budgets,
  spendByMonth,
  spendByBudgetId,
  month,
  currentMonth,
}: CategoryBudgetsCardInput): CategoryBudgetsCardVM {
  const { rows } = buildCategoryBudgetRows({
    categories: [category],
    budgets,
    spendByMonth,
    spendByBudgetId,
    yearMonth: month,
  });
  const lifecycle = resolveMonthLifecycle(month, currentMonth);
  const ringRows = (rows[0]?.budgets ?? []).map((budget) => toRingRow(budget, lifecycle));
  return {
    count: ringRows.length,
    rows: ringRows,
    emptyLine:
      ringRows.length === 0
        ? Strings.budgetCategoryDetailNoBudgets(fullMonthName(month))
        : undefined,
  };
}

function toRingRow(budget: NamedBudgetVM, lifecycle: MonthLifecycle): CategoryBudgetRingRowVM {
  const health = computeBudgetHealth(budget.spent, budget.planned);
  const over = health === 'over';
  return {
    id: budget.id,
    name: budget.name,
    ringShare: budget.usedPct ?? 0,
    ringColor: budget.ringColor,
    usedLabel: budget.usedLabel,
    caption: Strings.budgetCategoryDetailBudgetSpentOf(
      formatAmount(budget.spent),
      formatAmount(budget.planned),
    ),
    amountLabel: budget.balanceAmountLabel,
    amountCode: CURRENCY_CONFIG[Currency.EGP].code,
    amountWord: over
      ? Strings.budgetCategoryDetailBudgetOver
      : Strings.budgetCategoryDetailBudgetLeft,
    amountWordColor: over ? Colors.dark.negative : Colors.dark.text2,
    tag: resolveBudgetRowTag(health, lifecycle),
    accessibilityLabel: budget.accessibilityLabel,
  };
}

function resolveBudgetRowTag(
  health: BudgetHealth,
  lifecycle: MonthLifecycle,
): SpendingPlanLimitTagVM | undefined {
  if (health === 'over') return BUDGET_ROW_TAGS.over;
  if (health === 'watch' && lifecycle !== 'completed') return BUDGET_ROW_TAGS.watch;
  return undefined;
}
