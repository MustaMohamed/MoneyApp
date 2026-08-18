import type { TextStyle, ViewStyle } from 'react-native';

import { HERO_PILL_HEIGHT, HERO_PILL_STYLE, HERO_PILL_TEXT_STYLE } from '@/components/ui/chip';
import { Currency } from '@/constants/enums';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { BROADSHEET_HEADLINE_TRACKING_EM } from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';
import {
  N4_BODY_TEXT_STYLE,
  N4_HEADLINE_LINE_HEIGHT_RATIO,
  N4_HEADLINE_TEXT_STYLE,
  N4_HERO_CAPTION_SLOT_STYLE,
  N4_HERO_CAPTION_TEXT_STYLE,
  N4_HERO_CONTENT_STYLE,
  N4_HERO_CURRENCY_TEXT_STYLE,
  N4_HERO_FRAME_STYLE,
  N4_HERO_HEAD_STYLE,
  N4_HERO_LABEL_TEXT_STYLE,
  N4_HERO_PILL_ROW_STYLE,
  N4_HERO_REFUSAL_TEXT_STYLE,
  N4_HERO_VALUE_SLOT_STYLE,
  N4_HERO_VALUE_STEP_TEXT_STYLE,
  N4_HERO_VALUE_TEXT_STYLE,
  N4_SUMMARY_ROW_STYLE,
  N4_SUMMARY_ROW_TEXT_STYLE,
  resolveHeroAmountParts,
  resolveHeroValueTextStyle,
} from '@/modules/onboarding/screens/onboarding/ready/ready.geometry';

/**
 * N4's geometry, and the two resolvers behind the hero value.
 *
 * Every assertion is token- or ms()-bound. Under jest-expo the Dimensions mock
 * is 750pt, so responsiveScale clamps to 1.15 and Size.summaryValueSlot is 60,
 * not 52 — a bare `toBe(52)` fails here and on every device except a 390pt one.
 *
 * No readFileSync, no source scanning: MA-009 round 3 D1 proved that shape both
 * forbidden by the test rules and ineffective against two real mutations.
 */

/**
 * The screen's complete `fontSize` inventory, each row carrying the Type token
 * it must take. Asserting the pairing alone would be f(x) === f(x); pinning the
 * token in the same row means a wrong size fails one half and a hand-written
 * line height fails the other. This is the assertable answer to the defect that
 * fired in MA-009 D3 (an 11px row offset) and again in MA-010 Q6 (nine
 * overrides, four wrong).
 *
 * The eyebrow is absent deliberately — it is owned by the shared `Eyebrow`
 * component and N4 adds no override for it. `HERO_PILL_TEXT_STYLE` is present
 * even though the constant lives with its component in `chip.tsx`: the pill's
 * type belongs to this screen's inventory, and a test may import across layers
 * where production may not.
 */
const TEXT_STYLES: readonly (readonly [string, Readonly<TextStyle>, number])[] = [
  ['N4_BODY_TEXT_STYLE', N4_BODY_TEXT_STYLE, Type.body],
  ['N4_HERO_LABEL_TEXT_STYLE', N4_HERO_LABEL_TEXT_STYLE, Type.caption],
  ['N4_HERO_VALUE_TEXT_STYLE', N4_HERO_VALUE_TEXT_STYLE, Type.amountEntry],
  ['N4_HERO_VALUE_STEP_TEXT_STYLE', N4_HERO_VALUE_STEP_TEXT_STYLE, Type.hero],
  ['N4_HERO_CURRENCY_TEXT_STYLE', N4_HERO_CURRENCY_TEXT_STYLE, Type.subhead],
  ['N4_HERO_REFUSAL_TEXT_STYLE', N4_HERO_REFUSAL_TEXT_STYLE, Type.headline],
  ['N4_HERO_CAPTION_TEXT_STYLE', N4_HERO_CAPTION_TEXT_STYLE, Type.caption],
  ['N4_SUMMARY_ROW_TEXT_STYLE', N4_SUMMARY_ROW_TEXT_STYLE, Type.body],
  ['HERO_PILL_TEXT_STYLE', HERO_PILL_TEXT_STYLE, Type.caption],
];

