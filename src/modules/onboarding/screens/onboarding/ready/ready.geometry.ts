import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';

import { CURRENCY_CONFIG } from '@/constants/currency';
import type { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { BROADSHEET_HEADLINE_TRACKING_EM } from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';
import type { ReadyFrame, ReadyPill } from '@/modules/onboarding/domain/ready_summary_state';
import { formatAmount, formatCurrencyAmount, formatExchangeRate } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

/**
 * N4's geometry — mockup § F (F1-F9) — and the four pure resolvers behind the
 * hero: the value's two, and the frame -> caption and descriptor -> pill maps.
 *
 * The resolvers live here rather than inside the card so the suite can assert
 * the step-down rung, the explicit two decimals and all twelve copy branches
 * without rendering anything — the same split `resolveAccountRowAmount` already
 * ships one screen over, for the reason `N3_ACCOUNT_TYPE_LABELS` records: a
 * resolver must not import a component.
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
 */
const N4_STEP_DOWN_MAX_CHARS = 13;

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
 * The hero value's size, by how long the formatted amount is — mockup.html:686,
 * `.hero-v .n.step`.
 *
 * The count excludes the currency suffix because the suffix renders as its own
 * node at its own size and opacity; see `N4_STEP_DOWN_MAX_CHARS` for where the
 * boundary was settled.
 */
export function resolveHeroValueTextStyle(formattedAmount: string): Readonly<TextStyle> {
  return formattedAmount.length > N4_STEP_DOWN_MAX_CHARS
    ? N4_HERO_VALUE_STEP_TEXT_STYLE
    : N4_HERO_VALUE_TEXT_STYLE;
}

/**
 * The hero renders EGP at TWO decimals, against `CURRENCY_CONFIG`'s own 0 for
 * that currency — spec §1.3's screen-local deviation, approved, and recorded
 * in the PR body alongside the dashboard sites that render it at 0.
 */
export const N4_HERO_AMOUNT_DECIMALS = 2;

/**
 * `{ value: '148,250.00', code: 'EGP' }` — the two nodes of the hero value,
 * mockup.html:2334 (`.n` with a nested `.cur`).
 *
 * Split rather than routed through `formatCurrencyAmount`, which concatenates
 * them, for two reasons the screen cannot work around: the step-down counts
 * characters EXCLUDING the suffix, and the suffix renders at a different size
 * and opacity. This is the same split, for the same reason, that
 * `resolveAccountRowAmount` already ships on N3.
 *
 * The decimals are explicit, never `CURRENCY_CONFIG`'s default, which is 0 for
 * EGP and would render `148,250` on the biggest number in the app. Putting the
 * split behind a named pure function is what makes that assertable; the a11y
 * label on the slot still goes through `formatCurrencyAmount(value, currency,
 * 2)`, so a screen reader gets one announcement from the one formatter.
 *
 * The sign comes from whatever the domain resolver produced and from `Intl`,
 * never from a hand-written leading minus.
 */
export function resolveHeroAmountParts(
  value: number,
  currency: Currency,
): { value: string; code: string } {
  return {
    value: formatAmount(value, N4_HERO_AMOUNT_DECIMALS),
    code: CURRENCY_CONFIG[currency].code,
  };
}

/**
 * `'148,250.00 EGP'` — the hero value's single a11y announcement, so a screen
 * reader reads the amount and its currency as one thing rather than as the two
 * nodes `resolveHeroAmountParts` splits them into. `resolveAccountRowA11yLabel`
 * is the same shape one screen over.
 *
 * It exists as a named function for the reason that one does: the explicit
 * decimals are the whole point, and `CURRENCY_CONFIG[Currency.EGP].decimals` is
 * 0 — dropping the third argument here silently announces "148,250 EGP" over a
 * screen reading "148,250.00 EGP". Composed inline in the card that bug would
 * be reachable by no logic-only test, which is the repo's only kind.
 */
export function resolveHeroValueA11yLabel(value: number, currency: Currency): string {
  return formatCurrencyAmount(value, currency, N4_HERO_AMOUNT_DECIMALS);
}

/** The glyph a pill draws — `HeroPill`'s own `glyph` prop, named at its source. */
type ReadyPillGlyph = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * The frame's caption — mockup.html:2335, :2382, :2430, :2477, :2524, :2571,
 * :2618.
 *
 * The frame decides the caption and NOTHING else: the pills are composed by the
 * domain gate (`selectReadySummaryState`) and neither this map nor the card may
 * second-guess that array.
 *
 * F1 and F2 carry the only parameterised CODES. Both take a currency code
 * rather than hard-coding EGP: a USD-base user whose accounts are all USD lands
 * on F1 too, and "in EGP" would simply be false there. F7 is parameterised too,
 * but on the account COUNT — see the case below.
 */
export function resolveCaption(
  frame: ReadyFrame,
  accountCount: number,
  foreignCount: number,
  baseCode: string,
  foreignCode: string,
): string {
  switch (frame) {
    case 'F1':
      return Strings.n4CaptionAllBase(accountCount, baseCode);
    case 'F2':
      return Strings.n4CaptionConverted(foreignCount, foreignCode);
    case 'F3':
      return Strings.n4CaptionRateNeeded;
    case 'F4':
      return Strings.n4CaptionNegative;
    case 'F5':
      return Strings.n4CaptionZero;
    case 'F6':
      return Strings.n4CaptionSingle;
    case 'F7':
      // On `accountCount`, not on a hard-coded 1: F7 is returned for ANY
      // all-credit-card set, so the singular sentence would sit over a
      // "2 accounts" pill. See DEVIATION 6 in `strings.ts` for why the frame
      // is not narrowed instead.
      return Strings.n4CaptionCreditOnly(accountCount);
  }
}

/**
 * Descriptor to copy — mockup.html:2337-2338, :2385-2386, :2433, :2620.
 *
 * `needs-rate` renders the descriptor's own `count`, which the domain sets to
 * `foreignCount`; substituting `accountCount` here would read "3 need a rate"
 * for one USD account among three. The accounts pill's glyph is likewise the
 * descriptor's own — the domain keys it off the account composition, and this
 * map must not re-derive it.
 */
export function resolvePill(pill: ReadyPill): { label: string; glyph: ReadyPillGlyph } {
  switch (pill.kind) {
    case 'accounts':
      return { label: Strings.n4PillAccounts(pill.count), glyph: pill.glyph };
    case 'opening-balances':
      return { label: Strings.n4PillOpeningBal(pill.count), glyph: 'information-outline' };
    case 'needs-rate':
      return { label: Strings.n4PillNeedsRate(pill.count), glyph: 'swap-horizontal' };
    case 'rate':
      return { label: formatExchangeRate(pill.rate), glyph: 'swap-horizontal' };
    case 'approx':
      return {
        // Two decimals, against the mockup's rounded `2,169 USD` — Marcus's
        // 2026-08-06 ruling, recorded in the PR body as a declared deviation.
        label: formatCurrencyAmount(pill.value, pill.currency, N4_HERO_AMOUNT_DECIMALS),
        glyph: 'approximately-equal',
      };
  }
}
