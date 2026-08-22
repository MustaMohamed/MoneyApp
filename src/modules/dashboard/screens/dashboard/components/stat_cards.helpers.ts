import { Currency } from '@/constants/enums';
import { formatCurrencyParts } from '@/utils/format_amount';

/**
 * Exported for `__tests__/screens/dashboard/stat_cards.helpers.test.ts` --
 * stat_cards.tsx:249 was inline JSX with no test seam.
 *
 * Extracted in the `{ value, code }` shape c5 keeps (spec §6.3 / #243) -- this is the same
 * shape `resolveAccountRowAmount` (more_accounts.geometry.ts:113) already uses, so this is a
 * direct call to `formatCurrencyParts`. `Currency.USD` here is a construction-time literal --
 * stat_cards.tsx:181's call site is always the USD month-spend stat (the render itself is at
 * :255), never any other currency -- so this site stays reachable at the corrected mutation
 * locus (src/constants/currency.ts:10-11):
 * `formatCurrencyParts` (format_amount.ts:56-63) reads `CURRENCY_CONFIG[currency].decimals`
 * itself, so routing through it preserves that reachability exactly.
 */
export function resolveMonthSpendUsdAmount(monthSpentUsd: number): { value: string; code: string } {
  return formatCurrencyParts(monthSpentUsd, Currency.USD);
}
