import type { DetailHeroBadge, DetailHeroModel } from '@/components/ui/detail_hero';
import type { DetailLoadErrorCopy } from '@/components/ui/detail_load_error.helpers';
import { HERO_GRADIENT_COLORS } from '@/components/ui/hero_gradient';
import { DETAIL_HERO_BADGE_COLORS } from '@/components/ui/hero_gradient_badge';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { type BudgetGroup, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { resolveBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import {
  type MonthResultVM,
  computeBudgetHealth,
  remainingLabel,
} from '@/modules/budget/screens/budget/budget.helpers';
import type { BudgetHealth } from '@/modules/budget/screens/budget/budget_categories.types';
import { resolveBudgetGroupRowValue } from '@/modules/budget/screens/budget/components/set_budget_sheet.helpers';
import { LIMIT_TAG_FILL_SHARE } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { budgetBandColor } from '@/modules/budget/utils/budget_summary';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  resolveCategoryGlyph,
  resolveHeroTileGlyphColor,
} from '@/modules/transactions/components/transaction_row.helpers';
import { formatAmount, formatDisplayAmountParts } from '@/utils/format_amount';
import { ratioHeldAtTie, wholePercent } from '@/utils/money';
import { daysLeftInMonth, lastDayOfMonth } from '@/utils/year_month';

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

function heroTag(label: string, icon: DetailHeroBadge['badgeIcon'], tone: string): DetailHeroBadge {
  const { fill, foreground } = resolveBadgeColors({
    tone,
    backdrop: HERO_GRADIENT_COLORS[1],
    fillShare: LIMIT_TAG_FILL_SHARE,
    inkShare: 1,
  });
  return { badgeLabel: label, badgeIcon: icon, badgeFill: fill, badgeForeground: foreground };
}

const HERO_TAGS = {
  onTrack: heroTag(Strings.budgetCategoriesStatusOnTrack, 'check-circle', Colors.dark.positive),
  withinLimit: heroTag(
    Strings.budgetCategoryDetailStatusWithinLimit,
    'check-circle',
    Colors.dark.positive,
  ),
  watch: heroTag(Strings.budgetCategoriesStatusWatch, 'trending-up', Colors.dark.gold),
  over: heroTag(Strings.budgetCategoriesStatusOver, 'alert-circle', Colors.dark.negative),
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
  const parts = formatDisplayAmountParts(remainingLabel(limit - spent).magnitude, Currency.EGP);
  const code = CURRENCY_CONFIG[Currency.EGP].code;
  const daysLeft = daysLeftInMonth(month, today);

  return {
    ...base,
    amountValue: parts.text,
    amountCode: over ? Strings.budgetCategoryDetailHeroOverCode(code) : code,
    amountColor: over ? Colors.dark.negative : CoreTokens.text1,
    amountAccessibilityLabel: over
      ? Strings.budgetCategoryDetailHeroOverA11y(parts.withCode)
      : parts.withCode,
    overline: over ? false : LEFT_OVERLINE[lifecycle],
    tag: resolveHeroTag(health, lifecycle),
    bar: {
      share: over ? 1 : ratioHeldAtTie(spent, limit),
      color: over ? Colors.dark.budgetOver : budgetBandColor(spent, limit),
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
