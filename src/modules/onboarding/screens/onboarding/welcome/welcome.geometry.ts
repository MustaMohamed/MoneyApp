import type { ViewStyle } from 'react-native';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing, TouchSize } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export type CurrencySymbol =
  | { kind: 'text'; text: string }
  | { kind: 'icon'; name: 'currency-usd' };

export interface CurrencyOption {
  value: Currency;
  label: string;
  consequence: string;
  symbol: CurrencySymbol;
}

/** mockup.html:1054-1069. EGP first, per business rule 5 (pre-selected). */
export const CURRENCY_OPTIONS: readonly CurrencyOption[] = [
  {
    value: Currency.EGP,
    label: Strings.n1CurrencyEgpLabel,
    consequence: Strings.n1CurrencyEgpConsequence,
    symbol: { kind: 'text', text: Strings.n1CurrencyEgpSymbol }, // mockup.html:1056
  },
  {
    value: Currency.USD,
    label: Strings.n1CurrencyUsdLabel,
    consequence: Strings.n1CurrencyUsdConsequence,
    symbol: { kind: 'icon', name: 'currency-usd' }, // mockup.html:1064
  },
] as const;

export function resolveCurrencyOptionA11y(option: CurrencyOption): { accessibilityLabel: string } {
  return { accessibilityLabel: `${option.label}. ${option.consequence}` };
}

/** 48 shield box + 12 padding each side + 1 hairline each side = 74 at the 390pt reference. */
export const CURRENCY_ROW_MIN_HEIGHT = Math.max(
  Size.shieldBox + Spacing.sm * 2 + Size.hairline * 2,
  TouchSize.min,
);

// Shared by reference between both rows: frozen, and carries no colour key.
export const CURRENCY_ROW_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: CURRENCY_ROW_MIN_HEIGHT,
  borderWidth: Size.hairline,
  borderRadius: Radius.md,
  padding: Spacing.sm,
  alignItems: 'center',
  gap: Spacing.sm,
});

/** mockup.html:414, `.vr { width: 2px; border-radius: 1px }`. */
export const N1_BODY_RULE_WIDTH = ms(2);
export const N1_BODY_RULE_RADIUS = ms(1);
