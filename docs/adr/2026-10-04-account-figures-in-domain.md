# ADR: The account rows' money derivations live in the accounts domain folder

- **Date:** 2026-10-04
- **Status:** accepted
- **Ticket:** #666 (MA-155), under #585
- **Applies to:** `src/modules/accounts/domain/account_figures.ts`, `src/modules/accounts/domain/is_over_limit.ts`, `src/modules/accounts/utils/account_info_rows.ts`, `src/modules/dashboard/screens/dashboard/components/account_card.tsx`, `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts`, `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts`, `src/modules/onboarding/domain/starting_net_position.ts`, `scripts/validate-structural-guards.js`

The account card row builders in the accounts module's `utils/` derived money inline: the available credit, the daily average, the savings month start and change, the week net, and the base equivalent's conversion and rounding. ADR 2026-09-28 §1 sends money math to `domain/`, where `.claude/rules/money.md` loads, and `utils/` is outside that rule's paths. The dashboard card and the account detail hero each derived the available credit a second time.

**Extended 2026-10-04 (#673).** `account_figures.ts` gained a sixth and a seventh function, `creditUtilization` and `hasFlow`, and `netFlow` returns its difference through `snapToZero`, so §1's `inflow - outflow` holds only half a cent or more off zero. `isOverLimit` kept its signature and compares in integer cents through `exceedsToCent`, so the body §2 calls unchanged has changed. The dashboard card reads the balance through `creditUtilization` and no longer calls `availableCredit`, which leaves the last paragraph of §1 true of the detail hero only. `docs/adr/2026-10-04-half-cent-zero-and-cent-ties.md` records all three.

## 1. The five derivations live in `account_figures.ts`

`src/modules/accounts/domain/account_figures.ts` exports five pure functions. The first four take required `number` arguments, `baseEquivalent` takes one object covered in §3, no argument is `null`, and every return is a `number`. The file imports no store, which ADR 2026-08-31 §1 forbids in a `domain/` file, and nothing under `database/`.

- `availableCredit(balance: number, limit: number): number` is `Math.max(0, limit - balance)`.
- `dailyAverage(monthOut: number, daysElapsed: number): number` is `monthOut / Math.max(1, daysElapsed)`. The one-day floor moved in from the rows file, so the divisor is never 0.
- `netFlow(inflow: number, outflow: number): number` is `inflow - outflow`. It serves the savings change and the week net, which are the same arithmetic.
- `savingsMonthStart(balance: number, monthIn: number, monthOut: number): number` is `Math.max(0, balance - netFlow(monthIn, monthOut))`. The clamp at 0 moved in from the rows file.
- `baseEquivalent(input: { amount: number; from: Currency; to: Currency; rate: number }): number` is covered in §3.

`account_info_rows.ts` keeps `buildInfoRows`, `buildMonthRows`, `InfoRow` and `InfoRowKind`, and it formats, labels and dates only. It reads the clock in `nextDueDate` and in `new Date().getDate()`, and passes the day of month to `dailyAverage` unclamped. It re-exports nothing from `domain/`. One row in `scripts/validate-structural-guards.js` fails `npm run lint` when this file names `convertCurrency`, `roundMoney` or `Math` outside a comment, and no row covers another module's `utils/`.

The dashboard card's progress colour and the detail hero's available caption call `availableCredit` too. The hero reaches it only when `isOverLimit` is false, where `limit - balance` is at least 0, so the clamp changes nothing there.

## 2. The over-limit check moved whole to `domain/`

`is_over_limit.ts` moved from `src/modules/accounts/constants/` to `src/modules/accounts/domain/` with `git mv`, so `git log --follow` keeps its history. Its body and its signature, `isOverLimit(balance: number, limit: number | null): boolean`, did not change. Its three readers name the new path, and nothing under `constants/` re-exports it.

## 3. `baseEquivalent` is the one rounding on the base-equivalent path

`baseEquivalent` returns `roundMoney(convertCurrency(input))`, 2dp banker's, once. `convertCurrency` still does not round, as ADR 2026-08-31 §3 decided. The rounding moved from the rows file into a named function.

It has five callers. `buildInfoRows` is one. `computeNetWorth`, `computeLiquidityBreakdown` and `computeLiabilitiesBreakdown` in `dashboard.helpers.ts`, and `resolveStartingNetPosition` in `starting_net_position.ts`, each held the same two calls inline and now take each account's rounded base figure from `baseEquivalent`. Their values and thrown types did not change. `computeNetWorth`, `computeLiquidityBreakdown` and `resolveStartingNetPosition` still round their sums with `roundMoney`, and the two total conversions in `computeNetWorth` stay on `convertCurrency`.

`baseEquivalent` validates no rate, and an unsupported currency throws `AccountAggregationError` from `convertCurrency`. Each caller keeps the protection it had before #666:

- `buildInfoRows` calls it only when `isRateUsable` is true and the account's currency differs from the base, the gate ADR 2026-09-07 §2 records.
- `computeNetWorth` and `resolveStartingNetPosition` return `rate-needed` before any conversion when a foreign account has no usable rate. With no foreign account every pair is same-currency, which `convertCurrency` returns without reading the rate.
- `computeLiquidityBreakdown` and `computeLiabilitiesBreakdown` take the dashboard hook's rate with no gate. The breakdown sheet draws no body on `rate-needed`, as ADR 2026-08-19 §4 records.

Every screen prints the same strings and colours for the same account and stats. `__tests__/account_info_rows.test.ts`, `__tests__/screens/accounts/balance_hero.helpers.test.ts`, `__tests__/screens/dashboard/dashboard_helpers.test.ts` and `__tests__/starting_net_position.test.ts` did not change, and `__tests__/accounts/is_over_limit.test.ts` changed its import line only. The worked numbers for the five functions are in `__tests__/accounts/account_figures.test.ts`.
