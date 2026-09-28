/** A size for `allowFontScaling={false}`: RN sizes a TextView's own paint unscaled, so an OS-scaled line reserves too narrow an ellipsis (ReactTextView.java:392-397). */
export function scaledFontSize(
  fontSize: number,
  fontScale: number,
  maxFontScale = Infinity,
): number {
  return fontSize * Math.min(fontScale, maxFontScale);
}
