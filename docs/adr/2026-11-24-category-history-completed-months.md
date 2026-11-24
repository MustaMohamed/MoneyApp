# ADR: the category history counts its figures over completed months

- **Date:** 2026-11-24
- **Status:** accepted
- **Ticket:** MA-323 (part of #946), plan step 6
- **Decided by:** the ticket's Acceptance, Rules and Decisions (2026-11-21, 2026-11-23,
  2026-11-24 ×2). Composes with `docs/adr/2026-11-23-category-monthly-result-bars.md`,
  `docs/adr/2026-10-04-half-cent-zero-and-cent-ties.md` and
  `docs/adr/2026-08-22-money-rounding-layer.md`.
- **Applies to:** `computeCategoryHistory` in `src/modules/budget/screens/budget/budget.helpers.ts`
  and `buildMonthFigures` in
  `src/modules/budget/screens/budget/category_detail/components/monthly_result_chart.helpers.ts`.

## 1. The window

`computeCategoryHistory` takes the history rows oldest first, ending at the selected month, and
returns the last `MONTHLY_RESULT_BAR_COUNT` (6) as `results`. Every row keeps its bar: completed,
the month in progress, and every planned month up to a selected future month. When the selected
month has no budget, the hook adds it as an `UnbudgetedMonthResultVM` (`limit`, `delta` and
`status` `undefined`), so it draws beside the latest five budgeted months before it.

## 2. What counts

Avg / mo, Under limit and Net read `completed` rows only. The month in progress and planned months
keep their bars and stay out of all three.

- `monthsCompleted` counts the completed rows; `avgPerMonth` is their mean `spent`.
- `monthsTotal`, `monthsUnder` (`!exceedsToCent(spent, limit)`) and `netBanked` (the snapped sum of
  `delta`) read completed rows that have a limit.
- A completed selected month with no budget counts in Avg / mo and stays out of Under limit and
  Net, since it has no limit to be under and no delta to bank.

## 3. The dash

With `monthsCompleted` 0, Avg / mo reads `–` (U+2013). With `monthsTotal` 0, Under limit and Net
read `–`, Net in the plain figure colour `Colors.dark.text1`. So a completed no-budget month alone
reads its own spending as Avg / mo and the dash for the other two.

## 4. Net's word and colour

`netBanked` is snapped by `snapToZero` before the figure reads it. Below zero it reads
`<amount> over` in `Colors.dark.negative`; at zero or above, `<amount> under` in
`Colors.dark.positive`. The amount prints through `formatAmount`, the EGP whole unit the bar amounts
use, so a net of −0.30 reads `0 over` in the negative colour: the word and the colour follow the
snapped net, not the printed digits.

This record writes nothing.
