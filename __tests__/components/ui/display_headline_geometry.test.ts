import {
  DISPLAY_HEADLINE_LINE_HEIGHT,
  DISPLAY_HEADLINE_MAX_FONT_SCALE,
  resolveDisplayHeadlineA11y,
  resolveDisplayHeadlineGeometry,
  resolveDisplayHeadlineTextStyle,
} from '@/components/ui/display_headline.geometry';

describe('display headline geometry', () => {
  it('scales the font size with the OS font scale', () => {
    expect(resolveDisplayHeadlineGeometry(42, 1).fontSize).toBe(42);
    expect(resolveDisplayHeadlineGeometry(42, 1.3).fontSize).toBeCloseTo(54.6, 5);
  });

  it.each([0.85, 1, 1.15, 1.3, 2])('never clips the glyph box at font scale %s', (fontScale) => {
    const g = resolveDisplayHeadlineGeometry(42, fontScale);
    // Sora_700Bold: ascent 0.97em above the baseline, descent 0.29em below.
    expect(g.baselineY).toBeGreaterThanOrEqual(g.fontSize * 0.97);
    expect(g.boxHeight - g.baselineY).toBeGreaterThanOrEqual(g.fontSize * 0.29);
  });

  it('grows monotonically with the font scale', () => {
    const heights = [0.85, 1, 1.15, 1.3, 2].map(
      (s) => resolveDisplayHeadlineGeometry(42, s).boxHeight,
    );
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
    expect(new Set(heights).size).toBe(heights.length);
  });

  it('occupies exactly one line box once the top inset is applied', () => {
    const g = resolveDisplayHeadlineGeometry(42, 1);
    expect(g.boxHeight + g.topInset).toBe(Math.round(42 * DISPLAY_HEADLINE_LINE_HEIGHT));
    expect(g.topInset).toBeLessThan(0);
  });

  it('tracks the mockup letter-spacing in user units, not em', () => {
    // TSpanView.java:295 divides the prop by fontSize before setLetterSpacing.
    expect(resolveDisplayHeadlineGeometry(42, 1).letterSpacing).toBeCloseTo(-0.42, 5);
  });

  it('names the graphic with the string it draws and announces it once', () => {
    const a11y = resolveDisplayHeadlineA11y('Finally clear.');
    expect(a11y.container.accessibilityLabel).toBe('Finally clear.');
    expect(a11y.container.accessible).toBe(true);
    // "header", not "image" — @marcus, 2026-08-06. The role describes what the
    // element is to a user, not how it is drawn. RN maps "image" to a
    // roleDescription of "Image" (ReactAccessibilityDelegate.kt:657-659), which
    // TalkBack appends after the words; "header" sets isHeading (:674-676) and
    // leaves the announcement as the copy alone — identical for both treatments,
    // which is this task's own requirement.
    expect(a11y.container.accessibilityRole).toBe('header');
    // The drawing must not surface a second node carrying the same string.
    expect(a11y.graphic.importantForAccessibility).toBe('no-hide-descendants');
    expect(a11y.graphic.accessibilityElementsHidden).toBe(true);
  });
});

describe('display headline — accessibility ceiling (MA-010 decision D2)', () => {
  it('is unchanged for callers that pass no ceiling', () => {
    expect(resolveDisplayHeadlineGeometry(42, 2)).toEqual(
      resolveDisplayHeadlineGeometry(42, 2, undefined),
    );
    expect(resolveDisplayHeadlineGeometry(42, 2).fontSize).toBeCloseTo(84, 5);
  });

  it.each([1.3, 1.5, 2])('freezes at the ceiling above font scale %s', (fontScale) => {
    expect(resolveDisplayHeadlineGeometry(42, fontScale, DISPLAY_HEADLINE_MAX_FONT_SCALE)).toEqual(
      resolveDisplayHeadlineGeometry(42, DISPLAY_HEADLINE_MAX_FONT_SCALE),
    );
  });

  it.each([0.85, 1, 1.15])('still scales below the ceiling at %s', (fontScale) => {
    expect(
      resolveDisplayHeadlineGeometry(42, fontScale, DISPLAY_HEADLINE_MAX_FONT_SCALE).fontSize,
    ).toBeCloseTo(42 * fontScale, 5);
  });
});

describe('display headline — the plain-text sibling line (MA-010 decision D3)', () => {
  it.each([0.85, 1, 1.15, 1.3, 2])(
    'draws at exactly the SVG line size at scale %s',
    (fontScale) => {
      const svg = resolveDisplayHeadlineGeometry(42, fontScale, DISPLAY_HEADLINE_MAX_FONT_SCALE);
      const text = resolveDisplayHeadlineTextStyle(42, fontScale, DISPLAY_HEADLINE_MAX_FONT_SCALE);
      expect(text.fontSize).toBe(svg.fontSize);
      expect(text.letterSpacing).toBe(svg.letterSpacing);
    },
  );

  it('occupies the same 1.05 line box the SVG line occupies after its inset', () => {
    const svg = resolveDisplayHeadlineGeometry(42, 1);
    const text = resolveDisplayHeadlineTextStyle(42, 1);
    expect(text.lineHeight).toBe(svg.boxHeight + svg.topInset);
  });

  // Both sides of the assertion above derive from DISPLAY_HEADLINE_LINE_HEIGHT,
  // so it pins that the two lines share one box but not what that box measures.
  // These literals are the arithmetic itself: round(42 * 1.05) and, above the
  // ceiling, round(42 * 1.3 * 1.05). Without them, changing the constant moves
  // the shipped line height with nothing red.
  it('measures round(fontSize x 1.05) in dp, clamped at the ceiling', () => {
    expect(resolveDisplayHeadlineTextStyle(42, 1).lineHeight).toBe(44);
    expect(resolveDisplayHeadlineTextStyle(42, 2, DISPLAY_HEADLINE_MAX_FONT_SCALE).lineHeight).toBe(
      57,
    );
  });
});
