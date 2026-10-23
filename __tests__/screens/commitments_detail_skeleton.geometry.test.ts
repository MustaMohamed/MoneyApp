import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { STATUS_BADGE_PADDING_VERTICAL } from '@/components/ui/status_badge';
import { FITTED_LINE_SLACK, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { lineHeightFor, Type } from '@/constants/theme';
import { resolveCommitmentDetailSkeletonHero } from '@/modules/commitments/screens/commitments/detail/components/detail_skeleton.geometry';

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
});
