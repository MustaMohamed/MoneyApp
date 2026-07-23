# Startup and Async Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make startup, currency, deferred work, and category loading deterministic, race-safe, and explicit about loading and failure states.

**Architecture:** Keep the existing Zustand/repository architecture and add request generations at each async ownership boundary. Required startup becomes a small state machine, while optional preloads retain screen-owned errors. UI keeps warm data mounted and uses existing HeroUI/shared primitives for retry states.

**Tech Stack:** Expo 55, React Native 0.83, TypeScript strict, Zustand 5, RHF 7, Zod 4, HeroUI Native, Jest/RNTL.

---

## File map

- `src/modules/currency/store/currency.helpers.ts`: pure persisted/remote rate validation and freshness policy.
- `src/modules/currency/store/currency.store.ts`: currency load/fetch/manual request ownership.
- `src/modules/currency/screens/currency/currency.hook.ts`: normalized RHF/Zod manual input and explicit fetch UI state.
- `src/store/ready.store.ts`: required startup state machine and request generation.
- `src/utils/use_layout_init.hook.ts`: required initialization orchestration and optional post-ready work.
- `src/app/_layout.tsx`: provider-mounted startup/fatal/ready presentation.
- `src/app/(app)/_layout.tsx`: optional category preload and owned background rate refresh only.
- `src/modules/navigation/components/startup_error.tsx`: compact retryable fatal startup UI.
- `src/utils/run_after_interactions.ts`: safe deferred rejection delivery.
- `src/modules/categories/store/category.store.ts`: request ownership and cold-load deduplication.
- `src/modules/categories/screens/settings/categories/categories.hook.ts`: retry action and category load state projection.
- `src/modules/categories/screens/settings/categories/index.tsx`: stable cold/error/warm presentation.
- `src/constants/strings.ts`: centralized startup/category retry copy.

### Task 1: Currency lifecycle and validation

**Files:**
- Create: `src/modules/currency/store/currency.helpers.ts`
- Modify: `src/modules/currency/store/currency.store.ts`
- Modify: `src/modules/currency/screens/currency/currency.hook.ts`
- Modify: `src/app/(app)/_layout.tsx`
- Test: `__tests__/currency.store.test.ts`
- Test: `__tests__/currency.helpers.test.ts`
- Test: `__tests__/screens/currency/currency_hook.test.ts`

- [ ] **Step 1: Add failing pure-policy tests**

Test positive persisted/remote validation, rejection of malformed values, and the exact 24-hour freshness boundary through pure helpers:

```ts
expect(parsePersistedRate('50.25')).toBe(50.25);
expect(parsePersistedRate('50abc')).toBeUndefined();
expect(parseRemoteRate({ rates: { EGP: 55 } })).toBe(55);
expect(shouldRefreshRate({ manual: true, lastFetched: null, now })).toBe(false);
expect(shouldRefreshRate({ manual: false, lastFetched: stale, now })).toBe(true);
```

- [ ] **Step 2: Run policy tests and verify RED**

Run: `npm test -- --runInBand __tests__/currency.helpers.test.ts`

Expected: FAIL because `currency.helpers.ts` does not exist.

- [ ] **Step 3: Implement minimal pure helpers**

Use Zod for the remote payload and strict normalized number parsing. Export `RATE_REFRESH_MAX_AGE_MS`, `parsePersistedRate`, `parseRemoteRate`, and `shouldRefreshRate` with an injected `now` timestamp.

- [ ] **Step 4: Run policy tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/currency.helpers.test.ts`

Expected: PASS.

- [ ] **Step 5: Add failing currency ownership tests**

Cover:

```ts
await store.getState().loadRate();
expect(store.getState().hasLoaded).toBe(true);

const staleFetch = store.getState().fetchRate();
await store.getState().setManualRate(48.5);
resolveRemote({ rates: { EGP: 55 } });
await staleFetch;
expect(store.getState()).toMatchObject({ rate: 48.5, isManualOverride: true });

