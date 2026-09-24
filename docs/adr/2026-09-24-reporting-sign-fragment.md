# ADR: One SQL fragment carries the reporting sign rule

- **Date:** 2026-09-24
- **Status:** accepted
- **Ticket:** #557 (MA-101), under #544
- **Applies to:** `src/modules/transactions/database/reporting_sign.ts`, and the six queries that sum by it: `getMonthExpenseStats` and `getPeriodTotals` in `src/modules/transactions/database/transactions.ts`; `getCategorySpendByMonth`, `getBudgetSpendByMonth` and `getSpendingPlanSpend` in `src/modules/budget/database/budget_stats.ts`; `getDashboardTransactionFactRows` in `src/modules/dashboard/database/dashboard_snapshot.ts`

`REPORTING_SIGN_SQL` holds the reporting sign rule as two SQL expressions, `out` and `in`, over the `transaction_row` and `account_row` aliases. Every query that classifies a transaction as Out, In or neither interpolates them. Before this record, five copies of the same CASE spread across three modules made that decision, and nothing checked that they agreed.

## 1. The rule

| Row | `out` | `in` |
|---|---|---|
| `expense` | 1 | 0 |
| `income` on a non-card account | 0 | 1 |
| `income` on a `credit_card` account (card credit) | -1 | 0 |
| `transfer`, `cc_payment` | 0 | 0 |

Card credit is not a column. It is an income row whose account is a credit card, so the fragment reads `account_row.type` and every query that uses it joins `accounts account_row ON account_row.id = transaction_row.account_id`.

## 2. A multiplier, not a signed amount

Each expression yields -1, 0 or 1, and a query multiplies it into the column it sums: `SUM((out) * transaction_row.egp_amount)`. One expression then serves the EGP sums, the native `amount` sums inside a currency CASE, and the dashboard's row count, `CASE WHEN (out) <> 0 THEN 1 ELSE 0 END`. A signed CASE over `egp_amount` would need a copy per column, which is the duplication this record removes.

Multiplying by -1, 0 or 1 is exact in IEEE doubles, so every figure is the one the old CASE produced. Sums run over the 2 dp values stored on the rows; SQL rounds nothing, and the domain layer rounds once. Under a LEFT JOIN with no matching row, `0 * NULL` is NULL where the old CASE gave 0, so the budget and plan queries keep their `COALESCE(…, 0)`.

## 3. The domain classifier is the reference

`resolveReportingClass` and `resolveReportingEffect` in `src/modules/transactions/domain/transaction_policy.ts` define the rule; the fragment is its SQL spelling. `__tests__/reporting_sign.agreement.test.ts` seeds one month with an expense, an income, a card credit, a transfer, a card payment and a USD expense, runs all six queries over it, and asserts each figure against a fold of `resolveReportingEffect` over the same rows. A change to either side that the other does not follow fails that suite.

## 4. What is not the rule, and stays

- The account ledger legs in `src/modules/accounts/database/account_stats.ts:46-60` sum an account's own in and out in its native amount. That is the account cash-flow rule, where a card credit is money in.
- The trailing income filter in `getTrailingIncomeSuggestion`, `budget_stats.ts:69-70`, selects In rows for an average. On the fragment, a month holding only card credits would enter the average as 0 instead of being absent.
- The `getMonthExpenseStats` WHERE, `transactions.ts:48-53`, restricts rows to expense and card credit; it filters, it does not sum.
- The search's Card credit label, `transactions.ts:169-173`, matches text.

## 5. A new sum by the rule outside the fragment is a defect

A query that sums or counts by Out or In imports `REPORTING_SIGN_SQL` from `@/modules/transactions/database/reporting_sign`. MA-102's month aggregate is the first consumer. `git grep -l "WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card'" -- src` lists the fragment's file and nothing else, but it catches that one spelling of the Out rule only; the agreement suite is what ties the six named queries to the classifier.
