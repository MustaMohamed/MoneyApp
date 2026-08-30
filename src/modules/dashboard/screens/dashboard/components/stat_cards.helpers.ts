import { Currency } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type { DashboardNetWorth } from '@/modules/accounts/domain/account_aggregation';
import { formatCurrencyParts } from '@/utils/format_amount';

/**
 * Exported for `__tests__/screens/dashboard/stat_cards.helpers.test.ts` --
 * stat_cards.tsx:249 was inline JSX with no test seam.
 *
 * Extracted in the `{ value, code }` shape c5 keeps (spec §6.3 / #243) -- this is the same
 * shape `formatCurrencyParts` itself returns, called directly here the same way
 * `resolveAccountRowA11yLabel` (more_accounts.geometry.ts) composes it inline -- so this is a
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

/**
 * The net-worth stat card's tint (docs/adr/2026-08-27-money-colour-vocabulary.md):
 * a net worth is a magnitude the user owns or owes, never coloured by sign — both a
 * positive and a negative net worth render gold, matching the same aggregate on
 * `hero_card.tsx` and the breakdown sheet's headline. `rate-needed` stays warning;
 * that state is actionable (no rate to compute from), not a signed amount.
 */
export function resolveNetWorthStatColor(netWorth: DashboardNetWorth): string {
  return netWorth.kind === 'rate-needed' ? SemanticTokens.warning : Colors.dark.gold;
}
