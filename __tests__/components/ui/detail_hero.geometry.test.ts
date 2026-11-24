import { resolveDetailHeroBarShare } from '@/components/ui/detail_hero.geometry';

describe('resolveDetailHeroBarShare', () => {
  it.each([
    [-0.2, 0],
    [0, 0],
    [0.38, 0.38],
    [1, 1],
    [1.13, 1],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])('draws a share of %s at %s', (share, drawn) => {
    expect(resolveDetailHeroBarShare(share)).toBe(drawn);
  });
});
