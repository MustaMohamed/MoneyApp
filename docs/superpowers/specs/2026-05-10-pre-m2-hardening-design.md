# Pre-M2 Hardening — Design Spec

**Date:** 2026-05-10
**Status:** Draft (pending plan + approval)
**Owners:** [sarah] sequencing · [tariq] technical · [layla] financial
**Source:** Audit checkpoint conducted 2026-05-10 against M1 codebase.

---

## Overview

A consolidated, scoped set of hardening tasks identified during the M1 audit checkpoint. These items are **not new features** — they close test gaps, upgrade list rendering performance, tighten configuration hygiene, document financial transfer rules with executable tests, and shrink the cold-start splash window by removing redundant preload work.

Out of scope for this doc: budget logic, debt payoff, CC interest accrual — those belong in their own design docs when their feature scope is opened.

---

## Goals

1. Close the M1.5 test gap before M2 features compound it.
2. Migrate list rendering to a more performant primitive before M2 adds more list-heavy screens.
3. Move the currency rate API URL out of store code into a config constant.
4. Lock down the multi-currency `to_amount` transfer rules with explicit test cases against existing-and-correct production code.
5. Shrink cold-start splash duration by removing redundant commitment preload work and deferring housekeeping writes until after first paint.

## Non-Goals

- New product features (Marcus is not involved here).
- Schema changes (no migrations).
- Refactoring stores or screens beyond what the items below require.
- Anything related to budgets, debt, CC interest, or other unscoped M2 features.

---

## Work Items

### 1. Hook & Screen Test Closure (M1.5) — [sarah] + [tariq]

**Context:** `jest.config.js` currently excludes `*.hook.ts` and screen `*.tsx` files from coverage. This was an intentional M1 deferral, recorded in the config comment. Coverage thresholds (80/95/100) are met only because of these exclusions.

**Scope:**

- Add `renderHook` tests for every `*.hook.ts` file in `screens/**`.
- Add screen smoke tests using `@testing-library/react-native` for at least the main route screens (dashboard, transactions, accounts, commitments, settings).
- Remove the corresponding `coveragePathIgnorePatterns` entries from `jest.config.js` once the new tests bring coverage back above thresholds.

**Library guidance:** Use `renderHook` from `@testing-library/react-native` (already in deps). Do not introduce `react-hooks-testing-library` (legacy, unmaintained).

**Acceptance criteria:**

- All `screens/**/*.hook.ts` files have at least one `renderHook` test.
- Main route screens have a smoke test that asserts the screen renders without throwing.
- `jest.config.js` no longer excludes hooks or screens from coverage.
- `npm run test:coverage` passes with the existing 80/95/100 thresholds.

**Risk:** Low. Tests against existing behavior; no production code changes expected unless tests surface a bug.

---

### 2. FlashList Migration — [tariq]

**Context:** Every list screen (transactions, accounts, categories, commitments, dashboard account list) uses RN's `FlatList`. At current dataset sizes (≤30-item pages) this is acceptable, but `@shopify/flash-list` offers significantly better render performance via item recycling and is bundled in Expo Go. Migrating now — before M2 adds more list-heavy screens — is cheaper than later.

**Scope:**

- Add `@shopify/flash-list` to dependencies (verify Expo Go compatibility for the installed Expo SDK version before adding).
- Replace `FlatList` imports from `react-native` with `FlashList` from `@shopify/flash-list` across `screens/**` and global `components/**`.
- Compute and pass `estimatedItemSize` for each list, derived from existing `ms()`-tokenized item heights.
- Verify `keyExtractor` uses stable IDs (UUIDs) where available; document any intentional index-as-key usage (e.g. static numpad).

**Explicit exception — DO NOT TOUCH:** Lists inside `ActionSheet` components must continue to import `FlatList` from `react-native-actions-sheet` (per the patched library workaround documented in CLAUDE.md). The patch handles gesture-handler interception; replacing it will break sheet scroll behavior.

**Acceptance criteria:**

- All non-ActionSheet lists use `FlashList`.
- Each list provides an `estimatedItemSize` value.
- Manual smoke test on Android: scroll dashboard account list, transactions list (with pagination), commitments list, categories list — no visual regressions.
- All existing tests continue to pass.

**Risk:** Medium. `FlashList` has different layout assumptions than `FlatList` (recycled views, no implicit `flex` on items in some cases). Validate visually on at least the transactions list before merging.

---

### 3. Currency API URL → Config Constant — [tariq]

**Context:** `screens/.../currency.store.ts` (around line 11) contains a hardcoded API endpoint:

```ts
const RATE_URL = 'https://open.er-api.com/v6/latest/USD';
```

