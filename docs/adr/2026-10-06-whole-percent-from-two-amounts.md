# ADR: A whole percent is made once, from two amounts in integer cents

- **Date:** 2026-10-06
- **Status:** accepted
- **Ticket:** #578 (MA-112)
- **Applies to:** `src/utils/money.ts`, `src/modules/transactions/screens/transactions/transactions.helpers.ts`, `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts`, `src/modules/dashboard/screens/dashboard/components/budget_card.tsx`, `src/modules/dashboard/screens/dashboard/components/commitments_card.tsx`, `src/modules/commitments/screens/commitments/components/summary_header.tsx`, `src/modules/budget/screens/budget/budget.helpers.ts`, `src/modules/budget/screens/budget/spending_plans_summary.helpers.ts`, `src/modules/budget/screens/budget/spending_plans.helpers.ts`, `src/modules/budget/screens/budget/spending_plan_timing.helpers.ts`, `src/modules/budget/screens/budget/budget_buckets.helpers.ts`, `src/modules/budget/utils/budget_summary.ts`, `src/modules/accounts/constants/available_credit_color.ts`

Each site divided in floating point and rounded the quotient, so a value on a half or on a boundary landed just under it. `(145 / 1000) * 100` is `14.499999999999998` and printed 14%. `2399.2 / 2999` is `0.7999999999999999`, so 2,399.20 spent of 2,999 printed `80% used` in the 50 to 79% colour. `Math.round` also sent −14.5 to −14 while it sent 14.5 to 15. The user ruled on 2026-10-06 that each site asks one shared helper with its two amounts, and that a value below zero rounds its size and keeps its sign.

## 1. Five helpers in `src/utils/money.ts`

Every argument is a required `number`, none takes `null`, and each returns a `number`.

- `wholePercentOf(numerator: number, denominator: number): number` takes two exact integers: cents, counts or days. Its size is `Math.floor((2 × |numerator| × 100 + |denominator|) / (2 × |denominator|))`, and its sign is the sign of the numerator times the sign of the denominator. It rounds no money.
- `wholePercent(part: number, whole: number): number` is `wholePercentOf(toCents(part), toCents(whole))`.
- `wholePercentGap(part: number, whole: number, elapsed: number, span: number): number` is the whole points between `part / whole`, in money, and `elapsed / span`, in whole counts. With `p = toCents(part)` and `w = toCents(whole)` it is `wholePercentOf(p × span − elapsed × w, w × span)`, and `wholePercentOf(−elapsed, span)` when `w` is `0`.
- `compareToPercent(part: number, whole: number, percent: number): number` takes a whole `percent`. It is `Math.sign(toCents(part) × 100 − toCents(whole) × percent)`, and `-1` when `toCents(whole) <= 0`.
- `compareGapToPoints(part: number, whole: number, elapsed: number, span: number, points: number): number` is `Math.sign((p × span − elapsed × w) × 100 − w × span × points)`, and `-1` when `w <= 0` or `span <= 0`.

The largest product is cents times days times 200, the doubled numerator inside `wholePercentOf` when `wholePercentGap` calls it. It stays exact below 2^53, which holds for a plan under about 1.2 billion EGP over 365 days. `compareGapToPoints` multiplies by 100 and holds to about 2.4 billion.

## 2. The rule

- The size rounds half up: 14.5 prints 15.
- The sign is kept: −14.5 prints −15.
- A size of 0 is unsigned. `wholePercentOf` returns positive `0`, never `-0`, so −0.4 prints `0%` in the neutral colour with the neutral icon where the site has them.
- Nothing to divide by is `0`. A denominator of `0` returns `0`, never `NaN` or `Infinity`, and a site that prints something else for it keeps its own guard in front of the helper (§3).
- A percent is made once, from its two amounts. No site rounds a quotient that floating point already divided, and one figure printed in two places prints the same whole percent in both.
- No percent gains a decimal, a cap or a floor. `100% used` can print with money left and `0% used` with money spent, and the shares of one whole need not sum to 100.

## 3. What each site passes

