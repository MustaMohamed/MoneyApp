import { AccountType } from '@/constants/enums';
import { MINUS_SIGN } from '@/utils/format_amount';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

/** Finite; a card refuses a negative, a non-card may hold one, and one leading minus is read. */
export type AdjustParseResult = { ok: true; value: number } | { ok: false };

/** One leading U+002D or U+2212 is the sign; a second minus of either glyph stays in the magnitude. */
function splitLeadingMinus(raw: string): { magnitude: string; typedNegative: boolean } {
  const trimmed = raw.trim();
  return trimmed.startsWith('-') || trimmed.startsWith(MINUS_SIGN)
    ? { magnitude: trimmed.slice(1), typedNegative: true }
    : { magnitude: trimmed, typedNegative: false };
}

export function parseAdjustInput(raw: string, accountType: AccountType): AdjustParseResult {
  const { magnitude, typedNegative } = splitLeadingMinus(raw);
  const parsed = parseNonNegativeDecimal(magnitude);
  if (parsed === undefined) {
    return { ok: false };
  }
  if (typedNegative && parsed !== 0 && accountType === AccountType.CreditCard) {
    return { ok: false };
  }
  // `roundMoney(-0)` returns `-0` and the column would keep it, so zero never takes the sign.
  return { ok: true, value: typedNegative && parsed !== 0 ? -parsed : parsed };
}
