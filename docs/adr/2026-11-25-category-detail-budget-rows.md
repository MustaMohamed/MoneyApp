# ADR: a category detail budget row decides over to the cent and Watch only outside a completed month

- **Date:** 2026-11-25
- **Status:** accepted
- **Ticket:** MA-328 (part of #947), plan step 2
- **Decided by:** the ticket's Acceptance and Rules (reviewed 2026-11-25). Composes with `docs/adr/2026-10-04-half-cent-zero-and-cent-ties.md` (over decided to the cent), `docs/adr/2026-08-22-money-rounding-layer.md` (round once, at the write) and `docs/adr/2026-11-24-plan-limit-rows.md` (the plan limit rows' tags).
- **Applies to:** `buildCategoryBudgetsCard` in `src/modules/budget/screens/budget/category_detail/category_detail.helpers.ts`, the rows of the category detail's Budgets card and its Unassigned spending row (MA-333).

## 1. Over and Watch

A row is over through `computeBudgetHealth(spent, limit)`, which decides by `exceedsToCent`, so 1,000.01 against 1,000 is and a float tie such as `0.1 + 0.2` against 0.3 is not. Over tags the row in every lifecycle. Watch is `compareToPercent(spent, limit, BUDGET_WARNING_PERCENT) >= 0` short of over, and tags the row only outside a completed month (`resolveMonthLifecycle`); a completed month's row carries the Over tag or none.

## 2. Colour and percent

The ring takes `NamedBudgetVM.ringColor`, `budgetBandColor(spent, limit)` unchanged, which already reads `budgetOver` on over to the cent for any limit above 0, so the row adds no over branch. The ring's fill is `ratioHeldAtTie(spent, limit)` and `BudgetRing` clamps it at 1, so an over ring draws full. The label keeps the real `wholePercent`, `104%` past the limit. The over word reads in `Colors.dark.negative`, as the plan limit rows do; the left word reads in `text2`.

## 3. The printed amount

Every figure comes from `buildCategoryBudgetRows`, the resolver the budget tab draws its named budgets from, so the order and the per-budget spent, limit and left match the tab by construction. Caption and amount print through `formatAmount`, EGP's 0 dp from `CURRENCY_CONFIG`. The left or over figure is `remainingLabel(limit - spent).magnitude`. The row adds no rounding point.

## 4. The unassigned row

The Unassigned spending row's amount is `CategoryBudgetRowVM.unassignedSpend` from `buildCategoryBudgetRows`, the figure the tab's Unassigned row prints, so the two match by construction. It shows when that figure is above 0, as the tab's row does; with no budget in the month `buildCategoryBudgetRows` returns no row for the category, so there is none. It prints through `formatAmount` at EGP's 0 dp and adds no rounding point. It adds nothing to the header count, which stays the number of named budgets. Its glyph and hollow circle draw in graphite soft (`AcctTokens.graphite.soft`), about 4.3:1 on the card's surface.
