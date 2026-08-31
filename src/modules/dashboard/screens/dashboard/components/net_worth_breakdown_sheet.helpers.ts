import { CURRENCY_CONFIG, foreignCurrencyFor } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatCurrencyAmount, formatDisplayMagnitude } from '@/utils/format_amount';

import type { LiquidityBreakdown } from '../dashboard.helpers';

/** Keyed on the field being absent, not on the rate: the placeholder rate is 50, not 0. */
export function resolveNetWorthForeignCaption(
  netWorthForeign: number | undefined,
  baseCurrency: Currency,
): string {
  const foreignCurrency = foreignCurrencyFor(baseCurrency);
  return netWorthForeign === undefined
    ? Strings.netWorthBreakdownForeignUnavailable(CURRENCY_CONFIG[foreignCurrency].code)
    : Strings.netWorthBreakdownForeignApprox(
        formatCurrencyAmount(netWorthForeign, foreignCurrency),
      );
}

export type BreakdownRowKind = 'liquid' | 'reserve' | 'liability';

const BREAKDOWN_ROW_LEGEND_COLOR: Record<BreakdownRowKind, string> = {
  liquid: Colors.dark.positive,
  reserve: Colors.dark.gold,
  liability: Colors.dark.negative,
};

/** Categorical group colour; no value colour, since owing money is not an actionable state. */
export function resolveBreakdownRowColors(kind: BreakdownRowKind): {
  legend: string;
  value: string | undefined;
} {
  return { legend: BREAKDOWN_ROW_LEGEND_COLOR[kind], value: undefined };
}

/** `balance` is signed: positive owed, negative in credit. Pass a `roundMoney`-quantised value. */
export function formatLiabilityRowValue(balance: number, baseCurrency: Currency): string {
  const { text, printsAsZero } = formatDisplayMagnitude(balance, baseCurrency);
  if (printsAsZero) return text;
  return `${balance < 0 ? '+' : '−'}${text}`;
}

/** An overdrawn account can make a part negative while the total stays positive. */
export function shouldShowProportionBar(
  parts: Pick<LiquidityBreakdown, 'liquid' | 'reserve'>,
): boolean {
  return parts.liquid >= 0 && parts.reserve >= 0 && parts.liquid + parts.reserve > 0;
}
