# MA-155 — The account info rows' money math moves to the accounts domain folder
base: ddef743bbd88108c177b80efae88731f778535de · verify: none · flags: money path · expected diff: ~90 lines

## Steps
### 1. The over-limit check lives in `domain/`
- File: `src/modules/accounts/constants/is_over_limit.ts` → `src/modules/accounts/domain/is_over_limit.ts` (`isOverLimit`), by `git mv`, body unchanged
- Change: the three readers name the new path: `src/modules/accounts/utils/account_info_rows.ts:6`, `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts:6`, `__tests__/accounts/is_over_limit.test.ts:1`. `isOverLimit(balance: number, limit: number | null): boolean`, both arguments required, in that order; signature unchanged. No file under `constants/` re-exports it. The readers are from `git grep -n is_over_limit -- src __tests__`; LSP find-references names the same four files.
- Test: `none` · the existing suite `__tests__/accounts/is_over_limit.test.ts` changes its import line only; no case added or edited

### 2. The five derivations exist as domain functions with worked-number tests
- File: `src/modules/accounts/domain/account_figures.ts` (new)
- Change: five exports, pure, no store, no `database/` import (ADR 2026-08-31 §1 `:25-26`); imports are `Currency` from `@/constants/enums`, `convertCurrency` from `@/modules/accounts/domain/account_aggregation`, `roundMoney` from `@/utils/money` (the import `starting_net_position.ts:12` and `transaction_amounts.ts:2` already make from a domain file). Every argument is a required `number`, never `null`; every return is a `number`.
  - `availableCredit(balance: number, limit: number): number`, `Math.max(0, limit - balance)`, today `account_info_rows.ts:113` and `account_card.tsx:61`; the hero's unclamped `limit - balance` at `balance_hero.helpers.ts:39` is only reached when `isOverLimit` is false, so the clamp is a no-op there (both predicates are `limit > 0 && balance > limit`).
  - `dailyAverage(monthOut: number, daysElapsed: number): number`, `monthOut / Math.max(1, daysElapsed)`; the clamp moves in from `account_info_rows.ts:140` so the divisor can never be 0, and the caller passes the clock's day of month unclamped.
  - `netFlow(inflow: number, outflow: number): number`, `inflow - outflow`; one function for the savings change (`:164`) and the week net (`:183`), which are the same arithmetic.
  - `savingsMonthStart(balance: number, monthIn: number, monthOut: number): number`, `Math.max(0, balance - netFlow(monthIn, monthOut))`; the clamp moves in from `:171`.
  - `baseEquivalent(input: { amount: number; from: Currency; to: Currency; rate: number }): number`, `roundMoney(convertCurrency(input))`, the object parameter mirroring `convertCurrency` so `from`/`to` cannot transpose. It rounds once, 2dp banker's; `convertCurrency` itself still does not round (ADR 2026-08-31 §3). It adds no rate validation: a non-positive rate is kept out by the callers' `isRateUsable` gate as today (ADR 2026-09-07 §2), and an unsupported currency throws `AccountAggregationError` from `convertCurrency`.
- Test: `first` · `__tests__/accounts/account_figures.test.ts` (new, logic-only), worked numbers: `availableCredit(4080, 50000) → 45920`, `(1000, 1000) → 0`, `(1500, 1000) → 0` (clamped), `(-100, 1000) → 1100`; `dailyAverage(640.25, 20) → 32.0125`, `(640.25, 0) → 640.25` (one-day floor); `netFlow(1250.75, 640.25) → 610.5` (change), `(90.5, 12.05) → 78.45` (week net), `(12.05, 90.5) → -78.45`; `savingsMonthStart(1000, 1250.75, 640.25) → 389.5`, `(100, 1250.75, 640.25) → 0` (clamped); `baseEquivalent` one case per pair: USD→EGP `100.25 × 48.6 → 4872.15`, EGP→USD `1000 / 48.85 → 20.47`, EGP→EGP `1000` at `rate: 999 → 1000`, USD→USD `100.25` at `rate: 999 → 100.25`, plus a half-even case USD→EGP `0.0425 × 50 = 2.125 → 2.12`, plus `from: 'XXX' as Currency` throws `AccountAggregationError` (type, not message)

