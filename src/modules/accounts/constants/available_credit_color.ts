import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';

export function availableCreditColor(available: number, limit: number): string {
  if (limit <= 0) return CoreTokens.text2;
  const pct = available / limit;
  if (pct > 0.5) return SemanticTokens.positive;
  if (pct >= 0.2) return SemanticTokens.warning;
  return SemanticTokens.negative;
}
