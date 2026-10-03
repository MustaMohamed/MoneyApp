import { CURRENCY_CONFIG, foreignCurrencyFor } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatOwnedAmountParts } from '@/utils/format_amount';

import type { LiquidityBreakdown } from '../dashboard.helpers';

/**
 * Keyed on the field being absent, not on the rate: the placeholder rate is 50, not 0. Composed
 * through `formatOwnedAmountParts`, not plain `formatCurrencyAmount` — `netWorthForeign` mirrors
 * `netWorth`'s sign, so it needs the same U+2212-not-ASCII-hyphen convention (PR #375 r1).
 */
export function resolveNetWorthForeignCaption(
  netWorthForeign: number | undefined,
  baseCurrency: Currency,
): string {
  const foreignCurrency = foreignCurrencyFor(baseCurrency);
  if (netWorthForeign === undefined) {
    return Strings.netWorthBreakdownForeignUnavailable(CURRENCY_CONFIG[foreignCurrency].code);
  }
  const { value, code } = formatOwnedAmountParts(netWorthForeign, foreignCurrency);
  return Strings.netWorthBreakdownForeignApprox(`${value} ${code}`);
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
