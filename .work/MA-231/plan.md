# MA-231 — Month aggregate and its EGP totals
base: 96e0499e1a5a4fec73bb02ebbd57776250b32c4c · verify: none · flags: money path · expected diff: ~210 lines

Files outside tests (6): `src/modules/commitments/database/payment_state_sql.ts` ~4, `src/modules/commitments/domain/commitment_month_totals.ts` ~75, `scripts/validate-money-rounding.js` ~1, `src/modules/commitments/database/commitment_payments.ts` ~65, `src/modules/commitments/repositories/commitment.repository.ts` ~10, `docs/adr/2026-10-21-commitments-month-aggregate.md` ~55. The ticket's `Size:` line missed `payment_state_sql.ts` and the ADR.

## Steps
### 1. A skipped row has an SQL predicate that agrees with `isSkippedPayment`
- File: `src/modules/commitments/database/payment_state_sql.ts` (beside `unpaidPaymentSql`, `paidPaymentSql`, `:6-12`)
- Change: add `skippedPaymentSql(alias?: string): string`, alias optional and never `null`, returning `<alias.>paid_date IS NULL AND <alias.>skipped_date IS NOT NULL`, the SQL form of `isSkippedPayment` (`src/modules/commitments/domain/payment_state.ts:23-25`). A row with both dates set is paid, never skipped.
- Test: `first` · `__tests__/commitment_payment_state.agreement.test.ts`: add `['skipped', skippedPaymentSql, isSkippedPayment]` to `CASES`; its `ROWS` already hold the `both` row.

### 2. The month totals turn an aggregate into EGP figures at a passed rate
- File: `src/modules/commitments/domain/commitment_month_totals.ts` (new); `scripts/validate-money-rounding.js` (`PERMITTED.roundMoney`, `:16-28`)
- Change: export the aggregate types and the totals. Every field below is required and never `null`.
  - `CommitmentPaidBucket { egp: number; count: number }`: a paid row counts its transaction's `egp_amount`, so it has no USD leg and no variable flag.
  - `CommitmentHeldBucket { egp: number; usd: number; count: number; hasVariable: boolean }`: a row's `amount_due` in its `payment.currency` leg, `NULL` adding 0; `hasVariable` is true when any row's commitment is `AmountType.Variable` (`src/constants/enums.ts:44-47`).
  - `CommitmentMonthAggregate { paid: CommitmentPaidBucket; skipped, overdue, due, upcoming, carried: CommitmentHeldBucket }`. `egp` and `usd` are raw SQL sums, unrounded (`docs/adr/2026-09-24-transactions-month-aggregate.md` §3).
  - `CommitmentMonthFigure { egp: number; showTilde: boolean }`, named after `showTilde` in `src/modules/commitments/utils/commitment_status.ts:77`.
  - `CommitmentMonthTotals { leftToPay, committed, paid, skipped, overdue: CommitmentMonthFigure; carriedCount: number; counts: { paid, skipped, overdue, due, upcoming: number } }`.
  - `computeCommitmentMonthTotals(aggregate: CommitmentMonthAggregate, rate: number): CommitmentMonthTotals`. Arguments in that order, both required; `rate` is EGP per USD.
  - Each held bucket's figure is `roundMoney(egp + convertCurrency({ amount: usd, from: Currency.USD, to: Currency.EGP, rate }))` (`src/modules/accounts/domain/account_aggregation.ts:75-89`, rounding as `account_figures.ts:39` does). Paid is `roundMoney(paid.egp)`.
  - `committed = roundMoney(paid + overdue + due + upcoming)`, `leftToPay = roundMoney(committed − paid)`. The `overdue` figure is the carried bucket. Skipped stays out of both sums.
  - `showTilde`: leftToPay and committed take `overdue.hasVariable || due.hasVariable || upcoming.hasVariable`; skipped takes `skipped.hasVariable`; overdue takes `carried.hasVariable`; paid is always `false`.
  - `carriedCount = carried.count`; `counts.overdue = overdue.count + carried.count`; the other four counts are their bucket's `count`.
  - Throws `RangeError` when any held bucket's `usd !== 0` and `rate` is not finite or `<= 0`. Precedent: `.claude/rules/money.md` (a resolver throws on a non-positive rate when USD is involved) and `src/utils/format_amount.ts:212`. With every `usd` at 0, any rate passes.
  - Add `'src/modules/commitments/domain/commitment_month_totals.ts'` under `roundMoney` in `PERMITTED`, in ASCII order: after `budget.repository.ts`, before `commitments/repositories/commitment.repository.ts`.