| Site | Helper | Operands | Nothing to divide by |
|---|---|---|---|
| transactions hero, change against last month, and the dashboard transactions card's three deltas, through `computeDeltaPct` | `wholePercentOf` | cents: this month less last month, over the size of last month | nothing prints at 0 cents |
| transactions hero, share of income spent and Left of income | `wholePercentOf` | cents: Out over In, and In less Out over In | `noIncome` and a dash when In is 0 cents or less |
| dashboard spend delta, `computeDashboardSpendDeltaPct` | `wholePercent` | amounts: this month less last month, over last month | nothing prints unless last month is a cent or more |
| dashboard budget card | `wholePercent` | amounts: spent, budgeted | 0 |
| dashboard commitments card, commitments summary pill | `wholePercentOf` | counts: paid, total | 0 |
| Categories lens: a named budget's used and share, a category row's used, the summary's used | `wholePercent` | amounts | 0, and the summary's label stays `undefined` with nothing planned |
| Plans summary card, used and itemized | `wholePercent` | amounts | 0 |
| plan card `<n>% used` and plan detail `Budget used` | `wholePercent` | amounts: spent, plan total | 0 |
| plan card elapsed marker and plan detail `Time elapsed` | `wholePercentOf` | days: elapsed, total, then clamped to 0..100 | 0 |
| plan pace line and pace insight colour | `wholePercentGap` | amounts and days | a plan total of 0 cents reads the elapsed share as under pace |
| plan allocation chip, detail category row and pressure insight, through the file-local `allocationPercentage` | `wholePercent` | amounts: spent, allocated | an allocation of 0 prints 100 when over and 0 otherwise (ADR 2026-10-04 §4) |
| 50/30/20 summary and contributor share | `wholePercent` | whole-pound amounts | 0 |

`buildSpendingPlanRows` makes `usedPercentage`, `elapsedPercentage` and `pacePoints` once per plan and hands them to the card and the detail, so the card's marker sits at the percent the detail prints as time elapsed. The pace line reads `On pace` at 0 points. The detail's pace insight takes the warning colour only above 0 points, the integer the label reads.

## 4. Steps that compare in cents

| Step | Function | Comparison | An amount exactly on the boundary |
|---|---|---|---|
| budget colour steps at 50, 80 and 90% | `budgetBandColor(spent: number, limit: number)` | `compareToPercent(spent, limit, p) >= 0` | takes the step the boundary opens |
| over a budget | `budgetBandColor` | `exceedsToCent(spent, limit)` | exactly 100% is `budgetNear` (ADR 2026-10-04 §4) |
| 80% warning on a budget, on the month's budget health and on a plan category | `computeStatus`, `computeBudgetHealth`, `isWarning` in `buildSpendingPlanRows` | `compareToPercent(spent, limit, BUDGET_WARNING_PERCENT) >= 0` | warns |
| 10-point pace watch | `derivePlanStatus` | `compareGapToPoints(spent, totalAmount, elapsedDays, totalDays, PACE_WARNING_POINTS) >= 0` | `watch` |
| credit card colour at 50% used | `creditBandColor(balance: number, limit: number)` | positive when `compareToPercent(balance, limit, 50) < 0` | warning |
| credit card colour at 80% used | `creditBandColor` | warning when `compareToPercent(balance, limit, 80) <= 0` | warning |

`budgetBandColor` returns `budgetUnder` for a limit of 0 or less. An unbudgeted 50/30/20 contributor has no limit, and `buildContributorPresentation` gives its ring `budgetNear` directly, the colour it had. `creditBandColor` keeps `CoreTokens.text2` for a limit of 0 or less, then returns negative when `isOverLimit(balance, limit)`, so a limit of 0 cents under a balance of a cent or more stays negative.

A label and its colour come from the same two amounts, and the label rounds where the step does not. 795 spent of 1,000 prints `80% used` in the 50 to 79% colour, and 800 prints it in the 80% colour.

## 5. What keeps a float ratio

Bars, rings and view-model fields keep it. `pct`, `usedPct`, `categorySharePct`, `paceDelta`, `elapsedPct`, `planShareRatio`, `plannedRatio`, `progressRatio` and `creditUtilization` keep their values, and no view model gains a field. `budget_bar.tsx`, the arc of `budget_ring.tsx` and the bar of `account_card.tsx` read them as before, and `ratioHeldAtTie` feeds bars and rings only. The bars of the dashboard budget card, the dashboard commitments card and the commitments summary read the printed whole percent and move with it.

The worked numbers are in `__tests__/utils/money.test.ts`. The sites' cases are in `__tests__/budget.helpers.test.ts`, `__tests__/spending_plans.helpers.test.ts`, `__tests__/budget_buckets.helpers.test.ts`, `__tests__/accounts/available_credit_color.test.ts`, `__tests__/screens/dashboard/dashboard_helpers.test.ts`, `__tests__/screens/transactions/transactions_helpers.test.ts`, `__tests__/screens/dashboard/budget_card.test.tsx`, `__tests__/screens/dashboard/commitments_card.test.tsx` and `__tests__/screens/commitments/summary_header.test.tsx`.
