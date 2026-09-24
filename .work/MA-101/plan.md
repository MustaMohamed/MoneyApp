# MA-101 — Reporting sign fragment: one SQL rule for every query that classifies transactions
base: 4ec4342386ab55d2a5070e24d6a46d46b4b7fd47 · verify: none · flags: money path · expected diff: ~130 lines

## Steps
### 1. The sign rule has one SQL spelling
- File: `src/modules/transactions/database/reporting_sign.ts` (new); `src/database/transactions.ts:1-16` (barrel)
- Change: export `REPORTING_SIGN_SQL = { out, in } as const`, two SQL expressions over the aliases every copy already uses, `transaction_row` and `account_row`. `out` is a multiplier: `CASE WHEN transaction_row.type = 'expense' THEN 1 WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card' THEN -1 ELSE 0 END`. `in`: `CASE WHEN transaction_row.type = 'income' AND account_row.type <> 'credit_card' THEN 1 ELSE 0 END`. Literal type strings, as in the WHERE predicates that stay in the same files. A query sums `(${REPORTING_SIGN_SQL.out}) * <amount column>`; the multiplier form is what lets one expression serve `egp_amount`, `amount` and a row count. Add a third statement to the barrel, `export { REPORTING_SIGN_SQL } from '@/modules/transactions/database/reporting_sign';`; the two existing blocks re-export from `transactions.ts`, and there is no type export.
- Test: `none` · the fragment has no behaviour of its own; step 5 and the four existing suites assert it through the queries.

### 2. Month totals and month expense stats sum by the fragment
- File: `src/modules/transactions/database/transactions.ts` (`getMonthExpenseStats` `:32-49`, `getPeriodTotals` `:319-330`)
- Change: `total` becomes `COALESCE(SUM((out) * transaction_row.egp_amount), 0)`; `egp_native` and `usd_native` become `SUM(CASE WHEN transaction_row.currency = '<EGP|USD>' THEN (out) * transaction_row.amount ELSE 0 END)`; `COUNT(*)` and the WHERE at `:52-57` stay as they are. In `getPeriodTotals`, `income` sums `(in) * egp_amount`, `expense` sums `(out) * egp_amount`; the inclusive range and `netEgp` stay. Same terms in the same order, so every figure is float-identical to today.
- Test: `none` · `__tests__/transaction.query_executor.test.ts:163` and `__tests__/transactions_get_period_totals.test.ts` pass unedited; the negative-expense case at `transactions_get_period_totals.test.ts:177` is the one that proves no clamp crept in.

### 3. The three budget spend queries sum by the fragment
- File: `src/modules/budget/database/budget_stats.ts` (`getCategorySpendByMonth` `:13-18`, `getBudgetSpendByMonth` `:44-49`, `getSpendingPlanSpend` `:98-103`)
- Change: each `spent` becomes `COALESCE(SUM((out) * transaction_row.egp_amount), 0)`. Keep `COALESCE`: under the two LEFT JOINs a budget or plan with no rows now yields `SUM(0 * NULL)`, NULL, where the CASE yielded 0. The `Math.max(0, …)` clamps at `:30,62,118`, the join conditions, the `IN ('expense','income')` predicates and `getTrailingIncomeSuggestion` `:66-87` are untouched. Import from `@/modules/transactions/database/reporting_sign`.
- Test: `none` · `__tests__/budget_stats.query.test.ts`, `__tests__/spending_plans.query.test.ts`, `__tests__/budget.repository.test.ts` and `__tests__/budget.repository.spending_plans.test.ts` pass unedited.

### 4. The dashboard month facts sum and count by the fragment
- File: `src/modules/dashboard/database/dashboard_snapshot.ts` (`getDashboardTransactionFactRows` `:53-77`)
- Change: `income_egp` sums `(in) * egp_amount`; `expense_egp` sums `(out) * egp_amount`; `usd_native` sums `CASE WHEN transaction_row.currency = 'USD' THEN (out) * transaction_row.amount ELSE 0 END`; `transaction_count` sums `CASE WHEN (out) <> 0 THEN 1 ELSE 0 END`. The two `year_month` and `category_id` CASEs, `INDEXED BY idx_transactions_date`, the WHERE, GROUP BY and ORDER BY stay byte-identical.
- Test: `none` · `__tests__/dashboard_snapshot.query.test.ts` passes unedited, including the `EXPLAIN QUERY PLAN` case at `:241`, and `__tests__/dashboard.repository.test.ts`.

