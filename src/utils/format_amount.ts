import { CURRENCY_CONFIG } from '@/constants/currency';
import { type Currency } from '@/constants/enums';
import { roundMoney } from '@/utils/money';

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
//
// Looks like ZERO_AT_DISPLAY_PRECISION below (one character apart) but is not the same
// check: this one matches an Intl-produced sign character, the other matches a bare
// magnitude that was Math.abs()'d before this regex ever sees it. Do not fold them into
// one — they run at different layers, over different populations (§2 vs §2.1).
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

// Mirrors roundMoney's fixed precision (src/utils/money.ts) — the domain's persisted
// precision, not any currency's display precision. Not exported from money.ts because
// nothing there needs it as a value; it exists here only as the fallback this function
// escalates to.
const MONEY_ROUNDING_DECIMALS = 2;

// Matches a magnitude that prints as a literal zero at the site's display precision —
// "0", "0.0", "0.00" — even though the rounded value it came from is nonzero. No sign
// variant needed: the input here is always Math.abs()'d before this runs.
//
// Looks like SIGNED_ZERO above (one character apart) but is not the same check — see
// that comment for the distinction. Do not fold them into one.
const ZERO_AT_DISPLAY_PRECISION = /^0(\.0+)?$/;

/**
 * The magnitude four composed-sign call sites were each computing by hand
 * (`transactions.helpers.ts`, `detail.helpers.ts`, `transaction_row.helpers.ts`,
 * `transfer_flow_card.tsx`), plus whether the true rounded value is an exact zero.
 * Callers own sign composition and any currency-code suffix — this owns exactly the
 * money-precision problem that was quadruplicated: `roundMoney` persists at 2dp, but
 * EGP's 0dp display precision can round a genuine 0.40 down to a printed "0", and a
 * sign glyph beside that reads as a direction that does not exist. See
 * docs/adr/2026-08-21-currency-aware-display-decimals.md §2.1.
 *
 * The rule, site-independent:
 *   1. `r = roundMoney(value)` — magnitude only. `-0 === 0` already holds in JS, so no
 *      separate negative-zero normalisation is needed to test for an exact zero here
 *      (that stays `normalizeNegativeZero`'s job at the domain layer, upstream of this).
 *   2. `r === 0`  -> magnitude `"0"`, `isZero: true`. There is no direction to report.
 *   3. `r !== 0`  -> render at the site's normal (currency-config) precision. If that
 *      would print a literal zero, fall back to `r`'s full rounding precision instead so
 *      a nonzero amount never displays as zero. Structurally unreachable for any
 *      currency whose display precision already matches or exceeds
 *      `MONEY_ROUNDING_DECIMALS` — USD today.
 */
export function formatDisplayMagnitude(
  value: number,
  currency: Currency,
): { text: string; isZero: boolean } {
  const magnitude = Math.abs(roundMoney(value));
  if (magnitude === 0) return { text: formatAmount(0, 0), isZero: true };

  const config = CURRENCY_CONFIG[currency];
  const atSitePrecision = formatAmount(magnitude, config.decimals);
  const text = ZERO_AT_DISPLAY_PRECISION.test(atSitePrecision)
    ? formatAmount(magnitude, MONEY_ROUNDING_DECIMALS)
    : atSitePrecision;
  return { text, isZero: false };
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
