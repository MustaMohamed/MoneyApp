# Whole-App Quality, Performance, and UI Standards Audit

**Date:** 2026-07-23
**Scope:** App startup, navigation, Dashboard, Accounts, Transactions, Commitments, Budget, Categories, Currency, Settings, shared UI, stores, repositories, database queries, and tests.
**Lenses:** Runtime performance, render performance, data correctness, async state ownership, layout stability, HeroUI/design-system compliance, and codebase conventions.
**Status:** Review only. No production code changed.
**Branch:** `audit/whole-app-quality-performance`

---

## Executive verdict

The app has a good foundation: React Compiler and the New Architecture are enabled, primary ledger lists are virtualized, important transaction rows are memoized, full-screen routes use the shared `Screen` primitives, and the recent Transactions remediation has materially improved request ownership and UI-state handling.

The current whole-app slowdown is not primarily a Transactions problem. It is the cumulative effect of startup work plus Dashboard, Budget, and Commitments independently re-querying overlapping data whenever screens focus or refresh. Several of those paths publish multiple intermediate Zustand states, replace warm content with skeletons, or execute sequential SQLite round trips. That combination increases database work, JS renders, native layout work, and perceived delay at the same time.

The most urgent correctness issue is Currency startup: the app automatically fetches a remote rate after loading the user's saved value, even when the user selected a manual override. A late fetch can overwrite both a prior manual choice and a manual save made during startup.

## Severity summary

| Severity | Count | Main themes |
| --- | ---: | --- |
| High | 7 | Currency ownership, startup failure policy, dashboard query fan-out, budget duplicate loads, commitment housekeeping, uncaught async errors |
| Medium | 8 | Query scaling, request ownership, blank/error states, sheet lifecycle, refresh churn, list virtualization, UI standards, test strategy |
| Low | 3 | Remaining warnings, compatibility imports, centralized copy |

---

## High-severity findings

### H1. Startup overwrites manual exchange rates and can race a manual save

**Evidence**

- `src/app/(app)/_layout.tsx:13` always chains `loadRate()` into `fetchRate()` on app entry.
- `src/modules/currency/store/currency.store.ts:57` fetches without checking `isManualOverride`, freshness, or request ownership.
- `src/modules/currency/store/currency.store.ts:65` persists the remote rate and resets `isManualOverride` to false.
- `src/modules/currency/screens/currency/currency.hook.ts:44` uses permissive `parseFloat` validation.

**Impact**

- A user-selected manual rate is lost on the next launch.
- A remote response that completes after a manual save can overwrite the newer manual value.
- Rate-dependent dashboard values can render with the default rate, then the persisted rate, then the fetched rate, producing visible number changes and repeated renders.
- Malformed input such as `50abc` can pass validation as `50`.

**Recommendation**

- Load the persisted rate before publishing rate-dependent UI.
- Do not auto-fetch while manual override is enabled.
- Refresh only when the remote value is stale or absent.
- Add a request generation/token so older network results cannot overwrite newer manual state.
- Validate `res.ok`, parse the payload with Zod, and add timeout/abort handling.
- Use the shared normalized amount parser in the RHF/Zod schema.

### H2. Dashboard focus creates overlapping query fan-out and many full-screen rerenders

**Evidence**

- `src/modules/dashboard/screens/dashboard/dashboard.hook.ts:122` through `:171` defines four independent loaders.
- `src/modules/dashboard/screens/dashboard/dashboard.hook.ts:173` starts all four on every focus.
- `src/modules/dashboard/screens/dashboard/dashboard.hook.ts:209` starts account-stat loading in a separate effect.
- `src/modules/dashboard/screens/dashboard/dashboard.store.ts:65` through `:84` publishes each result independently.
- Month spend, transaction totals, and budget summary all query overlapping transaction history.

**Impact**

One Dashboard visit can trigger commitment, spend, transaction-total, budget, account, and account-stat work. Independent completions repeatedly rerender the full Dashboard. Fast tab changes can leave old requests doing SQLite and JS work even if their results are no longer useful.

**Recommendation**

