import { Currency } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type { DashboardNetWorth } from '@/modules/accounts/domain/account_aggregation';
import { formatCurrencyParts } from '@/utils/format_amount';

export function resolveMonthSpendUsdAmount(monthSpentUsd: number): { value: string; code: string } {
  return formatCurrencyParts(monthSpentUsd, Currency.USD);
}

/** Net worth is gold at either sign; only `rate-needed` is warning, because it is actionable. */
export function resolveNetWorthStatColor(netWorth: DashboardNetWorth): string {
  return netWorth.kind === 'rate-needed' ? SemanticTokens.warning : Colors.dark.gold;
}
