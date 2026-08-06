import {
  DISPLAY_HEADLINE_LINE_HEIGHT,
  resolveDisplayHeadlineA11y,
  resolveDisplayHeadlineGeometry,
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
