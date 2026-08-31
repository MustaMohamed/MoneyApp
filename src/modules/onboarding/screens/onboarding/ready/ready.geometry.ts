import type { TextStyle, ViewStyle } from 'react-native';

import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { BROADSHEET_HEADLINE_TRACKING_EM } from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';
import { ms } from '@/utils/responsive';

/** mockup.html:667, :678, :695; `.hero-hd`, `.hero-v` and `.hero-pills` gap. */
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

/** mockup.html:410, `.b-headline { line-height: 1.05 }`. */
export const N4_HEADLINE_LINE_HEIGHT_RATIO = 1.05;

/** Hero value steps down from 40px to 28px above this count, excluding the currency suffix. */
export const N4_STEP_DOWN_MAX_CHARS = 13;

/** mockup.html:2332, `.hero.mt20`; `ScreenScroll` already insets, so `HeroShell` margin is 0. */
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

// The value `Text` must set `numberOfLines={1}`; `overflow: 'hidden'` slices a wrapped amount.
/** mockup.html:677-680, `.hero-v`; fixed height, not `minHeight`, so the card cannot shift. */
export const N4_HERO_VALUE_SLOT_STYLE: Readonly<ViewStyle> = Object.freeze({
  height: Size.summaryValueSlot,
  flexDirection: 'row',
  alignItems: 'center',
  gap: N4_HERO_GAP,
  marginTop: Spacing.sm,
  overflow: 'hidden',
});

/** Caps the caption so the fixed-height slot ellipsises instead of slicing a third line. */
export const N4_HERO_CAPTION_MAX_LINES = 2;

/** mockup.html:691-694, `.hero-c`; sized for `N4_HERO_CAPTION_MAX_LINES`. */
export const N4_HERO_CAPTION_SLOT_STYLE: Readonly<ViewStyle> = Object.freeze({
  height: Size.summaryCaptionSlot,
  marginTop: Spacing.xxs,
  overflow: 'hidden',
});

/** mockup.html:695, `.hero-pills`; height caps wrap, so a third pill clips above ~1.3 scale. */
export const N4_HERO_PILL_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  height: Size.summaryPillTrack,
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: N4_HERO_GAP,
  marginTop: Spacing.sm,
  overflow: 'hidden',
});

/** mockup.html:2343, `.lrow` at `--size-budget-named-row-height`. */
export const N4_SUMMARY_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: Size.budgetNamedRowHeight,
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.sm,
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.sm,
});

/** mockup.html:409-411, `.b-headline`, with the inline type-size override at :2328. */
export const N4_HEADLINE_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.hero,
  lineHeight: Math.round(Type.hero * N4_HEADLINE_LINE_HEIGHT_RATIO),
  letterSpacing: Type.hero * BROADSHEET_HEADLINE_TRACKING_EM,
});

/** mockup.html:393, `.t-body`; its literal `line-height: 21px` becomes `lineHeightFor`'s 1.3. */
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

/** mockup.html:686, `.hero-v .n.step`, the step-down rung. */
export const N4_HERO_VALUE_STEP_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.hero,
  lineHeight: lineHeightFor(Type.hero),
  letterSpacing: Type.hero * N4_HERO_VALUE_STEP_TRACKING_EM,
});

/** mockup.html:687, `.hero-v .n .cur`, the currency suffix node. */
export const N4_HERO_CURRENCY_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.subhead,
  lineHeight: lineHeightFor(Type.subhead),
  letterSpacing: 0,
  opacity: 0.8,
});

/** mockup.html:688, `.hero-v .st`, the refusal line in the same slot. */
export const N4_HERO_REFUSAL_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.headline,
  lineHeight: lineHeightFor(Type.headline),
});

/** mockup.html:691-694, `.hero-c`; literal `line-height: 17px` becomes the 1.3 ratio. */
export const N4_HERO_CAPTION_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.caption,
  lineHeight: lineHeightFor(Type.caption),
});

/** mockup.html:2344-2345, the summary rows' inline `--type-body`. */
export const N4_SUMMARY_ROW_TEXT_STYLE: Readonly<TextStyle> = Object.freeze({
  fontSize: Type.body,
  lineHeight: lineHeightFor(Type.body),
});

/** The hero renders EGP at two decimals, against `CURRENCY_CONFIG`'s 0 for that currency. */
export const N4_HERO_AMOUNT_DECIMALS = 2;
