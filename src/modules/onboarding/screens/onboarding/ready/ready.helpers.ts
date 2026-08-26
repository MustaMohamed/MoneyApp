import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import type { TextStyle } from 'react-native';

import type { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { ReadyFrame, ReadyPill } from '@/modules/onboarding/domain/ready_summary_state';
import {
  formatCurrencyAmount,
  formatCurrencyParts,
  formatExchangeRate,
} from '@/utils/format_amount';

import {
  N4_HERO_AMOUNT_DECIMALS,
  N4_HERO_VALUE_STEP_TEXT_STYLE,
  N4_HERO_VALUE_TEXT_STYLE,
  N4_STEP_DOWN_MAX_CHARS,
} from './ready.geometry';

/**
 * N4's formatter resolvers — split out of `ready.geometry.ts` (folder
 * convention `ready.<role>.ts`, `ready.helpers.ts` per the repo's own
 * `.helpers.ts` precedent): the hero value's three (its step-down text
 * style, its split amount parts, its a11y label) and the two maps that turn a
 * frame or a pill descriptor into copy.
 *
 * They live in their own pure module, not inside the card, so the suite can
 * assert the step-down rung, the explicit two decimals and all twelve copy
 * branches without rendering anything — the same value/code split N3's
 * account row already uses, one screen over, for the reason
 * `ACCOUNT_TYPE_LABELS` (`constants/account_type_labels.ts`) exists: a
 * resolver must not import a component.
 */

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
 * `{ value: '148,250.00', code: 'EGP' }` — the two nodes of the hero value,
 * mockup.html:2334 (`.n` with a nested `.cur`).
 *
 * Split rather than routed through `formatCurrencyAmount`, which concatenates
 * them, for two reasons the screen cannot work around: the step-down counts
 * characters EXCLUDING the suffix, and the suffix renders at a different size
 * and opacity. This is the same split, for the same reason, N3's account row
 * amount already ships.
 *
 * The decimals are explicit, never `CURRENCY_CONFIG`'s default, which is 0 for
 * EGP and would render `148,250` on the biggest number in the app. Putting the
 * split behind a named pure function is what makes that assertable; the a11y
 * label on the slot still goes through `formatCurrencyAmount(value, currency,
 * 2)`, so a screen reader gets one announcement from the one formatter.
 *
 * The sign comes from whatever the domain resolver produced and from `Intl`,
 * never from a hand-written leading minus. (The mockup draws U+2212 MINUS and
 * `Intl` emits U+002D HYPHEN-MINUS — formatter output, not transcribed copy.)
 */
export function resolveHeroAmountParts(
  value: number,
  currency: Currency,
): { value: string; code: string } {
  return formatCurrencyParts(value, currency, N4_HERO_AMOUNT_DECIMALS);
}

/**
 * `'148,250.00 EGP'` — the hero value's single a11y announcement, so a screen
 * reader reads the amount and its currency as one thing rather than as the two
 * nodes `resolveHeroAmountParts` splits them into. N3's account row a11y label
 * is the same shape, one screen over.
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
