import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatCurrencyAmount, formatDisplayMagnitude } from '@/utils/format_amount';

import type { LiquidityBreakdown } from '../dashboard.helpers';

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

/**
 * A liability row's value cell — `LiabilityRow.balanceEgp` is signed
 * (positive owed, negative in credit; #259 C2), and this is the SINGLE site
 * that composes a glyph onto it. `printsAsZero` is checked before the sign:
 * a magnitude that rounds to a printed zero gets no glyph at all, the
 * `transaction_row.helpers.ts` `primaryAmountFor` shape. U+2212 `−`, never an
 * ASCII hyphen, when owed; ASCII `+` in credit — no space either side.
 *
 * Pure `(number) => string`: no `LiabilityRow` in the signature, no React
 * import in this file. `-0` is admitted deliberately (C2) — do not add a
 * `normalizeNegativeZero` call here; `-0 < 0` is false, so it takes the
 * `−` branch, and `formatDisplayMagnitude`'s true-zero test already routes
 * it to the unsigned `printsAsZero` return before the sign check runs.
 */
export function formatLiabilityRowValue(balanceEgp: number): string {
  const { text, printsAsZero } = formatDisplayMagnitude(balanceEgp, Currency.EGP);
  if (printsAsZero) return text;
  return `${balanceEgp < 0 ? '+' : '−'}${text}`;
}

/**
 * The breakdown sheet's asset proportion bar, gated on both parts being
 * non-negative and the total being positive — not just `assetsTotal > 0`.
 * `current_balance REAL NOT NULL DEFAULT 0` carries no CHECK constraint
 * (`src/database/migrations/001_create_accounts.ts:11`), so an overdrawn
 * bank can make one part negative while the total stays positive; without
 * this the bar rendered `flex: -0.5` on one segment.
 *
 * Takes `Pick<LiquidityBreakdown, 'liquidEgp' | 'reserveEgp'>`, not the full
 * breakdown: the predicate reads exactly two fields, and the narrow
 * signature keeps its test fixtures to two numbers. The total is derived
 * from the two picked fields, never taken as a third parameter — a caller
 * cannot pass a total that disagrees with its own parts.
 */
export function shouldShowProportionBar(
  parts: Pick<LiquidityBreakdown, 'liquidEgp' | 'reserveEgp'>,
): boolean {
  return parts.liquidEgp >= 0 && parts.reserveEgp >= 0 && parts.liquidEgp + parts.reserveEgp > 0;
}
