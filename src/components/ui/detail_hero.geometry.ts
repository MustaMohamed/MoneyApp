import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { STATUS_BADGE_PADDING_VERTICAL } from '@/components/ui/status_badge';
import {
  FITTED_LINE_SLACK,
  scaledFontSize,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export const DETAIL_HERO_AMOUNT_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;
export const DETAIL_HERO_SHELL_STYLE = { marginTop: Spacing.xs };
export const DETAIL_HERO_PADDING = Spacing.md;
export const DETAIL_HERO_TILE_GAP = Spacing.sm;
export const DETAIL_HERO_BADGE_GAP = Spacing.xxs;
export const DETAIL_HERO_OVERLINE_GAP = Spacing.md;
export const DETAIL_HERO_CAPTION_GAP = Spacing.xxs;
export const DETAIL_HERO_CODE_GAP = ms(6);
export const DETAIL_HERO_CODE_OPACITY = 0.8;
const DETAIL_HERO_BADGE_CHROME = 2 * STATUS_BADGE_PADDING_VERTICAL;

interface DetailHeroGeometry {
  titleFontSize: number;
  overlineFontSize: number;
  amountFontSize: number;
  codeFontSize: number;
  captionFontSize: number;
  titleLineHeight: number;
  overlineLineHeight: number;
  captionLineHeight: number;
  badgeHeight: number;
  topHeight: number;
  amountHeight: number;
  height: number;
}

/** The loaded hero and its skeleton both stand at `height`; the amount line is fitted, so it keeps one device pixel of slack. */
export function resolveDetailHeroGeometry(fontScale: number): DetailHeroGeometry {
  const title = scaledTextStyle(Type.headline, fontScale);
  // The overline, the caption and the badge label are one step.
  const micro = scaledTextStyle(Type.micro, fontScale);
  const amount = scaledTextStyle(Type.detailHero, fontScale, DETAIL_HERO_AMOUNT_MAX_FONT_SCALE);
  const codeFontSize = scaledFontSize(Type.subhead, fontScale, DETAIL_HERO_AMOUNT_MAX_FONT_SCALE);
  const badgeHeight = micro.lineHeight + DETAIL_HERO_BADGE_CHROME;
  const topHeight = Math.max(
    Size.detailHeroTile,
    title.lineHeight + DETAIL_HERO_BADGE_GAP + badgeHeight,
  );
  const amountHeight = amount.lineHeight + FITTED_LINE_SLACK;
  const height =
    2 * DETAIL_HERO_PADDING +
    topHeight +
    DETAIL_HERO_OVERLINE_GAP +
    micro.lineHeight +
    amountHeight +
    DETAIL_HERO_CAPTION_GAP +
    micro.lineHeight;

  return {
    titleFontSize: title.fontSize,
    overlineFontSize: micro.fontSize,
    amountFontSize: amount.fontSize,
    codeFontSize,
    captionFontSize: micro.fontSize,
    titleLineHeight: title.lineHeight,
    overlineLineHeight: micro.lineHeight,
    captionLineHeight: micro.lineHeight,
    badgeHeight,
    topHeight,
    amountHeight,
    height,
  };
}
