import { CURRENCY_CONFIG } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { formatAmount } from '@/utils/format_amount';

/**
 * Exported for `__tests__/screens/dashboard/stat_cards.helpers.test.ts` --
 * stat_cards.tsx:249 was inline JSX with no test seam.
 *
 * Extracted in the `{ value, code }` shape c5 keeps (spec §6.3 / #243) -- this is the same
 * shape `resolveAccountRowAmount` (more_accounts.geometry.ts:113) already uses, so c5's later
 * adoption of formatCurrencyParts here is a body swap with zero test churn. This resolver
 * calls formatAmount(x, CURRENCY_CONFIG[USD].decimals) directly, never formatCurrencyAmount --
 * the direct call is what makes it reachable at the corrected mutation locus
 * (src/constants/currency.ts:10-11), not `formatCurrencyAmount`'s.
 */
export function resolveMonthSpendUsdAmount(monthSpentUsd: number): { value: string; code: string } {
  const config = CURRENCY_CONFIG[Currency.USD];
  return { value: formatAmount(monthSpentUsd, config.decimals), code: config.code };
}
