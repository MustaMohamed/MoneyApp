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

/** Hero value size by formatted length, suffix excluded; mockup.html:686 `.hero-v .n.step`. */
export function resolveHeroValueTextStyle(formattedAmount: string): Readonly<TextStyle> {
  return formattedAmount.length > N4_STEP_DOWN_MAX_CHARS
    ? N4_HERO_VALUE_STEP_TEXT_STYLE
    : N4_HERO_VALUE_TEXT_STYLE;
}

/** The two hero nodes, mockup.html:2334; decimals are explicit, EGP's default is 0. */
export function resolveHeroAmountParts(
  value: number,
  currency: Currency,
): { value: string; code: string } {
  return formatCurrencyParts(value, currency, N4_HERO_AMOUNT_DECIMALS);
}

/** Amount and currency as one screen-reader announcement, not the two nodes of the split. */
export function resolveHeroValueA11yLabel(value: number, currency: Currency): string {
  return formatCurrencyAmount(value, currency, N4_HERO_AMOUNT_DECIMALS);
}

/** The glyph a pill draws; `HeroPill`'s own `glyph` prop. */
type ReadyPillGlyph = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** The frame's caption, mockup.html:2335, :2382, :2430, :2477, :2524, :2571, :2618. */
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
      // On `accountCount`, not 1: F7 covers any all-credit-card set, including two accounts.
      return Strings.n4CaptionCreditOnly(accountCount);
  }
}

/** Descriptor to copy, mockup.html:2337-2338, :2385-2386, :2433, :2620. */
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
        // Two decimals, deliberately against the mockup's rounded `2,169 USD`.
        label: formatCurrencyAmount(pill.value, pill.currency, N4_HERO_AMOUNT_DECIMALS),
        glyph: 'approximately-equal',
      };
  }
}
