# Zustand Store Rollback And Smooth Transition Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for implementation. Run Tasks 1-6 sequentially unless the main thread explicitly declares two write sets disjoint. Some onboarding files are intentionally revisited by later account-store work. Do not start implementation until this plan has been reviewed and approved. Track progress by changing checkbox lines from `[ ]` to `[x]`.

**Goal:** Start from `main` (the repository uses `main`; no `master` branch exists), roll back the current Preact Signals slices to the legacy Zustand store/state model, keep the current `src/modules/*` structure intact, then reapply the first safe smooth-transition performance fixes.

**History Baseline:** The last clean Zustand shape before Signals is `23d4a4d Refactor application source under src`, followed by the Signals migration commits `151a41a`, `181c832`, and `f8f0882`. Use `23d4a4d` as a pattern source, not as a blind checkout, because current `main` has newer module repositories and tests that must be preserved.

**Architecture:** Canonical stores remain module-local under `src/modules/<domain>/store` or screen-local `*.state.ts` files. Root `src/store/*` stays a compatibility surface. Zustand stores expose reactive values and actions as top-level fields, wrap `create(...)` with `createMoneyAppSelectors(...)`, update with `set((s) => ({ ...s, field }))`, and keep actions available through `useStore.getState().action`. Consumers use `useShallow(...)` for grouped reactive reads and stop reading Preact Signal refs through `.value`.

**Out Of Scope:** No schema changes, no product behavior changes, no MobX work, no module relocation, no push/merge until explicitly requested at the end. Reanimated `.value` reads are not part of this rollback.

---

## Plan Review Checklist

- [x] Review module boundaries and sequencing.
- [x] Review whether each Signals consumer has an owner.
- [x] Review smooth-transition fixes for compatibility with the `main` branch and HeroUI BottomSheet constraints.
- [x] Fix valid review comments before implementation.
- [x] Record review verdict in this plan.

**Review Verdict:** Approved by Tariq after two revision passes. The final plan addresses ownership/sequencing, account race protection, onboarding compatibility exports/tests, freeze scope, add-transaction hook order and state machine, smooth-transition test coverage, and dependency cleanup.

## Task 1: Shared State Infrastructure

**Owner:** shared-state agent

**Files:**
- Modify: `src/store/ready.store.ts`
- Modify: `src/utils/use_async.hook.ts`
- Modify: `src/utils/use_init.hook.ts`
- Modify: `src/utils/use_layout_init.hook.ts`
- Modify: `src/app/_layout.tsx`
- Modify: `__tests__/use_async.hook.test.ts`
- Modify: `__tests__/use_init.hook.test.ts`
- Modify: `__tests__/use_layout_init.test.ts`
- Modify: `__tests__/ready.store.test.ts`

- [x] Restore `ready.store.ts` to a Zustand store with `{ ready, markReady, reset }` and `createMoneyAppSelectors(...)`.
- [x] Keep the public name `useAppReadyStore` to limit churn, but remove the class API. Final reads should use `useAppReadyStore.useState.ready()` or `useAppReadyStore((s) => s.ready)`, and actions should use `useAppReadyStore.getState().markReady()` / `reset()`.
- [x] Replace `useAsync` signal refs with React state-backed status booleans. Keep the augmented callable shape, but expose `asyncFn.isLoading` and `asyncFn.isError` as booleans instead of signal refs.
- [x] Replace `useInit` with a React effect/ref implementation that runs init once per mounted hook and logs async rejection.
- [x] Update root layout/app-init readiness reads from `ready.value` to Zustand values.
- [x] Rewrite helper tests so they assert booleans directly rather than `.value`.
- [x] Verify no Preact Signals imports remain in shared helper/state files.
- [x] Run focused helper tests:

```bash
npm test -- --ci __tests__/use_async.hook.test.ts __tests__/use_init.hook.test.ts __tests__/use_layout_init.test.ts __tests__/ready.store.test.ts --runInBand
```

