# ADR: Form schedule previews read the whole schedule through the save's own selection

- **Date:** 2026-11-04
- **Status:** accepted
- **Ticket:** MA-280, under #797
- **Applies to:** `src/modules/commitments/domain/due_date_selection.ts` (`selectNewDueDates`), `src/modules/commitments/repositories/commitment_housekeeping.helpers.ts`, `src/modules/commitments/screens/commitments/commitment_form.helpers.ts`, `src/modules/commitments/screens/commitments/components/ends_sheet.hook.ts`, `src/modules/commitments/screens/commitments/components/ends_sheet.tsx`, `src/modules/commitments/screens/commitments/components/repeats_sheet.hook.ts`, `src/modules/commitments/screens/commitments/components/repeats_sheet.tsx`, `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx`, `src/modules/commitments/store/commitment_form_host.state.ts`, `src/modules/commitments/screens/commitments/commitment_form/`, `src/modules/commitments/screens/commitments/detail/detail.hook.ts`

The commitment form names days and counts before the save writes a row: the Ends sheet's last payment under After and its payments-through count under On a date, the same figures in its track and on the Ends row, and the Repeats sheet's next due day. This record states where those figures come from, how far each reads, and what it counts on edit.

## 1. One selection of new due dates

Every preview takes its dates from `computeDueDates` and passes them through `selectNewDueDates`, the loop `planMissingCommitmentPayments` writes rows with. `selectNewDueDates` keeps the dates in order, skips a date the `existing` set holds, and under After N takes at most N minus the size of that set. The edit save and the housekeeping pass map its result to rows unchanged, so a preview and a write cannot select different dates from the same schedule.

## 2. A preview reads the whole schedule, with a bound of its own

The rows the save writes stop at `generationWindowEnd`, today plus three months (`docs/adr/2026-11-03-commitment-generation-window.md` §1). A preview never reads that window. Each passes `computeDueDates` a bound of its own, since the generator has no default cap (§3 of that record):

- **Ends, After N:** `maxCount` N, the schedule's Starts and cadence read as After N. The last day is the latest of the settled dates and the selected ones.
- **Ends, On a date:** `throughDate` the day, the schedule read as On that day. The count is the settled dates through the day plus the selected ones, so a day earlier than Starts counts the settled rows through it, and 0 with none.
- **Repeats, next day:** `maxCount` is the number of schedule dates through today, plus the number of settled dates, plus 1. The selection is greedy in date order, so the selection over a prefix of the schedule is a prefix of the selection over the whole. Of the settled count plus one schedule dates after today, at most the settled count are held, so the bound reaches the first unpaid date after today whenever the schedule has one. The same bound ends a schedule that never ends, and an On a date schedule with no day picked.

## 3. On edit, the paid and skipped rows are `existing`

The edit save keeps the commitment's paid and skipped rows and regenerates the rest with their due dates as `existing` (`commitment.repository.ts`, `update`). The detail hands those due dates to the form host when it opens the edit sheet, and every preview passes them as `existing`. After N then names the latest row the schedule holds, paid, skipped or new, and On a date counts every row through its day. The next day passes over a settled cycle. The add form holds none (`NO_SETTLED_DUE_DATES`).

## 4. Today

The Repeats next day is the first date after today, today being `toLocalDateString(now)`, the local calendar date, never a UTC slice, as the first-payment footnote reads it. The Ends previews take no today: the last day and the count depend on the schedule and the settled rows alone.
