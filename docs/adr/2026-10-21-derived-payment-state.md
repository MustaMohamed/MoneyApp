# ADR: A commitment payment's state is derived from its dates, and the stored status goes

- **Date:** 2026-10-21
- **Status:** accepted
- **Ticket:** #778 (MA-204)
- **Applies to:** `src/modules/commitments/domain/payment_state.ts`, `src/database/migrations/022_drop_payment_status.ts`, `src/modules/commitments/database/commitment_payments.ts`, `src/modules/commitments/database/commitments.ts`, `src/modules/commitments/repositories/commitment.repository.ts`, `src/modules/commitments/store/commitment.store.ts`, `src/modules/commitments/screens/commitments/`, `src/modules/dashboard/repositories/dashboard.repository.ts`, `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts`

Housekeeping stamped each payment's `status` once, at insert, against a UTC day, and nothing aged it. A row inserted as `upcoming` stayed `upcoming` after its due date passed, so Overdue was empty for every normally created commitment, and last month's unpaid rows never reached this month (audit H1, H2).

## 1. One function derives the state

`resolvePaymentState(payment, today)` in `src/modules/commitments/domain/payment_state.ts` reads three dates and today, both required, and returns a `CommitmentPaymentStatus`, never `null`:

- `Paid` when `paid_date` is set, whatever `skipped_date` and `due_date` hold.
- Else `Skipped` when `skipped_date` is set.
- Else `Overdue`, `Due` or `Upcoming` as `due_date` is before, on or after `today`, compared as `YYYY-MM-DD` strings.

`today` is the local calendar date, `toLocalDateString` (`src/utils/format_date.ts:40`), never a UTC slice of an ISO timestamp. In Egypt the two differ between local midnight and 02:00. The enum of five states stays as the derived type.

## 2. The status column is dropped

Migration 022 drops `commitment_payments` and creates it again with 007's columns less `status`, the same three foreign keys, and `UNIQUE (commitment_id, due_date)`. It recreates `idx_cp_commitment_id` and `idx_cp_due_date` by those names, because three reads in `src/modules/commitments/database/commitments.ts` name `INDEXED BY idx_cp_commitment_id`, and it adds no `idx_cp_status`. The rebuild keeps no rows: the user ruled a reset, and the app is unpublished.

The ruled reset means wiping the database, not upgrading it. On a database that keeps its rows, 022 drops every payment while each paid expense keeps a `commitment_payment_id` naming a dropped row. The search join (`src/modules/transactions/database/transactions.ts:141`) then reads null for it, "View commitment" on the transaction detail lands on not found, and housekeeping regenerates the paid cycles as unpaid and overdue, payable a second time.

## 3. Two predicates, in SQL and in TypeScript

- Unpaid is `paid_date IS NULL AND skipped_date IS NULL`, and `isUnpaidPayment` in TypeScript. Every guarded write (pay, skip, the account move) and every unpaid read (the next due date, the carried rows) uses it, and the delete that edit calls removes every unpaid row, overdue ones included.
- Paid is `paid_date IS NOT NULL`, and `isPaidPayment`. The last paid row, the paid count and the expiry count use it.

No query orders or filters on a stored status. A skip writes the local calendar date as its `skipped_date`.

## 4. The month read carries unpaid rows

`getPaymentsByMonth(db, yearMonth, today)` returns the rows due in `yearMonth` plus every unpaid row due before `carriedDueBound(yearMonth, today)`, the earlier of the month's first day and today. The two ranges are disjoint. A past month's unpaid row reaches the selected month, and a row not yet due never reads as carried, in a future month included. A paid row reads in its due month only. `getCommitmentsForMonthSnapshot` takes the same `today` and the same two ranges, so every row the payment read returns has its commitment in the snapshot, an inactive one with a carried row included.

The list and the dashboard card count a carried row in Overdue, and leave it out of the month's total, percent and committed amounts (`isDueInMonth`).

## 5. Foreign keys

The three foreign keys carry over from 007 unchanged, with no `ON DELETE`. Each has an app-level guard:

- `commitment_id`: a commitment is never hard-deleted (epic #777, Not building).
- `account_id`: an account is soft-deleted (`is_deleted`, migration 019).
- `transaction_id`: `assertOwnership` (`src/modules/transactions/repositories/transaction.repository.ts:261-262`, called by `delete` at `:377`) refuses to delete a commitment-owned transaction.

**Extended 2026-10-27 (#863, MA-262).** The commitment detail's This cycle card derives its status, day line and amount from the payment and today, on the hero's and the list row's resolvers: `resolvePaymentState` for the tag, `resolvePaymentDayDistance` with `resolveDayIndicator` for the day line, and `resolveDisplayAmount` with `composeCommitmentAmount` for the amount, in `buildCommitmentCycleCard` (`src/modules/commitments/screens/commitments/detail/detail.helpers.ts`). A paid cycle's line takes the success tone at every distance, since red marks only an actionable state.