- Test: `first` · `__tests__/commitment_month_totals.test.ts` (new):
  - At rate 50: paid {1000, 2}; overdue {egp 300, count 1}; due {usd 10, count 1}; upcoming {egp 200, usd 1.5, count 2, variable}; carried {egp 120, usd 2, count 2}; skipped {usd 3, count 1, variable}. Expected: committed 2075 `~`, leftToPay 1075 `~`, paid 1000, skipped 150 `~`, overdue 220, carriedCount 2, counts paid 2, skipped 1, overdue 3, due 1, upcoming 2.
  - USD 10.5 at 48.37 is 507.88: half-even (`roundMoney`).
  - Each flag lights alone from its own bucket. A variable-only paid bucket cannot exist by type.
  - An all-zero aggregate gives every figure 0, no `~`, and every count 0.
  - Rate 0, −1, `NaN` and `Infinity` throw `RangeError` with a USD leg; rate 0 with no USD leg returns the figures.

### 3. One statement returns the month's six buckets, optionally for one account
- File: `src/modules/commitments/database/commitment_payments.ts` (new `getPaymentMonthAggregate`, beside `getPaymentsByMonth`, `:54-76`)
- Change: `PaymentMonthAggregateScope { yearMonth: string; today: string; carriedBefore: string; accountId?: string }`. `yearMonth` is `YYYY-MM`; `today` and `carriedBefore` are `YYYY-MM-DD`; `accountId` is optional and never `null`. Add `getPaymentMonthAggregate(db: SQLiteDatabase, scope: PaymentMonthAggregateScope): Promise<CommitmentMonthAggregate>`, which never resolves `null`.
  - One `getFirstAsync`, as `getTransactionScopedTotals` does (`src/modules/transactions/database/transactions.ts:355-375`).
  - The row set is `getPaymentsByMonth`'s: a month row has `due_date >= monthStart AND due_date < nextMonthStart`, with `nextMonthStart` from `shiftYearMonth(yearMonth, 1)` (`src/utils/year_month.ts:37`). A carried row has `due_date < carriedBefore AND unpaidPaymentSql`. Read them as two `UNION ALL` branches with `commitment_payments payment INDEXED BY idx_cp_due_date` in each (index name from `src/database/migrations/022_drop_payment_status.ts:29`; the `INDEXED BY` pattern is at `src/modules/commitments/database/commitments.ts:31`).
  - Join `commitments commitment ON commitment.id = payment.commitment_id` and `LEFT JOIN transactions transaction_row ON transaction_row.id = payment.transaction_id`. No `is_active` filter, as `getPaymentsByMonth` has none.
  - Buckets over month rows: paid is `paidPaymentSql('payment')`, summing `transaction_row.egp_amount`; skipped is `skippedPaymentSql('payment')`. Over unpaid rows: overdue is `due_date < today`, due is `due_date = today`, upcoming is `due_date > today`. Carried covers carried rows.
  - A held bucket sums `payment.amount_due` into `egp` where `payment.currency` is `Currency.EGP` and into `usd` where it is `Currency.USD`. It never reads `commitment.amount`. `hasVariable` maps a `MAX(...)` 0/1 to a boolean, comparing `commitment.amount_type` to a bound `AmountType.Variable`.
  - Every `SUM` is wrapped in `COALESCE(..., 0)`; a `null` row maps to all-zero buckets.
  - With `accountId`, each branch gets `AND COALESCE(payment.account_id, commitment.account_id) = ?`. Pay writes the paid-from account to `payment.account_id` (`:234`, `MarkAsPaidDetails.account_id: string`), so a paid row matches by it. An unpaid or skipped row falls back as `commitments.hook.ts:124` does. Without `accountId` the clause and its parameter are absent; no `? IS NULL OR`.
  - Import `type CommitmentMonthAggregate` from `../domain/commitment_month_totals`, the database-to-domain type import `:5` already makes.