## Task 2: Onboarding Module Rollback

**Owner:** onboarding agent

**Files:**
- Modify: `src/modules/onboarding/store/onboarding.store.ts`
- Modify: `src/store/onboarding.store.ts`
- Modify: `src/modules/onboarding/index.ts`
- Modify: `src/modules/onboarding/screens/onboarding/add_account/add_account.hook.ts`
- Modify: `src/modules/onboarding/screens/onboarding/more_accounts/more_accounts.hook.ts`
- Modify: `src/modules/onboarding/screens/onboarding/ready/ready.hook.ts`
- Modify: `src/modules/onboarding/screens/onboarding/ready/index.tsx`
- Modify: `src/modules/onboarding/screens/onboarding/welcome/welcome.hook.ts`
- Modify: `src/modules/onboarding/screens/onboarding/welcome/index.tsx`
- Modify: `src/app/index.tsx`
- Modify: `src/app/(onboarding)/_layout.tsx`
- Modify: related onboarding tests under `__tests__/`

- [x] Convert the onboarding store back to a Zustand factory while preserving the current `OnboardingRepository` module boundary and its `load()` normalization behavior.
- [x] Final exports: `createOnboardingStore(repo)`, `useOnboardingStore`, and an `init` action on the store that loads repository state, sets Zustand fields, and returns `{ complete, step }` for app startup.
- [x] Update `src/store/onboarding.store.ts` and `src/modules/onboarding/index.ts` compatibility exports to expose the Zustand factory/store API, not `OnboardingStore` class exports.
- [x] Update tests that instantiate `new OnboardingStore(...)` to instantiate `createOnboardingStore(repo)` instead.
- [x] Keep `loadOnboardingState()` only if a current consumer still needs that exact top-level function after `use_layout_init` is updated; otherwise remove/avoid it.
- [x] Replace onboarding `state.complete.value`, `state.currentStep.value`, and `state.baseCurrency.value` reads with Zustand selectors or plain values.
- [x] Replace `complete.isLoading.value` and `completing.value` reads with the new React-state-backed `useAsync` booleans.
- [x] Convert the welcome screen's local selected-currency signal to React state or existing screen-state conventions.
- [x] Do not convert `useAccountStore().state.accounts.value` reads in these onboarding hooks in this task; Task 3 owns account-store consumer conversion. This means Task 2 and Task 3 must not run in parallel.
- [x] Keep onboarding business rules unchanged: N1 default, N2 requires an account, N3 skippable after N2, completion only on ready CTA.
- [x] Run focused onboarding tests.

## Task 3: Accounts Domain Store Rollback

**Owner:** accounts-store agent

**Files:**
- Modify: `src/modules/accounts/store/account.store.ts`
- Modify: `src/store/account.store.ts`
- Modify: `src/utils/use_layout_init.hook.ts`
- Modify: `__tests__/use_layout_init.test.ts`
- Modify: `src/app/(app)/_layout.tsx`
- Modify: `src/modules/accounts/screens/accounts/add_account/add_account.hook.ts`
- Modify: `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts` for account-store API reads only; Task 4 owns local UI state in the same hook later.
- Modify: cross-module account consumers in:
  - `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`
  - `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`
  - `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts`
  - `src/modules/transactions/screens/transactions/transactions.hook.ts`
  - `src/modules/transactions/screens/transactions/filter/filter.hook.ts`
  - `src/modules/transactions/screens/transactions/detail/detail.hook.ts`
  - `src/modules/commitments/screens/commitments/add_commitment/add_commitment.hook.ts`
  - `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts`
  - `src/modules/commitments/screens/commitments/detail/detail.hook.ts`
  - `src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts`
  - `src/modules/onboarding/screens/onboarding/add_account/add_account.hook.ts`
  - `src/modules/onboarding/screens/onboarding/more_accounts/more_accounts.hook.ts`
  - `src/modules/onboarding/screens/onboarding/ready/ready.hook.ts`
