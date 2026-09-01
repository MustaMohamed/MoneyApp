import { Currency } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  DashboardNetWorth,
  DashboardNetWorthAmount,
} from '@/modules/accounts/domain/account_aggregation';

export type MonthSpendLegState = 'spent' | 'refunded';

export interface MonthSpendLeg {
  state: MonthSpendLegState;
  magnitude: number;
}

/**
 * A credit-card refund month can net negative — there is no purchase-to-refund link in the
 * schema, so period-net is the only implementable model (#332). `net` is a state, not a signed
 * display value: `net >= 0` (zero included) is `spent`, `net < 0` is `refunded` at its magnitude.
 * Only the magnitude is meant to reach a formatter — a negative number never reaches display.
 */
export function resolveMonthSpendLeg(net: number): MonthSpendLeg {
  return net < 0 ? { state: 'refunded', magnitude: -net } : { state: 'spent', magnitude: net };
}

/**
 * Base-native row first (#347). Both rows are native ledger totals — the USD subtotal is already
 * folded inside the EGP figure at each transaction's own historical rate — so nothing converts;
 * only the hierarchy follows the base.
 */
export function resolveMonthSpendRows<T extends { value: string; code: string }>(
  baseCurrency: Currency,
  egpParts: T,
  usdParts: T,
): ReadonlyArray<T> {
  return baseCurrency === Currency.USD ? [usdParts, egpParts] : [egpParts, usdParts];
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