- Introduce one Dashboard snapshot loader with request ownership.
- Query shared month facts once and derive card view models from that snapshot.
- Batch the Zustand publication so the Dashboard receives one coherent update.
- Use stale-while-revalidate: keep warm values visible and show a small stable refresh status instead of remounting every card.
- Refresh only when the snapshot is stale or an owned mutation invalidates it.

### H3. Dashboard converts database failures into authoritative financial zeroes

**Evidence**

- `src/modules/dashboard/screens/dashboard/dashboard.hook.ts:130`, `:144`, `:157`, and `:167` catch failures and publish empty values.
- `src/modules/dashboard/screens/dashboard/dashboard.store.ts:66` through `:84` mark those values as loaded.

**Impact**

A failed query can display zero spending, zero transactions, no commitments, or an empty budget as if those were real financial results. This is a trust and correctness problem, not only an error-state issue.

**Recommendation**

- Model `initialLoading`, `ready`, `refreshing`, `refreshErrorWithData`, and `initialError` explicitly.
- Preserve the last successful snapshot on refresh failure.
- Render one coherent nonblocking retry/status surface rather than per-card false zeroes.

### H4. Budget month changes launch the same expensive load twice

**Evidence**

- `src/modules/budget/screens/budget/budget.hook.ts:140` reloads Budget whenever `selectedMonth` changes.
- `src/modules/budget/screens/budget/budget.hook.ts:290` also calls `load(month)` and `loadIncomeSuggestion(month)` directly before the focus effect reruns.
- `src/modules/budget/store/budget.store.ts:131` performs six repository reads per load.
- `src/modules/budget/store/budget.store.ts:145` loads every budget row, not only the active history window.

**Impact**

Every month navigation can execute the six-query load twice. Request IDs prevent stale publication, but they do not cancel the duplicated SQLite and JS work. The result is slower month switching and unnecessary battery/CPU use.

**Recommendation**

- Give month selection one load owner; either the setter or the effect initiates loading, never both.
- Deduplicate in-flight loads by month and snapshot generation.
- Query only the current/history window needed by the active lenses.
- Cache immutable category data separately from month-specific budget data.

### H5. Commitment focus performs sequential O(N) database housekeeping

**Evidence**

- `src/modules/commitments/screens/commitments/commitments.hook.ts:188` reloads commitments, generates payments, and then loads the month on every focus.
- `src/modules/commitments/store/commitment.store.ts:205` loops over every commitment and awaits existing due dates and inserts sequentially.
- `src/modules/commitments/store/commitment.store.ts:255` loops again and runs a paid-count query per applicable commitment.
- `src/utils/use_layout_init.hook.ts:35` invokes the same housekeeping at startup before it has explicitly loaded commitments in that path.

**Impact**

Tab entry cost grows linearly with commitment count and number of SQLite round trips. Cold-start housekeeping can do little or no useful work because the in-memory list may still be empty, then the Commitments tab repeats it.

**Recommendation**

- Move payment generation and expiry evaluation into one repository-owned transaction.
- Fetch existing dates and paid counts in batches, or implement the operation SQL-side.
- Run housekeeping once per relevant day/data generation, not every focus.
- Load the resulting commitment/month snapshot once after housekeeping completes.

### H6. The deferred-task helper turns normal async failures into uncaught crashes

**Evidence**

- `src/utils/run_after_interactions.ts:7` rethrows promise errors inside `setTimeout`.
- The helper is used by Dashboard, Transactions, Commitments, Budget, and Spending Plan detail.
- It also relies on deprecated `InteractionManager`.

**Impact**

A transient repository or database failure can become an uncaught exception/red screen instead of a screen-owned retry state. Callers have inconsistent error handling because the helper does not provide a safe result boundary.

**Recommendation**

- Remove asynchronous rethrowing.
- Require callers to supply an error handler or return an owned cancellable promise/result.
- Replace deprecated scheduling with a small navigation/frame-aware scheduler that has explicit cancellation and tests.

### H7. Fundamental startup failures are hidden as a usable app

**Evidence**