- Modify: `__tests__/account.store.test.ts`
- Modify: related hook tests under `__tests__/`, including account add/detail tests if their account-store mocks need the new Zustand API.

- [x] Convert `AccountStore` class/signals back to the legacy Zustand factory shape: `createAccountStore(repo)`, `accounts`, `hasLoaded`, `loadAccounts`, mutation actions, and `reset`.
- [x] Preserve the current repository singleton import style if it changed since `23d4a4d`; use history only for the Zustand structure.
- [x] Preserve the current load race protection in the Zustand factory: older `loadAccounts()` results must not overwrite newer results, and a pending load must not write after `reset()`.
- [x] Keep/adapt account tests for "older load cannot overwrite newer load" and "pending load cannot write after reset".
- [x] Replace `useAccountStore().state.accounts.value` consumers with Zustand selectors.
- [x] Replace `init()` calls with `loadAccounts()` in startup and screen hooks, or keep a compatibility `init` action only if it is needed to reduce churn and is tested.
- [x] Ensure cross-module consumers do not subscribe to more account store fields than needed.
- [x] Run account store and account-hook tests.

## Task 4: Account Detail Local State Rollback

**Owner:** account-detail agent

**Files:**
- Modify: `src/modules/accounts/screens/accounts/detail/account_detail.state.ts`
- Modify: `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts`
- Modify: `src/modules/accounts/screens/accounts/detail/index.tsx`
- Modify: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state.ts`
- Modify: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.tsx`
- Modify: related account detail tests under `__tests__/`

- [x] Restore account detail UI state to a screen-local Zustand store.
- [x] Restore adjust balance sheet UI state to a component-local Zustand store.
- [x] Remove `.value` reads from account-detail consumers while leaving Reanimated shared values untouched elsewhere.
- [x] Keep the existing screen hook return shape: `{ state: { ...reactive values... }, ...flat actions }`.
- [x] Run focused account detail tests.

## Task 5: Signals Dependency And Config Cleanup

**Owner:** cleanup agent

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `babel.config.js`

- [x] Remove `@preact/signals-react` and `@preact/signals-react-transform`.
- [x] Remove the Babel Signals transform while keeping `react-native-worklets/plugin` last.
- [x] Prefer `npm uninstall @preact/signals-react @preact/signals-react-transform` so `package-lock.json` is updated mechanically; if that command cannot run, edit dependency entries and lockfile changes through the package manager as soon as available.
- [x] Verify `babel.config.js` still lists `react-native-worklets/plugin` last after removing the Signals transform.
- [x] Run a targeted search and confirm no application/test imports remain:

```bash
rg -n "@preact/signals-react|useSignal|useSignals|useSignalEffect|signal\\(" src __tests__ package.json package-lock.json babel.config.js
```

## Task 6: Smooth Transition Performance Fixes

**Owner:** smooth-transitions agent

**Files:**
- Modify: `src/app/_layout.tsx`
- Modify: `src/app/(app)/_layout.tsx`
- Modify: `src/app/(app)/(tabs)/_layout.tsx`
- Modify: `src/app/(app)/(tabs)/dashboard/_layout.tsx`
- Modify: `src/app/(app)/(tabs)/transactions/_layout.tsx`
- Modify: `src/app/(app)/(tabs)/commitments/_layout.tsx`
- Modify: `src/app/(app)/(tabs)/budget/_layout.tsx`
- Modify: `src/app/(app)/settings/_layout.tsx`
- Verify: `src/app/(onboarding)/_layout.tsx`
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Modify: `src/modules/commitments/screens/commitments/commitments.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/index.tsx`
- Create: `src/utils/run_after_interactions.ts`
- Create: `__tests__/utils/run_after_interactions.test.ts`
- Create: `__tests__/screens/transactions/transaction_form/add_transaction_sheet.test.ts`
- Modify: `__tests__/screens/dashboard/dashboard_hook.test.ts`
- Modify: `__tests__/screens/budget/budget_month_rollover.hook.test.ts`
- Modify: `__tests__/screens/commitments.hook.test.ts`

