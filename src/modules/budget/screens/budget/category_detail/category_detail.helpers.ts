import type { DetailHeroBadge, DetailHeroModel } from '@/components/ui/detail_hero';
import type { DetailLoadErrorCopy } from '@/components/ui/detail_load_error.helpers';
import { HERO_GRADIENT_COLORS } from '@/components/ui/hero_gradient';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { type BudgetGroup, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { resolveBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import {
  computeBudgetHealth,
  remainingLabel,
} from '@/modules/budget/screens/budget/budget.helpers';
import type { BudgetHealth } from '@/modules/budget/screens/budget/budget_categories.types';
import { BUDGET_GROUP_OPTIONS } from '@/modules/budget/screens/budget/components/set_budget_sheet.helpers';
import { budgetBandColor } from '@/modules/budget/utils/budget_summary';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  resolveCategoryGlyph,
  resolveHeroTileGlyphColor,
} from '@/modules/transactions/components/transaction_row.helpers';
import { formatAmount, formatDisplayAmountParts } from '@/utils/format_amount';
import { ratioHeldAtTie, wholePercent } from '@/utils/money';

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

// Frame B1 `.badge`: `text2` at a 0.22 share of the fill over the hero gradient's middle stop, `text1` ink.
const GROUP_BADGE_COLORS = resolveBadgeColors({
  tone: CoreTokens.text2,
  backdrop: HERO_GRADIENT_COLORS[1],
  fillShare: 0.22,
  ink: CoreTokens.text1,
  inkShare: 1,
});

function heroTag(label: string, icon: DetailHeroBadge['badgeIcon'], tone: string): DetailHeroBadge {
  const { fill, foreground } = resolveBadgeColors({
    tone,
    backdrop: HERO_GRADIENT_COLORS[1],
    fillShare: 0.15,
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

type MonthPhase = 'past' | 'current' | 'future';

const LEFT_OVERLINE: Record<MonthPhase, string> = {
  past: Strings.budgetHeroLeftUnspent,
  current: Strings.budgetHeroLeftThisMonth,
  future: Strings.budgetHeroLeftToSpend,
};

export interface CategoryDetailHeroInput {
  category: Category;
  /** The month's budgets summed; `null` with no budget in the month. */
  limit: number | null;
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
    badgeLabel:
      BUDGET_GROUP_OPTIONS.find((option) => option.value === group)?.label ??
      Strings.budget5030NotGroupedTitle,
    badgeFill: GROUP_BADGE_COLORS.fill,
    badgeForeground: GROUP_BADGE_COLORS.foreground,
    tileColor: glyphColor,
    tileGlyph: glyphName,
    tileGlyphColor: resolveHeroTileGlyphColor(glyphColor),
  };

  if (limit === null) {
    return {
      ...base,
      amountValue: Strings.budgetCategoryDetailHeroNoBudget,
      amountColor: CoreTokens.text1,
      amountAccessibilityLabel: Strings.budgetCategoryDetailHeroNoBudget,
      overline: false,
      caption: Strings.budgetCategoryDetailHeroSpent(formatAmount(spent)),
    };
  }

  const todayMonth = today.slice(0, 7);
  const phase: MonthPhase =
    month < todayMonth ? 'past' : month === todayMonth ? 'current' : 'future';
  const health = computeBudgetHealth(spent, limit);
  const over = health === 'over';
  const parts = formatDisplayAmountParts(remainingLabel(limit - spent).magnitude, Currency.EGP);
  const code = CURRENCY_CONFIG[Currency.EGP].code;

  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const day = Number(today.slice(8, 10));

  return {
    ...base,
    amountValue: parts.text,
    amountCode: over ? Strings.budgetCategoryDetailHeroOverCode(code) : code,
    amountColor: over ? Colors.dark.negative : CoreTokens.text1,
    amountAccessibilityLabel: over
      ? Strings.budgetCategoryDetailHeroOverA11y(parts.withCode)
      : parts.withCode,
    overline: over ? false : LEFT_OVERLINE[phase],
    tag: resolveHeroTag(health, phase),
    bar: {
      share: ratioHeldAtTie(spent, limit),
      color: budgetBandColor(spent, limit),
      tickShare: phase === 'current' ? day / daysInMonth : undefined,
    },
    caption: Strings.budgetCategoryDetailHeroCaption(
      formatAmount(spent),
      formatAmount(limit),
      wholePercent(spent, limit),
      phase === 'current' ? Strings.budgetCategoriesDaysLeft(daysInMonth - day) : undefined,
    ),
  };
}

function resolveHeroTag(health: BudgetHealth, phase: MonthPhase): DetailHeroBadge {
  if (health === 'over') return HERO_TAGS.over;
  if (phase === 'past') return HERO_TAGS.withinLimit;
  return health === 'watch' ? HERO_TAGS.watch : HERO_TAGS.onTrack;
}
