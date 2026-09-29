import {
  resolveOneLineTextProps,
  scaledFontSize,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';

describe('scaledFontSize', () => {
  it('follows the font scale up to its cap', () => {
    expect(scaledFontSize(Type.overline, 1)).toBe(Type.overline);
    expect(scaledFontSize(Type.overline, 2)).toBe(Type.overline * 2);
    expect(scaledFontSize(Type.overline, 2, 1.3)).toBe(Type.overline * 1.3);
  });
});

describe('resolveOneLineTextProps', () => {
  it('with no scaled style leaves the size to the OS and only lets the line shrink', () => {
    expect(resolveOneLineTextProps(undefined)).toEqual({
      numberOfLines: 1,
      allowFontScaling: true,
      style: { flexShrink: 1 },
    });
  });

  it('with a scaled style stops OS scaling and keeps that style plus a shrink', () => {
    const scaled = scaledTextStyle(Type.caption, 2);
    expect(resolveOneLineTextProps(scaled)).toEqual({
      numberOfLines: 1,
      allowFontScaling: false,
      style: { ...scaled, flexShrink: 1 },
    });
  });
});
