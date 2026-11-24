import {
  DETAIL_HERO_FIGURE_VALUE_GAP,
  DETAIL_HERO_FIGURES_GAP,
  DETAIL_HERO_INFO_STACK_GAP,
  resolveDetailHeroBarShare,
  resolveDetailHeroGeometry,
} from '@/components/ui/detail_hero.geometry';
import {
  FITTED_LINE_SLACK,
  scaledFontSize,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Type, lineHeightFor } from '@/constants/theme';

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

describe('resolveDetailHeroGeometry slots (MA-325)', () => {
  const figuresSum = (s: number) =>
    DETAIL_HERO_FIGURES_GAP +
    scaledTextStyle(Type.micro, s).lineHeight +
    FITTED_LINE_SLACK +
    DETAIL_HERO_FIGURE_VALUE_GAP +
    scaledTextStyle(Type.meta, s).lineHeight +
    FITTED_LINE_SLACK;
  const stackSum = (s: number) =>
    DETAIL_HERO_INFO_STACK_GAP + lineHeightFor(scaledFontSize(Type.micro, s));

  it.each([0.85, 1, 1.3, 2])('adds the figures row height at font scale %s', (s) => {
    const base = resolveDetailHeroGeometry(s);
    const withFigures = resolveDetailHeroGeometry(s, { figures: true });
    expect(withFigures.figuresHeight).toBeCloseTo(figuresSum(s), 6);
    expect(withFigures.height - base.height).toBeCloseTo(figuresSum(s), 6);
  });

  it.each([0.85, 1])('keeps the end span on the caption row at font scale %s', (s) => {
    const geometry = resolveDetailHeroGeometry(s, { captionEnd: true });
    expect(geometry.stacksInfo).toBe(false);
    expect(geometry.height).toBe(resolveDetailHeroGeometry(s).height);
  });

  it.each([1.3, 2])('stacks the end span under the caption at font scale %s', (s) => {
    const geometry = resolveDetailHeroGeometry(s, { captionEnd: true });
    expect(geometry.stacksInfo).toBe(true);
    expect(geometry.height - resolveDetailHeroGeometry(s).height).toBeCloseTo(stackSum(s), 6);
  });

  it.each([0.85, 1, 1.3, 2])('adds both slots to the bar layout at font scale %s', (s) => {
    const stacked = s > 1 ? stackSum(s) : 0;
    const bar = resolveDetailHeroGeometry(s, { bar: true });
    const all = resolveDetailHeroGeometry(s, { bar: true, figures: true, captionEnd: true });
    expect(all.height).toBeCloseTo(bar.height + figuresSum(s) + stacked, 6);
  });

  it.each([0.85, 1, 1.3, 2])('adds no slot without a layout at font scale %s', (s) => {
    const geometry = resolveDetailHeroGeometry(s);
    expect(geometry.figuresHeight).toBe(0);
    expect(geometry.stacksInfo).toBe(false);
  });
});
