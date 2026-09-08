import { AccountType } from '@/constants/enums';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

/** Finite; a card is floored at zero, a non-card may be negative, and one leading minus is read. */
export type AdjustParseResult = { ok: true; value: number } | { ok: false };

interface AdjustSign {
  isNegative: boolean;
  accountType: AccountType;
}

/** Only U+002D is a sign; a U+2212 or a second minus stays in the magnitude and fails the parse. */
export function splitLeadingMinus(raw: string): { magnitude: string; typedNegative: boolean } {
  const trimmed = raw.trim();
  return trimmed.startsWith('-')
    ? { magnitude: trimmed.slice(1), typedNegative: true }
    : { magnitude: trimmed, typedNegative: false };
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
