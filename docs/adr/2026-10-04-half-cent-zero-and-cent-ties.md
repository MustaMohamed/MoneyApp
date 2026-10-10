# ADR: A figure under half a cent reads as zero, and over is decided to the cent

- **Date:** 2026-10-04
- **Status:** accepted
- **Ticket:** #673 (MA-158), under #585
- **Applies to:** `src/utils/money.ts`, `src/modules/accounts/domain/account_figures.ts`, `src/modules/accounts/domain/is_over_limit.ts`, `src/modules/accounts/constants/available_credit_color.ts`, `src/modules/accounts/utils/account_info_rows.ts`, `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts`, `src/modules/dashboard/screens/dashboard/components/account_card.tsx`, `src/modules/budget/screens/budget/budget.helpers.ts`, `src/modules/budget/screens/budget/category_detail/components/live_month_card.helpers.ts`, `src/modules/budget/screens/budget/spending_plans.helpers.ts`, `src/modules/budget/screens/budget/budget_buckets.helpers.ts`, `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts`, `src/modules/dashboard/screens/dashboard/components/stat_cards.helpers.ts`, `src/modules/transactions/screens/transactions/transactions.helpers.ts`

The formatters print a figure under half a cent off zero as an unsigned `0` (ADR 2026-08-21 §2.1), while the colour, the icon and the word beside it read the raw float. A month in of 0.30 against expenses of 0.10 and 0.20 leaves a net of `-5.551115123125783e-17`, which printed `0` in the negative colour with the down icon. The same leftover put a spend or a card balance that tied its limit to the cent over it. The dashboard card derived the card's utilisation ratio inline with no lower clamp, so a balance of `-7.105427357601002e-15` gave the bar a negative width, and the colour band derived a second ratio from the available amount.

## 1. Three helpers in `src/utils/money.ts`

Accounts, budget, dashboard and transactions all read them, so no single module owns them and they live in the shared money helpers (ADR 2026-09-28 §1 and its 2026-10-04 amendment). Every argument is a required `number`, and none takes `null`.

- `snapToZero(n: number): number` returns positive `0` when `Math.abs(n) < 0.005` and `n` unchanged otherwise, so `0.005` and `-0.005` are kept. It returns `0` for `-0` too. The gate is half a cent whatever the screen's decimals, so an EGP figure of 0.30 that prints as `0` keeps its own colour (ADR 2026-08-21 §2). It never reads `roundMoney(n) === 0`, because half-even rounding zeroes `0.005`, which prints `0.01`. `__tests__/utils/money.test.ts` holds `snapToZero(v) === 0` to `formatDisplayMagnitude(v, currency).printsAsZero` on values each side of the gate, in EGP and in USD. `normalizeNegativeZero(roundMoney(x))` (`src/modules/accounts/domain/account_aggregation.ts:11`) stays for a total that is rounded first, as at `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts:78-86` and `:228-229`: a value through that pair is `0` or a cent or more off zero, so `snapToZero` returns it unchanged, and the pair also rounds what it keeps and zeroes `0.005`. `snapToZero` is for a figure a screen compares to zero.
- `exceedsToCent(amount: number, limit: number): boolean` is `toCents(amount) > toCents(limit)`, the comparison `sumAllocations` makes on the write path.
- `ratioHeldAtTie(part: number, whole: number): number` returns `0` when `whole` is `0`. Otherwise it returns `part / whole`, except that a quotient above `1` comes back as exactly `1` when `exceedsToCent(part, whole)` is false. It never rounds a quotient at or below `1`, so `budgetBandColor` reads `> 1` only for a part over its whole to the cent and reads every lower band on the quotient it read before.

