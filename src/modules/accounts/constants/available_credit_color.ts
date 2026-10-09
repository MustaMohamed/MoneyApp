import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import { creditUtilisation } from '@/modules/accounts/domain/account_figures';

/** Takes the card's balance and bands the used share; one minus it is 0.19999999999999996 at 20% available. */
export function availableCreditColor(balance: number, limit: number): string {
  if (limit <= 0) return CoreTokens.text2;
  const used = creditUtilisation(balance, limit);
  if (used < 0.5) return SemanticTokens.positive;
  if (used <= 0.8) return SemanticTokens.warning;
  return SemanticTokens.negative;
}
