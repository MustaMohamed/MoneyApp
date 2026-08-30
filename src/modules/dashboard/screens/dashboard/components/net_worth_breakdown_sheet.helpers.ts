import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
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
  return netWorthUsd === undefined
    ? Strings.netWorthBreakdownUsdUnavailable
    : Strings.netWorthBreakdownUsdApprox(formatCurrencyAmount(netWorthUsd, Currency.USD));
}

export type BreakdownRowKind = 'liquid' | 'reserve' | 'liability';

// Record-keyed, not a nested ternary: a fourth kind added to BreakdownRowKind
// without an entry here is a compile error (the account_balance_color.ts shape),
// not an unhandled branch that falls through at runtime.
const BREAKDOWN_ROW_LEGEND_COLOR: Record<BreakdownRowKind, string> = {
  liquid: Colors.dark.positive,
  reserve: Colors.dark.gold,
  liability: Colors.dark.negative,
};

/**
 * The bar segment / legend dot / legend icon colour for a breakdown row, by
 * kind — categorical, identifying which group a row belongs to, never a
 * judgement on the row's balance (docs/adr/2026-08-27-money-colour-vocabulary.md).
 * `value` is `undefined` for every kind: a liability's magnitude is money the
 * user owes, not an actionable state. `net_worth_breakdown_sheet.tsx` wires this
 * `.value` straight into the liability `LegendRow`'s `valueColor` prop, so it
 * falls to `LegendRow`'s default `text-foreground` because the resolver said so
 * — its composed `−` sign is what carries the polarity — not because the JSX
 * happens to omit a prop. Liquid and reserve route through the same
 * `BREAKDOWN_ROW_LEGEND_COLOR` lookup, so a fourth kind can't reintroduce a
 * value colour without this function's return type changing too.
 */
export function resolveBreakdownRowColors(kind: BreakdownRowKind): {
  legend: string;
  value: string | undefined;
} {
  return { legend: BREAKDOWN_ROW_LEGEND_COLOR[kind], value: undefined };
}
