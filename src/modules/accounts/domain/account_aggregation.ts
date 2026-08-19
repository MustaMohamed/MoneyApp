import { AccountType } from '@/constants/enums';

/**
 * Account-aggregation primitives, shared by every surface that sums balances
 * across accounts.
 *
 * Lives under `domain/` deliberately — `.claude/rules/money.md` globs the
 * `domain/` folders beneath `src/modules/`, so this is the path on which the
 * money rules auto-load (issue #244).
 */

/**
 * The named site for "credit cards are liabilities" in the two aggregations
 * that adopted it: `computeNetWorth` (dashboard helpers) and
 * `resolveStartingNetPosition` (N4); before #255 each inlined its own copy of
 * the conditional.
 *
 * It is NOT yet the only aggregation encoding the rule. Two more sit inline in
 * `dashboard.helpers.ts`: `computeLiabilitiesBreakdown` filters on
 * `type !== AccountType.CreditCard`, and `computeDashboardAccountCounts`
 * buckets accounts on `type === AccountType.CreditCard`. Adopting the resolver
 * at either is out of scope for #255 (spec §7) and owned by a separate ticket.
 *
 * `resolvePrimaryBalanceDelta` in the transactions domain remains a separate
 * encoding on purpose: it signs WRITES, not aggregations, and unifying the two
 * is out of scope (spec §2).
 *
 * The corollary is scoped to AGGREGATION: a summed TOTAL takes its sign from
 * this function, and a surface rendering one must not re-apply a minus on top.
 * It is NOT "no minus is ever composed at the display layer". Per-account
 * liability ROWS are the standing exception and are deliberately unsigned —
 * `computeLiabilitiesBreakdown` returns `Math.abs(balanceEgp)`, and
 * `net_worth_breakdown_sheet.tsx:218` composes the leading minus glyph itself
 * for the rows it flags `negative`. Signing those rows too would double it.
 */
export function resolveAccountAggregationSign(type: AccountType): 1 | -1 {
  return type === AccountType.CreditCard ? -1 : 1;
}

/**
 * `roundMoney` returns `-0` for a negative input that rounds to zero, and
 * `Intl.NumberFormat` renders `-0` as "-0.00". Called as the LAST operation
 * before returning any value that reaches a formatter.
 */
export function normalizeNegativeZero(value: number): number {
  return value === 0 ? 0 : value;
}
