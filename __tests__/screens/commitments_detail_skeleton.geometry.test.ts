import { resolveDetailHeroGeometry } from '@/components/ui/detail_hero.geometry';
import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { STATUS_BADGE_PADDING_VERTICAL } from '@/components/ui/status_badge';
import { FITTED_LINE_SLACK, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { lineHeightFor, Size, Type } from '@/constants/theme';
import {
  COMMITMENT_DETAIL_SKELETON_BADGE_GAP,
  COMMITMENT_DETAIL_SKELETON_CAPTION_GAP,
  COMMITMENT_DETAIL_SKELETON_HERO_PADDING,
  COMMITMENT_DETAIL_SKELETON_OVERLINE_GAP,
  resolveCommitmentDetailSkeletonHero,
} from '@/modules/commitments/screens/commitments/detail/components/detail_skeleton.geometry';

const FIELDS = [
  'titleLineHeight',
  'badgeHeight',
  'overlineLineHeight',
  'amountHeight',
  'captionLineHeight',
] as const;

function heightOf(hero: Record<(typeof FIELDS)[number], number>): number {
  return FIELDS.reduce((sum, field) => sum + hero[field], 0);
}

describe('resolveCommitmentDetailSkeletonHero', () => {
  it.each([1, 2])('sizes each bar from the type scale at font scale %s', (fontScale) => {
    const micro = scaledTextStyle(Type.micro, fontScale).lineHeight;
    const amount = scaledTextStyle(Type.detailHero, fontScale, DISPLAY_HEADLINE_MAX_FONT_SCALE);

    expect(resolveCommitmentDetailSkeletonHero(fontScale)).toStrictEqual({
      titleLineHeight: scaledTextStyle(Type.headline, fontScale).lineHeight,
      badgeHeight: micro + 2 * STATUS_BADGE_PADDING_VERTICAL,
      overlineLineHeight: micro,
      amountHeight: amount.lineHeight + FITTED_LINE_SLACK,
      captionLineHeight: micro,
    });
  });

  it('reads the unscaled line heights at font scale 1.0', () => {
    expect(resolveCommitmentDetailSkeletonHero(1)).toStrictEqual({
      titleLineHeight: lineHeightFor(Type.headline),
      badgeHeight: lineHeightFor(Type.micro) + 2 * STATUS_BADGE_PADDING_VERTICAL,
      overlineLineHeight: lineHeightFor(Type.micro),
      amountHeight: lineHeightFor(Type.detailHero) + FITTED_LINE_SLACK,
      captionLineHeight: lineHeightFor(Type.micro),
    });
  });

  it('reads taller at font scale 2.0 than at 1.0', () => {
    expect(heightOf(resolveCommitmentDetailSkeletonHero(2))).toBeGreaterThan(
      heightOf(resolveCommitmentDetailSkeletonHero(1)),
    );
  });

  // The stack detail_skeleton.tsx lays out: padding, the tile beside title and badge, overline, amount, caption.
  it.each([1, 1.3, 2])('stacks to the loaded hero height at font scale %s', (fontScale) => {
    const hero = resolveCommitmentDetailSkeletonHero(fontScale);
    const stack =
      2 * COMMITMENT_DETAIL_SKELETON_HERO_PADDING +
      Math.max(
        Size.detailHeroTile,
        hero.titleLineHeight + COMMITMENT_DETAIL_SKELETON_BADGE_GAP + hero.badgeHeight,
      ) +
      COMMITMENT_DETAIL_SKELETON_OVERLINE_GAP +
      hero.overlineLineHeight +
      hero.amountHeight +
      COMMITMENT_DETAIL_SKELETON_CAPTION_GAP +
      hero.captionLineHeight;

    expect(stack).toBe(resolveDetailHeroGeometry(fontScale).height);
  });
});
