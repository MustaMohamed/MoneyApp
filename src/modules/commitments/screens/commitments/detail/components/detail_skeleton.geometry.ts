import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { STATUS_BADGE_PADDING_VERTICAL } from '@/components/ui/status_badge';
import { FITTED_LINE_SLACK, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Spacing, Type } from '@/constants/theme';

export const COMMITMENT_DETAIL_SKELETON_SHELL_STYLE = Object.freeze({ marginTop: Spacing.xs });
export const COMMITMENT_DETAIL_SKELETON_HERO_PADDING = Spacing.md;
export const COMMITMENT_DETAIL_SKELETON_TILE_GAP = Spacing.sm;
export const COMMITMENT_DETAIL_SKELETON_BADGE_GAP = Spacing.xxs;
export const COMMITMENT_DETAIL_SKELETON_OVERLINE_GAP = Spacing.md;
export const COMMITMENT_DETAIL_SKELETON_CAPTION_GAP = Spacing.xxs;

interface CommitmentDetailSkeletonHero {
  titleLineHeight: number;
  badgeHeight: number;
  overlineLineHeight: number;
  amountHeight: number;
  captionLineHeight: number;
}

/** The hero's bar heights at `fontScale`; the amount line is fitted, so it keeps one device pixel of slack. */
export function resolveCommitmentDetailSkeletonHero(
  fontScale: number,
): CommitmentDetailSkeletonHero {
  const title = scaledTextStyle(Type.headline, fontScale);
  // The overline, the caption and the badge label are one step.
  const micro = scaledTextStyle(Type.micro, fontScale);
  const amount = scaledTextStyle(Type.detailHero, fontScale, DISPLAY_HEADLINE_MAX_FONT_SCALE);
  return {
    titleLineHeight: title.lineHeight,
    badgeHeight: micro.lineHeight + 2 * STATUS_BADGE_PADDING_VERTICAL,
    overlineLineHeight: micro.lineHeight,
    amountHeight: amount.lineHeight + FITTED_LINE_SLACK,
    captionLineHeight: micro.lineHeight,
  };
}
