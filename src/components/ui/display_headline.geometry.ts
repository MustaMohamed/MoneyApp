/**
 * Geometry for the N1 display headline. Both treatments consume this, so the
 * gradient and the flat fallback occupy identical space — the spike can swap
 * one for the other without MA-010 noticing.
 *
 * Metrics read from node_modules/@expo-google-fonts/sora/700Bold/Sora_700Bold.ttf
 * (head/hhea/OS/2): unitsPerEm 1000 · ascent 970 · descent -290 · lineGap 0 ·
 * capHeight 730. An SVG viewport clips; a React Native line box does not, which
 * is why the drawing area is the full 1.26em glyph box and a negative top inset
 * pulls the element back to the 1.05 line box the mockup draws.
 */
const SORA_ASCENT_EM = 0.97;
const SORA_DESCENT_EM = 0.29;

/** Mockup § B, `.b-headline { line-height: 1.05 }`. */
export const DISPLAY_HEADLINE_LINE_HEIGHT = 1.05;
/** Mockup § B, `.b-headline { letter-spacing: -0.01em }`. */
export const DISPLAY_HEADLINE_TRACKING_EM = -0.01;

export interface DisplayHeadlineGeometry {
  /** Drawn size in dp, already multiplied by the OS font scale. */
  fontSize: number;
  /** SVG viewport height in dp — the full glyph box, so nothing is clipped. */
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
): DisplayHeadlineGeometry {
  const fontSize = scaledFontSize * fontScale;
  // boxHeight is derived FROM baselineY, never independently. Rounding the two
  // up separately makes (boxHeight - baselineY) a difference of two ceils, which
  // can land below fontSize * SORA_DESCENT_EM and clip the tail of "Finally" —
  // it does so at fontScale 0.85, 1, 1.15 and 2. Stacking the ceils makes the
  // descender space a ceil of the requirement, so it can only ever round up.
  const baselineY = Math.ceil(fontSize * SORA_ASCENT_EM);
  const boxHeight = baselineY + Math.ceil(fontSize * SORA_DESCENT_EM);
  return {
    fontSize,
    boxHeight,
    baselineY,
    letterSpacing: fontSize * DISPLAY_HEADLINE_TRACKING_EM,
    topInset: Math.round(fontSize * DISPLAY_HEADLINE_LINE_HEIGHT) - boxHeight,
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

/**
 * SVG text is drawn, not written — a screen reader reads a vector as nothing at
 * all. The wrapper carries the name (spec.md § Accessibility) and the drawing is
 * removed from the tree so the string is announced exactly once.
 *
 * The role is "header", not "image" (@marcus, 2026-08-06): it describes what the
 * element is to a user rather than how it happens to be drawn, it keeps the
 * announcement identical for the gradient and the flat treatment — which this
 * task requires — and it gives N1 a heading-navigation stop in MA-010. RN maps it
 * to isHeading on the node; "image" would have appended a spoken "image" after
 * the copy (ReactAccessibilityDelegate.kt:657-659 vs :674-676).
 */
export function resolveDisplayHeadlineA11y(text: string): DisplayHeadlineA11y {
  return {
    container: { accessible: true, accessibilityRole: 'header', accessibilityLabel: text },
    graphic: {
      importantForAccessibility: 'no-hide-descendants',
      accessibilityElementsHidden: true,
    },
  };
}