await store.getState().refreshRateIfStale(now);
expect(fetch).not.toHaveBeenCalled(); // manual override
```

Also test failed HTTP status, invalid payload, invalid persisted rate, newer-fetch-wins ordering, and reset invalidation.

- [ ] **Step 6: Run currency store tests and verify RED**

Run: `npm test -- --runInBand __tests__/currency.store.test.ts`

Expected: FAIL on missing lifecycle state/actions and stale result publication.

- [ ] **Step 7: Implement currency request ownership**

Add `hasLoaded`, request generations, one in-flight background refresh, `refreshRateIfStale(now)`, and owner checks before persistence/publication. Explicit `fetchRate()` remains user-driven and may replace a manual override. `setManualRate()` and `reset()` invalidate outstanding remote requests.

- [ ] **Step 8: Add failing normalized manual-input hook test**

Submit `5,000` and assert `setManualRate(5000)`. Submit `50abc` and assert validation blocks persistence.

- [ ] **Step 9: Implement normalized RHF/Zod input and AppLayout policy**

Use `parsePositiveDecimal` in the schema and submit path. Replace AppLayout's unconditional load/fetch chain with optional category preload plus `refreshRateIfStale(Date.now())`; persisted rate loading moves to required startup.

- [ ] **Step 10: Run focused currency tests**

Run: `npm test -- --runInBand __tests__/currency.helpers.test.ts __tests__/currency.store.test.ts __tests__/screens/currency/currency_hook.test.ts`

Expected: PASS.

- [ ] **Step 11: Commit currency slice**

```bash
git add src/modules/currency src/app/'(app)'/_layout.tsx __tests__/currency.store.test.ts __tests__/currency.helpers.test.ts __tests__/screens/currency/currency_hook.test.ts
git commit -m "fix(currency): protect startup rate ownership"
```

### Task 2: Required startup state and fatal recovery UI

**Files:**
- Modify: `src/store/ready.store.ts`
- Modify: `src/utils/use_layout_init.hook.ts`
- Modify: `src/app/_layout.tsx`
- Create: `src/modules/navigation/components/startup_error.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/ready.store.test.ts`
- Test: `__tests__/use_layout_init.test.ts`
- Create: `__tests__/screens/navigation/startup_error.test.tsx`

- [ ] **Step 1: Add failing ready-store state-machine tests**

Test `initializing`, matching-generation `ready`, matching-generation `fatalError`, retry generation increment, and stale-generation suppression.

- [ ] **Step 2: Run ready-store tests and verify RED**

Run: `npm test -- --runInBand __tests__/ready.store.test.ts`

Expected: FAIL because the store only exposes a boolean.

- [ ] **Step 3: Implement the ready-store state machine**

Expose top-level `status`, `generation`, and `error`, plus `begin`, `resolveReady(generation)`, `rejectFatal(generation, error)`, and `reset`. Keep selectors shallow and actions read outside render.

- [ ] **Step 4: Add failing startup orchestration tests**

Require migrations, onboarding, accounts, and currency load before ready. Assert DB/migration failure produces `fatalError`, optional category/commitment failure does not block ready, and retry suppresses stale first-attempt completion.

- [ ] **Step 5: Run startup tests and verify RED**

Run: `npm test -- --runInBand __tests__/use_layout_init.test.ts`

Expected: FAIL because failures still mark ready and currency is not required.

- [ ] **Step 6: Implement owned startup orchestration**

Make `useAppInit` start one generation, await the four required operations, and publish only to the matching generation. Schedule category preload and commitment housekeeping after ready with safe local error handling. Return `retry` and `state.status` to the root.

- [ ] **Step 7: Add failing fatal UI rendering test**

Render the new presentation with a retry spy and assert centralized heading, description, and Retry button while keeping exact outer full-screen geometry.

- [ ] **Step 8: Implement fatal startup presentation**

Mount providers once fonts load, render nothing while startup is initializing, render `StartupError` on fatal state, and render the router stack only when ready. Keep the splash hidden once fonts and either ready/fatal presentation are available.

- [ ] **Step 9: Run startup-focused tests**

Run: `npm test -- --runInBand __tests__/ready.store.test.ts __tests__/use_layout_init.test.ts __tests__/screens/navigation/startup_error.test.tsx __tests__/app_layout_imports.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit startup slice**

```bash
git add src/store/ready.store.ts src/utils/use_layout_init.hook.ts src/app/_layout.tsx src/modules/navigation/components/startup_error.tsx src/constants/strings.ts __tests__/ready.store.test.ts __tests__/use_layout_init.test.ts __tests__/screens/navigation/startup_error.test.tsx __tests__/app_layout_imports.test.ts
git commit -m "fix(startup): surface required initialization failures"
```

### Task 3: Safe deferred work

**Files:**
- Modify: `src/utils/run_after_interactions.ts`
- Modify: throwing call sites only where an explicit state/log handler is needed.
- Test: `__tests__/utils/run_after_interactions.test.ts`
- Test: affected hook tests.

- [ ] **Step 1: Add failing rejection and cancellation tests**

Assert rejected work calls `onError` exactly once, does not schedule a timer throw, and canceled work suppresses callback/error delivery.

- [ ] **Step 2: Run helper tests and verify RED**

Run: `npm test -- --runInBand __tests__/utils/run_after_interactions.test.ts`

Expected: FAIL because the helper has no error callback and rethrows asynchronously.

- [ ] **Step 3: Implement safe deferred error delivery**

Extend the helper signature with `{ onError?: (error: unknown) => void }`. Catch sync/async failures, ignore them after cancellation, call `onError` when present, otherwise log a scoped error. Never throw from a timer.

