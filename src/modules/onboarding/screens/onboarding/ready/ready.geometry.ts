import type { TextStyle, ViewStyle } from 'react-native';

import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { BROADSHEET_HEADLINE_TRACKING_EM } from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';
import { ms } from '@/utils/responsive';

/**
 * N4's geometry — mockup § F (F1-F9): the fixed slot heights, the type styles
 * and the tracking. The formatter resolvers that used to live here — the
 * hero value's own three, and the frame -> caption and descriptor -> pill
 * maps — moved to the sibling `ready.helpers.ts` (folder convention
 * `ready.<role>.ts`), so this file stays pure layout tokens.
 * `N4_STEP_DOWN_MAX_CHARS` and `N4_HERO_AMOUNT_DECIMALS` stay here and are
 * exported so `ready.helpers.ts` can import them: both are geometry facts (a
 * character-count boundary, a decimals deviation), not formatting logic.
 *
 * The pill's OWN box — padding, radius, fill, height, glyph and label type —
 * is not here: it lives in `chip.tsx` beside the component that draws it, as
 * `HERO_PILL_STYLE` / `HERO_PILL_TEXT_STYLE`. `chip.tsx` is on N3's runtime
 * path through `SuccessChip`, so importing this module from there would drag
 * N4's geometry into N3's bundle. This file owns the pill ROW, which is N4's
 * track, not the pill.
 */

/** mockup.html:667, :678, :695 — `.hero-hd`, `.hero-v` and `.hero-pills` gap. */
const N4_HERO_GAP = ms(6);

/** mockup.html:668, `.hero-hd .chip24 { width: 24px }`. */
export const N4_HERO_CHIP_SIZE = ms(24);

/** mockup.html:674, `.hero-hd .chip24 svg { width: 14px }`. */
export const N4_HERO_CHIP_GLYPH = ms(14);

/** mockup.html:675, `.hero-l { letter-spacing: 0.04em }`. */
const N4_HERO_LABEL_TRACKING_EM = 0.04;

/** mockup.html:683, `.hero-v .n { letter-spacing: -1px }` at 40px. */
const N4_HERO_VALUE_TRACKING_EM = -0.025;

/** mockup.html:686, `.hero-v .n.step { letter-spacing: -0.6px }` at 28px. */
const N4_HERO_VALUE_STEP_TRACKING_EM = -0.021;

/**
 * mockup.html:410, `.b-headline { line-height: 1.05 }`.
 *
 * Screen-local, and deliberately NOT the same number as N3's
 * `N3_HEADLINE_LINE_HEIGHT_RATIO`: N4 adds no inline override (mockup.html:2328
 * overrides the type size only) so it takes `.b-headline`'s own 1.05, while N3
 * overrides it to 1.12 at mockup.html:2014. The two screens legitimately
 * differ, which is why only the TRACKING was hoisted to the Broadsheet shell.
 */
export const N4_HEADLINE_LINE_HEIGHT_RATIO = 1.05;

/**
 * The character count at which the hero value steps down from 40px to 28px —
 * settled from F0 (mockup.html:2266-2271 and its caption at :2298-2310):
 * `-1,234,567.89` (13) renders at the full 40, `-12,345,678.90` (14) carries
 * `.n.step`. The count EXCLUDES the currency suffix, which renders as a
 * separate node at a different size and opacity.
 *
 * Exported for `ready.helpers.ts` to import — this export is what keeps the
 * dependency one-directional.
 */
export const N4_STEP_DOWN_MAX_CHARS = 13;

/**
 * mockup.html:2332, `.hero.mt20` — overrides `HeroShell`'s own horizontal
 * margin, because `ScreenScroll`'s content container already insets the screen.
 */
export const N4_HERO_FRAME_STYLE: Readonly<ViewStyle> = Object.freeze({
  marginHorizontal: 0,
  marginTop: Spacing.lg,
});

/** mockup.html:650, `.hero { padding: 12px 12px 20px }`. */
export const N4_HERO_CONTENT_STYLE: Readonly<ViewStyle> = Object.freeze({
  paddingTop: Spacing.sm,
  paddingHorizontal: Spacing.sm,
  paddingBottom: Spacing.lg,
});

/** mockup.html:667, `.hero-hd`. */
export const N4_HERO_HEAD_STYLE: Readonly<ViewStyle> = Object.freeze({
  flexDirection: 'row',
  alignItems: 'center',
  gap: N4_HERO_GAP,
});

/**
 * mockup.html:677-680, `.hero-v`.
 *
 * A fixed `height`, never a `minHeight`: the zero-shift contract is that the
 * card is the same height in every state, and this slot holds a 40px number in
 * five of them and a 22px refusal line in another. `.hero-v`'s fourth
 * declaration, `white-space: nowrap` (:679), has no style counterpart in React
 * Native — it ports as `numberOfLines={1}` on the value `Text` itself, and it
 * is load-bearing: without it a long amount wraps and gets sliced by the
 * `overflow: hidden` here instead of stepping down.
 */
export const N4_HERO_VALUE_SLOT_STYLE: Readonly<ViewStyle> = Object.freeze({
  height: Size.summaryValueSlot,
  flexDirection: 'row',
  alignItems: 'center',
  gap: N4_HERO_GAP,
  marginTop: Spacing.sm,
  overflow: 'hidden',
});

