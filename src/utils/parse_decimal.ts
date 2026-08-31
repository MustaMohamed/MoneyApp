import { MIN_MONEY_AMOUNT } from '@/utils/money';

const DECIMAL_PATTERN = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;

/** Pattern and finite parse only: no money floor, so a money caller must apply its own. */
export function parseDecimalText(value: string): number | undefined {
  const normalized = value.trim();
  if (!DECIMAL_PATTERN.test(normalized)) return undefined;
  const parsed = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Money text, zero admitted: below `MIN_MONEY_AMOUNT` is `undefined`, never a round-up. */
export function parseNonNegativeDecimal(value: string): number | undefined {
  const parsed = parseDecimalText(value);
  if (parsed === undefined) return undefined;
  return parsed === 0 || parsed >= MIN_MONEY_AMOUNT ? parsed : undefined;
}

/** Money text, zero refused: `0` and anything below `MIN_MONEY_AMOUNT` parse as `undefined`. */
export function parsePositiveDecimal(value: string): number | undefined {
  const parsed = parseNonNegativeDecimal(value);
  return parsed !== undefined && parsed >= MIN_MONEY_AMOUNT ? parsed : undefined;
}

/** Exchange rate (EGP per USD), not money: no floor, and `transaction_amounts.ts` bounds output. */
export function parseRateText(value: string): number | undefined {
  const parsed = parseDecimalText(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}
