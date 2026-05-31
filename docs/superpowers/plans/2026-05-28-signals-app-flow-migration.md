# Signals App Flow Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Zustand with Preact Signals for app boot readiness and onboarding flow state.

**Architecture:** Shared app/domain data uses small class-based stores that own their `signal(...)` refs and dependencies, then export one singleton through a hook facade. Component state uses hook-local `useSignal(...)`. Consumers destructure `{ state, ...actions }` and read signal values with `.value`.

The Babel `@preact/signals-react-transform` plugin handles render tracking, so do not add empty `useSignals()` calls. Async operation state should come from `useAsync(...)` loading/error signal refs instead of hand-managed loading booleans unless the operation state must be global.

**Tech Stack:** Expo Router, React Native, TypeScript strict, `@preact/signals-react`, Jest, oxlint.

---

## Workstream 1: App Global Boot Readiness

**Owner:** Dev agent 1.

**Files:**
- Modify: `store/ready.store.ts`
- Modify: `utils/use_layout_init.hook.ts`
- Modify: `app/_layout.tsx`
- Test: `__tests__/use_layout_init.test.ts`

- [ ] Replace `store/ready.store.ts` Zustand store with Signals.
  - Export `useAppReadyStore()`.
  - Return `{ state: { ready }, markReady, reset }`.
  - Use a module-level `ready = signal(false)`.
  - Provide test helper behavior without `.getState()` / `.setState()`.

- [ ] Update `utils/use_layout_init.hook.ts`.
  - Rename exported hook to `useAppInit()`.
  - Use `const { markReady } = useAppReadyStore()`.
  - Keep startup behavior unchanged: run migrations, call `useOnboardingStore().load()`, mark ready on success or degraded failure, then schedule commitment housekeeping only when onboarding is complete.
  - Keep `useLayoutInit` as a temporary alias only if needed by existing imports during this workstream.

- [ ] Update `app/_layout.tsx`.
  - Read app readiness through `useAppReadyStore()`.
  - Call `useAppInit()`.
  - Use `state.ready.value` when deciding to hide the splash and render the root stack.

- [ ] Update `__tests__/use_layout_init.test.ts`.
  - Remove old `useReadyStore.getState()` assumptions.
  - Assert readiness through the new Signals API or exported reset helper.

- [ ] Run targeted checks:
  - `npm run typecheck`
  - `npm test -- --ci __tests__/use_layout_init.test.ts`
  - `npx oxlint --type-aware --type-check store/ready.store.ts utils/use_layout_init.hook.ts app/_layout.tsx __tests__/use_layout_init.test.ts`

## Workstream 2: Onboarding Flow

**Owner:** Dev agent 2.

**Files:**
- Modify: `modules/onboarding/store/onboarding.store.ts`
- Modify: `store/onboarding.store.ts`
- Modify: `app/index.tsx`
- Modify: `app/(onboarding)/_layout.tsx`
- Modify: `modules/onboarding/screens/onboarding/welcome/welcome.hook.ts`
- Modify: `modules/onboarding/screens/onboarding/add_account/add_account.hook.ts`
- Modify: `modules/onboarding/screens/onboarding/more_accounts/more_accounts.hook.ts`
- Modify: `modules/onboarding/screens/onboarding/ready/ready.hook.ts`
- Test: onboarding-related Jest tests that reference the old Zustand API.

- [ ] Replace `modules/onboarding/store/onboarding.store.ts` Zustand store with Signals.
  - Export `OnboardingStore` plus `useOnboardingStore()`.
  - Return `{ state: { complete, currentStep, baseCurrency }, setStep, setBaseCurrency, completeOnboarding }`.
  - Keep persistence behind `modules/onboarding/repositories/onboarding.repository.ts`.
  - Do not keep a store factory or `__*ForTests` helpers just for tests; mock the repository module and use the public store API.
  - Keep `OnboardingStore.load()` and update signals directly instead of calling `.setState()`.
  - Expose a normal `reset` action only if the store needs local state reset parity with existing stores.

- [ ] Update root compatibility export `store/onboarding.store.ts`.
  - Re-export `useOnboardingStore` and any explicit test helpers.
  - Do not re-export old Zustand APIs.

- [ ] Update root routing and onboarding layout.
  - `app/index.tsx`: remove `useShallow`, call `useOnboardingStore()`, read `state.complete.value` and `state.currentStep.value`.
  - `app/(onboarding)/_layout.tsx`: call `useOnboardingStore()`, read `state.complete.value`.

- [ ] Update onboarding screen hooks.
  - `welcome.hook.ts`: call `useOnboardingStore()` for shared onboarding data/actions.
  - `add_account.hook.ts`: replace onboarding reads/actions only; leave account store as Zustand for now.
  - `more_accounts.hook.ts`: replace onboarding actions only; leave account store as Zustand for now.
  - `ready.hook.ts`: replace onboarding reads/actions only; leave account store as Zustand for now.

- [ ] Update ready completion operation state.
  - Delete the separate `ready.state.ts` manual `completing` flag if it only exists for completion loading.
  - Wrap `completeOnboarding` with `useAsync(...)` inside `ready.hook.ts`.
  - Return `state.completing: complete.isLoading` and have the screen read `state.completing.value`.
  - Keep the double-tap guard by checking `complete.isLoading.value` before invoking the wrapped action.

- [ ] Update onboarding tests.
  - Remove `.getState()`, `.setState()`, `.useState`, and mocked Zustand selector-store expectations for migrated onboarding state.
  - Prefer explicit helpers exported from the store module for reset/setup.

- [ ] Run targeted checks:
  - `npm run typecheck`
  - onboarding Jest tests
  - `npx oxlint --type-aware --type-check modules/onboarding/store/onboarding.store.ts store/onboarding.store.ts app/index.tsx 'app/(onboarding)/_layout.tsx' modules/onboarding/screens/onboarding/welcome/welcome.hook.ts modules/onboarding/screens/onboarding/add_account/add_account.hook.ts modules/onboarding/screens/onboarding/more_accounts/more_accounts.hook.ts modules/onboarding/screens/onboarding/ready/ready.hook.ts`

## Integration

- [ ] Review both workstreams for API conflicts.
- [ ] Run `npm run format:check`.
- [ ] Run `npm run typecheck`.
- [ ] Run targeted Jest tests for layout init and onboarding.
- [ ] Run changed-file oxlint.
- [ ] Commit the integrated migration after review.
