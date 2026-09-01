import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

/** The adjusted balance must be finite and >= 0, credit cards included. */
export type AdjustParseResult = { ok: true; value: number } | { ok: false };

export function parseAdjustInput(raw: string): AdjustParseResult {
  const parsed = parseNonNegativeDecimal(raw);
  if (parsed === undefined) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
}
