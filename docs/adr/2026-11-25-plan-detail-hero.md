# ADR: the active plan hero's figure, bar and pace

- **Date:** 2026-11-25
- **Status:** accepted
- **Ticket:** MA-331 (part of #958), plan step 8
- **Decided by:** the ticket's Acceptance, Rules, Copy and Decisions (2026-11-24, 2026-11-25).
  Composes with `docs/adr/2026-08-22-money-rounding-layer.md`,
  `docs/adr/2026-10-04-half-cent-zero-and-cent-ties.md`,
  `docs/adr/2026-08-27-money-colour-vocabulary.md` and
  `docs/adr/2026-11-24-detail-hero-figures.md`.
- **Applies to:** `buildSpendingPlanHero` in
  `src/modules/budget/screens/budget/spending_plans.helpers.ts`, called by
  `buildSpendingPlanDetail` for an active plan only, fed by `useSpendingPlanDetail` in
  `spending_plan_detail/spending_plan_detail.hook.ts`.

## 1. Over

Over is `exceedsToCent(spent, total)`: decided to the cent, never by the sign of the difference.
Spent `0.1 + 0.2` against a total of 0.3 is not over.

## 2. The figure

The figure is `remainingLabel(total - spent).magnitude`, printed through
`formatDisplayAmountParts(…, Currency.EGP)`: EGP's 0 decimals, escalated until a nonzero digit
shows. The code slot reads `EGP`. Within the total the overline reads `Left of <total>`, the
figure is `text1`, and the screen reader reads `1,100 EGP`. The overline total goes through
`formatDisplayAmountParts` too, so it escalates as the amount does: a 0.40 total reads
`Left of 0.40`, not `Left of 0`. Over, the overline reads `Over by`, the figure is `Colors.dark.negative`, and the screen reader reads
`260 EGP over`. Frame D2 reads 1,100 left of 5,000 with 3,900 spent.

The plan card that upcoming and ended plans keep until MA-327 still prints its balance through
`formatAmount`, so a left of 0.40 reads `0.40` on the hero and `0` on that card.

## 3. Percent, bar and tick

The used percent is `wholePercent(spent, total)`. The bar's share is `ratioHeldAtTie(spent, total)`,
so a float tie fills it whole without reading over, and its colour is `budgetBandColor` unchanged:
steps at 50, 80 and 90%, exactly 100% `budgetNear`. Over, the bar is full in `budgetOver`. The tick
sits at `elapsedDays / totalDays`, today counted as elapsed, so day 3 of 4 reads 75% and the last
day reads 1.

## 4. Pace

The pace is `wholePercentGap` of spent over total against `elapsedDays / totalDays`. Positive reads
`<n> pts ahead`, negative `<n> pts under` with the magnitude, zero `On pace`; one point reads `pt`.
The timing after the dot is the Plans row's active timing: `ends today`, `ends tomorrow` or
`<n> days left`.

## 5. Tag

The tag is `derivePlanStatus` with category pressure, as the Plans tab shows it (2026-11-24
ruling): a limited category at Watch or over makes the plan Watch. D2 draws `On track` beside a
Watch limit row, so the device shot differs from the frame there. Its colours are the `limitTag`
recipe over the hero gradient's middle stop, `heroStatusTag`, which category detail's hero shares.

## 6. The day

Every day-derived value, the tag, the day count, the tick and the pace, rebuilds from `loadedOn`,
which `useLocalDayChange` (`spending_plan_detail.hook.ts`) refreshes at local midnight while the
screen stays open.
