import { lineHeightFor } from '@/constants/theme';

export interface ScaledTextStyle {
  fontSize: number;
  lineHeight: number;
}

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
