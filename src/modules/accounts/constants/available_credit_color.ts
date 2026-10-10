import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import { isOverLimit } from '@/modules/accounts/domain/is_over_limit';
import { compareToPercent } from '@/utils/money';

/** Bands the card's balance against its limit in integer cents; exactly 50% and exactly 80% used both stay warning. */
export function creditBandColor(balance: number, limit: number): string {
  if (limit <= 0) return CoreTokens.text2;
  if (isOverLimit(balance, limit)) return SemanticTokens.negative;
  if (compareToPercent(balance, limit, 50) < 0) return SemanticTokens.positive;
  if (compareToPercent(balance, limit, 80) <= 0) return SemanticTokens.warning;
  return SemanticTokens.negative;
}
