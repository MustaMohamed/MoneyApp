import { HERO_GRADIENT_COLORS } from '@/components/ui/hero_gradient';
import { CoreTokens } from '@/constants/theme_tokens';
import { resolveBadgeColors } from '@/modules/accounts/constants/account_badge_color';

// Frames B1 and C1 `.badge`: `text2` at a 0.22 share of the fill over the hero gradient's middle stop, `text1` ink.
export const DETAIL_HERO_BADGE_COLORS = resolveBadgeColors({
  tone: CoreTokens.text2,
  backdrop: HERO_GRADIENT_COLORS[1],
  fillShare: 0.22,
  ink: CoreTokens.text1,
  inkShare: 1,
});
