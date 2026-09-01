import { Currency } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  DashboardNetWorth,
  DashboardNetWorthAmount,
} from '@/modules/accounts/domain/account_aggregation';
import { formatCurrencyParts } from '@/utils/format_amount';

export function resolveMonthSpendUsdAmount(monthSpentUsd: number): { value: string; code: string } {
  return formatCurrencyParts(monthSpentUsd, Currency.USD);
}

/**
 * An overdrawn bank makes `assets` negative (negative flex); an all-credit zero-debt portfolio
 * makes `liabilities` negative, which `Math.abs` painted as 100% debt (#345). Same compound gate
 * as the breakdown sheet's `shouldShowProportionBar`, typed to this card's fields.
 */
export function shouldShowNetWorthProportionBar(
  parts: Pick<DashboardNetWorthAmount, 'assets' | 'liabilities'>,
): boolean {
  return parts.assets >= 0 && parts.liabilities >= 0 && parts.assets + parts.liabilities > 0;
}

/** Net worth is gold at either sign; only `rate-needed` is warning, because it is actionable. */
export function resolveNetWorthStatColor(netWorth: DashboardNetWorth): string {
  return netWorth.kind === 'rate-needed' ? SemanticTokens.warning : Colors.dark.gold;
}