const FROZEN_STYLES: readonly (readonly [string, Readonly<ViewStyle> | Readonly<TextStyle>])[] = [
  ['N4_HERO_FRAME_STYLE', N4_HERO_FRAME_STYLE],
  ['N4_HERO_CONTENT_STYLE', N4_HERO_CONTENT_STYLE],
  ['N4_HERO_HEAD_STYLE', N4_HERO_HEAD_STYLE],
  ['N4_HERO_VALUE_SLOT_STYLE', N4_HERO_VALUE_SLOT_STYLE],
  ['N4_HERO_CAPTION_SLOT_STYLE', N4_HERO_CAPTION_SLOT_STYLE],
  ['N4_HERO_PILL_ROW_STYLE', N4_HERO_PILL_ROW_STYLE],
  ['N4_SUMMARY_ROW_STYLE', N4_SUMMARY_ROW_STYLE],
  ['N4_HEADLINE_TEXT_STYLE', N4_HEADLINE_TEXT_STYLE],
  ...TEXT_STYLES.map(([name, style]) => [name, style] as const),
];

describe('N4 type — every fontSize override pairs a lineHeight', () => {
  it.each(TEXT_STYLES)('%s takes its Type token and the paired line height', (_n, style, token) => {
    expect(style.fontSize).toBe(token);
    expect(style.lineHeight).toBe(lineHeightFor(token));
  });

  // The headline is the one style that does NOT go through lineHeightFor: it
  // takes `.b-headline`'s own 1.05 (mockup.html:410), and N4 adds no inline
  // override (mockup.html:2328 overrides font-size only). It does not mirror
  // N3, which ships 1.12 from its own inline override at mockup.html:2014.
  //
  // Because this ticket AUTHORS the ratio, asserting only
  // `lineHeight === Math.round(Type.hero * RATIO)` would be f(x) === f(x) — the
  // exact edit "make N4 match N3" (1.05 -> 1.12) would move the shipped line
  // height and leave every assertion green. So the ratio is literal-locked as
  // well, the change-detector shape geometry_tokens.test.ts already uses. The
  // ratio is dimensionless, so unlike every other value here it takes no ms().
  it('the headline pairs through the screen-local 1.05 ratio, which is locked', () => {
    expect(N4_HEADLINE_LINE_HEIGHT_RATIO).toBe(1.05);
    expect(N4_HEADLINE_TEXT_STYLE.fontSize).toBe(Type.hero);
    expect(N4_HEADLINE_TEXT_STYLE.lineHeight).toBe(
      Math.round(Type.hero * N4_HEADLINE_LINE_HEIGHT_RATIO),
    );
  });

  it('the headline tracking comes from the shared Broadsheet constant', () => {
    expect(N4_HEADLINE_TEXT_STYLE.letterSpacing).toBe(Type.hero * BROADSHEET_HEADLINE_TRACKING_EM);
  });
});

describe('N4 shared style constants are frozen', () => {
  // Same discipline as N3_ROW_STYLE: these are shared by reference across every
  // instance that renders them, so one stray assignment would move all of them
  // at once and a suite reading keys at module load would not notice.
  it.each(FROZEN_STYLES)('%s', (_name, style) => {
    expect(Object.isFrozen(style)).toBe(true);
  });
});

describe('N4 zero-shift slots — fixed tracks, consumed unconditionally', () => {
  // "The card is the same height in every state" in its assertable form: the
  // three content-variable slots take a fixed `height` from a named token —
  // never `minHeight` — so the composed card height cannot depend on which
  // frame is drawn.
  it('the value slot is a fixed token height that clips', () => {
    expect(N4_HERO_VALUE_SLOT_STYLE.height).toBe(Size.summaryValueSlot);
    expect(N4_HERO_VALUE_SLOT_STYLE.minHeight).toBeUndefined();
    expect(N4_HERO_VALUE_SLOT_STYLE.overflow).toBe('hidden');
  });

  it('the caption slot is a fixed token height that clips', () => {
    expect(N4_HERO_CAPTION_SLOT_STYLE.height).toBe(Size.summaryCaptionSlot);
    expect(N4_HERO_CAPTION_SLOT_STYLE.minHeight).toBeUndefined();
    expect(N4_HERO_CAPTION_SLOT_STYLE.overflow).toBe('hidden');
  });

  it('the pill row is a fixed token track that clips rather than grows', () => {
    // `.hero-pills` is flex-wrap in CSS and would grow; the zero-shift contract
    // needs it bounded. It keeps flexWrap for graceful ordering but is capped
    // by height + overflow, so a third pill above roughly 1.3 font scale clips
    // instead of moving the CTA. That trade is on the device-QA walk.
    expect(N4_HERO_PILL_ROW_STYLE.height).toBe(Size.summaryPillTrack);
    expect(N4_HERO_PILL_ROW_STYLE.minHeight).toBeUndefined();
    expect(N4_HERO_PILL_ROW_STYLE.overflow).toBe('hidden');
    expect(N4_HERO_PILL_ROW_STYLE.flexWrap).toBe('wrap');
  });

  it('the value slot carries exactly these keys — nothing added, nothing dropped', () => {
    expect(Object.keys(N4_HERO_VALUE_SLOT_STYLE).sort()).toEqual([
      'alignItems',
      'flexDirection',
      'gap',
      'height',
      'marginTop',
      'overflow',
    ]);
  });

  it('the caption slot carries exactly these keys', () => {
    expect(Object.keys(N4_HERO_CAPTION_SLOT_STYLE).sort()).toEqual([
      'height',
      'marginTop',
      'overflow',
    ]);
  });

  it('the pill row carries exactly these keys', () => {
    expect(Object.keys(N4_HERO_PILL_ROW_STYLE).sort()).toEqual([
      'alignItems',
      'flexDirection',
      'flexWrap',
      'gap',
      'height',
      'marginTop',
      'overflow',
    ]);
  });

  it('the summary row takes a minHeight, not a height — a wrapped label may grow it', () => {
    expect(N4_SUMMARY_ROW_STYLE.minHeight).toBe(Size.budgetNamedRowHeight);
    expect(N4_SUMMARY_ROW_STYLE.height).toBeUndefined();
  });
});