- `src/utils/use_layout_init.hook.ts:18` runs migrations, onboarding initialization, and account loading in one startup boundary.
- `src/utils/use_layout_init.hook.ts:25` catches any failure and still calls `markReady()`.
- Downstream screens can then interpret absent data as empty user data.

**Impact**

A migration or database-open failure can route the user into onboarding or an empty app rather than a recoverable startup error. Continuing after a failed migration also risks executing queries against an incompatible schema.

**Recommendation**

- Distinguish recoverable optional preload failures from fatal database/migration failures.
- Keep the splash/startup shell stable and present a retryable fatal-error screen for migration or database-open failures.
- Do not publish app-ready until required schema and onboarding state are valid.

---

## Medium-severity findings

### M1. Budget queries will slow as transaction and budget history grows

**Evidence**

- `src/modules/budget/database/budget_stats.ts:14`, `:25`, `:58`, and `:88` apply `substr()` to indexed transaction dates.
- `src/modules/budget/repositories/budget.repository.ts:149` returns every budget row.
- `src/modules/budget/repositories/budget.repository.ts:259` copies limits with nested concurrent writes outside an exclusive transaction.
- Existing transaction indexes are single-column; plan/category/date access lacks the composite indexes used by these queries.

**Impact**

Function-wrapped date predicates can prevent efficient index range scans. Full-history reads and concurrent writes on one SQLite connection increase work and can partially apply a copy if one write fails.

**Recommendation**

- Replace month extraction predicates with date ranges (`>= monthStart AND < nextMonthStart`).
- Add bounded budget-history queries.
- Make all copy operations exclusive and atomic with serial writes inside the transaction.
- Profile with `EXPLAIN QUERY PLAN` and a realistic large fixture before adding composite indexes.

**Critical-trigger note:** adding indexes requires a new migration and user sign-off before implementation.

### M2. Category data has no request ownership or in-flight deduplication

**Evidence**

- `src/modules/categories/store/category.store.ts:31` starts unrestricted loads and always publishes completion.
- App layout, Budget, Spending Plan detail, Category detail, and sheets can request categories independently.
- `src/modules/categories/screens/settings/categories/index.tsx:98` renders an endless spinner when initial loading fails because the screen ignores `loadError`.

**Impact**

An older request can overwrite a newer post-mutation result. Concurrent screen entry performs duplicate reads and publications. A first-load failure has no retry affordance.

**Recommendation**

- Match the Account/Transaction stores: request generation, query ownership, and in-flight deduplication.
- Preserve loaded categories while revalidating.
- Add explicit initial-error and refresh-error states with retry.

### M3. Account detail can render a completely blank route

**Evidence**

- `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts:65` resolves only from active accounts.
- `src/modules/accounts/screens/accounts/detail/index.tsx:57` returns `null` when the account is absent.
- Transaction detail can navigate to an archived account while the account repository already exposes an including-archived lookup.

**Impact**

Deep links, startup races, stale navigation, or archived historical accounts can produce a blank screen with no loading, not-found, or back affordance.

**Recommendation**

- Load detail by ID, including archived accounts, with request ownership.
- Render stable loading, not-found, and error states.
- Make archived accounts read-only or clearly labeled where mutation is not allowed.

### M4. Category add/edit sheet has validation and lifecycle defects

**Evidence**

- `src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx:125` builds duplicate-name validation with the parent tab, not the current type selected in the sheet.
- `src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx:238` nests a disabled-scroll `FlatList` inside a bottom-sheet scroll view for a fixed 32-item grid.
- The sheet remains dismissable while `isLoading` is true.

**Impact**

Switching Expense/Income can validate against the wrong category type. The nested virtualized list adds overhead and warnings without providing virtualization. Dismissal during save can desynchronize sheet and mutation state.

**Recommendation**

- Put type in the RHF schema and validate against the current controlled value.
- Render the small fixed icon grid without a nested virtualized list.
- Set `isDismissable={!isLoading}`, make save idempotent, and preserve content until close completion.

### M5. Refresh replaces warm UI with expensive skeleton trees

