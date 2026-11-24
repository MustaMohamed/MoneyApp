# ADR: the category detail hero's figure, bar and month pace

- **Date:** 2026-11-24
- **Status:** accepted
- **Ticket:** MA-330 (part of #946), plan step 5
- **Decided by:** the ticket's Acceptance, Rules, Copy and Decisions (2026-11-21, 2026-11-23,
  2026-11-24). Composes with `docs/adr/2026-08-22-money-rounding-layer.md`,
  `docs/adr/2026-10-04-half-cent-zero-and-cent-ties.md` and
  `docs/adr/2026-08-27-money-colour-vocabulary.md`.
- **Applies to:** `buildCategoryDetailHero` in
  `src/modules/budget/screens/budget/category_detail/category_detail.helpers.ts`, fed by
  `useCategoryDetail` in `category_detail.hook.ts`.

## 1. Limit and spent

The limit is the sum of the category's budgets in the selected month (`resolveLimitForMonth`),
`null` when the month has none. Spent is the category's whole spending that month, unassigned
spending included (`spendByMonth[id][month]`, 0 when absent). Frame B1 reads 1,850 left of 3,000
from budgets of 2,000 and 1,000, with 1,150 spent.

## 2. The figure

The figure is `remainingLabel(limit - spent).magnitude`, snapped to zero, printed through
`formatDisplayAmountParts(…, Currency.EGP)`: EGP's 0 decimals, escalated until a nonzero digit
shows, so a left of 0.40 reads `0.40` where the tab's `formatAmount` reads `0`. The code slot reads
`EGP`, and the screen reader reads the figure with its code, `1,850 EGP`.

Over is `computeBudgetHealth(spent, limit) === 'over'`, which is `exceedsToCent`: decided to the
cent, never by the sign of the difference. Spent 100.004 against 100 is not over. Over reads the
same on a past, current or future month: the magnitude, the code slot `EGP over`, the figure in
`Colors.dark.negative`, no label line, and the screen reader reads `200 EGP over`. Not over, the
figure is `text1` under a label line: `Left this month`, `Left unspent` or `Left to spend` for the
current, a past or a future month, the month compared with the local day's `YYYY-MM`.

## 3. Percent, bar and tag

The caption's percent is `wholePercent(spent, limit)`. The bar's share is
`ratioHeldAtTie(spent, limit)`, so a float tie (spent `0.1 + 0.2` of 0.3) fills it whole without
reading over, and its colour is `budgetBandColor` unchanged: steps at 50, 80 and 90%, exactly 100%
`budgetNear`, over to the cent `budgetOver`.

The tag on the current and future months reads `computeBudgetHealth`: On track, Watch from 80%
(`BUDGET_WARNING_PERCENT`), Over. A past month reads Over or Within limit, since a closed month has
no pace left to watch. Its colours are the `limitTag` recipe over the hero gradient's middle stop.

## 4. Month pace

On the current month only, the bar's tick sits at `day / daysInMonth` and the caption ends with
`daysInMonth - day` days left: 16 on 14 November, 0 on the month's last day. `day` and the month
come from `useLocalToday`, so both, and which month counts as current, move at local midnight and
on each return to the foreground while the screen stays open. `daysInMonth` is read from the
selected month, so February reads 28 or 29.

## 5. No budget in the month

With `limit` `null`, the figure line reads `No budget this month` in `text1`, with no code, no
label line, no tag and no bar. The group badge stays, and the caption reads the month's spending
through `formatAmount`, `1,150 spent`.

This record writes nothing.