describe('N4 slot fit checks — the content each fixed track has to hold', () => {
  // Each ms()/msFont() rounds independently, so these are fit checks, never
  // equalities, and under jest-expo they evaluate at ONE scale (the 1.15
  // clamp). They are change-detectors on the relationship, not proofs across
  // the range — the same caveat geometry_tokens.test.ts records for the
  // progress rail.
  it('the value slot holds the 40px hero number', () => {
    expect(lineHeightFor(Type.amountEntry)).toBeLessThanOrEqual(Size.summaryValueSlot);
  });

  it('the value slot also holds the F3 refusal line at 22px, in the same box', () => {
    expect(lineHeightFor(Type.headline)).toBeLessThanOrEqual(Size.summaryValueSlot);
  });

  it('the caption slot holds two caption lines — what F7 needs', () => {
    expect(lineHeightFor(Type.caption) * 2).toBeLessThanOrEqual(Size.summaryCaptionSlot);
  });

  it('the pill fits the track it sits in', () => {
    // Two names, one source: the pill composes its own height from its own
    // padding and line box (HERO_PILL_HEIGHT, in chip.tsx beside the component
    // that draws it), and the row is Size.summaryPillTrack. Asserting equality
    // between them would stay green-but-wrong if the track ever doubled to the
    // two-line reservation the plan's Risk 3 contemplates, so this is a fit
    // check. See geometry_tokens.test.ts for the range caveat: at 63 of the
    // swept width x pixel-ratio combinations the composed height overshoots the
    // track by a point, which jest's single clamped scale never sees.
    expect(HERO_PILL_STYLE.height).toBe(HERO_PILL_HEIGHT);
    expect(HERO_PILL_HEIGHT).toBeLessThanOrEqual(Size.summaryPillTrack);
  });
});

describe('resolveHeroValueTextStyle — the step-down rung', () => {
  // Both strings are F0's own cases (mockup.html:2266-2271 and its caption at
  // :2298-2310): 13 characters renders at the full 40, 14 steps down to 28. The
  // count excludes the currency suffix, which renders as a separate node at a
  // different size and opacity.
  it('keeps the full 40px size at 13 characters', () => {
    expect(resolveHeroValueTextStyle('-1,234,567.89').fontSize).toBe(Type.amountEntry);
  });

  it('steps down to 28px at 14 characters', () => {
    expect(resolveHeroValueTextStyle('-12,345,678.90').fontSize).toBe(Type.hero);
  });
});

describe('resolveHeroAmountParts — the explicit two decimals', () => {
  // CURRENCY_CONFIG[EGP].decimals is 0, so a call that drops the explicit `2`
  // renders `148,250` and this row is what catches it — the exact bug spec §1.3
  // exists to prevent, invisible to tsc and to every other suite. Both sides
  // are literals; the first is F1's drawn number and feeds the step-down
  // assertions above.
  it('renders EGP at two decimals despite the currency config saying zero', () => {
    expect(resolveHeroAmountParts(148250, Currency.EGP)).toEqual({
      value: '148,250.00',
      code: 'EGP',
    });
  });

  it('renders USD cents and its ISO code', () => {
    expect(resolveHeroAmountParts(2168.93, Currency.USD)).toEqual({
      value: '2,168.93',
      code: 'USD',
    });
  });

  it('renders a zero with both decimals', () => {
    expect(resolveHeroAmountParts(0, Currency.EGP)).toEqual({ value: '0.00', code: 'EGP' });
  });
});