**Evidence**

- `src/modules/dashboard/screens/dashboard/index.tsx:64` treats refresh as loading for every card.
- `src/modules/budget/screens/budget/index.tsx:157` replaces the complete selected lens with `BudgetScreenSkeleton` during refresh.
- `src/modules/commitments/screens/commitments/index.tsx:161` replaces the summary content with its loading state while rows remain warm.

**Impact**

Pull-to-refresh causes component churn, text-to-skeleton transitions, layout recalculation, and perceived flicker even when valid data is already present. Budget's large data-shaped skeleton is itself expensive to mount.

**Recommendation**

- Use skeletons only for cold initial loading.
- Keep the last successful layout mounted during refresh.
- Show the native refresh indicator plus a fixed-size nonblocking status/error slot.
- Reserve geometry for values that truly have no warm snapshot.

### M6. Dashboard account rendering is not virtualized

**Evidence**

- `src/modules/dashboard/screens/dashboard/index.tsx:220` renders every account group.
- `src/modules/dashboard/screens/dashboard/components/account_carousel.tsx:36` uses a horizontal `ScrollView` and maps every account card.

**Impact**

Users with many accounts mount every card and all card detail rows at once. React Compiler reduces avoidable rerenders but cannot reduce initial native view count or memory.

**Recommendation**

- Use a virtualized horizontal list per group or one virtualized grouped account surface.
- Provide stable item layout/estimated sizing and memoized item callbacks.
- Add a large-account fixture to performance/device QA.

### M7. Sheet visibility is published after the sheet render

**Evidence**

- `src/components/ui/sheet.tsx:226` updates the global sheet counter in `useEffect`.
- `src/modules/navigation/screens/tabs/index.tsx:84` renders the global FAB outside the sheet host.

**Impact**

On open, the sheet can render one frame before the global FAB learns that a sheet is visible. This leaves a short visual/pressable overlap window and makes overlapping close/open transitions dependent on effect cleanup order.

**Recommendation**

- Make sheet ownership explicit and key visibility by session/owner rather than a delayed anonymous counter.
- Publish open ownership synchronously from the controlling state or a lifecycle-safe registry.
- Test close-and-immediate-reopen across different sheets.

### M8. UI standards are enforced inconsistently and sometimes by brittle source tests

**Evidence**

- Arbitrary pixel Tailwind classes appear across shared UI and feature screens; `budget_screen_skeleton.tsx` alone contains many arbitrary geometry values.
- `__tests__/screens/budget/spending_plan_styling_architecture.test.ts` asserts exact source strings such as `text-[19px]`, `text-[31px]`, and exact class sequences.
- `src/modules/dashboard/screens/dashboard/index.tsx:59` through `:94` owns lifecycle and gesture logic that belongs in its hook/animation layer.
- A few visible/accessibility strings remain inline, including Dashboard settings and shared FAB labels.

**Impact**

Exact source assertions can make inconsistent hardcoded styling look intentional while failing to test actual rendered geometry or behavior. Screen-template logic is harder to test and maintain. Token drift makes typography and skeleton matching fragile.

**Recommendation**

- Add semantic shared geometry/type tokens for repeated card, skeleton, row, and header tracks.
- Replace exact-source styling assertions with rendering/geometry/view-model tests where behavior matters.
- Move Dashboard gesture/lifecycle behavior into `.hook.ts`/`.anim.ts`.
- Centralize remaining user-visible and accessibility copy.

---

## Low-severity findings

### L1. Production lint is green but still reports warnings

`npx oxlint --type-aware --type-check src` exits successfully with warnings for redundant union types and unbound Zustand method references in Commitments. These do not currently fail CI, but cleaning them will reduce suppressions and make real warnings easier to notice.

### L2. App layout uses compatibility-root imports

`src/app/(app)/_layout.tsx:4` and `:5` import category and currency stores from root compatibility paths. New module consumers should use canonical module paths to keep ownership clear.

### L3. Some shared controls keep hardcoded accessibility copy

