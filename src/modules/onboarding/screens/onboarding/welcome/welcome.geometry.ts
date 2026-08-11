import type { ViewStyle } from 'react-native';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing, TouchSize } from '@/constants/theme';

export type CurrencySymbol =
  | { kind: 'text'; text: string }
  | { kind: 'icon'; name: 'currency-usd' };

export interface CurrencyOption {
  value: Currency;
  label: string;
  consequence: string;
  symbol: CurrencySymbol;
}

/**
 * The two currency rows — mockup.html:1054-1069. EGP first, per business
 * rule 5 (pre-selected). Each option states its own display consequence
 * (scope.md decision 1) rather than leaving the reader to infer what
 * choosing it does.
 */
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

/**
 * Row height — MA-010 decision D6. Derived from the symbol box, not
 * authored: `Size.shieldBox` (48) + `Spacing.sm` (12) padding on each side +
 * `Size.hairline` (1) border on each side = 74 at the 390pt reference. The
 * mockup's own CSS (`.opt`, mockup.html:441-447) computes the same 74 — its
 * B1 caption annotation says "76 pt target", a recorded 2 dp deviation from
 * the drawn frame, not a typo in this derivation (see D6 for the full
 * account). Both numbers clear TouchSize.min (44).
 */
export const CURRENCY_ROW_MIN_HEIGHT = Math.max(
  Size.shieldBox + Spacing.sm * 2 + Size.hairline * 2,
  TouchSize.min,
);

/**
 * Shared literally between selected and unselected rows (MA-010 decision
 * D7) — carries no colour key, ever. Selection changes only `borderColor`
 * and the fill class in the render-prop branch, so the row is exactly as
 * tall selected as unselected.
 */
export const CURRENCY_ROW_STYLE: ViewStyle = {
  minHeight: CURRENCY_ROW_MIN_HEIGHT,
  borderWidth: 1,
  borderRadius: Radius.md,
  padding: Spacing.sm,
  alignItems: 'center',
  gap: Spacing.sm,
};

/** mockup.html:387, `.t-over { letter-spacing: 0.14em }`. */
export const N1_EYEBROW_TRACKING_EM = 0.14;
