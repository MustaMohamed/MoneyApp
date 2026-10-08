import { PixelRatio } from 'react-native';

import {
  FITTED_LINE_SLACK,
  resolveFitAmountTextProps,
  resolveLoneWordLines,
  resolveOneLineTextProps,
  resolveRowStacking,
  scaledFontSize,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Type } from '@/constants/theme';

describe('FITTED_LINE_SLACK', () => {
  it('MA-162: is one device pixel, in dp', () => {
    expect(FITTED_LINE_SLACK * PixelRatio.get()).toBe(1);
  });
});

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

describe('resolveRowStacking', () => {
  it('keeps a row at font scale 1 and below', () => {
    expect(resolveRowStacking(0.85)).toBe('row');
    expect(resolveRowStacking(1)).toBe('row');
  });

  it('stacks above font scale 1', () => {
    expect(resolveRowStacking(1.01)).toBe('stacked');
    expect(resolveRowStacking(2)).toBe('stacked');
  });
});

describe('resolveLoneWordLines', () => {
  it('gives a lone word one line', () => {
    expect(resolveLoneWordLines('Housing', 2)).toBe(1);
  });

  it('reads a word with space around it as a lone word', () => {
    expect(resolveLoneWordLines(' Subscriptions ', 2)).toBe(1);
  });

  it('keeps the line cap of the caller for a text of several words', () => {
    expect(resolveLoneWordLines('Health & Fitness', 2)).toBe(2);
    expect(resolveLoneWordLines('Health & Fitness', 3)).toBe(3);
  });
});

describe('resolveFitAmountTextProps', () => {
  it('at font scale 1 holds one line at its own size that does not shrink', () => {
    expect(resolveFitAmountTextProps(Type.title, 1)).toEqual({
      numberOfLines: 1,
      allowFontScaling: false,
      adjustsFontSizeToFit: false,
      style: scaledTextStyle(Type.title, 1),
    });
  });

  it('at font scale 2 holds one line at twice the size that shrinks to fit', () => {
    expect(resolveFitAmountTextProps(Type.title, 2)).toEqual({
      numberOfLines: 1,
      allowFontScaling: false,
      adjustsFontSizeToFit: true,
      style: scaledTextStyle(Type.title, 2),
    });
  });
});