### 5. One seeded month proves every query on the fragment agrees with the classifier
- File: `__tests__/reporting_sign.agreement.test.ts` (new)
- Change: none in `src/`.
- Test: `first` · bridge pattern from `__tests__/transaction.query_executor.test.ts:1-60` (`MIGRATIONS` concat, `getExpoSQLiteTestDatabase`, `bridgeBetterSQLite` from `@/test_helpers/sqlite`). Seed: accounts `acc_bank` and `acc_other` (`bank`), `acc_card` (`credit_card`); categories `cat_food`, `cat_salary`; one budget on `cat_food` with `effective_from '2026-05'`; one spending plan `2026-05-01..2026-05-31` with `cat_food` in `spending_plan_categories`. Six rows dated in 2026-05: expense 300 EGP (`cat_food`, `budget_id` the budget), income 1000 EGP on `acc_bank` (`cat_salary`), income 150 EGP on `acc_card` (`cat_food`, the budget), transfer 200 `acc_bank` to `acc_other`, `cc_payment` 400 `acc_bank` to `acc_card`, expense 10 USD at `exchange_rate 50`, `egp_amount 500` (`cat_food`, the budget). Whole-number amounts so sums are exact. Oracle: fold `resolveReportingEffect` (`transaction_policy.ts:339`) over the same six rows, building each command's `source` from the seeded account's type; expected In is the sum of `incomeEgp`, expected Out the sum of `spendingEgp`, expected USD native the sum of `amount` signed by `resolveReportingClass` for `currency = 'USD'`, expected count the rows whose class is `expense` or `card_credit`. Assert, against the fold and not against literals: `getMonthExpenseStats(db, '2026-05')` `totalEgp`, `usdNative`, `count`; `getPeriodTotals(db, {from: '2026-05-01', to: '2026-05-31'})` `incomeEgp`, `expenseEgp`; `getCategorySpendByMonth(db, ['2026-05'])` for `cat_food` against the fold restricted to `cat_food` rows (nets 650, so the clamp is not reached); `getBudgetSpendByMonth(db, ['2026-05'])` and `getSpendingPlanSpend(db, [planId])` the same figure; `getDashboardTransactionFactRows(db, resolveDashboardMonthWindow('2026-05'))` summed over `year_month = '2026-05'` for `income_egp`, `expense_egp`, `usd_native`, `transaction_count`. Imports through `@/database/transactions`, `@/modules/budget/database/budget_stats`, `@/modules/dashboard/database/dashboard_snapshot`. This suite passes at base as well; it guards drift after the move, and the base-vs-head gate for this ticket is the grep in Verification.

### 6. The decision record names the fragment as the rule and the classifier as its reference
- File: `docs/adr/2026-09-24-reporting-sign-fragment.md` (new)
- Change: header bullets as in `docs/adr/2026-09-15-account-lookup-keyed-by-id.md` (Date, Status accepted, Ticket #557 MA-101 under #544, Applies to: the fragment file and the six queries). Sections: the rule in one table (expense +Out, income on a non-card account +In, income on a card account −Out, transfer and cc_payment 0); why a multiplier and not a signed CASE (one expression serves EGP, native and count); `resolveReportingClass` and `resolveReportingEffect` as the reference and `__tests__/reporting_sign.agreement.test.ts` as the proof; what is not the rule and stays (`account_stats.ts:49-52` ledger legs, `budget_stats.ts:74-82` trailing income filter, `transactions.ts:52-55` month expense stats WHERE, `:172-176` search label); the standing rule that a new sum by Out or In outside the fragment is a defect and MA-102 is the first consumer.
- Test: `none` · documentation.

## Non-goals
- The month aggregate query, the shared filter builder, the list state and the hook (MA-102).
- Rendering the hero, the chips and the tally (MA-091, #547); the day cards and their headers (MA-092, #548).
- Moving the four non-copies onto the fragment: the account ledger legs, the trailing income filter, the month expense stats WHERE, the search's Card credit label.
- Replacing `substr(transaction_date, 1, 7)` in the budget queries or any other predicate change; the queries keep the predicates they have.
- A schema change, a migration, a change to `resolveReportingEffect` or its return shape.
- Rounding inside SQL; sums stay over the 2 dp values stored on the rows.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Head-only gate, must list exactly one file: `git grep -l "WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card'" -- src` (lists three files at base).
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The ticket names `__tests__/budgets.query.test.ts` as the budget spend suite; that file tests `budgets.ts`, not `budget_stats.ts`. The suites that prove the three budget figures unchanged are `budget_stats.query.test.ts`, `spending_plans.query.test.ts`, `budget.repository.test.ts` and `budget.repository.spending_plans.test.ts`.
- If oxlint or oxfmt objects to `in` as a property name, rename the two keys (`out`, `inflow`) in step 1 only; nothing else in the plan depends on the spelling.
- If the seeded `categories`, `budgets` or `spending_plans` rows trip a foreign key under better-sqlite3's default `foreign_keys = ON`, seed parents before children in step 5; the migrations define every parent table.
- A float difference between `CASE … THEN -x` and `-1 * x` would show in the existing suites; none is expected, as both are exact for every stored value.
- Amended 2026-09-24, step 1 only: the barrel export is a third `export … from '@/modules/transactions/database/reporting_sign'` statement, because the two existing blocks re-export from `transactions.ts` and a name added there fails typecheck after step 1.

## Self-assessment
Step 4's `transaction_count` is the one I am least sure about. Today it is its own CASE with two `THEN 1` arms; on the fragment it becomes a test on the multiplier, `(out) <> 0`, which is the same set of rows but a different shape from the sums beside it, and an implementer may reach for `ABS(out)` or `COUNT` with a filter instead. Any of the three keeps the dashboard suite green; the invariant is "rows whose Out sign is non-zero", and the plan test at `:241` is unaffected because the SELECT list does not touch the index choice.