- [x] Enable `react-native-screens` freeze support at app startup using `enableFreeze(true)` if the installed package exports it.
- [x] Set `freezeOnBlur: true` on these supported navigators:
  - root stack in `src/app/_layout.tsx`
  - app stack in `src/app/(app)/_layout.tsx`
  - main tabs in `src/app/(app)/(tabs)/_layout.tsx`
  - nested dashboard, transactions, commitments, budget, and settings stacks listed above
- [x] Verify onboarding stack keeps its existing `freezeOnBlur: true`. If TypeScript rejects `freezeOnBlur` for any layout option type, document the unsupported navigator and leave that one unchanged rather than weakening types.
- [x] Add a small `runAfterInteractions` helper around `InteractionManager.runAfterInteractions` with cancellation support and tests.
- [x] Defer non-critical focus reloads in dashboard, budget, and commitments until after navigation interactions finish.
- [x] Keep pull-to-refresh and explicit user actions immediate.
- [x] Avoid mounting expensive add-transaction sheet body and nested picker sheets while the add sheet is closed.
- [x] Implement the add-transaction safe state machine:
  - use an outer shell/state-machine component for mount/open/close state and a separate inner component that owns `useAddTransaction`
  - never call `useAddTransaction` conditionally inside the same component render path
  - when `visible=false` and no pending open exists, render nothing for the add sheet and all nested pickers
  - when a FAB/requested open arrives, mount the `Sheet` once with `isOpen={false}` and without the expensive `useAddTransaction` body/pickers
  - after one commit, flip the sheet to `isOpen={true}` and mount `useAddTransaction`, `TransactionFormBody`, and nested pickers
  - on close, call the existing close action and unmount expensive body/pickers after the close path completes
  - never add a generic lazy `Sheet` wrapper API
- [x] Add/keep focused smooth-transition tests:
  - `runAfterInteractions` schedules callbacks after interactions
  - cancellation prevents the scheduled callback
  - focus-effect cleanup cancels pending dashboard/budget/commitments reload work
  - pull-to-refresh/explicit refresh paths still invoke reloads immediately
  - add-transaction sheet does not call `useAddTransaction` or mount nested picker sheets while closed, and uses the closed-first open sequence
- [x] Run focused smooth-transition tests.

```bash
npm test -- --ci __tests__/utils/run_after_interactions.test.ts __tests__/screens/transactions/transaction_form/add_transaction_sheet.test.ts __tests__/screens/dashboard/dashboard_hook.test.ts __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/commitments.hook.test.ts --runInBand
```

## Task 7: Module Reviews And Integration

**Owner:** main thread / Tariq reviewer

- [x] After each module agent finishes, inspect `git diff` for that module.
- [x] Run that module's focused tests before accepting the module.
- [x] Request a targeted review for the module result and fix valid findings before starting the next dependent module.
- [x] Keep unrelated user/worktree changes intact.

## Task 8: Full Verification Before PR

- [x] Run format check.
- [x] Run lint.
- [x] Run typecheck.
- [x] Run unit tests in CI mode.
- [x] Run expo-doctor.
- [x] Run Android prebuild dry-run.
- [x] Confirm the repository is free of Preact Signals imports/usages outside lockfile history.
- [ ] Commit once verification is green.
- [ ] Push only after explicit user request or as part of the user's already requested PR creation step.
- [ ] Create PR.
- [ ] Run a full code review of the PR and fix valid findings.

## Verification Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test -- --ci
npx --yes expo-doctor
npx expo prebuild --no-install --platform android
```

## Device QA Gate

Manual device QA is still required before merge because the smooth-transition work targets animation and focus timing. Device QA should cover: cold start, onboarding redirects, tab switches, FAB add-transaction open/close, nested account/category pickers, dashboard refresh, budget focus, commitments focus, and account detail edit/adjust/archive flows.
