import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

/**
 * Pure parse-and-validate for the Adjust Balance input.
 * Enforces [layla] §3.4: the value must be finite and >= 0, and this applies to
 * ALL account types including credit cards. Both survive unchanged.
 * It no longer mirrors the V1 inline guard. That guard was a bare `parseFloat`,
 * which accepted '5abc' as 5 and truncated '1,234.56' to 1. Parsing is delegated
 * to `parseNonNegativeDecimal` (`src/utils/parse_decimal.ts`), which adds
 * DECIMAL_PATTERN and the shared MIN_MONEY_AMOUNT floor: '0' still parses,
 * (0, 0.01) no longer does. See MA-019 D2.
 */
export type AdjustParseResult = { ok: true; value: number } | { ok: false };

export function parseAdjustInput(raw: string): AdjustParseResult {
  const parsed = parseNonNegativeDecimal(raw);
  if (parsed === undefined) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
}
