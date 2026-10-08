import { PixelRatio } from 'react-native';

import { Type, lineHeightFor } from '@/constants/theme';

export interface ScaledTextStyle {
  fontSize: number;
  lineHeight: number;
}

// The `Type` steps that match HeroUI's `text-sm`, `text-base`, `text-lg` at 390 dp.
export const HEROUI_TEXT_TYPE = {
  sm: Type.body,
  base: Type.subhead,
  lg: Type.title,
} as const;

/** A size for `allowFontScaling={false}`: RN sizes a TextView's own paint unscaled, so an OS-scaled line reserves too narrow an ellipsis (ReactTextView.java:392-397). */
export function scaledFontSize(
  fontSize: number,
  fontScale: number,
  maxFontScale = Infinity,
): number {
  return fontSize * Math.min(fontScale, maxFontScale);
}

export function scaledTextStyle(
  fontSize: number,
  fontScale: number,
  maxFontScale = Infinity,
): ScaledTextStyle {
  const scaled = scaledFontSize(fontSize, fontScale, maxFontScale);
  return { fontSize: scaled, lineHeight: lineHeightFor(scaled) };
}

/** `undefined` at or below scale 1: the text keeps its own size and the OS scales it. */
export function scaledTextStyleAboveOne(
  fontSize: number,
  fontScale: number,
  maxFontScale = Infinity,
): ScaledTextStyle | undefined {
  return fontScale <= 1 ? undefined : scaledTextStyle(fontSize, fontScale, maxFontScale);
}

export interface OneLineTextProps {
  numberOfLines: 1;
  allowFontScaling: boolean;
  style: { fontSize?: number; lineHeight?: number; flexShrink: 1 };
}

/** One line ending in a tail ellipsis: a scaled style stops OS scaling, `undefined` leaves the OS to scale. */
export function resolveOneLineTextProps(scaled: ScaledTextStyle | undefined): OneLineTextProps {
  return {
    numberOfLines: 1,
    allowFontScaling: scaled === undefined,
    style: { ...scaled, flexShrink: 1 },
  };
}

/** One device pixel in dp, added to a fixed-height box around a line under `adjustsFontSizeToFit`: RN ceils the line box to a whole px and a layout past its bound fails the fit. */
export const FITTED_LINE_SLACK = 1 / PixelRatio.get();

export type RowStacking = 'row' | 'stacked';

/** The one threshold for a layout that changes above font scale 1. */
export function resolveRowStacking(fontScale: number): RowStacking {
  return fontScale > 1 ? 'stacked' : 'row';
}

/** A lone word takes one line and a tail ellipsis: Android breaks a word wider than its line at a glyph. */
export function resolveLoneWordLines(text: string, lines: number): number {
  return /\s/.test(text.trim()) ? lines : 1;
}

export interface FitAmountTextProps {
  numberOfLines: 1;
  allowFontScaling: false;
  adjustsFontSizeToFit: boolean;
  style: ScaledTextStyle;
}

/** An amount on one line that shrinks to fit above font scale 1. */
export function resolveFitAmountTextProps(fontSize: number, fontScale: number): FitAmountTextProps {
  return {
    numberOfLines: 1,
    allowFontScaling: false,
    adjustsFontSizeToFit: fontScale > 1,
    style: scaledTextStyle(fontSize, fontScale),
  };
}