- Test: `first` · `__tests__/commitment_month_aggregate.query.test.ts` (new). Use `createSeededDatabase` and `bridgeBetterSQLite(getExpoSQLiteTestDatabase(), db)` as `__tests__/transactions_month_aggregate.test.ts:140-149` does, with accounts and transactions from `@/test_helpers/transaction`. Cases, each with `today` passed in:
  - **Four pairs.** Paid rows for EGP→EGP, EGP→USD, USD→EGP and USD→USD sum their transactions' `egp_amount` (200, 200, 500, 485 → 1385), never `amount_paid`.
  - **Legs.** One EGP row and one USD row in each held bucket: overdue, due, upcoming, carried and skipped. Each bucket's `egp` holds its EGP row's `amount_due` alone, and its `usd` holds its USD row's alone.
  - **Late payment.** A row due 2026-05-20 and paid 2026-06-03 counts in 2026-05's `paid`, and 2026-06's `paid` is 0.
  - **States.** May with `today` 2026-05-08: rows on 05-07, 05-08 and 05-09 fall in overdue, due and upcoming.
  - **Month end.** May with `today` 2026-05-31: a row on 05-31 is due, 06-01 is outside, and a row on 2026-04-30 is carried.
  - **Leap February.** A row on 2028-02-29 counts in 2028-02, and is carried in 2028-03 while unpaid.
  - **Carried bound.** The bound is the earlier of month start and `today`: in a past, the current and a future month, an unpaid row counts carried, while paid and skipped earlier rows never do.
  - **Variable.** Put one variable row in each held bucket in turn: overdue, due, upcoming, carried and skipped. Each time, that bucket's `hasVariable` is true and the other four are false. A row with no estimate counts 0, and one with an estimate counts the estimate. A paid variable row counts its transaction amount.
  - **Skipped variable.** A skipped variable row adds its estimate (0 without one) with `skipped.hasVariable` true.
  - **Commitment edit.** Raising the commitment's `amount` after a skip leaves `skipped.egp` unchanged.
  - **Account scope.** A paid row on a commitment whose account is A, paid from B, counts under B and not A. An unpaid row with a `null` `account_id` counts under its commitment's account. An unpaid row with its own `account_id` counts under that account. A skipped row with its own `account_id` B, on a commitment whose account is A, counts in `skipped` under B and not under A.
  - **Empty month.** All buckets are zero and every flag false.
  - **Agreement.** Over one seed, the per-state counts from `resolvePaymentState` over `getPaymentsByMonth(db, ym, carriedDueBound(ym, today))` equal the aggregate's counts.
  - **Plan.** Run `EXPLAIN QUERY PLAN` on the captured SQL, with and without `accountId`. Two `SEARCH payment USING INDEX idx_cp_due_date` lines; no line matches `/SCAN (payment|commitment)\b/`.

### 4. The repository exposes the aggregate with the carried bound applied
- File: `src/modules/commitments/repositories/commitment.repository.ts` (`ICommitmentRepository`, `:76-101`; `CommitmentRepository`); `__tests__/commitment.store.test.ts` (`makeRepository`, `:89-109`)
- Change: add `getMonthAggregate(yearMonth: string, today: string, accountId?: string): Promise<CommitmentMonthAggregate>`. `yearMonth` and `today` are required and never `null`; `accountId` is optional, never `null`, and `undefined` means every account. The return is never `null`. The body calls `getPaymentMonthAggregate(db, { yearMonth, today, carriedBefore: carriedDueBound(yearMonth, today), accountId })`, as `getPaymentsForMonth` does (`:140-143`). It sets no `accountId` key when none is passed. Add `getMonthAggregate: jest.fn()` to the store test stub so typecheck passes. The only other implementer is `CommitmentRepository` (LSP findReferences on `ICommitmentRepository`; grep of `__tests__`).
- Test: `first` · `__tests__/commitment.repository.test.ts`, a new `describe('CommitmentRepository.getMonthAggregate')` beside `:259-269`. `('2026-07', '2026-05-08', 'acc-1')` calls `getPaymentMonthAggregate` with `carriedBefore '2026-05-08'` and `accountId 'acc-1'`, and returns its result. `('2026-05', '2026-05-08')` passes `carriedBefore '2026-05-01'` and no `accountId`.

