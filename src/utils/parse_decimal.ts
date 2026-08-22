import { MIN_MONEY_AMOUNT } from '@/utils/money';

const DECIMAL_PATTERN = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;

/**
 * Pattern + finite parse only — no money floor. For a value that must reach
 * a schema `.refine` as typed, so the field renders its own floor message
 * against the raw parsed value (e.g. the transaction amount hooks, which
 * compare this output to `MIN_MONEY_AMOUNT` at the field's own validator).
 * Every money text field that has no such refine in front of it uses
 * `parseNonNegativeDecimal` or `parsePositiveDecimal` below instead.
 */
export function parseDecimalText(value: string): number | undefined {
  const normalized = value.trim();
  if (!DECIMAL_PATTERN.test(normalized)) return undefined;
  const parsed = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseNonNegativeDecimal(value: string): number | undefined {
  const parsed = parseDecimalText(value);
  if (parsed === undefined) return undefined;
  return parsed === 0 || parsed >= MIN_MONEY_AMOUNT ? parsed : undefined;
}

export function parsePositiveDecimal(value: string): number | undefined {
  const parsed = parseNonNegativeDecimal(value);
  return parsed !== undefined && parsed >= MIN_MONEY_AMOUNT ? parsed : undefined;
}
