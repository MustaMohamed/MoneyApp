import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';

/**
 * Three-threshold utilisation color, shared by `account_card.tsx` (dashboard)
 * and `balance_hero.helpers.ts` (account detail) — both surfaces colour the
 * same "available credit" figure and previously carried their own copy,
 * which is how the two screens drifted apart on `warning` (#264).
 *   > 50% available → positive · 20%–50% → warning · < 20% → negative
 */
export function availableCreditColor(available: number, limit: number): string {
  if (limit <= 0) return CoreTokens.text2;
  const pct = available / limit;
  if (pct > 0.5) return SemanticTokens.positive;
  if (pct >= 0.2) return SemanticTokens.warning;
  return SemanticTokens.negative;
}