### 5. The decision record names the aggregate's rules
- File: `docs/adr/2026-10-21-commitments-month-aggregate.md` (new, the shape of `docs/adr/2026-09-24-transactions-month-aggregate.md`)
- Change: Applies to `getPaymentMonthAggregate`, `skippedPaymentSql`, `ICommitmentRepository.getMonthAggregate` and `computeCommitmentMonthTotals`. One section each for:
  - `skippedPaymentSql` as a third predicate beside the two in `docs/adr/2026-10-21-derived-payment-state.md` §3;
  - the row set and the carried bound, shared with `getPaymentsByMonth` (that ADR's §4);
  - the six buckets and what each sums: transaction EGP for paid, the held `amount_due` by currency for the rest;
  - the account rule (`COALESCE`), with the clause absent without an account;
  - `INDEXED BY idx_cp_due_date` in both branches, pinned by the plan case;
  - SQL rounds nothing; the totals round each converted bucket once, then the two derived sums;
  - the `~` flags and the `RangeError` on a bad rate with a USD leg.
- Test: `none` · a document; `npm run lint` checks it for the banned phrases.

## Decision record
- `docs/adr/2026-10-21-commitments-month-aggregate.md`: the commitments hero reads one two-branch aggregate on the due-date index, and the totals convert its USD legs at a passed rate and round each bucket once; step 5 adds the file.

## Non-goals
- The hero model, its caption, the store slot, the load lifecycle and the live-rate read (MA-232). No `commitment.store.ts` or `commitments.hook.ts` change.
- Removing or changing `summarizeMonthPayments` or the dashboard's read of it.
- Formatting, the `~` string, `wholePercent`, or any copy.
- Deduplicating the month-bound arithmetic in `getPaymentsByMonth` and `getCommitmentsForMonthSnapshot`.
- An index on `account_id`, or any migration.

## Untested inputs
- `accountId` as `''` matches no row and is not special-cased (step 3).
- A `yearMonth` or `today` not in `YYYY-MM` / `YYYY-MM-DD` form is outside the contract and not validated (steps 3, 4).
- A paid row with `transaction_id` `NULL` adds 0 to `paid.egp`; Pay links both in one transaction (`commitment_payments.ts:229-272`), so no seed can reach it (step 3).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- With the joins, the planner may still read `commitments` first; the plan case in step 3 fails, and `INDEXED BY` forces the order. A prepare error at `INDEXED BY` means the branch predicate no longer constrains `due_date`.
- MA-232 may expect the ticket's uniform bucket for paid. The narrower `CommitmentPaidBucket` is a compile error there, not a silent zero.
- `roundMoney` on a raw float SQL sum: a stored 2 dp amount summed in floating point can land on an exact-half artefact. The epsilon in `roundMoney` (`src/utils/money.ts:19`) covers it, and step 2's 507.885 case pins it.

## Self-assessment
I am least sure about step 3's query plan. Two `UNION ALL` branches, each joined to `commitments` and `transactions`, under `INDEXED BY`, are what I expect SQLite to plan as two due-date searches. I have not run `EXPLAIN QUERY PLAN` on that shape, and a compound subquery that SQLite will not flatten could add `SCAN` lines for the subquery, so the plan case's regex may need its alias set adjusted. The behaviour cases do not depend on the shape.
