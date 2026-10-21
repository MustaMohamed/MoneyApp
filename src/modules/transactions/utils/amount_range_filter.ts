import { CURRENCY_CONFIG } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { MONEY_ROUNDING_DECIMALS, formatAmount } from '@/utils/format_amount';
import { parseDecimalText } from '@/utils/parse_decimal';

export interface AmountRangeBounds {
  amountCurrency: Currency;
  amountMin?: number;
  amountMax?: number;
}

export function parseAmountInput(s: string): number | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  return parseDecimalText(trimmed);
}

export interface AmountRangeValidation {
  isValid: boolean;
  min: number | undefined;
  max: number | undefined;
  minError: string | undefined;
  maxError: string | undefined;
  rangeError: string | undefined;
}

// A bound past 2 dp would filter on a value the summary cannot print, so the sheet refuses it.
function exceedsMoneyDecimals(text: string): boolean {
  return (text.split('.')[1] ?? '').length > MONEY_ROUNDING_DECIMALS;
}

export function validateAmountRange(minText: string, maxText: string): AmountRangeValidation {
  const normalizedMin = minText.trim();
  const normalizedMax = maxText.trim();
  const min = parseAmountInput(normalizedMin);
  const max = parseAmountInput(normalizedMax);
  const minError =
    normalizedMin && (min === undefined || exceedsMoneyDecimals(normalizedMin))
      ? Strings.filterAmountInvalid
      : undefined;
  const maxError =
    normalizedMax && (max === undefined || exceedsMoneyDecimals(normalizedMax))
      ? Strings.filterAmountInvalid
      : undefined;
  const rangeError =
    minError === undefined &&
    maxError === undefined &&
    min !== undefined &&
    max !== undefined &&
    min > max
      ? Strings.filterAmountRangeInvalid
      : undefined;

  return {
    isValid: minError === undefined && maxError === undefined && rangeError === undefined,
    min,
    max,
    minError,
    maxError,
    rangeError,
  };
}

export function formatAmountSummary(bounds: AmountRangeBounds): string {
  const { amountMin, amountMax, amountCurrency: cur } = bounds;
  // A fractional bound keeps its cents, so the summary never rounds past the bound the filter applies.
  const bound = (value: number) =>
    formatAmount(
      value,
      Number.isInteger(value) ? CURRENCY_CONFIG[cur].decimals : MONEY_ROUNDING_DECIMALS,
    );
  if (amountMin === undefined) {
    return amountMax === undefined
      ? Strings.filterSummaryAmountEmpty
      : `${Strings.filterSummaryAmountUpTo} ${bound(amountMax)} ${cur}`;
  }
  if (amountMax === undefined)
    return `${Strings.filterSummaryAmountFrom} ${bound(amountMin)} ${cur}`;
  return `${bound(amountMin)}–${bound(amountMax)} ${cur}`;
}

export interface AmountRangeDraft {
  isValid: boolean;
  hasText: boolean;
  summary: string;
  minError: string | undefined;
  maxError: string | undefined;
  rangeError: string | undefined;
}

export function resolveAmountRangeDraft(
  minText: string,
  maxText: string,
  bounds: AmountRangeBounds,
): AmountRangeDraft {
  const { isValid, minError, maxError, rangeError } = validateAmountRange(minText, maxText);
  return {
    isValid,
    hasText: minText.trim().length > 0 || maxText.trim().length > 0,
    summary: isValid ? formatAmountSummary(bounds) : Strings.filterSummaryAmountInvalid,
    minError,
    maxError,
    rangeError,
  };
}
