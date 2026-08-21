import { CURRENCY_CONFIG } from '@/constants/currency';
import { type Currency } from '@/constants/enums';

// A NONZERO negative magnitude that rounds to zero at this precision still carries the
// minus sign, and reads as a small debt that does not exist. Struck after formatting,
// never before: the input is not -0 (Object.is(-0.4, -0) is false), so a numeric
// pre-normalise cannot see it.
//
// The `value !== 0` clause is load-bearing and is NOT a redundant fast path. An exact -0
// arriving here is a DOMAIN defect — `normalizeNegativeZero` failed to run as the last
// operation before the formatter — and this layer deliberately leaves it on screen rather
// than laundering it. Widening the condition to catch everything deletes the three
// tripwire tests' only signal. See docs/adr/2026-08-21-currency-aware-display-decimals.md §2.
const SIGNED_ZERO = /^-0(\.0+)?$/;

// Rate precision, shared by every rate site that keeps its own surrounding string. Not the
// same constant as exchange_rate_row.tsx's RATE_PREVIEW_AMOUNT_DECIMALS — that one is a
// pre-confirmation EGP amount, not a rate, and the two are allowed to diverge; see the ADR.
export const EXCHANGE_RATE_DECIMALS = 2;

export function formatAmount(value: number, decimals = 0): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return value !== 0 && SIGNED_ZERO.test(formatted) ? formatted.slice(1) : formatted;
}

export function formatCurrencyAmount(value: number, currency: Currency, decimals?: number): string {
  const config = CURRENCY_CONFIG[currency];
  return `${formatAmount(value, decimals ?? config.decimals)} ${config.code}`;
}

export function formatWithCurrencyCode(value: number, code: string, decimals = 0): string {
  return `${formatAmount(value, decimals)} ${code}`;
}

/**
 * `48.60 EGP/USD` — the rate pill's label (mockup.html:2385 draws the longer
 * `1 USD = 48.60 EGP`; spec §1.4 shortens it). The long form needs 137.4pt of
 * N4's 330pt pill track, which is what pushed the three-pill F2 row to 329.1pt;
 * the compact form buys back ~40pt and lands the row at ~289pt, so all three
 * pills fit on one line at base text size — which is what lets
 * `Size.summaryPillTrack` be a ONE-line track with no dead space in the six
 * states that carry two pills.
 *
 * The unit order stays rate-first because that is how the pill reads next to a
 * swap glyph. Rounding is unchanged: two decimals, from `formatAmount`.
 */
export function formatExchangeRate(rate: number): string {
  return `${formatAmount(rate, EXCHANGE_RATE_DECIMALS)} EGP/USD`;
}
