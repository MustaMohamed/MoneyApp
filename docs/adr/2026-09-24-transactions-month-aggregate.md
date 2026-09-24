# ADR: One query answers the list's day nets, tally and hero

- **Date:** 2026-09-24
- **Status:** accepted
- **Ticket:** MA-102, under #544
- **Applies to:** `getTransactionMonthAggregate` and `buildTransactionFilterSql` in `src/modules/transactions/database/transactions.ts`; `TransactionTotalsState`, `beginTotalsRequest`, `resolveTotals` and `failTotals` in `src/modules/transactions/screens/transactions/transactions.store.ts`; `loadTotals` in `src/modules/transactions/screens/transactions/transactions.hook.ts`

`getTransactionMonthAggregate(db, query)` returns every day of the range that has a matching row with its net and row count, the tally over those rows, and the month's Out, In and Net. The redesigned list reads its day card nets, the count and sum under the search field, and the hero from this one result. Before this record the month totals ignored every filter, the day grouping folded only the loaded page, and nothing counted a search.

## 1. One filter builder for the rows and the aggregate

`buildTransactionFilterSql` builds the rows' filter predicates once: the date range, type, search, accounts, categories and the amount range with its currency. It returns the search joins, the `WHERE` clause and the bound parameters. `getTransactions` and both aggregate statements interpolate its output, so a predicate that changes for the rows changes for the aggregate in the same edit.

The builder adds each clause only when its filter is set. No `? IS NULL OR` chain is left (audit L34). A month-only or search query plans `SEARCH transaction_row USING INDEX idx_transactions_date (transaction_date>? AND transaction_date<?)`. A type, account or category filter plans that filter's equality index. Neither plans a table scan, and `__tests__/database_get_transactions_filter.test.ts` and `__tests__/transactions_month_aggregate.test.ts` assert this with `EXPLAIN QUERY PLAN`.

## 2. Days and tally take the full filter; the hero takes the accounts filter alone

The function runs two statements over `transactions transaction_row JOIN accounts account_row`:

| Figure | Filter | Statement |
|---|---|---|
| `days`: date, net, count, newest first | the full query | `GROUP BY transaction_date` |
| `matchCount`, `matchNetEgp` | the full query | TypeScript fold over `days` |
| `scoped`: `incomeEgp`, `expenseEgp`, `netEgp` | the date range and `accountIds` only | one `SUM` row |

Only the accounts filter scopes the hero. The type tabs, the search, the category and the amount range never change it. A net is `in` minus `out`, composed from `REPORTING_SIGN_SQL` with no new sign expression (the 2026-09-24 reporting-sign-fragment ADR). `scoped` has the `PeriodTotals` shape, so the totals strip and `buildTotalsPresentation` read it unchanged.

## 3. Nothing rounds

Every sum runs over the 2 dp `egp_amount` persisted on the row. SQL rounds nothing, and neither does the fold. Formatting for display belongs to the renderers (MA-091, MA-092), through the app's money formatters.

## 4. The previous month is a second call

The strip's previous-month figure comes from a second call of the same function, with the previous month's range and the current `accountIds`, and no type, search, category or amount. The screen reads that call's `scoped` alone. No other query fetches it.

## 5. The state keys on the rows' query key

`beginTotalsRequest(queryKey, yearMonth, preserveData)` stamps the key, the month and a request id. `resolveTotals` publishes only when both the key and the id still match, and `failTotals` matches on the same pair. A response for an older request or another filter key never overwrites a newer one. A load starts on a key change, a write (`mutationVersion`), a focus behind the staleness gate, or pull-to-refresh. The focus gate compares `totalsQueryKey` with the key at focus.

When a new key resolves scoped figures equal to the held ones, `resolveTotals` keeps the held `current` and `previous` objects. A search keystroke that leaves the hero's figures unchanged does not change their identity, so a hero that selects them skips the render (M25).

## 6. `totalsQueryKey` names the request in flight, not the data held

On a same-month key change, `beginTotalsRequest` keeps the previous key's `totals`, including its `days`, `matchCount` and `matchNetEgp`, under the new stamp until the response lands. The strip therefore does not blank on every keystroke. As a result, `days` and the tally are current for `totalsQueryKey` only when `totalsStatus === 'ready'`. MA-092 must gate its zip of `days` with the list sections on that status, never on the stamp alone.

## 7. `getPeriodTotals` leaves production

No production code calls `getPeriodTotals` any more. It stays exported for its suite, `__tests__/transactions_get_period_totals.test.ts`, and for the agreement suite, until a later ticket removes it.
