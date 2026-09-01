import { CURRENCY_CONFIG } from '@/constants/currency';
import { type Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

// Strips the minus `Intl` prints for a nonzero magnitude rounding to zero; test after formatting.
// An exact `-0` is a domain defect, so the `value !== 0` guard leaves it on screen.
// Not `ZERO_AT_DISPLAY_PRECISION` minus a character: different layer, different population.
const SIGNED_ZERO = /^-0(\.0+)?$/;

// Rate precision; not interchangeable with `exchange_rate_row.tsx`'s amount-preview decimals.
export const EXCHANGE_RATE_DECIMALS = 2;

// ADR 2026-08-27 (money-colour vocabulary, decision 3): polarity is a composed sign, and the
// canonical negative glyph is U+2212 — never the ASCII hyphen, whose advance width differs (#332).
export const MINUS_SIGN = '−';
export const PLUS_SIGN = '+';

export type AmountSign = typeof MINUS_SIGN | typeof PLUS_SIGN | '';

/**
 * The one composition point for a sign glyph (#332). Callers format an unsigned magnitude
 * (`Math.abs` or `formatDisplayMagnitude`) and pick the sign from their own polarity rule;
 * text that prints as zero carries no sign.
 */
export function signAmountText(text: string, sign: AmountSign, printsAsZero = false): string {
  return printsAsZero ? text : `${sign}${text}`;
}

// Keep the `new Intl.NumberFormat(` below on one line; `validate-money-formatting.js` scans lines.
// Keyed on `decimals` alone, total only because the locale below is a literal, not a parameter.
const FORMATTERS = new Map<number, Intl.NumberFormat>();

function formatterFor(decimals: number): Intl.NumberFormat {
  const cached = FORMATTERS.get(decimals);
  if (cached !== undefined) return cached;
  const created = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  FORMATTERS.set(decimals, created);
  return created;
}

export function formatAmount(value: number, decimals = 0): string {
  const formatted = formatterFor(decimals).format(value);
  return value !== 0 && SIGNED_ZERO.test(formatted) ? formatted.slice(1) : formatted;
}

export function formatCurrencyParts(
  value: number,
  currency: Currency,
  decimals?: number,
): { value: string; code: string } {
  const config = CURRENCY_CONFIG[currency];
  return { value: formatAmount(value, decimals ?? config.decimals), code: config.code };
}

export function formatCurrencyAmount(value: number, currency: Currency, decimals?: number): string {
  const parts = formatCurrencyParts(value, currency, decimals);
  return `${parts.value} ${parts.code}`;
}

export function formatCurrencyTotals(totals: Map<Currency, number>): string {
  const entries = Array.from(totals.entries());
  if (entries.length === 0) return Strings.currencyTotalsUnavailable;
  return entries
    .map(([currency, amount]) => formatCurrencyAmount(amount, currency))
    .join(Strings.currencyTotalsSeparator);
}

// Mirrors `roundMoney`'s persisted 2dp (`src/utils/money.ts`), not any display precision.
const MONEY_ROUNDING_DECIMALS = 2;

// Matches a magnitude that prints as zero at the site's precision; input is always `Math.abs()`'d.
// Not `SIGNED_ZERO` plus a character: different layer, different population. Do not fold the two.
const ZERO_AT_DISPLAY_PRECISION = /^0(\.0+)?$/;

// Tells a true zero from float noise; unrelated to `roundMoney`'s 1e-9 despite the numeral.
const ZERO_EPSILON = 1e-9;

/** `printsAsZero` describes the rendered text, not the value; no sign glyph belongs beside it. */
export function formatDisplayMagnitude(
  value: number,
  currency: Currency,
): { text: string; printsAsZero: boolean } {
  const isTrueZero = Math.abs(value) < ZERO_EPSILON;
  if (isTrueZero) return { text: formatAmount(0, 0), printsAsZero: true };

  const magnitude = Math.abs(value);
  const config = CURRENCY_CONFIG[currency];
  const atSitePrecision = formatAmount(magnitude, config.decimals);
  // Escalate once, taking `roundMoney`'s 2dp precision but never its half-even mode.
  const text = ZERO_AT_DISPLAY_PRECISION.test(atSitePrecision)
    ? formatAmount(magnitude, MONEY_ROUNDING_DECIMALS)
    : atSitePrecision;
  const printsAsZero = ZERO_AT_DISPLAY_PRECISION.test(text);
  return { text, printsAsZero };
}

export function formatExchangeRate(rate: number): string {
  return `${formatAmount(rate, EXCHANGE_RATE_DECIMALS)} EGP/USD`;
}

/** Long form for a labelled row on its own line; a chip or pill uses `formatExchangeRate`. */
export function formatExchangeRateSentence(rate: number): string {
  return Strings.detailExchangeRateSentence(formatAmount(rate, EXCHANGE_RATE_DECIMALS));
}
