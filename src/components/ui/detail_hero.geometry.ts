import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { STATUS_BADGE_PADDING_VERTICAL } from '@/components/ui/status_badge';
import {
  FITTED_LINE_SLACK,
  resolveRowStacking,
  scaledFontSize,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export const DETAIL_HERO_AMOUNT_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;
export const DETAIL_HERO_SHELL_STYLE = { marginTop: Spacing.xs };
export const DETAIL_HERO_TILE_STYLE = {
  width: Size.detailHeroTile,
  height: Size.detailHeroTile,
  borderRadius: Radius.md,
  alignItems: 'center',
  justifyContent: 'center',
} as const;
export const DETAIL_HERO_PADDING = Spacing.md;
export const DETAIL_HERO_TILE_GAP = Spacing.sm;
export const DETAIL_HERO_BADGE_GAP = Spacing.xxs;
export const DETAIL_HERO_OVERLINE_GAP = Spacing.md;
export const DETAIL_HERO_CAPTION_GAP = Spacing.xxs;
export const DETAIL_HERO_CODE_GAP = ms(6);
export const DETAIL_HERO_CODE_OPACITY = 0.8;
export const DETAIL_HERO_BADGE_ROW_GAP = ms(6);
export const DETAIL_HERO_BAR_GAP = Spacing.sm;
export const DETAIL_HERO_BAR_HEIGHT = ms(3);
export const DETAIL_HERO_BAR_RADIUS = Radius.xs;
export const DETAIL_HERO_BAR_TICK_WIDTH = ms(2);
export const DETAIL_HERO_BAR_TICK_OVERHANG = ms(3);
export const DETAIL_HERO_BAR_TICK_RADIUS = Size.hairline;
export const DETAIL_HERO_BAR_CAPTION_GAP = Spacing.xs;
export const DETAIL_HERO_FIGURES_GAP = Spacing.xs;
export const DETAIL_HERO_FIGURE_VALUE_GAP = Spacing.xxxxs;
export const DETAIL_HERO_FIGURES_COLUMN_GAP = Spacing.xs;
export const DETAIL_HERO_INFO_ROW_GAP = Spacing.xs;
// D2 draws no stacked info line, so the end span keeps the caption's own gap.
export const DETAIL_HERO_INFO_STACK_GAP = DETAIL_HERO_CAPTION_GAP;
const DETAIL_HERO_BADGE_CHROME = 2 * STATUS_BADGE_PADDING_VERTICAL;

export interface DetailHeroLayout {
  hidesOverline?: boolean;
  bar?: boolean;
  figures?: boolean;
  captionEnd?: boolean;
}

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
  overlineMarginTop: number;
  amountMarginTop: number;
  captionGap: number;
  figuresHeight: number;
  stacksInfo: boolean;
  height: number;
}

/** At font scale 1.0 the loaded hero and its skeleton stand at `height`, above it `height` is the loaded hero's floor; the amount line is fitted, so it keeps one device pixel of slack. */
export function resolveDetailHeroGeometry(
  fontScale: number,
  layout: DetailHeroLayout = {},
): DetailHeroGeometry {
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
  const hidesOverline = layout.hidesOverline === true;
  const overlineMarginTop = DETAIL_HERO_OVERLINE_GAP;
  const overlineBlock = hidesOverline ? 0 : overlineMarginTop + micro.lineHeight;
  const amountMarginTop = hidesOverline ? DETAIL_HERO_OVERLINE_GAP : 0;
  const captionGap = layout.bar === true ? DETAIL_HERO_BAR_CAPTION_GAP : DETAIL_HERO_CAPTION_GAP;
  const barRowHeight = layout.bar === true ? DETAIL_HERO_BAR_GAP + DETAIL_HERO_BAR_HEIGHT : 0;
  const figuresHeight =
    layout.figures === true
      ? DETAIL_HERO_FIGURES_GAP +
        micro.lineHeight +
        FITTED_LINE_SLACK +
        DETAIL_HERO_FIGURE_VALUE_GAP +
        scaledTextStyle(Type.meta, fontScale).lineHeight +
        FITTED_LINE_SLACK
      : 0;
  const stacksInfo = layout.captionEnd === true && resolveRowStacking(fontScale) === 'stacked';
  const infoStackHeight = stacksInfo ? DETAIL_HERO_INFO_STACK_GAP + micro.lineHeight : 0;
  const height =
    2 * DETAIL_HERO_PADDING +
    topHeight +
    overlineBlock +
    amountMarginTop +
    amountHeight +
    figuresHeight +
    barRowHeight +
    captionGap +
    micro.lineHeight +
    infoStackHeight;

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
    overlineMarginTop,
    amountMarginTop,
    captionGap,
    figuresHeight,
    stacksInfo,
    height,
  };
}

export function resolveDetailHeroBarShare(share: number): number {
  if (!Number.isFinite(share)) return 0;
  return Math.min(Math.max(share, 0), 1);
}
