import { Size, Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

/**
 * The zero-shift contract (spec.md § "The zero-shift contract") is the reason
 * this scope exists, and until these five numbers were tokens the only way to
 * check it was to open a device and stare at a field while an error appeared.
 *
 * The value locks below are deliberate change-detectors: they do not prove the
 * numbers are right, they force a change to them through review instead of
 * through a silent one-character edit. The two relationship assertions after
 * them are the ones that can catch a genuine mistake.
 *
 * Every assertion goes through ms(). Under jest-expo the Dimensions mock is
 * 750pt wide, so responsiveScale is clamped to 1.15 and Size.statusTrack is 39,
 * not 34 — a bare `toBe(34)` fails here and on every device except a 390pt one.
 */
describe('zero-shift geometry tokens', () => {
  it('locks the seven authored base values', () => {
    expect(Size.fieldMessageTrack).toBe(ms(20)); // field message rail
    expect(Size.summaryValueSlot).toBe(ms(52)); // N4 value slot
    expect(Size.summaryCaptionSlot).toBe(ms(34)); // N4 caption slot
    expect(Size.summaryPillTrack).toBe(ms(24)); // N4 pill row, one line
    expect(Size.statusTrack).toBe(ms(34)); // footer status track
    // fieldHeight is deliberately NOT ms()-wrapped — see the test below.
    expect(Size.fieldHeight).toBe(48); // field height, unscaled
    expect(Size.progressRail).toBe(ms(55)); // onboarding progress rail
  });

  it('the N4 value slot stays taller than the number it has to hold', () => {
    // mockup rationale item 4: the slot went 40 -> 52 *because* the hero number
    // went 31 -> 40. If Type.amountEntry grows again and the slot does not, the
    // 40px number reflows the summary card and the contract is broken silently.
    expect(Size.summaryValueSlot).toBeGreaterThan(Type.amountEntry);
  });

  it('the field height is unscaled 48 and never breaches the touch floor', () => {
    // fieldHeight is UNSCALED — @sarah's ruling, note 5. It matches HeroUI
    // Input's own unscaled min-height: 48, so a custom row sized from this
    // token aligns with a real Input on every device instead of only above
    // scale 1.09. Both assertions below are now true at every scale; while the
    // token was ms(44) the second one was false on every phone under 390pt.
    expect(Size.fieldHeight).toBe(48);
    expect(Size.fieldHeight).toBeGreaterThanOrEqual(TouchSize.min);
  });

  it('the N4 pill row holds one padded caption line', () => {
    // The pill's own composed height — 4pt padding top and bottom plus one
    // caption line box (mockup.html:697-699) — against the track it sits in
    // (mockup.html:695 + the 194pt composition at mockup.html:2298-2310, whose
    // missing 24 term this token names). The row is `height` + `overflow:
    // hidden` with no slack, so this is what stops the pill's type or padding
    // growing without the track growing with it.
    //
    // Each ms()/msFont() rounds independently, so this is a fit check, never an
    // equality — the same caveat the progress-rail check below carries. Under
    // jest-expo the Dimensions mock is 750pt, scale clamps to 1.15, and the
    // composition lands exactly ON the track (5 + 5 + 18 = 28 = ms(24)). It
    // does NOT hold everywhere: swept across 320-500pt at pixel ratios
    // 2/2.625/3/3.5 the composed height overshoots the track by 1 at 63
    // combinations (440pt @2.625: track 27, composed 28), which jest never
    // sees. Those pills clip by a point inside an `overflow: hidden` row —
    // accepted, and on the device-QA walk.
    //
    // Because the jest-side margin is zero, a TYPE_LINE_HEIGHT_RATIO bump reds
    // THIS assertion rather than the geometry it guards. The correct response
    // is to grow Size.summaryPillTrack with it, not to relax the check.
    expect(Spacing.xxs * 2 + lineHeightFor(Type.caption)).toBeLessThanOrEqual(
      Size.summaryPillTrack,
    );
  });

  it('the progress rail holds its bar and one label line', () => {
    // Composed content is padding + bar + one label line box. Each ms() rounds
    // independently, so this is a fit check, never an equality. The mockup's
    // literal composition also carries a Spacing.xs gap between bar and label
    // (mockup.html:305); including it makes the sum land exactly on the track at
    // both clamp ends and OVERSHOOT in between — 54 against a 53 track at scale
    // 0.9615, i.e. any 375pt phone. That gap is therefore not a fixed offset in
    // the component: the label row takes flex: 1 (plan decision 8), so the only
    // thing that must fit is padding + bar + one line.
    //
    // Under jest-expo, Dimensions is mocked at 750pt, so responsiveScale is
    // clamped to 1.15 and this assertion evaluates at ONE scale. It is a
    // change-detector, not a proof across the range; the range holds because
    // the label row is flexed rather than offset.
    expect(Spacing.sm * 2 + Size.progressThin + Size.compactBodyLineHeight).toBeLessThan(
      Size.progressRail,
    );
  });
});
