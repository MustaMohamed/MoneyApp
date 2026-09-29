import type { ButtonSize } from 'heroui-native';

import {
  resolveButtonLabelStyle,
  resolveButtonRootStyle,
  resolveCompactCtaHeight,
  resolveSmallButtonHeight,
} from '@/components/ui/button.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Radius, Size, Type, lineHeightFor } from '@/constants/theme';

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

  it('at font scale 2 keeps the md label line box inside the onboarding CTA track', () => {
    expect(resolveButtonLabelStyle('md', 2)?.lineHeight).toBeLessThanOrEqual(
      Size.onboardingCtaTrack,
    );
  });
});

describe('resolveCompactCtaHeight', () => {
  it('is the compact CTA track at font scale 1', () => {
    expect(resolveCompactCtaHeight('md', 1)).toBe(Size.compactCtaTrack);
  });

  it('at font scale 2 holds the md label line box', () => {
    const label = resolveButtonLabelStyle('md', 2);
    expect(resolveCompactCtaHeight('md', 2)).toBeGreaterThanOrEqual(label?.lineHeight ?? Infinity);
    expect(resolveCompactCtaHeight('md', 2)).toBeGreaterThanOrEqual(Size.compactCtaTrack);
  });
});

describe('resolveSmallButtonHeight', () => {
  it('is the small button track at font scale 1', () => {
    expect(resolveSmallButtonHeight(1)).toBe(Size.smallButtonTrack);
  });

  it('at font scale 2 holds the sm label line box and never drops below the track', () => {
    const label = resolveButtonLabelStyle('sm', 2);
    expect(resolveSmallButtonHeight(2)).toBeGreaterThanOrEqual(label?.lineHeight ?? Infinity);
    expect(resolveSmallButtonHeight(2)).toBeGreaterThanOrEqual(Size.smallButtonTrack);
  });
});

describe('resolveButtonRootStyle', () => {
  it('gives the sm root the small button height at every font scale', () => {
    expect(resolveButtonRootStyle('sm', 1)).toEqual({ height: Size.smallButtonTrack });
    expect(resolveButtonRootStyle('sm', 2)).toEqual({ height: resolveSmallButtonHeight(2) });
  });

  it.each<ButtonSize>(['md', 'lg'])('leaves the %s root height to HeroUI', (size) => {
    expect(resolveButtonRootStyle(size, 2)).toBeUndefined();
  });

  it("lets the compact accent arm's height win over the sm track and keeps its radius", () => {
    const accent = { borderRadius: Radius.cta, height: Size.compactCtaTrack };
    expect(resolveButtonRootStyle('sm', 1, accent)).toEqual(accent);
  });
});
