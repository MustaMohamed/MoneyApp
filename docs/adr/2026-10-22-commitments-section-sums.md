# ADR: Commitments section sums fold the loaded rows leg by leg, as the month aggregate does

- **Date:** 2026-10-22
- **Status:** accepted
- **Ticket:** MA-209, under #777
- **Applies to:** `src/modules/commitments/domain/commitment_section_sums.ts`, `src/modules/commitments/database/commitment_payments.ts` (`getPaymentsByMonth`), `src/modules/commitments/screens/commitments/commitments.helpers.ts`, `src/modules/commitments/screens/commitments/components/commitment_row.helpers.ts`

The commitments list draws a sum in each section header and publishes a tally of the rows a search and the filters match. Both sum rows the screen holds, not the month aggregate (`docs/adr/2026-10-21-commitments-month-aggregate.md`), because a status tab, a search and the filter sheet narrow the rows and the aggregate is not scoped by them. This record states how those sums match the aggregate, and what a USD row's `≈ n EGP` leg converts.

## 1. One fold, the aggregate's legs

`sumCommitmentRowsEgp(rows, rate)` folds the rows the way `getPaymentMonthAggregate` and `computeCommitmentMonthTotals` fold them:

- A paid row adds its transaction's `egp_amount`, 0 when the row has no transaction, and never flags the sum as an estimate.
- An unpaid or skipped row adds `amount_due` to its currency's leg, 0 when it has none. A row on a variable commitment flags the sum, so the header prints `~ {sum}`.
- The USD leg converts once at the live rate, and the total rounds once with `roundMoney`, as `heldEgp` does.

Over the same rows, a section sum and the hero figure for that state agree in `egp` and in the flag. The paid and skipped cases are asserted in `__tests__/commitment_month_aggregate.query.test.ts`.

## 2. The month read carries the paid row's EGP amount

`getPaymentsByMonth` joins `transactions` on `payment.transaction_id`, the join the aggregate reads `paid_egp` through, and returns each row as `CommitmentMonthPayment` with `paid_egp_amount`. It is `null` on an unpaid or skipped row and on a paid row whose transaction is gone. After a Pay, the store patches the row with the `egpAmount` the repository resolved, so the Paid section shows the written amount before the next read.

## 3. The rate comes from the screen hook

The screen hook reads the live rate and passes it down, `undefined` until it has loaded. No domain function or helper reads a store. With a nonzero USD leg and no rate, `sumCommitmentRowsEgp` returns `undefined` and the section header draws its skeleton. A rate that is not finite and positive throws `CommitmentMonthTotalsError`, as the hero does.

## 4. A row's leg converts the amount it prints

`resolveCommitmentRowLegEgp` gives a USD row its `≈ n EGP` leg. A paid row takes its transaction's EGP amount. An unpaid or skipped row converts the amount the row prints, `amount_due ?? commitment.amount`, at the live rate, and draws no leg until the rate loads. The leg stays beside the number it approximates, while the section sum stays beside the hero. A skipped variable row with no estimate can therefore print a leg while it adds 0 to its section.