**Amended 2026-10-06 (#578, MA-112).** `budgetBandColor(spent: number, limit: number)` takes the two amounts and compares them in integer cents, so it reads no quotient, and `ratioHeldAtTie` feeds bars and rings only. `docs/adr/2026-10-06-whole-percent-from-two-amounts.md` §4 records the steps.

## 2. The utilisation ratio is `creditUtilization` in the accounts domain folder

`src/modules/accounts/domain/account_figures.ts` gains its sixth and seventh functions.

- `creditUtilization(balance: number, limit: number): number` is `0` when `limit <= 0` or `balance <= 0`, and `balance / limit` capped at `1` otherwise. It is never below 0 and never above 1, and a balance below zero gives positive `0`. The dashboard card's bar width and the colour band both read it, and `account_card.tsx` no longer calls `availableCredit`.
- `hasFlow(amount: number): boolean` is `snapToZero(amount) > 0`. The month in, month out, month spend and week spend rows take their colour from it.

`netFlow(inflow, outflow)` returns `snapToZero(inflow - outflow)`, so the savings change row, the week net row and `savingsMonthStart` read a net under half a cent as `0`.

`creditBandColor(balance: number, limit: number): string`, in `available_credit_color.ts`, replaces the resolver named for the available amount it took, and takes the card's balance. With `limit <= 0` it keeps `CoreTokens.text2`. Otherwise it reads `used = creditUtilization(balance, limit)`, and `used < 0.5` is positive, `used <= 0.8` is warning and anything above is negative. It compares `used` itself, because `1 - 800 / 1000` is `0.19999999999999996` and would turn exactly 20% available negative. Exactly 20% and exactly 50% available stay warning on a limit of 1,000. Its three callers, `account_info_rows.ts`, `balance_hero.helpers.ts` and `account_card.tsx`, pass `current_balance`.

**Amended 2026-10-06 (#578, MA-112).** `creditBandColor` keeps its signature and its `limit <= 0` line and compares the balance in integer cents: negative when `isOverLimit(balance, limit)`, positive when `compareToPercent(balance, limit, 50) < 0`, warning when `compareToPercent(balance, limit, 80) <= 0`, else negative. Exactly 50% and exactly 80% used stay warning on any limit, 820.08 of 1,025.10 included, and a balance stored as `800.0000000000001` on 1,000 stays warning. It calls `creditUtilization` no more; the dashboard card's bar still reads it.

`isOverLimit(balance: number, limit: number | null): boolean` keeps its signature and its `null` and `<= 0` guards, and its last term is `exceedsToCent(balance, limit)`. A card at `1000.0000000000001` of `1000` reads `Available 0 EGP`, never `Over limit`.

## 3. The figures that arrive snapped

Each figure below passes through `snapToZero` in the pure function that returns it, so the `.tsx` that compares it to zero changed nothing.

| Figure | Returned by | Read by |
|---|---|---|
| the magnitude and the word of a balance | `remainingLabel` | the category rows, the named budget rows, the Categories and Plans summary cards, the plan and plan-category balances |
| `results[].delta`, `results[].spent` and `netBanked` | `computeCategoryHistory` | `stat_tiles.tsx`, `month_ledger.tsx`, `monthly_result_chart.tsx` |
| `unassignedSpend` | `buildCategoryBudgetRows` | `category_budget_row.tsx` |
| `unbudgetedSpend` | `buildBudgetCategoriesSummary` | `summary_card.tsx` |
| `left` | `buildDashboardBudgetSummary` | `budget_card.tsx` |
| the live month card's left figure | `resolveLiveMonthLeftPresentation` | its own text and colour |
| a net of two flows | `netFlow` | the change and week net rows |
| a plan's `buffer` | `buildSpendingPlanRows` | the plan detail's Flexible row and metric, the plan card's allocation footer, and the row's `buffer` field |
| a 50/30/20 contributor's `spent` | `buildBudgetRuleLens` | the bucket's `contributors` list, drawn by `rule_bucket_row.tsx` |

`buildBudgetCategoriesSummary` takes its balance colour from the word `remainingLabel` returns. `computeCategoryHistory` sums `netBanked` from the snapped deltas and snaps the sum. `resolveMonthSpendLeg` and `buildTotalsPresentation` snap the net they are given before they decide, so a month whose spend nets to under half a cent below zero is `spent` at `0`, never `refunded` and never `netCredit`. `lastMonthOutCaption`, the transactions hero's last-month caption, snaps the previous month's expense before comparing it to zero, so a previous month with no income and an expense under half a cent off zero, on either side, prints `Strings.transactionsHeroUnavailable` for its amount as it does at exactly `0`, and an expense of `0.01` keeps its amount.

## 4. Over is decided in integer cents

`computeStatus`, `computeBudgetHealth`, the three `isOver` values in `buildSpendingPlanRows` and the `monthsUnder` count in `computeCategoryHistory` decide on `exceedsToCent`. Their warning thresholds did not change. The named budget's ring, the Categories summary bar, the two plan allocation ratios and the dashboard budget card's `pct` take `ratioHeldAtTie`, so a tie reaches `budgetBandColor` as exactly `1`, the `budgetNear` band. Both allocation sites take `{ isOver, pct }` from one call to the file-local `allocationRatio(spent, allocated)`, which decides over once. An allocation of `0` has a ratio of `1` when its spend is over to the cent and `0` otherwise, and the two percentage labels read the row's `isOver` where they read `spent > 0`. The category row's `usedPct` and the plan's own `pct` stay raw quotients.

**Amended 2026-10-06 (#578, MA-112).** The warning thresholds compare in cents too: `computeStatus`, `computeBudgetHealth` and the plan category's `isWarning` read `compareToPercent(spent, limit, BUDGET_WARNING_PERCENT) >= 0`, and the plan's pace watch reads `compareGapToPoints`. The rings and bars above pass their two amounts to `budgetBandColor`, where a tie to the cent is `budgetNear` because `exceedsToCent` is false. The two percentage labels read the file-local `allocationPercentage(spent, allocated, isOver)`, which prints 100 for an allocation of `0` that is over and 0 otherwise.

## 5. The 50/30/20 bucket cap and summary balance need no gate

`src/modules/budget/screens/budget/budget_buckets.helpers.ts` rounds income, planned and spend to whole pounds through `normalizeRuleAmount` (`:257-259`) before its bucket cap and its summary balance read them, so no figure under half a cent reaches either. A contributor's row is decided at `:601` and `:610`, before `:627-628` round its `spent` to whole pounds, so `buildBudgetRuleLens` snaps the figure where it derives it, at `:599` (§3).

The worked numbers are in `__tests__/utils/money.test.ts`, `__tests__/accounts/account_figures.test.ts`, `__tests__/accounts/available_credit_color.test.ts` and `__tests__/accounts/is_over_limit.test.ts`. The cases at a tie and at 0.01 past it are in `__tests__/account_info_rows.test.ts`, `__tests__/budget.helpers.test.ts`, `__tests__/budget_buckets.helpers.test.ts`, `__tests__/spending_plans.helpers.test.ts`, `__tests__/screens/dashboard/dashboard_helpers.test.ts`, `__tests__/screens/dashboard/stat_cards.helpers.test.ts` and `__tests__/screens/transactions/transactions_helpers.test.ts`.
