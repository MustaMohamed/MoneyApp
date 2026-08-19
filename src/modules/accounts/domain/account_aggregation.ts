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
 * The single named site for "credit cards are liabilities" in every
 * AGGREGATION. Its two consumers are `computeNetWorth` (dashboard helpers) and
 * `resolveStartingNetPosition` (N4); before #255 each inlined its own copy of
 * the conditional.
 *
 * `resolvePrimaryBalanceDelta` in the transactions domain remains a separate
 * encoding on purpose: it signs WRITES, not aggregations, and unifying the two
 * is out of scope (spec §2). Two encodings, split along that line, by design.
 *
 * The corollary is a rule for every consumer: no leading minus is derived at
 * the display layer. The formatter renders whatever sign this returned.
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
