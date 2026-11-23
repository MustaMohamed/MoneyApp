# ADR: each monthly result bar is judged against its own month's limit

- **Date:** 2026-11-23
- **Status:** accepted
- **Ticket:** MA-320 (part of #946), plan step 2
- **Decided by:** the ticket's Acceptance and Rules (reviewed 2026-11-23). Composes with
  `docs/adr/2026-10-04-half-cent-zero-and-cent-ties.md` (over decided to the cent) and
  `docs/adr/2026-08-22-money-rounding-layer.md` (round once, at the write).
- **Applies to:** `buildMonthlyResult` in
  `src/modules/budget/screens/budget/category_detail/components/monthly_result_chart.helpers.ts`,
  the bars the Monthly result card on the category detail draws.

## 1. Colour and over, per month

Each bar takes `budgetBandColor(spent, limit)` (`src/modules/budget/utils/budget_summary.ts`)
against that month's own limit, its steps at 50, 80 and 90% unchanged. A bar reads over by the
history row's `status === 'over'`, which `computeStatus` (`budget.helpers.ts`) sets through
`exceedsToCent`, so 3,000 against 3,000 is not over and 3,000.01 is, and a legacy limit of 0 or
less is never over. A month whose limit changed keeps the colour of the limit it had.

## 2. The amount over each bar

The amount prints through `formatAmount(spent)`, the EGP whole unit, as the month ledger it
replaces did. `spent` is the history row's snapped value from `computeCategoryHistory`; the helper
rounds nothing.

## 3. Bar height is a drawing figure

A bar's height is `spent` over the scale times `Size.budgetMonthlyBarMaxHeight`, floored at
`Size.budgetMonthlyBarMinHeight` and rounded to a device pixel. The scale is the larger of the
selected month's limit and every drawn bar's `spent`. A scale of 0 gives every bar the floor. The
limit line sits at the selected month's limit over the same scale. Neither figure is money and
neither is stored.

## 4. The window

The six-bar window lives in `buildMonthlyResult`: the last six history rows when one is the
selected month, else the last five. `computeCategoryHistory` and the stat tiles keep their twelve
month window until MA-323 (#986). This record writes nothing.
