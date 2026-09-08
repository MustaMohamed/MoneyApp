# ADR: Deleting an account is a soft delete that keeps its history

- **Date:** 2026-09-08
- **Status:** accepted
- **Ticket:** #386 (MA-020), under epic #378; the delete flow that calls this data layer is #387 (MA-021)
- **Applies to:** `src/database/migrations/019_add_account_is_deleted.ts`, `src/modules/accounts/database/accounts.ts`, `src/modules/accounts/repositories/account.repository.ts`, `src/modules/commitments/database/commitments.ts`, `src/utils/account_name.ts`

Deleting an account marks it, it does not remove it. `AccountRepository.delete` sets `is_deleted = 1`, scrubs the name to `''`, clears the account off every commitment that pointed at it, and touches nothing else — in one transaction. Every transaction the account touched keeps its row and its amounts, and reads "Deleted Account" wherever its name would have shown.

## 1. Soft delete, because a hard delete cannot run and would not be wanted if it could

Five foreign keys reference `accounts` or `transactions` and not one carries an `ON DELETE` clause: `transactions.account_id` (NOT NULL) and `transactions.to_account_id`, `004_create_transactions.ts:11-12`; `commitments.account_id`, `006_create_commitments.ts:22`; `commitment_payments.account_id` and `commitment_payments.transaction_id`, `007_create_commitment_payments.ts:21-22`. The connection runs with `PRAGMA foreign_keys = ON` (`src/database/client.ts:10`), so a `DELETE FROM accounts` throws while any of them points at the row.

Making it succeed would be worse than the throw. The transaction list and every month total inner-join `accounts` for the account type — `src/modules/transactions/database/transactions.ts:51,321`, `src/modules/budget/database/budget_stats.ts:20,76`, `src/modules/dashboard/database/dashboard_snapshot.ts:79`. A removed account row silently drops its transactions out of the list, out of budget spent figures and out of dashboard month totals: money the user really spent stops being counted. Under a soft delete not one of those queries changes.

Records leave one at a time, through the transaction delete the user already has. `TransactionRepository.delete` (`transaction.repository.ts:342-367`) keeps working against the hidden row, because it loads both sides through `getAccountByIdIncludingArchived` and applies the reversal there.

## 2. Balances are never replayed or recomputed

`current_balance` is a stored column with three writers — `applyAccountDelta` (`accounts.ts:45-70`), `setAccountBalance` (`:143-158`) and `addAccount` — and nothing in the tree recomputes it from transaction history. The delete calls none of them and writes neither `current_balance` nor `revolving_balance`, on the deleted account or on any other.

That is the whole correctness argument for the surviving accounts: the money moved and stays moved, so their totals are right precisely because nothing touched them. The deleted account's balance leaves net worth with the account, because every list that feeds net worth filters `is_deleted = 0`.

## 3. The name is scrubbed; the label is decided by the flag

`setAccountDeleted` writes `name = ''` in the same statement that sets the flag, so the old name is stored nowhere. `name` is `NOT NULL` (`001_create_accounts.ts`), which is why the scrub is `''` and not `NULL`.

The label is therefore never read off the name. `resolveAccountName` (`src/utils/account_name.ts`) branches on `is_deleted`: `Strings.deletedAccount` for a deleted account, the name otherwise, and `Strings.unknownAccount` only for an account that did not resolve at all. Those two fallbacks stay distinct on purpose. "Unknown account" also fires on a transient lookup miss — `loadAccountLookup` is one global slot with two writers (audit L27) — and must never tell the user an account was deleted when it was not.

Scrubbing also frees the name. Uniqueness is an app-level check against the loaded list (`add_account.schema.ts:34`, `account_detail.hook.ts:160-162`), and that list excludes deleted rows, so a new account may reuse the name.

A deleted row also stays archived: `setAccountDeleted` never writes `is_archived` and only an archived account reaches it, so `is_deleted = 1` implies `is_archived = 1`, and every list that hides archived accounts (`dashboard.helpers.ts:28,132,174,283`, `account_aggregation.ts:51`, `starting_net_position.ts:44`) hides deleted ones without ever testing `is_deleted`. Any future unarchive must therefore carry `AND is_deleted = 0`, or a deleted account returns to the live list under an empty name.

## 4. Commitments lose the reference; commitment payments keep theirs

A commitment is forward-looking: it says where the next payment will come from, and that account no longer exists, so `clearCommitmentAccount` sets `account_id = NULL` on every commitment that pointed at the account. A commitment payment is history — what was paid, from where — so its `account_id` and `transaction_id` are left exactly as they are. The pay sheet already refuses an unavailable account (`src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts:101-108`) and already falls back when an id outlives its account (`:278-281`), so a cleared commitment degrades into a state the screen handles.

Both writes and the flag live in one `withTransactionAsync`, so a failure leaves the account whole rather than deleted-but-still-referenced.

## 5. The rejected alternative

Adding `ON DELETE` clauses to the five foreign keys, and hard-deleting. It is refused here for two reasons: it needs a table rebuild in SQLite, which is a migration with data-loss risk on every user's database, and even done perfectly it produces the vanished-transactions outcome of §1. The clauses remain a separate decision with its own sign-off, tracked as item 2 of `docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md`, alongside the equivalent question for categories. Nothing in this ticket depends on how it is answered.
