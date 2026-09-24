# ADR: One query answers the list's day nets, tally and hero

- **Date:** 2026-09-24
- **Status:** accepted
- **Ticket:** MA-102, under #544
- **Applies to:** `getTransactionMonthAggregate` and `getTransactionScopedTotals` in `src/modules/transactions/database/transactions.ts`; `getMonthAggregate` and `getScopedTotals` on `ITransactionTotalsRepository` in `src/modules/transactions/repositories/transaction.repository.ts`; `TransactionTotalsState`, `beginTotalsRequest`, `resolveTotals` and `failTotals` in `src/modules/transactions/screens/transactions/transactions.store.ts`; `loadTotals` in `src/modules/transactions/screens/transactions/transactions.hook.ts`

`getTransactionMonthAggregate(db, query)` returns every day of the range that has a matching row with its net and row count, the tally over those rows, and the month's Out, In and Net. The redesigned list reads its day card nets, the count and sum under the search field, and the hero from this one result. Before this record the month totals ignored every filter, the day grouping folded only the loaded page, and nothing counted a search.

## 1. One filter builder, and every dated shape plans the date index

A file-private builder in `transactions.ts` writes the rows' filter predicates once: the date range, type, search, accounts, categories and the amount range with its currency. The rows query and both aggregate statements interpolate its output, so a predicate that changes for the rows changes for the aggregate in the same edit. The builder adds each clause only when its filter is set, so no `? IS NULL OR` chain is left (audit L34).

With no `ANALYZE` statistics, SQLite prefers an equality index over a range, so a type, account or category filter used to plan `idx_transactions_type`, the account `MULTI-INDEX OR` or `idx_transactions_category_id`, and read the whole history. When the query carries a date bound, the builder writes those columns with a unary `+` (`+transaction_row.type = ?`). This removes them from index selection, so every shape of the rows query and of both aggregate statements plans `SEARCH transaction_row USING INDEX idx_transactions_date (transaction_date>?…`. A dateless caller keeps its equality index; none exists today. `__tests__/database_get_transactions_filter.test.ts` and `__tests__/transactions_month_aggregate.test.ts` pin the date index on every shape with `EXPLAIN QUERY PLAN`.

`dateTo` stays an inclusive `<=` where the database rule asks for half-open ranges. `transaction_date` is a date-only `YYYY-MM-DD` column, so `<= 'YYYY-MM-31'` misses nothing a time component would add. `<=` on the bare column plans as a range on the index, just as `<` does. The period helpers pass the month's last day. The rule's intent is a bare indexed column in a range, and this meets it.

## 2. Days and tally take the full filter; the hero takes the accounts filter alone

| Figure | Filter | Statement |
|---|---|---|
| `days`: date, net, count, newest first | the full query | `GROUP BY transaction_date` |
| `matchCount`, `matchNetEgp` | the full query | TypeScript fold over `days` |
| `scoped`: `incomeEgp`, `expenseEgp`, `netEgp` | the date range and `accountIds` only | `getTransactionScopedTotals`, one `SUM` row |

Both statements join `accounts account_row` on `transaction_row.account_id` once, and the search matches the source account's name through that join. `getTransactionScopedTotals` takes the date range and `accountIds` from whatever query it is handed. It is the one place that subset is picked, and `getPeriodTotals` is that function over a bare range. Only the accounts filter scopes the hero. The type tabs, the search, the category and the amount range never change it. A net is `in` minus `out`, composed from `REPORTING_SIGN_SQL` with no new sign expression (the 2026-09-24 reporting-sign-fragment ADR). `scoped` has the `PeriodTotals` shape, so the totals strip and `buildTotalsPresentation` read it unchanged.

## 3. Nothing rounds

Every sum runs over the 2 dp `egp_amount` persisted on the row. SQL rounds nothing, and neither does the fold. Formatting for display belongs to the renderers (MA-091, MA-092), through the app's money formatters.

## 4. The previous month is the scoped statement alone, reused across same-scope key changes

The strip's previous-month figure is `getTransactionScopedTotals` over the previous month's range with the current `accountIds`. It runs no day statement. The screen reaches both functions through the repository and never opens the database itself (audit L14).

A load that only a key change started reuses the held previous month when the month, `accountIds` and `mutationVersion` all match the load that fetched it. A search keystroke, a type tab or a category or amount change therefore runs one aggregate call and no previous-month statement. A write, a focus refresh, pull-to-refresh, a retry, a month change and an `accountIds` change fetch it again.

## 5. The state keys on the rows' query key

`beginTotalsRequest(queryKey, yearMonth, preserveData)` stamps the key, the month and a request id. The hook re-checks that stamp after the aggregate's await. `resolveTotals` publishes only when both the key and the id still match, and `failTotals` matches on the same pair. A response for an older request or another filter key never overwrites a newer one. A load starts on a change of `activeQueryKey` (a new query object with an equal key starts nothing), a write, a focus behind the staleness gate, or pull-to-refresh. The focus gate compares `totalsQueryKey` with the key at focus.

When a new key resolves scoped figures equal to the held ones, `resolveTotals` keeps the held `current` and `previous` objects, and the screen memoizes the strip on those two objects. A search keystroke that leaves the hero's figures unchanged neither changes their identity nor re-renders the strip (M25).

## 6. The data names the key it was computed for

`totalsQueryKey` names the request in flight. `totals.queryKey` names the key the held data was computed for, and `resolveTotals` sets it. On a same-month key change, `beginTotalsRequest` keeps the previous key's `totals`, including its `days`, `matchCount`, `matchNetEgp` and `queryKey`, until the response lands, so the strip does not blank on every keystroke. After a failed load the held data still names the previous key. MA-092 must gate its zip of `days` with the list sections on `totals.queryKey === activeQueryKey`, never on `totalsQueryKey`.

## 7. `getPeriodTotals` leaves production

No production code calls `getPeriodTotals` any more. It stays exported for its suite, `__tests__/transactions_get_period_totals.test.ts`, and for the agreement suite, until a later ticket removes it.
