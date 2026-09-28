import { CURRENCY_CONFIG } from '@/constants/currency';
import type { Currency } from '@/constants/enums';
import { MINUS_SIGN, formatDisplayMagnitude, signAmountText } from '@/utils/format_amount';

/** An owned magnitude (ADR 2026-08-27 decision 1) takes `−` only below zero and never `+`, and a `-0` from float noise prints unsigned (#332). */
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