This couples the store to a specific provider and is awkward to swap or stub. Expo Go has no native `.env` injection without `expo-constants` plumbing, so the lightweight fix is a `constants/config.ts` module.

**Scope:**

- Create `constants/config.ts` exporting at minimum:
  ```ts
  export const Config = {
    currencyRateUrl: 'https://open.er-api.com/v6/latest/USD',
  } as const;
  ```
- Update `currency.store.ts` to import from `Config`.
- Leave existing fallback rate (50) unchanged.

**Acceptance criteria:**

- `currency.store.ts` no longer contains a literal URL.
- Existing currency store tests continue to pass.
- No new test required — the existing mocked fetch covers the integration.

**Risk:** Trivial.

---

### 4. `to_amount` Transfer Rule Test Coverage — [layla]

**Context:** The multi-currency transfer math in `database/transactions.ts` is correct, but the rules are documented only as a comment block in `database/entities/transaction.entity.ts`. Locking them down with explicit Jest cases prevents silent regressions when M2 work touches the transactions layer.

**Scope:** Add the following test cases to `__tests__/database/transactions.test.ts` (or split into a focused new file if the existing file grows unwieldy):

#### Case A — Same-currency transfer

> Given an EGP→EGP transfer of 1000.
> Expect: `to_amount = 1000`, `exchange_rate = 1`, FROM account `current_balance` decreases by 1000, TO account `current_balance` increases by 1000.

#### Case B — Foreign-currency transfer

> Given an EGP account transferring 1000 EGP to a USD account at exchange_rate 0.02 (1 EGP = 0.02 USD).
> Expect: `amount = 1000` (native EGP), `to_amount = 20` (native USD), `exchange_rate = 0.02`, FROM EGP balance −1000, TO USD balance +20.

#### Case C — CC payment, payment ≤ minimum (installment-first satisfaction)

> Given a CC with `revolving_balance = 5000`, `minimum_payment = 500`, and a CC payment of 300.
> Expect: `minimum_payment_snapshot = 500`. The 300 satisfies (part of) the installment due; **`revolving_balance` is unchanged at 5000**. No principal reduction occurs because the payment did not exceed the installment.

