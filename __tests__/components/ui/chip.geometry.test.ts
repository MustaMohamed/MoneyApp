import {
  CHIP_MD_PADDING_BLOCK,
  HERO_PILL_HEIGHT,
  resolveHeroPillGeometry,
  resolveSuccessChipGeometry,
} from '@/components/ui/chip';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

const CAPTION_AT_ONE = { fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) };

describe('resolveSuccessChipGeometry', () => {
  it('MA-162: at font scale 1 the chip is Size.compactChipHeight with the Type.caption pair', () => {
    expect(resolveSuccessChipGeometry(1)).toEqual({
      height: Size.compactChipHeight,
      label: CAPTION_AT_ONE,
    });
  });

  it('MA-162: at font scale 2 the chip is its scaled label line inside the md padding', () => {
    const g = resolveSuccessChipGeometry(2);
    const label = scaledTextStyle(Type.caption, 2);

    expect(g.label).toEqual(label);
    expect(g.height).toBe(label.lineHeight + 2 * CHIP_MD_PADDING_BLOCK);
    expect(g.height).toBeGreaterThan(Size.compactChipHeight);
  });
});

describe('resolveHeroPillGeometry', () => {
  it('MA-162: at font scale 1 the pill is HERO_PILL_HEIGHT with the Type.caption pair', () => {
    expect(resolveHeroPillGeometry(1)).toEqual({
      height: HERO_PILL_HEIGHT,
      label: CAPTION_AT_ONE,
    });
  });

  it('MA-162: at font scale 2 the pill is its scaled label line inside its own padding', () => {
    const g = resolveHeroPillGeometry(2);
    const label = scaledTextStyle(Type.caption, 2);

    expect(g.label).toEqual(label);
    expect(g.height).toBe(2 * Spacing.xxs + label.lineHeight);
  });
});
