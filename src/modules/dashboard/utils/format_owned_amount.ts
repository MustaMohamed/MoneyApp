import { CURRENCY_CONFIG } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { MINUS_SIGN, formatDisplayMagnitude, signAmountText } from '@/utils/format_amount';

/**
 * A magnitude the user owns (ADR 2026-08-27 decision 1): unsigned at zero or positive, `−` only
 * for a genuine negative (an overdrawn liquid/reserve total, an overdrawn account row, or the
 * assets sum) — never `+`. Also absorbs the `-0` float-noise artifact `computeLiquidityBreakdown`'s
 * per-total rounding can produce: `formatDisplayMagnitude`'s epsilon gate reads it as true zero,
 * so the sheet's asset rows stop printing `-0` (#332).
 */
export function formatOwnedAmountParts(
  value: number,
  baseCurrency: Currency,
): { value: string; code: string } {
  const { text, printsAsZero } = formatDisplayMagnitude(value, baseCurrency);
  return {
    value: signAmountText(text, value < 0 ? MINUS_SIGN : '', printsAsZero),
    code: CURRENCY_CONFIG[baseCurrency].code,
  };
}
