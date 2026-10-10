import { resolveRowStacking } from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  DashboardNetWorth,
  DashboardNetWorthAmount,
} from '@/modules/accounts/domain/account_aggregation';
import { snapToZero } from '@/utils/money';
import { ms } from '@/utils/responsive';

export type MonthSpendLegState = 'spent' | 'refunded';

export interface MonthSpendLeg {
  state: MonthSpendLegState;
  magnitude: number;
}

/** `net` is a state (#332): refunded from half a cent below zero, spent otherwise. */
export function resolveMonthSpendLeg(net: number): MonthSpendLeg {
  const snapped = snapToZero(net);
  return snapped < 0
    ? { state: 'refunded', magnitude: -snapped }
    : { state: 'spent', magnitude: snapped };
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

export interface MonthSpendFooterLayout {
  flexDirection: 'row' | 'column';
  alignItems: 'center' | 'flex-start';
}

/** Above font scale 1 the count takes its own line under the delta, on the skeleton as on the loaded card. */
export function resolveMonthSpendFooterLayout(fontScale: number): MonthSpendFooterLayout {
  return resolveRowStacking(fontScale) === 'stacked'
    ? { flexDirection: 'column', alignItems: 'flex-start' }
    : { flexDirection: 'row', alignItems: 'center' };
}

export interface NetWorthDetailLayout {
  row: { flexDirection: 'row' | 'column'; gap: number };
  column: { flex?: 1; gap: number };
}

/** Above font scale 1 a label is wider than a half column, so each detail takes a full-width row, on the skeleton as on the loaded card. */
export function resolveNetWorthDetailLayout(fontScale: number): NetWorthDetailLayout {
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  return {
    row: { flexDirection: stacked ? 'column' : 'row', gap: ms(8) },
    column: stacked ? { gap: ms(4) } : { flex: 1, gap: ms(4) },
  };
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