### 3. The info rows file formats, labels and dates only
- File: `src/modules/accounts/utils/account_info_rows.ts` (`buildInfoRows`, `buildMonthRows`)
- Change: the six derivation sites call step 2's functions: `:113` `availableCredit(balance, limit)`; `:140-141` `dailyAverage(s.month_out, new Date().getDate())` with the `Math.max(1, …)` gone from this file; `:164-165` `netFlow(s.month_in, s.month_out)` for `change` and `savingsMonthStart(account.current_balance, s.month_in, s.month_out)` for `monthStart`, and `:171` passes `monthStart` unclamped to `amountParts`; `:183` `netFlow(s.week_in, s.week_out)`; `:189-199` `baseEquivalent({ amount: account.current_balance, from: account.currency, to: baseCurrency, rate })` inside the unchanged `isRateUsable && account.currency !== baseCurrency` gate, then `formatOwnedAmountParts(…, baseCurrency)` as today. The `convertCurrency` and `roundMoney` imports leave this file; `isOverLimit` comes from `domain/is_over_limit` (step 1). `buildInfoRows`, `buildMonthRows`, `InfoRow`, `InfoRowKind` keep names, signatures and file; the file re-exports nothing from `domain/`. `nextDueDate` and `new Date().getDate()` stay here: dates are this file's. No string, token or colour changes; the colour and icon still read the sign of `change` and `weekNet`.
- Test: `none` · `__tests__/account_info_rows.test.ts` stays byte-identical and green; it is the behaviour-neutral guard (every string in it, including `'32.0 USD'` on the frozen clock, `'389.50 USD'`, `'+610.50 USD'`, `'20.47 USD'`, `'4,872 EGP'`, must print unchanged)

### 4. The dashboard card's progress colour reads the shared available credit
- File: `src/modules/dashboard/screens/dashboard/components/account_card.tsx:61`
- Change: `const available = availableCredit(account.current_balance, limit)`, imported from `@/modules/accounts/domain/account_figures`; `limit`, `showProgress`, `progressPct` and `progressColor = availableCreditColor(available, limit)` are unchanged. `progressPct` is a ratio, not an amount, and stays inline.
- Test: `none` · `.tsx` with no suite; the Render-suite policy (`.claude/rules/tests.md`) bars a new `.tsx` case for non-render wiring; `npm run typecheck` and step 2's suite cover the call

### 5. The detail hero's available caption reads the shared available credit
- File: `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts:39` (`buildHeroCaption`)
- Change: `const available = availableCredit(account.current_balance, limit)` from `@/modules/accounts/domain/account_figures`; `isOverLimit` from `domain/is_over_limit` (step 1). The caption text, `adjusted` and `color` are unchanged; `Strings.accountHeroAvailable(formatAmount(available, decimals), currency, formatAmount(limit, decimals))` and `availableCreditColor(available, limit)` stay.
- Test: `none` · `__tests__/screens/accounts/balance_hero.helpers.test.ts` is unchanged and green, including `'Available 0 EGP of 1,000'` at balance = limit and `'Available 45,920 EGP of 50,000'`

