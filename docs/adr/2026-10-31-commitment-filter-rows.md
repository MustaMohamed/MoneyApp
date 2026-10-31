# ADR: The commitment filter sums every stored row beside a hero that stays on the month

- **Date:** 2026-10-31
- **Status:** accepted
- **Ticket:** MA-213, under #777
- **Applies to:** `src/modules/commitments/screens/commitments/commitments.store.ts`, `src/modules/commitments/screens/commitments/commitments.helpers.ts`, `src/modules/commitments/screens/commitments/commitments.hook.ts`, `src/components/ui/search_tally.tsx`, `src/components/ui/search_tally.helpers.ts`

See all on a commitment's detail, and the Commitments section of the filter sheet, narrow the list to one commitment across every month. The month snapshot cannot serve that list: it holds one month's rows, and it omits a stopped commitment with no row in that month. This record states what the list sums while that dimension is set, why the hero does not follow, and how the tally names the commitment.

## 1. The list and the tally read every stored row

The filtered list reads `getPaymentsByCommitment` and sums through `sumCommitmentRowsEgp`, the fold of `docs/adr/2026-10-22-commitments-section-sums.md`. A paid row adds its transaction's `egp_amount`. An unpaid or skipped row adds its `amount_due` leg, the skipped row as §1 of that record folds it. An unpaid USD row takes the live rate. Upcoming rows through the end of the generated window count.

The sum prints no `≈`: that mark stays on a row's own leg, and a section sum and the tally print EGP as frame B1 does over a USD row. A `~` still marks a sum holding a variable estimate.

## 2. The hero stays on the month

The hero and the month row keep their month aggregate and selected month while the dimension is set (epic R20). Only the single lit account chip moves the hero. The tally and the hero therefore differ by design: the tally sums one commitment's rows of every month, and the hero sums every commitment's rows of one month. Clearing the dimension returns the list to the month.

## 3. The rows live in the screen store

`commitments.store.ts` holds one read, keyed by commitment id, under a request guard, so a stale load never overwrites a newer one. The list's `payments` publish is the trigger, as on the detail, so a Pay, a Skip or a month reload re-reads the rows with no spinner and one publication per load. No focus loader is added. A failed read of the held id keeps the held rows and floats the refresh error. A failed first read shows the list's first-load error, and a failed month read alone leaves the row skeletons up until the rows land. This read follows `payments`, so a staleness gate on the month's focus reload in `commitments.hook.ts` gates it too.

## 4. The name is the tally's lead

`SearchTallyModel.lead` carries the name, and it alone truncates: `· {n} payments` and the sum stay whole, since a long name must not cost the figures. A model with no `lead` draws and speaks as `docs/adr/2026-09-27-transactions-search-tally.md` states. The line and the sum share one fixed line, so past its width the count and the sum run out of room and the name shows none of itself. Frame A12 prints the count in the tally's body style, the one exception to `.claude/rules/ui.md` § Design System, Typography, where a count is a number.
