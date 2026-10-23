import { resolveCommitmentDetailSkeletonHero } from '@/modules/commitments/screens/commitments/detail/components/detail_skeleton.geometry';
import { resolveDetailHeroGeometry } from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';

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
  it.each([1, 2])('matches the transactions hero line heights at font scale %s', (fontScale) => {
    const transactionsHero = resolveDetailHeroGeometry(fontScale);
    const expected = Object.fromEntries(FIELDS.map((field) => [field, transactionsHero[field]]));

    expect(resolveCommitmentDetailSkeletonHero(fontScale)).toStrictEqual(expected);
  });

  it('reads taller at font scale 2.0 than at 1.0', () => {
    expect(heightOf(resolveCommitmentDetailSkeletonHero(2))).toBeGreaterThan(
      heightOf(resolveCommitmentDetailSkeletonHero(1)),
    );
  });
});
