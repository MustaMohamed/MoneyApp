// `Sora_700Bold.ttf` metrics (unitsPerEm 1000): ascent 970, descent -290, lineGap 0.
const SORA_ASCENT_EM = 0.97;
const SORA_DESCENT_EM = 0.29;

/** Mockup § B, `.b-headline { line-height: 1.05 }`. */
export const DISPLAY_HEADLINE_LINE_HEIGHT = 1.05;
/** Mockup § B, `.b-headline { letter-spacing: -0.01em }`. */
export const DISPLAY_HEADLINE_TRACKING_EM = -0.01;

/** Top of the app's gated text scale range (0.85-1.3); SVG text cannot wrap, and clips at 2.0. */
export const DISPLAY_HEADLINE_MAX_FONT_SCALE = 1.3;

export interface DisplayHeadlineGeometry {
  /** Drawn size in dp, already multiplied by the OS font scale. */
  fontSize: number;
  /** SVG viewport height in dp; the full glyph box, so nothing is clipped. */
  boxHeight: number;
  /** Baseline offset from the top of the viewport, in dp. */
  baselineY: number;
  /** react-native-svg takes this in user units, not em (TSpanView.java:295). */
  letterSpacing: number;
  /** Negative margin that reduces the footprint to one 1.05 line box. */
  topInset: number;
}

export function resolveDisplayHeadlineGeometry(
  scaledFontSize: number,
  fontScale: number,
  maxFontScale?: number,
): DisplayHeadlineGeometry {
  const clampedFontScale =
    maxFontScale === undefined ? fontScale : Math.min(fontScale, maxFontScale);
  const fontSize = scaledFontSize * clampedFontScale;
  // Derive `boxHeight` from `baselineY`; ceiling the two separately can clip the descender.
  const baselineY = Math.ceil(fontSize * SORA_ASCENT_EM);
  const boxHeight = baselineY + Math.ceil(fontSize * SORA_DESCENT_EM);
  return {
    // oxlint-disable-next-line moneyapp/font-size-pairs-line-height -- SVG geometry, not an RN TextStyle: DisplayHeadlineGeometry has no lineHeight field by design (boxHeight/baselineY carry the SVG viewport instead).
    fontSize,
    boxHeight,
    baselineY,
    letterSpacing: fontSize * DISPLAY_HEADLINE_TRACKING_EM,
    topInset: Math.round(fontSize * DISPLAY_HEADLINE_LINE_HEIGHT) - boxHeight,
  };
}

export interface DisplayHeadlineTextStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

/** Pair with `allowFontScaling={false}`; otherwise the OS scales this value a second time. */
export function resolveDisplayHeadlineTextStyle(
  scaledFontSize: number,
  fontScale: number,
  maxFontScale?: number,
): DisplayHeadlineTextStyle {
  const g = resolveDisplayHeadlineGeometry(scaledFontSize, fontScale, maxFontScale);
  return {
    // oxlint-disable-next-line moneyapp/font-size-pairs-line-height -- DISPLAY_HEADLINE_LINE_HEIGHT is the mockup's own 1.05 `.b-headline` ratio (line 5-6), literal-locked by display_headline_geometry.test.ts:85-92, not lineHeightFor's 1.3.
    fontSize: g.fontSize,
    lineHeight: Math.round(g.fontSize * DISPLAY_HEADLINE_LINE_HEIGHT),
    letterSpacing: g.letterSpacing,
  };
}

export interface DisplayHeadlineA11y {
  container: {
    accessible: true;
    accessibilityRole: 'header';
    accessibilityLabel: string;
  };
  graphic: {
    importantForAccessibility: 'no-hide-descendants';
    accessibilityElementsHidden: true;
  };
}

/** A screen reader reads an SVG as nothing, so the wrapper carries the name instead. */
export function resolveDisplayHeadlineA11y(text: string): DisplayHeadlineA11y {
  return {
    container: { accessible: true, accessibilityRole: 'header', accessibilityLabel: text },
    graphic: {
      importantForAccessibility: 'no-hide-descendants',
      accessibilityElementsHidden: true,
    },
  };
}
