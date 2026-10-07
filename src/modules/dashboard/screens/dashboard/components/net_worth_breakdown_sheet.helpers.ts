import { CURRENCY_CONFIG, foreignCurrencyFor } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatOwnedAmount } from '@/utils/format_amount';

import type { LiquidityBreakdown } from '../dashboard.helpers';

/** Keyed on the field being absent, not on the rate, whose placeholder is 50; through the owned composer so the caption carries `netWorth`'s U+2212. */
export function resolveNetWorthForeignCaption(
  netWorthForeign: number | undefined,
  baseCurrency: Currency,
): string {
  const foreignCurrency = foreignCurrencyFor(baseCurrency);
  if (netWorthForeign === undefined) {
    return Strings.netWorthBreakdownForeignUnavailable(CURRENCY_CONFIG[foreignCurrency].code);
  }
  return Strings.netWorthBreakdownForeignApprox(
    formatOwnedAmount(netWorthForeign, foreignCurrency),
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

/** An overdrawn account can make a part negative while the total stays positive. */
export function shouldShowProportionBar(
  parts: Pick<LiquidityBreakdown, 'liquid' | 'reserve'>,
): boolean {
  return parts.liquid >= 0 && parts.reserve >= 0 && parts.liquid + parts.reserve > 0;
}