Examples include `src/components/ui/back_button.tsx`, `src/components/ui/fab.tsx`, and category action rows. Centralizing these in `Strings` improves consistency and localization readiness.

---

## What is already working well

- React Compiler and React Native New Architecture are enabled.
- Full-screen routes consistently use `Screen`/`ScreenScroll`; no direct feature-level `SafeAreaView` misuse was found.
- Transactions and Commitments use virtualized section lists; Categories uses FlashList.
- Transaction request generations, query-bound scroll restoration, error presentation, and form-session ownership are substantially stronger after the recent remediation.
- Account and Budget stores already demonstrate request-generation patterns that can be reused elsewhere.
- HeroUI Native primitives are broadly adopted, including the shared HeroUI-backed Sheet.
- `npm run typecheck` passes.
- Production type-aware lint exits successfully.

---

## Recommended remediation sequence

### PR 1 — Startup and async ownership

- Protect manual currency overrides and validate remote rates.
- Add currency request ownership/freshness.
- Replace unsafe deferred error rethrowing.
- Add explicit fatal startup error handling.
- Add category request ownership and initial-error state.

**Expected effect:** fewer launch-time number changes, no manual-rate overwrite, fewer duplicate category loads, safer failure behavior.

### PR 2 — Dashboard performance snapshot

- Build one owned Dashboard snapshot load.
- Consolidate overlapping current/previous-month transaction facts.
- Batch store publication.
- Preserve warm UI during refresh and expose nonblocking errors.
- Virtualize account-card rendering where scale warrants it.

**Expected effect:** faster Dashboard entry, fewer full-screen rerenders, smoother refresh, lower SQLite/JS work.

### PR 3 — Budget and Commitments workload

- Remove duplicate Budget month loads and dedupe by month.
- Bound Budget reads to the active history window.
- Batch Commitment housekeeping and run it only when stale.
- Keep warm list/card content during refresh.
- Make budget copy operations atomic.

**Expected effect:** faster tab switching and month navigation, less UI blocking, predictable refresh behavior.

### PR 4 — UI-state and standards consolidation

- Fix Account detail loading/not-found states.
- Fix Category sheet validation, save lifecycle, and nested list.
- Replace effect-delayed sheet visibility ownership.
- Move Dashboard template logic to hook/animation files.
- Replace repeated arbitrary geometry with shared semantic tokens and behavioral tests.

**Expected effect:** fewer blank/broken screens, fewer transition flashes, more consistent typography/spacing and maintainable UI code.

### PR 5 — Query/index scaling (requires migration sign-off)

- Convert month predicates to indexed date ranges.
- Measure realistic large datasets with `EXPLAIN QUERY PLAN` and device timings.
- Add only the composite indexes demonstrated by those plans.

**Expected effect:** stable Budget, search, plan, and commitment performance as history grows.

---

## Performance acceptance targets

These should be measured on the same physical Android device and representative seeded database before and after each PR:

- Warm Dashboard focus: no full skeleton remount; no more than one data snapshot publication.
- Dashboard pull-to-refresh: existing card geometry remains mounted; one stable progress/error affordance.
- Budget month switch: one owned load for the selected month; old-month values never appear under the new header.
- Commitments warm focus: no per-commitment query loop when housekeeping is already current.
- Sheet open/close: FAB is noninteractive before the first visible sheet frame and remains hidden through close completion.
- Large fixtures: 5,000 transactions, 100 commitments, 100 accounts, 24 months of budgets; no visible JS-thread stall during tab switching or typing search.
- Failures: database/network errors never render as valid financial zeroes and never produce uncaught async exceptions.

## Verification performed

- Static inspection of route screens, hooks, stores, repositories, database queries, shared UI, and targeted tests.
- `npm run typecheck` — passed.
- `npx oxlint --type-aware --type-check src` — passed with warnings noted in L1.
- No production files were modified during this audit.

## Limits of this audit

This is a code and static-state audit. It identifies high-confidence performance mechanisms, but it does not replace on-device profiling. Before merging performance changes, collect React Native performance monitor/Profiler traces and SQLite query plans on the device QA dataset described above.
