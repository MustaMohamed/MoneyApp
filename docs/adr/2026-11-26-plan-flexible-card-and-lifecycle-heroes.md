# ADR: the plan Flexible card and the upcoming and ended heroes

- **Date:** 2026-11-26
- **Status:** accepted
- **Ticket:** MA-327 (part of #958), plan step 7
- **Decided by:** the ticket's Acceptance, Rules, Copy and Decisions (2026-11-21, 2026-11-23,
  2026-11-25). Composes with `docs/adr/2026-11-25-plan-detail-hero.md`,
  `docs/adr/2026-11-24-plan-limit-rows.md`, `docs/adr/2026-08-21-currency-aware-display-decimals.md`
  and `docs/adr/2026-10-04-half-cent-zero-and-cent-ties.md`.
- **Applies to:** `buildSpendingPlanHero` and `buildFlexibleCard` in
  `src/modules/budget/screens/budget/spending_plans.helpers.ts`, `formatPlanDailyAmount` in
  `spending_plan_sheet/spending_plan_sheet.helpers.ts`, and
  `spending_plan_detail/components/spending_plan_detail_flexible_card.tsx`.

## 1. The Flexible card

The flexible amount is `max(buffer, 0)`, the plan total less its category limits, with the buffer
already snapped to zero under half a cent. The card shows when the plan has a category with no limit
or a flexible amount above 0 (2026-11-21). Its header prints the amount through
`formatCurrencyAmount`.

Rows are the categories with no limit, largest spending first, then by name and id. Each prints its
spending through `formatAmount` over `spent`.

## 2. Left or over in flexible

The footer compares the spending in categories with no limit against the flexible amount with
`exceedsToCent`: 1,000.01 against 1,000 is over, `0.1 + 0.2` against 0.3 is not. It prints
`formatAmount` of the magnitude of `flexible - spending`, `Over in flexible` in `negative` when over,
else `Left in flexible` in text1. A flexible amount of 0 with any such spending reads over.

An upcoming plan with a category with no limit has no footer: nothing has been spent against the
amount yet. An upcoming plan whose categories all carry a limit shows the footer at the whole
flexible amount (2026-11-23).

## 3. The upcoming hero

The figure is the plan total under `Planned`. The bar is the grey track at share 0 with no tick,
even when future-dated spending makes the Spent figure non-zero. The per-day amount is
`formatPlanDailyAmount(total, totalDays)`: the total over the inclusive days, unrounded before
`formatDisplayMagnitude`, the same function the plan sheet's daily line calls. Nothing is stored.

## 4. The ended hero

The overline, figure and band-coloured bar follow the active hero (`2026-11-25-plan-detail-hero.md`
§1-§3), with no tick. The tag is `Over` when the plan ended over its total, else `Within limit`, a
tag local to the hero; no `SpendingPlanStatus` value is added, so the Plans card and its counts do
not change.

## 5. The day

The upcoming start count and the ended days since derive from `loadedOn`, which `useLocalDayChange`
in `spending_plan_detail.hook.ts` refreshes at local midnight while the screen stays open.

## 6. What this replaces

The summary card leaves plan detail; every lifecycle draws the hero. The closing paragraph of
`2026-11-25-plan-detail-hero.md` §2, about the card that upcoming and ended plans kept, no longer
applies.
