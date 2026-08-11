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
// borderWidth is Size.hairline, the same token CURRENCY_ROW_MIN_HEIGHT
// derives from above — not a literal 1. The two agree wherever ms(1) is 1, so
// nothing differs as drawn today; they diverge the moment the token does, and
// the height would then be computed from a border nobody draws.
//
// Frozen because the zero-shift contract is "carries no colour key, ever" and
// this object is shared by reference between both rows: a single assignment
// anywhere would move the geometry of both, and the suite only checks the
// keys at module load.
export const CURRENCY_ROW_STYLE: ViewStyle = Object.freeze({
  minHeight: CURRENCY_ROW_MIN_HEIGHT,
  borderWidth: Size.hairline,
  borderRadius: Radius.md,
  padding: Spacing.sm,
  alignItems: 'center',
  gap: Spacing.sm,
});

/**
 * The body column's vertical rule — mockup.html:414, `.vr { width: 2px;
 * border-radius: 1px }`. Named and ms()-scaled rather than inlined as bare
 * numbers, so it grows with everything around it instead of thinning against
 * the copy it anchors at larger scales.
 */
export const N1_BODY_RULE_WIDTH = ms(2);
export const N1_BODY_RULE_RADIUS = ms(1);