### 6. The decision record and the two ADRs that name the row builders say where the math lives
- File: `docs/adr/2026-10-04-account-figures-in-domain.md` (new, ~25 lines); `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md` (after `:18`); `docs/adr/2026-09-07-list-caption-reads-card-rows.md:6`, `:8` and `:12`
- Change: the new ADR has the house header (Date 2026-10-04, Status accepted, Ticket #666 (MA-155) under #585, Applies to the five files of steps 1 to 5) and three short sections: (1) the five derivations and their signatures live in `account_figures.ts`, the rows file formats, labels and dates only, `netFlow` serves change and week net; (2) `is_over_limit.ts` moved whole from `constants/` to `domain/`, history kept by `git mv`, no re-export; (3) `baseEquivalent` is the one `roundMoney` on the base-equivalent path, `convertCurrency` still does not round (ADR 2026-08-31 §3), and the rate gate stays `isRateUsable` at the callers (ADR 2026-09-07 §2); strings and the rows suite unchanged. ADR 2026-09-28 gets one paragraph after `:18`: `Extended 2026-10-04 (#666).` the row builders' money derivations left `utils/` for `src/modules/accounts/domain/account_figures.ts` under §1's `domain/` clause, `is_over_limit.ts` moved from `constants/` to `domain/`, pointing at the new ADR. ADR 2026-09-07 `:6` adds `src/modules/accounts/domain/account_figures.ts` to Applies to, and `:8` changes "`buildInfoRows` does all four" to say it formats and labels, and computes, converts and rounds through `account_figures.ts` since #666, and `:12` changes "stays the only place a caption figure is computed or formatted" to "stays the only place a caption figure is formatted; it computes through `account_figures.ts` since #666". One-line comments only in code; no banned method-certification phrases (`npm run lint` checks tracked `.md`).
- Test: `none` · docs; `npm run lint` and `npm run format:check` are the gate

## Decision record
- `docs/adr/2026-10-04-account-figures-in-domain.md`: the account rows' five money derivations and the over-limit check live in `src/modules/accounts/domain/`, the rows file formats only, and `baseEquivalent` is the one rounding on that path; step 6 adds the file.

## Non-goals
- An account balance's sign on the list, picker, onboarding and pay sheet rows: MA-156.
- `availableCreditColor` stays in `constants/`: a colour band, not a money derivation (review.md item 3 decides colour in `.ts` resolvers; its home is not this ticket's).
- `progressPct` in `account_card.tsx:62` stays inline: a utilisation ratio for a bar width, not an amount.
- No rate validation or throw added to `baseEquivalent`; the `isRateUsable` gate at the callers is the protection today and the ticket is behaviour-neutral.
- No lint or structural guard forbidding `roundMoney`/`convertCurrency` in `src/modules/*/utils/`; the ticket's grep is a one-off check, not a rule.
- No barrel, no re-export from `account_info_rows.ts` or from `constants/`.
- `nextDueDate` and the `AccountStats` type stay where they are.
- No copy, token, decimals or layout change; `ACCOUNT_CARD_AVG_DAY_DECIMALS` stays in the rows file as a display constant.

## Untested inputs
- `baseEquivalent` at `rate <= 0`: returns `Infinity`/`NaN` like `convertCurrency` does; no test asserts it because the behaviour is the callers' gate's to prevent and the ticket adds no throw; step 2 states the gate.
- `account_card.tsx`'s call of `availableCredit` is reached by no Jest suite; typecheck and step 2 cover it, step 4.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `__tests__/account_info_rows.test.ts` and `__tests__/screens/accounts/balance_hero.helpers.test.ts` show no diff at hand-off (`git diff --stat origin/main -- __tests__/account_info_rows.test.ts __tests__/screens/accounts/balance_hero.helpers.test.ts` prints nothing).

## Risks
- The hero caption clamp: `availableCredit` clamps at 0 where `balance_hero.helpers.ts:39` does not today; the difference is unreachable because `isOverLimit` short-circuits first on the same predicate, and the hero suite's at-limit case asserts `Available 0`. A future hero that drops the `isOverLimit` branch would silently clamp.
- `netFlow` covering both change and week net reads as one derivation for two Acceptance items; a reviewer wanting two named functions is a naming change, not a plan change.
- Rounding placement: a reviewer may read `roundMoney` inside a domain function as contradicting ADR 2026-08-31 §3; it does not, since `convertCurrency` is unchanged and the rounding only moved from the rows file into a named wrapper, as `starting_net_position.ts` does.
- The 2026-09-28 ADR already carries a "Superseded in part" paragraph; a second amendment paragraph must stay distinct from it and not reopen §1's `src/utils/` reversal.

## Self-assessment
Step 2's shape is the least certain: whether `netFlow` should be one function or two named ones (`savingsChange`, `weekNet`), and whether `baseEquivalent` should validate `rate > 0` and throw the way `resolveTransactionAmounts` does. The plan keeps it behaviour-neutral and leaves the gate at the callers, as ADR 2026-09-07 §2 records, because adding a throw is new behaviour outside this ticket's Rules; a money-rules reader may still ask for it, and that would be a one-line amendment plus one test case rather than a replan.
