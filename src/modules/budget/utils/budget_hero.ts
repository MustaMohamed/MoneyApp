import type { DetailHeroBadge, DetailHeroBar, DetailHeroModel } from '@/components/ui/detail_hero';
import { HERO_GRADIENT_COLORS } from '@/components/ui/hero_gradient';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { resolveBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import { budgetBandColor } from '@/modules/budget/utils/budget_summary';
import { formatDisplayAmountParts } from '@/utils/format_amount';
import { ratioHeldAtTie } from '@/utils/money';

export const LIMIT_TAG_FILL_SHARE = 0.15;

export function heroStatusTag(
  label: string,
  icon: DetailHeroBadge['badgeIcon'],
  tone: string,
): DetailHeroBadge {
  const { fill, foreground } = resolveBadgeColors({
    tone,
    backdrop: HERO_GRADIENT_COLORS[1],
    fillShare: LIMIT_TAG_FILL_SHARE,
    inkShare: 1,
  });
  return { badgeLabel: label, badgeIcon: icon, badgeFill: fill, badgeForeground: foreground };
}

export interface BudgetLimitTag {
  label: string;
  icon: 'trending-up' | 'alert-circle';
  fill: string;
  foreground: string;
}

type BudgetTagStatus = 'onTrack' | 'watch' | 'over';

const BUDGET_STATUS_TAG_STYLE = {
  onTrack: { icon: 'check-circle', tone: Colors.dark.positive },
  watch: { icon: 'trending-up', tone: Colors.dark.gold },
  over: { icon: 'alert-circle', tone: Colors.dark.negative },
} as const satisfies Record<BudgetTagStatus, { icon: DetailHeroBadge['badgeIcon']; tone: string }>;

export function budgetStatusHeroTag(label: string, status: BudgetTagStatus): DetailHeroBadge {
  const { icon, tone } = BUDGET_STATUS_TAG_STYLE[status];
  return heroStatusTag(label, icon, tone);
}

function budgetLimitTag(label: string, status: 'watch' | 'over'): BudgetLimitTag {
  const { icon, tone } = BUDGET_STATUS_TAG_STYLE[status];
  const { fill, foreground } = resolveBadgeColors({
    tone,
    backdrop: CoreTokens.surface,
    fillShare: LIMIT_TAG_FILL_SHARE,
    inkShare: 1,
  });
  return { label, icon, fill, foreground };
}

export const BUDGET_LIMIT_TAGS: Record<'watch' | 'over', BudgetLimitTag> = {
  watch: budgetLimitTag(Strings.budgetCategoriesStatusWatch, 'watch'),
  over: budgetLimitTag(Strings.budgetCategoriesStatusOver, 'over'),
};

type BudgetHeroFigure = Pick<
  DetailHeroModel,
  'amountValue' | 'amountColor' | 'amountAccessibilityLabel'
>;

/** `magnitude` is `remainingLabel(limit - spent).magnitude`; over, it reads in negative and is announced as over. */
export function budgetHeroFigure(magnitude: number, over: boolean): BudgetHeroFigure {
  const parts = formatDisplayAmountParts(magnitude, Currency.EGP);
  return {
    amountValue: parts.text,
    amountColor: over ? Colors.dark.negative : CoreTokens.text1,
    amountAccessibilityLabel: over
      ? Strings.budgetCategoryDetailHeroOverA11y(parts.withCode)
      : parts.withCode,
  };
}

export function budgetHeroBar(
  spent: number,
  limit: number,
  over: boolean,
): Pick<DetailHeroBar, 'share' | 'color'> {
  return {
    share: over ? 1 : ratioHeldAtTie(spent, limit),
    color: over ? Colors.dark.budgetOver : budgetBandColor(spent, limit),
  };
}
