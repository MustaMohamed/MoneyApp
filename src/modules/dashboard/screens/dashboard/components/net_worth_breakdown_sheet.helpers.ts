import { CURRENCY_CONFIG, foreignCurrencyFor } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatDisplayMagnitude,
  signAmountText,
} from '@/utils/format_amount';

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

/** `balance` is signed: positive owed, negative in credit. Pass a `roundMoney`-quantised value. */
export function formatLiabilityRowValue(balance: number, baseCurrency: Currency): string {
  const { text, printsAsZero } = formatDisplayMagnitude(balance, baseCurrency);
  return signAmountText(text, balance < 0 ? PLUS_SIGN : MINUS_SIGN, printsAsZero);
}

/**
 * A magnitude the user owns (ADR 2026-08-27 decision 1): unsigned at zero or positive, `−` only
 * for a genuine negative (an overdrawn liquid/reserve total, an overdrawn account row, or the
 * assets sum) — never `+`. Also absorbs the `-0` float-noise artifact `computeLiquidityBreakdown`'s
 * per-total rounding can produce: `formatDisplayMagnitude`'s epsilon gate reads it as true zero,
 * so the sheet's asset rows stop printing `-0` (#332).
 */
export function formatOwnedAmountParts(
  value: number,
  baseCurrency: Currency,
): { value: string; code: string } {
  const { text, printsAsZero } = formatDisplayMagnitude(value, baseCurrency);
  return {
    value: signAmountText(text, value < 0 ? MINUS_SIGN : '', printsAsZero),
    code: CURRENCY_CONFIG[baseCurrency].code,
  };
}

/** `amount.liabilities` shares `LiabilityRow.balance`'s owed-frame sign (positive owed, negative
 * in credit) — the same composition point, with the currency code alongside for the header/footer. */
export function formatLiabilityAmountParts(
  value: number,
  baseCurrency: Currency,
): { value: string; code: string } {
  return {
    value: formatLiabilityRowValue(value, baseCurrency),
    code: CURRENCY_CONFIG[baseCurrency].code,
  };
}

/** An overdrawn account can make a part negative while the total stays positive. */
export function shouldShowProportionBar(
  parts: Pick<LiquidityBreakdown, 'liquid' | 'reserve'>,
): boolean {
  return parts.liquid >= 0 && parts.reserve >= 0 && parts.liquid + parts.reserve > 0;
}
