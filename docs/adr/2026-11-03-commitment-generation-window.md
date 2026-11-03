# ADR: Commitment payment rows run through a rolling window, with no cap

- **Date:** 2026-11-03
- **Status:** accepted
- **Ticket:** #910 (MA-278), under #777 R3
- **Applies to:** `src/modules/commitments/domain/payment_state.ts` (`generationWindowEnd`), `src/utils/compute_due_dates.ts`, `src/modules/commitments/repositories/commitment_housekeeping.helpers.ts`, `src/modules/commitments/repositories/commitment.repository.ts`, `src/modules/commitments/store/commitment.store.ts`

Until this record, generation stopped at 64 rows per commitment. A weekly commitment ran out after about a year and a daily one after two months, so later months read no rows. This record states how far rows now run, who asks for which window, and the cost accepted with it.

## 1. Rows run from the start date through the window end

A commitment's rows run from `start_date` through `generationWindowEnd(yearMonth, today)`, the later of two days:

- today plus three months, keeping today's day of the month clamped to that month's last day, as a monthly schedule clamps its due day: 30 November 2026 reaches 28 February 2027, and 30 November 2027 reaches 29 February 2028;
- the last day of `yearMonth`, the month being read.

`today` is the local calendar date (`toLocalDateString`), never a UTC slice. There is no count cap. The commitment's own end rule bounds the rows: an until-date commitment stops at its end date, an after-N commitment stops at N rows across passes, and a commitment that never ends stops at the window end. A stopped commitment (`is_active` 0) gets no new row on any pass, so the unpaid rows its Stop deleted never return. A due date already held by a paid or skipped row is skipped under the unique pair of commitment and due date.

## 2. Who passes which month

- **App start:** the post-onboarding microtask calls `ensureHousekeepingCurrent()` with no month, so the pass reads the month of now and runs through today plus three months.
- **List focus and month change:** `loadMonthSnapshot` and `loadMonthAggregate` pass the month they read. A month past the covered window runs a pass before the read, even when a pass already ran that day. A pass that fails leaves the month unread: the list shows its load error and the hero its figures error, and the next load runs the pass again.
- **Add:** the write opens the data generation, and the next load runs the pass through that load's month.
- **Edit:** `updateCommitment` regenerates the unpaid rows through the later of the selected month's window and the latest unpaid row it replaces, read in the edit's own transaction before the delete. A cycle a far browse wrote, opened from See all, therefore survives the edit at its new amount.

The store skips a pass only when a landed pass for the same local day and data generation reached a window end on or after the one asked for. It shares in-flight passes by day, generation and window end. A narrower pass that lands after a wider one never lowers the recorded end, and a failed pass records nothing.

## 3. The generator needs a bound

`computeDueDates` has no default cap. Its input requires `maxCount`, `throughDate` (an inclusive `YYYY-MM-DD`), or both. The row writer passes `throughDate`, and the first-payment footnote keeps `maxCount: 1`. The loop also stops when a date is not after the one before it, so a step below one day cannot loop without end.

## 4. The cost accepted

The month picker has no forward bound. A browse years ahead writes every row through that month in one exclusive transaction: for a daily commitment, one row per day. A daily commitment started years back writes thousands of rows in its first pass. Those rows stay until a Stop, since an edit regenerates through them, and every later pass's active due-date read (`getActiveCommitmentDueDates`) loads them, and See all lists every one. A forward bound on the picker, a cap on a far browse and pruning rows on a browse back are out of scope for #910.