/**
 * The caption's line cap — the counterpart of the value slot's
 * `numberOfLines={1}`, and load-bearing for the same reason.
 *
 * `Size.summaryCaptionSlot` is a fixed dp height that clips, while the caption's
 * `lineHeight` scales with the OS text size; and the longest caption (F7's, at
 * 109 characters) needs a third line on a narrow screen even at base size. With
 * no cap that third line is drawn and then sliced mid-glyph by the slot's
 * `overflow: 'hidden'`. Capping at the two lines the slot was sized for
 * ellipsises instead.
 */
export const N4_HERO_CAPTION_MAX_LINES = 2;

/** mockup.html:691-694, `.hero-c` — sized for `N4_HERO_CAPTION_MAX_LINES`. */
export const N4_HERO_CAPTION_SLOT_STYLE: Readonly<ViewStyle> = Object.freeze({
  height: Size.summaryCaptionSlot,
  marginTop: Spacing.xxs,
  overflow: 'hidden',
});

/**
 * mockup.html:695, `.hero-pills` — N4's pill TRACK.
 *
 * `.hero-pills` is `flex-wrap: wrap` in CSS and would grow; the zero-shift
 * contract needs it bounded, so it keeps `flexWrap` for graceful ordering but
 * is capped by `height` + `overflow: 'hidden'`. At base text size all three
 * pills fit one line — that is what shortening `formatExchangeRate` bought.
 * Above roughly 1.3 font scale a third pill clips rather than moving the CTA;
 * that is the deliberate trade, and it is on the device-QA walk.
 */
export const N4_HERO_PILL_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  height: Size.summaryPillTrack,
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: N4_HERO_GAP,
  marginTop: Spacing.sm,
  overflow: 'hidden',
});

/**
 * mockup.html:2343, `.lrow` at `--size-budget-named-row-height`.
 *
 * A `minHeight`, unlike the three slots above: a summary row is allowed to grow
 * when its label wraps at a large font scale, because nothing about the card's
 * zero-shift claim depends on it — the rows do not swap contents between states.
 * `Size.budgetNamedRowHeight` is borrowed from the budget module, exactly as the
 * mockup borrows the variable; the token is not renamed here.
 */
export const N4_SUMMARY_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: Size.budgetNamedRowHeight,
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.sm,
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.sm,
});

/**
 * mockup.html:409-411, `.b-headline`, with the inline type-size override at
 * :2328. The one text style on this screen that does not take `lineHeightFor` —
 * see `N4_HEADLINE_LINE_HEIGHT_RATIO`.
 */
export const N4_HEADLINE_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.hero,
  lineHeight: Math.round(Type.hero * N4_HEADLINE_LINE_HEIGHT_RATIO),
  letterSpacing: Type.hero * BROADSHEET_HEADLINE_TRACKING_EM,
});

/**
 * mockup.html:393, `.t-body`. Declared deviation: the mockup's literal
 * `line-height: 21px` becomes `lineHeightFor`'s centralised 1.3 ratio, which is
 * how N3 already ships the same atom.
 */
export const N4_BODY_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.body,
  lineHeight: lineHeightFor(Type.body),
});

/** mockup.html:675, `.hero-l`. */
export const N4_HERO_LABEL_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.caption,
  lineHeight: lineHeightFor(Type.caption),
  letterSpacing: Type.caption * N4_HERO_LABEL_TRACKING_EM,
});

/** mockup.html:681-685, `.hero-v .n`. */
export const N4_HERO_VALUE_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.amountEntry,
  lineHeight: lineHeightFor(Type.amountEntry),
  letterSpacing: Type.amountEntry * N4_HERO_VALUE_TRACKING_EM,
});

/** mockup.html:686, `.hero-v .n.step` — the step-down rung. */
export const N4_HERO_VALUE_STEP_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.hero,
  lineHeight: lineHeightFor(Type.hero),
  letterSpacing: Type.hero * N4_HERO_VALUE_STEP_TRACKING_EM,
});

/** mockup.html:687, `.hero-v .n .cur` — the currency suffix node. */
export const N4_HERO_CURRENCY_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.subhead,
  lineHeight: lineHeightFor(Type.subhead),
  letterSpacing: 0,
  opacity: 0.8,
});

/** mockup.html:688, `.hero-v .st` — F3's refusal line, in the same slot. */
export const N4_HERO_REFUSAL_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.headline,
  lineHeight: lineHeightFor(Type.headline),
});

/**
 * mockup.html:691-694, `.hero-c`. Declared deviation, same as `.t-body`: the
 * literal `line-height: 17px` becomes the centralised 1.3 ratio.
 */
export const N4_HERO_CAPTION_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.caption,
  lineHeight: lineHeightFor(Type.caption),
});

/** mockup.html:2344-2345, the summary rows' inline `--type-body`. */
export const N4_SUMMARY_ROW_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.body,
  lineHeight: lineHeightFor(Type.body),
});

/**
 * The hero renders EGP at TWO decimals, against `CURRENCY_CONFIG`'s own 0 for
 * that currency — spec §1.3's screen-local deviation, approved, and recorded
 * in `docs/adr/2026-08-18-starting-net-position.md` §6 alongside the dashboard
 * sites that render it at 0.
 */
export const N4_HERO_AMOUNT_DECIMALS = 2;
