# ADR: The transactions hero prints the scoped aggregate unchanged

- **Date:** 2026-09-24
- **Status:** accepted
- **Ticket:** MA-098, under #547
- **Applies to:** `buildTransactionsHeroModel`, `resolveTransactionsHeroMode` and `computeDeltaPct` in `src/modules/transactions/screens/transactions/transactions.helpers.ts`; `TransactionsHero` in `src/modules/transactions/screens/transactions/components/transactions_hero.tsx`

The top of the transactions tab opens on Out this month, with In, Net and Left of income under it, a rail filled with the share of income spent, and a caption with the days left and last month's Out. Every figure comes from `TransactionMonthAggregate.scoped` for the selected month and `getScopedTotals` for the month before, both scoped by the sheet's account filter alone (the 2026-09-24 transactions-month-aggregate ADR, §2).

## 1. Every figure is the aggregate's, unchanged

The hero reads `scoped.expenseEgp` as Out, `scoped.incomeEgp` as In and `scoped.netEgp` as Net. It adds, subtracts and re-signs nothing. A card credit reduces Out in the aggregate, so a month whose credits exceed its spend prints a negative Out. Transfers and card payments count 0 because the aggregate's reporting sign counts them 0.

## 2. Three percentages round, once each, with `Math.round`

| Figure | Formula |
|---|---|
| Left of income | `Math.round((toCents(In) − toCents(Out)) × 100 / toCents(In))`, a dash when In ≤ 0 |
| Share of income spent | `Math.round(toCents(Out) × 100 / toCents(In))`, no share when In ≤ 0; when Out < 0, whatever In is, no share either: the caption and the rail's label read `Credits exceed expenses` and the rail stays empty |
| Change against last month | `Math.round((toCents(Out) − toCents(last Out)) × 100 / \|toCents(last Out)\|)`, through `computeDeltaPct`; nothing when last month's Out is a dash (§4) or 0 in cents |

All three percentages work in integer cents (`toCents`, `src/utils/money.ts`) and multiply before they divide. Float division first puts a share that sits on a half just under it: In 1,000 Out 1,005 gives `100.49999999999999`, which rounds to 100 on a gold rail instead of 101 in danger, and In 1,000 Out 1,035 prints `−4%` left instead of `−3%`. The user ruled on 2026-09-26 that `buildTotalsPresentation` takes the same order, so the dashboard card's share changes only where it sat on a half. `computeDeltaPct` is shared with the card too, so a dashboard delta that sat on a half moves by one point as well (ruled 2026-09-26). Its cents guard also returns nothing for a float-noise last month such as `1e-13`, where the float form printed a 17-digit percentage.

The hero reads its share from `buildTotalsPresentation`: that one rounded integer drives the rail's width (clamped to 0..100), its danger colour (share > 100), its accessibility label and the `<n>% of income spent` caption. No money value rounds in this layer: the sums stay at the 2 dp the rows persist, and display truncation belongs to the formatter.

## 3. EGP, through the money formatters

The aggregate sums `egp_amount`, so every hero figure is EGP. Each one goes through `formatDisplayMagnitude(value, Currency.EGP)` at `CURRENCY_CONFIG`'s 0 dp, and a negative figure takes `MINUS_SIGN` (U+2212) through `signAmountText`. A negative Left of income takes the same glyph; a percentage that rounds to −0 prints `0%`.

## 4. Last month's Out is a dash when its In and Out are both 0

The aggregate carries no row count for the previous month, so the hero cannot tell a month with no rows from a month whose rows net to zero. Both print `<Mmm> —` (ruled at the /prep review, 2026-09-24).

## 5. Days left is the month's last day minus today, current month only

`today` is an input string, read from the clock by the hook. The count is the last day of the selected month minus today's day of month, floored at 0, the budget screen's convention. Outside the current month the days segment drops. In every month the change against last month follows last month's Out (§6).

## 6. The hero's colours follow frame A1 and the money-colour ADR's decision 5

The hero is a flow surface, a period's income, expense and net totals, so it follows decision 5 of the money-colour ADR (`docs/adr/2026-08-27-money-colour-vocabulary.md:17`), not decision 1's owned/owed rule (ruled 2026-09-26, frame A1). In renders in success. Net prints `+` above 0 in success, `−` below 0 in danger, and neither sign nor colour at 0. The rail fills in success up to 100% spent and in danger past it. Out and Left of income stay neutral.

After last month's Out the caption prints this month's Out against the month before's full Out, not pro-rated, as a whole percentage with an arrow: `4 days left · Aug 7,400 ↑ 137%`. A percentage of 1,000 or more is comma-grouped. Every month compares with the month before it, past months included. It keeps printing after a negative last month and on a month with nothing spent yet, `↓ 100%` (ruled 2026-09-26). It takes `deltaDisplay('expense', …)`'s vocabulary, decision 5's delta chip: up is danger, down is success, 0% a muted flat arrow. A screen reader hears it as one sentence naming the month before in full: `Spent <n>% more than <Month>`, `Spent <n>% less than <Month>` or `Spent the same as <Month>`.
