import { Currency } from '@/constants/enums';
import { formatCurrencyAmount } from '@/utils/format_amount';

/**
 * Exported for `__tests__/screens/dashboard/net_worth_breakdown_sheet.helpers.test.ts` —
 * net_worth_breakdown_sheet.tsx:164 was inline JSX with no test seam.
 *
 * Keyed on the FIELD being absent, not on `rate > 0`: `INITIAL_STATE.rate` is 50, so the old
 * check printed a confident `≈ N USD` computed from the placeholder for every user who had
 * never fetched a rate. No `?? 0` — `formatAmount(0)` renders `≈ 0.00 USD`, a wrong number
 * rather than an absent one.
 */
export function resolveNetWorthUsdCaption(netWorthUsd: number | undefined): string {
  return netWorthUsd === undefined ? '— USD' : `≈ ${formatCurrencyAmount(netWorthUsd, Currency.USD)}`;
}