> **Financial model note (MENA installment CC / التقسيط):** `minimum_payment` is treated as the scheduled installment due for the period, not as a US-style "minimum to avoid late fees against revolving principal." Payments up to the installment satisfy the installment; only the excess over the installment reduces revolving principal. This matches how installment-style cards (dominant in MoneyApp's target market) report balances on customer statements.

#### Case D — CC payment, payment > minimum (installment-first split)

> Given a CC with `revolving_balance = 5000`, `minimum_payment = 500`, and a CC payment of 800.
> Expect: `minimum_payment_snapshot = 500`. The first 500 satisfies the installment due (no revolving change); the 300 excess reduces revolving principal. Final `revolving_balance = 4700`.

#### Case E — Reversal symmetry

> For each of cases A–D, deleting the transaction must restore both account balances to their pre-transaction state.
> - Cases A, B (transfers): both `current_balance` values restored.
> - Case C (CC payment ≤ min): `revolving_balance` restored to 5000 (was already 5000, no change to undo on revolving; `current_balance` on the CC restored).
> - Case D (CC payment > min): `revolving_balance` restored from 4700 back to 5000.

**Acceptance criteria:**

- All five cases are present as discrete `it(...)` blocks in the transactions test file.
- Each test asserts the post-mutation database row state directly via the repository, not via mocks.
- All cases pass against the **existing** production code unchanged. (If any case fails, that is a bug to surface separately — do not modify production code under this work item without escalating.)

**Risk:** Low for tests themselves. If a case surfaces a real bug, escalate to [layla] + [tariq] before patching.

---

### 5. Defer Commitment Preload from App Startup — [tariq]

**Context:** `utils/use_layout_init.hook.ts` currently runs four commitment-related calls inside the splash gate, before `setReady(true)` fires:

```ts
await commitmentStore.loadCommitments();
await commitmentStore.generatePayments();
await commitmentStore.checkAndDeactivateExpired();
await commitmentStore.loadPaymentsForMonth(currentMonth);
```

Audit findings:

- **Read calls are redundant.** Both consumer screens already reload commitment data on focus:
  - Dashboard reloads payments via `useFocusEffect` (`screens/dashboard/dashboard.hook.ts:91–96`) and via a `useEffect` watching commitment store state (`dashboard.hook.ts:87–89`).
  - Commitments screen reloads via `useFocusEffect` (`screens/commitments/commitments.hook.ts:153–155`).
- **Write calls (housekeeping) don't need to block first paint.** `generatePayments()` schedules new rows; `checkAndDeactivateExpired()` flips status flags. Neither is read by the first reachable screen before the focus-effect fires.
- **Onboarding flow doesn't need any of it.** If `onboardingState.complete === false`, the user lands on `/(onboarding)/welcome`, which never reads commitments. There are also no commitments yet at that point.

**Scope:**

1. Remove all four commitment calls from `useLayoutInit`.
2. Replace with a post-splash housekeeping microtask that runs **only when onboarding is complete**:

   ```ts
   setReady(true);
   if (onboardingComplete) {
     queueMicrotask(async () => {
       const store = useCommitmentStore.getState();
       try {
         await store.generatePayments();
         await store.checkAndDeactivateExpired();
       } catch {
         // housekeeping is best-effort; consumers reload on focus
       }
     });
   }
   ```

   `InteractionManager.runAfterInteractions(...)` is an acceptable alternative if the microtask still contends with the first navigation animation on low-end Android.

3. Do **not** add a post-splash `loadCommitments()` or `loadPaymentsForMonth()` — the existing `useFocusEffect` hooks in dashboard and commitments screens already cover those.

**What stays in the preload (must block splash):**

- `getDb()` — DB must be open before anything reads.
- `runMigrations()` — schema must be at the latest version.
- `loadOnboardingState()` — required to pick the initial route in `app/index.tsx`.
- Font loading (`useFonts`) — first screen renders text immediately.

**Acceptance criteria:**

- `useLayoutInit` no longer awaits any commitment calls inside the splash-gating block.
- Housekeeping (`generatePayments` + `checkAndDeactivateExpired`) runs after `setReady(true)` and is gated on `onboardingComplete === true`.
- Cold-start manual smoke test on Android shows visible improvement in splash duration (no instrumentation required for sign-off; eyeball is fine).
- Dashboard first-paint behavior is unchanged from the user's perspective: `commitmentCounts` and `commitmentTotalsByCurrency` start at zero and update when the focus fetch resolves — same shape as the existing `monthSpend` and `accountStats` flows on dashboard.
- Commitments screen behavior is unchanged: `useFocusEffect` continues to load both commitments and payments on entry.
- Onboarding flow has zero commitment-related work running anywhere — verify by adding a console assertion or by tracing the call graph in code review.
- All existing tests continue to pass. Add a unit test in `__tests__/use_layout_init.test.ts` (new) that verifies the splash gate does not await commitment calls.

**Out of scope for this item:**

- Lazy-loading fonts. All 8 weights are used on first reachable screens (welcome and dashboard both render Sora numerals + Inter labels). No win available.
- Lazy-loading domain stores already loaded on-demand: `currency.fetchRate` (settings only), `loadAccounts`, `loadCategories`, `loadTransactions` — already correctly lazy.

**Risk:** Low. The change removes work rather than adding it. The main failure mode would be a screen that *secretly* depended on commitment data being pre-warmed at app start; the audit found none, but code review must confirm.

---

## Sequencing — [sarah]

Recommended order (smallest blast radius first, biggest last):

| # | Item | Owner | Estimated effort | Blocking? |
|---|---|---|---|---|
| 1 | Currency API URL → config | @dev | XS | No |
| 2 | `to_amount` transfer test cases | @dev (specs from [layla]) | S | No |
| 3 | Defer commitment preload from app startup | @dev | XS | No |
| 4 | Hook & screen test closure | @dev | M | Blocks removal of jest.config exclusions |
| 5 | FlashList migration | @dev | M | Should land last; touches most files |

Items 1–4 can be parallelized across separate PRs. Item 5 should land alone on its own PR for clean revert if a regression surfaces on Android.

**Gate:** Each item lands behind the standard superpowers code-review gate ([tariq] reviews). No item ships without a passing `npm run test:coverage`.

---

## Out of Scope (explicitly deferred)

- **Budget vs. actual aggregation query.** Belongs in the budget feature design doc when budget scope opens.
- **CC revolving balance interest accrual.** Belongs in the debt/payoff feature design doc when that scope opens.
- **Replacing `FlatList` inside ActionSheet components.** Bound to the `react-native-actions-sheet` patch; do not touch.
- **New screens, new categories, new financial features.** This is hardening only.

---

## Review Checklist (before plan is written)

- [ ] [sarah] confirms sequencing and that no M2 work starts before this lands.
- [ ] [tariq] confirms FlashList is Expo Go compatible at the project's current Expo SDK version.
- [ ] [tariq] confirms no consumer outside dashboard / commitments screen depends on commitment data being pre-warmed at app start.
- [ ] [layla] confirms the five `to_amount` test cases cover the full transfer/CC payment matrix.
- [ ] Human approves the spec before [tariq] writes the plan via `anthropic-skills:writing-plans`.
