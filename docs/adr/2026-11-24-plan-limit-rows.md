# ADR: a plan limit row decides over to the cent and Watch only while active

- **Date:** 2026-11-24
- **Status:** accepted
- **Ticket:** MA-326 (part of #958), plan step 4
- **Decided by:** the ticket's Acceptance and Rules (reviewed 2026-11-23). Composes with `docs/adr/2026-10-04-half-cent-zero-and-cent-ties.md` (over decided to the cent) and `docs/adr/2026-08-22-money-rounding-layer.md` (round once, at the write).
- **Applies to:** `buildDetailCategoryRow` in `src/modules/budget/screens/budget/spending_plans.helpers.ts`, the rows of plan detail's Category limits card.

## 1. Over and Watch

A row is over through `exceedsToCent(spent, limit)`, so 1,000.01 against 1,000 is and a float tie such as `0.1 + 0.2` against 0.3 is not. Over tags the row in every lifecycle. Watch is `compareToPercent(spent, limit, BUDGET_WARNING_PERCENT) >= 0` short of over, and tags the row only while the plan is active; an upcoming or ended plan's row carries no Watch tag.

## 2. Colour

The bar takes `budgetBandColor(spent, limit)` unchanged. A limit of 0 with spending is over yet reads `budgetUnder` in the band, so an over row takes `budgetOver` directly.

## 3. The printed amount

Caption and amount print through `formatAmount`, EGP's 0 dp from `CURRENCY_CONFIG`. The left or over figure is `remainingLabel(limit - spent).magnitude`. The row adds no rounding point.