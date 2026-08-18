import { CURRENCY_CONFIG } from '@/constants/currency';
import { type Currency } from '@/constants/enums';

export function formatAmount(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
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
  return `${formatAmount(rate, 2)} EGP/USD`;
}
