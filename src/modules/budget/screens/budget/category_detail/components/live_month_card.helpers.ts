import { Currency } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import { formatOwnedAmountParts } from '@/utils/format_amount';

/**
 * "Left to spend" is an owned magnitude, same family as `budget_card.tsx`'s left figure: unsigned
 * when non-negative, `−` only when over budget — never `+`. Colour converges to the sign-conditional
 * pattern its siblings already use (`month_ledger.tsx` / `monthly_result_chart.tsx`:
 * `(limit - spent) >= 0 ? Colors.dark.positive : Colors.dark.negative`) rather than a static green
 * regardless of value (#334 marcus ruling, ADR decision 5).
 */
export function resolveLiveMonthLeftPresentation(
  limit: number,
  spent: number,
): { text: string; color: string } {
  const left = limit - spent;
  return {
    text: formatOwnedAmountParts(left, Currency.EGP).value,
    color: left >= 0 ? Colors.dark.positive : Colors.dark.negative,
  };
}
