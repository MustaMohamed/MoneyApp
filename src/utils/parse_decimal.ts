import { MIN_MONEY_AMOUNT } from '@/utils/money';

const DECIMAL_PATTERN = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;

/**
 * Pattern + finite parse only — no money floor. Two shapes reach this: a
 * money value that must still clear a schema `.refine` as typed, so the
 * field renders its own floor message against the raw parsed value (e.g.
 * the transaction amount hooks, which compare this output to
 * `MIN_MONEY_AMOUNT` at the field's own validator) — every money text field
 * with no such refine in front of it uses `parseNonNegativeDecimal` or
 * `parsePositiveDecimal` below instead; and every non-money numeric text
 * field, direct — APR, due_day, the transaction filter and search amounts,
 * and (via `parseRateText` below) the exchange rate. The money floor never
 * applied to that second class (ADR: parse-floor-money-only).
 */
export function parseDecimalText(value: string): number | undefined {
  const normalized = value.trim();
  if (!DECIMAL_PATTERN.test(normalized)) return undefined;
  const parsed = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Money text, zero admitted: parse-and-floor. `0` always passes (an unset
 * optional amount, a promotional card's APR is not this parser's concern —
 * this is money only); anything else below `MIN_MONEY_AMOUNT` parses as
 * `undefined`, the same "not a number" result a garbled string gets — the
 * floor is a parse failure, never a silent round-up. This is the correct
 * parser for money text only; a non-money numeric field starts from
 * `parseDecimalText` (or `parseRateText` below for a rate) instead (ADR:
 * parse-floor-money-only).
 */
export function parseNonNegativeDecimal(value: string): number | undefined {
  const parsed = parseDecimalText(value);
  if (parsed === undefined) return undefined;
  return parsed === 0 || parsed >= MIN_MONEY_AMOUNT ? parsed : undefined;
}

/**
 * Money text, zero refused: the required-amount parser for a payment, limit,
 * or income that must be strictly positive. Below `MIN_MONEY_AMOUNT` —
 * `0` included — parses as `undefined`, same shape as a garbled string.
 * This floor is now load-bearing *only* for money text; a non-money numeric
 * field starts from `parseDecimalText` (or `parseRateText` below for a
 * rate) instead (ADR: parse-floor-money-only).
 */
export function parsePositiveDecimal(value: string): number | undefined {
  const parsed = parseNonNegativeDecimal(value);
  return parsed !== undefined && parsed >= MIN_MONEY_AMOUNT ? parsed : undefined;
}

/**
 * An exchange rate (EGP per USD): positive and finite, NOT money — no floor,
 * no upper bound at parse. A rate this loose could still drive a resolver to
 * an absurd computed amount; `transaction_amounts.ts`'s output guard is what
 * makes that safe, not a bound here (ADR: parse-floor-money-only).
 */
export function parseRateText(value: string): number | undefined {
  const parsed = parseDecimalText(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}
