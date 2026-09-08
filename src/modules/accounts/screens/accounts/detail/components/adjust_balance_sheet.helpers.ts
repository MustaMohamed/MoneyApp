import { AccountType } from '@/constants/enums';
import { MINUS_SIGN } from '@/utils/format_amount';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

/** Finite; a card is floored at zero, a non-card may be negative, and one leading minus is read. */
export type AdjustParseResult = { ok: true; value: number } | { ok: false };

interface AdjustSign {
  isNegative: boolean;
  accountType: AccountType;
}

/** One leading U+002D or U+2212 is the sign; a second minus of either glyph stays in the magnitude. */
export function splitLeadingMinus(raw: string): { magnitude: string; typedNegative: boolean } {
  const trimmed = raw.trim();
  return trimmed.startsWith('-') || trimmed.startsWith(MINUS_SIGN)
    ? { magnitude: trimmed.slice(1), typedNegative: true }
    : { magnitude: trimmed, typedNegative: false };
}

/** An absent `negative` means leave the segment as the user set it; an ordinary edit never moves it. */
export interface AdjustInputChange {
  input: string;
  negative?: true;
}

export function resolveAdjustInputChange(raw: string, isCard: boolean): AdjustInputChange {
  const { magnitude, typedNegative } = splitLeadingMinus(raw);
  // A card has no control to clear the sign with, so its text stays exactly as typed.
  return typedNegative && !isCard ? { input: magnitude, negative: true } : { input: raw };
}

export function parseAdjustInput(raw: string, sign: AdjustSign): AdjustParseResult {
  const { magnitude, typedNegative } = splitLeadingMinus(raw);
  const parsed = parseNonNegativeDecimal(magnitude);
  if (parsed === undefined) {
    return { ok: false };
  }
  const negative = sign.isNegative || typedNegative;
  if (negative && sign.accountType === AccountType.CreditCard) {
    return { ok: false };
  }
  // `roundMoney(-0)` returns `-0` and the column would keep it, so zero never takes the sign.
  return { ok: true, value: negative && parsed !== 0 ? -parsed : parsed };
}
