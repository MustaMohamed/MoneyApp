# ADR: One query answers the commitments month, and its totals convert at a passed rate

- **Date:** 2026-10-21
- **Status:** accepted
- **Ticket:** #813 (MA-231), under #784
- **Applies to:** `getPaymentMonthAggregate` in `src/modules/commitments/database/commitment_payments.ts`; `skippedPaymentSql` in `src/modules/commitments/database/payment_state_sql.ts`; `getMonthAggregate` on `ICommitmentRepository` in `src/modules/commitments/repositories/commitment.repository.ts`; `computeCommitmentMonthTotals` in `src/modules/commitments/domain/commitment_month_totals.ts`

`getPaymentMonthAggregate(db, scope)` returns, for one month and one `today`, the sums and counts of the month's paid, skipped, overdue, due and upcoming rows and of the carried unpaid rows. `computeCommitmentMonthTotals(aggregate, rate)` turns that result into the month's EGP figures: Left to pay, Committed, Paid, Skipped and Overdue, with their counts and `~` flags. The commitments hero and its counters take their figures from these two functions (MA-232 builds the hero on them), never from a fold over the loaded rows, as the transactions hero takes its own from one aggregate (`docs/adr/2026-09-24-transactions-month-aggregate.md`).

## 1. A third predicate: skipped

`skippedPaymentSql(alias?)` is `paid_date IS NULL AND skipped_date IS NOT NULL`, the SQL form of `isSkippedPayment`. It joins the unpaid and paid predicates of `docs/adr/2026-10-21-derived-payment-state.md` §3. A row with both dates set is paid, never skipped. `__tests__/commitment_payment_state.agreement.test.ts` runs each predicate against its TypeScript form over the same rows.

## 2. The row set and the carried bound are the month read's

The aggregate reads the rows `getPaymentsByMonth` returns (`docs/adr/2026-10-21-derived-payment-state.md` §4): the rows with `due_date >= monthStart AND due_date < nextMonthStart`, plus the unpaid rows with `due_date < carriedBefore`. `ICommitmentRepository.getMonthAggregate(yearMonth, today, accountId?)` sets `carriedBefore` to `carriedDueBound(yearMonth, today)`, the earlier of the month's first day and today, as `getPaymentsForMonth` does. The two ranges are disjoint, so no row counts twice. A late payment counts in its due month.

## 3. Six buckets

| Bucket | Rows | Sums |
|---|---|---|
| `paid` | month rows matching `paidPaymentSql` | the linked transaction's `egp_amount`, and a count |
| `skipped` | month rows matching `skippedPaymentSql` | `amount_due` by currency, a count, a variable flag |
| `overdue` | unpaid month rows with `due_date < today` | the same |
| `due` | unpaid month rows with `due_date = today` | the same |
| `upcoming` | unpaid month rows with `due_date > today` | the same |
| `carried` | the carried unpaid rows | the same |

A paid row counts the EGP amount its transaction wrote, never `amount_paid` or the estimate, so the paid bucket has no USD leg and no variable flag. A held bucket sums the row's own `amount_due` into `egp` or `usd` by `payment.currency`. It never reads `commitment.amount`, so an edit to the commitment after a skip leaves the skipped figure unchanged. A `NULL` `amount_due`, a variable row with no estimate, adds 0. The variable flag is true when any row in the bucket belongs to a commitment whose `amount_type` is variable. Every sum is wrapped in `COALESCE(..., 0)`, so an empty month returns all-zero buckets.

## 4. One account, by the row's account

With an `accountId`, each branch adds `AND COALESCE(payment.account_id, commitment.account_id) = ?`. Pay writes the paid-from account to `payment.account_id`, so a paid row counts under that account. An unpaid or skipped row with no `account_id` falls back to its commitment's account, as `commitments.hook.ts` does. Without an `accountId` the clause and its parameter are absent; there is no `? IS NULL OR` chain (audit L34). `account_id` has no index, so the `COALESCE` wraps no indexed column.

## 5. Both branches plan the due-date index

The statement is one `getFirstAsync`: an outer aggregate over two `UNION ALL` branches. Each branch reads `commitment_payments payment INDEXED BY idx_cp_due_date` with the bare `due_date` in a range, and joins `commitments` and `transactions` by primary key. `__tests__/commitment_month_aggregate.query.test.ts` runs `EXPLAIN QUERY PLAN` with and without an account and expects two `SEARCH payment USING INDEX idx_cp_due_date` lines and no scan of `payment` or `commitment`. A prepare error at `INDEXED BY` means a branch no longer constrains `due_date`.

## 6. SQL rounds nothing; the totals round each bucket once

The SQL sums are raw. `computeCommitmentMonthTotals` converts each held bucket's USD leg at the passed `rate`, EGP per USD, through `convertCurrency`, and rounds the bucket once with `roundMoney`: `roundMoney(egp + usd × rate)`. Paid is `roundMoney(paid.egp)`. Committed is `roundMoney(paid + overdue + due + upcoming)` over those rounded figures, and Left to pay is `roundMoney(committed − paid)`. Skipped and the carried rows stay out of both. The Overdue figure is the carried bucket, and the Overdue count is the month's overdue count plus the carried count. The live rate is read once by the screen's hook and passed in; no money function reads a store.

## 7. The `~` flags and a bad rate

Left to pay and Committed take `~` when the overdue, due or upcoming bucket holds a variable row, estimate or not. Skipped takes it when the skipped bucket does, and Overdue when the carried bucket does. Paid never takes it.

When any held bucket has a USD leg, a rate that is not finite or is at most 0 throws `CommitmentMonthTotalsError`, as `.claude/rules/money.md` asks of a conversion with USD involved. With no USD leg, the totals need no rate and any rate passes.
