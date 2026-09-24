# ADR: The transactions hero prints the scoped aggregate unchanged

- **Date:** 2026-09-24
- **Status:** accepted
- **Ticket:** MA-098, under #547
- **Applies to:** `buildTransactionsHeroModel` and `resolveTransactionsHeroMode` in `src/modules/transactions/screens/transactions/transactions.helpers.ts`; `TransactionsHero` in `src/modules/transactions/screens/transactions/components/transactions_hero.tsx`

The top of the transactions tab opens on Out this month, with In, Net and Left of income under it, a rail filled with the share of income spent, and a caption with the days left and last month's Out. Every figure comes from `TransactionMonthAggregate.scoped` for the selected month and `getScopedTotals` for the month before, both scoped by the sheet's account filter alone (the 2026-09-24 transactions-month-aggregate ADR, §2).

## 1. Every figure is the aggregate's, unchanged

The hero reads `scoped.expenseEgp` as Out, `scoped.incomeEgp` as In and `scoped.netEgp` as Net. It adds, subtracts and re-signs nothing. A card credit reduces Out in the aggregate, so a month whose credits exceed its spend prints a negative Out. Transfers and card payments count 0 because the aggregate's reporting sign counts them 0.

## 2. Two percentages round, once each, with `Math.round`

| Figure | Formula |
|---|---|
| Left of income | `Math.round((In − Out) / In × 100)`, a dash when In ≤ 0 |
| Share of income spent | `Math.round(Out / In × 100)`, no share when In ≤ 0 |

The share is rounded once and that one integer drives the rail's width (clamped to 0..100), its danger colour (share > 100), its accessibility label and the `<n>% of income spent` caption, as `buildTotalsPresentation` does. `computeDeltaPct` rounds the same way. No money value rounds in this layer: the sums stay at the 2 dp the rows persist, and display truncation belongs to the formatter.

## 3. EGP, through the money formatters

The aggregate sums `egp_amount`, so every hero figure is EGP. Each one goes through `formatDisplayMagnitude(value, Currency.EGP)` at `CURRENCY_CONFIG`'s 0 dp, and a negative figure takes `MINUS_SIGN` (U+2212) through `signAmountText`. A negative Left of income takes the same glyph; a percentage that rounds to −0 prints `0%`.

## 4. Last month's Out is a dash when its In and Out are both 0

The aggregate carries no row count for the previous month, so the hero cannot tell a month with no rows from a month whose rows net to zero. Both print `<Mmm> —` (ruled at the /prep review, 2026-09-24).

## 5. Days left is the month's last day minus today, current month only

`today` is an input string, read from the clock by the hook. The count is the last day of the selected month minus today's day of month, floored at 0, the budget screen's convention. Outside the current month the caption is last month's Out alone.