- [ ] **Step 4: Wire explicit handlers at throwing focus loaders**

Commitments should preserve current content and log/set its owned failure state rather than crash. Callers whose callback already catches internally require no extra wrapper.

- [ ] **Step 5: Run helper and focus-hook tests**

Run: `npm test -- --runInBand __tests__/utils/run_after_interactions.test.ts __tests__/screens/commitments.hook.test.ts __tests__/screens/dashboard/dashboard_hook.test.ts __tests__/screens/transactions/transactions_hook.test.ts __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/budget/spending_plan_detail_hook.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit deferred-work slice**

```bash
git add src/utils/run_after_interactions.ts src/modules __tests__/utils/run_after_interactions.test.ts __tests__/screens
git commit -m "fix(async): contain deferred task failures"
```

### Task 4: Category request ownership and stable error UI

**Files:**
- Modify: `src/modules/categories/store/category.store.ts`
- Modify: `src/modules/categories/screens/settings/categories/categories.hook.ts`
- Modify: `src/modules/categories/screens/settings/categories/index.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/category.store.test.ts`
- Test: `__tests__/screens/settings_categories.hook.test.ts`
- Create: `__tests__/screens/settings/categories/categories_screen.test.tsx`

- [ ] **Step 1: Add failing category concurrency tests**

Cover concurrent cold-load deduplication, mutation reload superseding a pending preload, stale error suppression, warm-data preservation, and reset invalidation.

- [ ] **Step 2: Run category store tests and verify RED**

Run: `npm test -- --runInBand __tests__/category.store.test.ts`

Expected: FAIL because every call queries and stale completions publish.

- [ ] **Step 3: Implement category ownership**

Track request generation and one cold in-flight promise. Public `loadCategories` joins the cold request; mutation reloads force a new generation. Publish `loadError` only for the current generation and keep warm categories/`hasLoaded` on refresh failure. Reset invalidates pending work.

- [ ] **Step 4: Add failing hook/screen state tests**

Assert the hook exposes `loadError` and `retry`. Render cold failure with a retry button. Render warm categories unchanged while a refresh error is present, with a stable nonblocking alert.

- [ ] **Step 5: Implement stable category error presentation**

Project category load state through the hook. Replace endless cold spinner with retryable error UI. Preserve FlashList during warm errors and reserve one overlay/status slot that does not change list geometry.

- [ ] **Step 6: Run category-focused tests**

Run: `npm test -- --runInBand __tests__/category.store.test.ts __tests__/screens/settings_categories.hook.test.ts __tests__/screens/settings/categories/categories_screen.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit category slice**

```bash
git add src/modules/categories src/constants/strings.ts __tests__/category.store.test.ts __tests__/screens/settings_categories.hook.test.ts __tests__/screens/settings/categories/categories_screen.test.tsx
git commit -m "fix(categories): own shared loading state"
```

### Task 5: Integration, quality, and performance verification

**Files:**
- Modify only files required by verification findings.

- [ ] **Step 1: Run focused PR suite**

Run:

```bash
npm test -- --runInBand \
  __tests__/currency.helpers.test.ts \
  __tests__/currency.store.test.ts \
  __tests__/screens/currency/currency_hook.test.ts \
  __tests__/ready.store.test.ts \
  __tests__/use_layout_init.test.ts \
  __tests__/screens/navigation/startup_error.test.tsx \
  __tests__/utils/run_after_interactions.test.ts \
  __tests__/category.store.test.ts \
  __tests__/screens/settings_categories.hook.test.ts \
  __tests__/screens/settings/categories/categories_screen.test.tsx
```

Expected: PASS with no unhandled rejection/timer warnings.

- [ ] **Step 2: Run static quality gates**

Run: `npm run format:check && npm run lint && npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run complete unit suite**

Run: `npm test -- --ci --runInBand`

Expected: PASS.

- [ ] **Step 4: Run remaining local CI parity**

Run: `npx --yes expo-doctor && npx expo prebuild --no-install --platform android && test -d android`

Expected: PASS and generated `android/` directory exists.

- [ ] **Step 5: Inspect final diff and commit verification fixes**

Run: `git diff --check && git status --short && git diff --stat main...HEAD`

If verification required edits, commit them with:

```bash
git add <verified-files>
git commit -m "test(startup): harden async ownership coverage"
```

- [ ] **Step 6: Prepare device QA matrix**

Verify manually before merge:

1. Relaunch with manual USD rate: value does not change automatically.
2. Tap Refresh on Currency: remote value replaces manual only after explicit action.
3. Force startup database failure in a development fixture: fatal screen stays usable and Retry works.
4. Open Categories after a simulated load failure: no endless spinner; Retry works.
5. Navigate rapidly among Dashboard, Budget, Commitments, and Transactions: no uncaught deferred error/red screen.
