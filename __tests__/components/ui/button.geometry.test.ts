import type { ButtonSize } from 'heroui-native';

import { resolveButtonLabelStyle, resolveCompactCtaHeight } from '@/components/ui/button.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Size, Type, lineHeightFor } from '@/constants/theme';

const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

describe('resolveButtonLabelStyle', () => {
  it.each(SIZES)('leaves the %s label to HeroUI at font scale 1 and below', (size) => {
    expect(resolveButtonLabelStyle(size, 1)).toBeUndefined();
    expect(resolveButtonLabelStyle(size, 0.85)).toBeUndefined();
  });

  it.each<[ButtonSize, number]>([
    ['sm', Type.body],
    ['md', Type.subhead],
    ['lg', Type.title],
  ])('at font scale 2 sizes the %s label from its type step', (size, base) => {
    const fontSize = scaledFontSize(base, 2);
    expect(resolveButtonLabelStyle(size, 2)).toEqual({
      fontSize,
      lineHeight: lineHeightFor(fontSize),
    });
  });
});

describe('resolveCompactCtaHeight', () => {
  it('is the compact CTA track at font scale 1', () => {
    expect(resolveCompactCtaHeight(1, 'md')).toBe(Size.compactCtaTrack);
  });

  it('at font scale 2 holds the md label line box', () => {
    const label = resolveButtonLabelStyle('md', 2);
    expect(resolveCompactCtaHeight(2, 'md')).toBeGreaterThanOrEqual(label?.lineHeight ?? Infinity);
    expect(resolveCompactCtaHeight(2, 'md')).toBeGreaterThanOrEqual(Size.compactCtaTrack);
  });
});
