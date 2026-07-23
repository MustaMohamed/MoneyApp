# Dashboard Performance Snapshot — Design Specification

**Date:** 2026-07-23
**Audit slice:** PR 2 — Dashboard performance snapshot
**Branch:** `perf/dashboard-owned-snapshot`
**Status:** Pending user sign-off
**Depends on:** Audit PR 1 — Startup and async ownership

## 1. Feature summary

The Dashboard will move from five independently owned async loaders to one request-owned, read-only snapshot. A snapshot is the complete set of local database values needed to render both Dashboard segments for one calendar month: active accounts, account activity stats, current/previous month transaction facts, current-month budget summary, and current-month commitment payments.

The change addresses audit findings H2, H3, M5, and M6:

- one load owner and one success publication instead of per-card completion races;
- one bounded transaction-facts scan instead of separate month-spend, transaction-total, and budget-spend scans;
- explicit request generations so stale requests cannot publish;
- cold-load, ready, warm-refresh, warm-error, and initial-error states that never turn database failures into financial zeroes;
- conditional virtualization for account groups large enough to justify it;
- measured before/after evidence on the audit fixture and a physical Android device.

This is a read-path performance and correctness change. It does not alter navigation, Dashboard information architecture, financial formulas, account ordering, card design, gestures, animations, copy beyond generic load-error text, or mutation behavior.

### Goals

- Reduce a normal Dashboard snapshot from up to eight Dashboard-owned SQL reads to at most five bounded reads, with exactly one transaction-history scan.
- Publish successful Dashboard data atomically in one Zustand `set(...)` call.
- Keep the last successful snapshot mounted during same-month refresh and refresh failure.
- Reject late completions from superseded, blurred, reset, or previous-month requests.
- Preserve all existing financial outputs for the same database contents.
- Bound mounted account-card views for large account groups without changing carousel geometry.

### Non-goals

- No schema migration, index, native-code change, dependency change, remote cache, or background sync.
- No shared cross-domain cache and no conversion to TanStack Query, Signals, or another state library.
- No changes to Budget or Commitment mutation/housekeeping workloads; those belong to audit PR 3.
- No Dashboard gesture/lifecycle file cleanup or broad token cleanup; those belong to audit PR 4 unless a small extraction is required to test this snapshot.
- No changes to transaction, budget, commitment, account, or currency financial policy.
- No production code or implementation plan before this specification is signed off.

## 2. Product & UX

### 2.1 Preserved experience

The existing Cairo Nights Dashboard remains the product contract:

- Header, settings action, `Overview` / `Accounts` HeroUI `Tabs`, horizontal swipe behavior, and focus reset to `Overview` remain unchanged.
- Overview order remains Hero, stat cards, Transactions, Budget, Commitments.
- Accounts order remains Bank, Smart Wallet, Physical Wallet, Physical Savings, Credit Card, with empty groups hidden.
- Net-worth breakdown remains the existing HeroUI-backed sheet and remains read-only.
- Pull-to-refresh remains available in both segments.
- A successful snapshot containing zero accounts still shows the existing accounts `EmptyState`. A missing snapshot or failed query must never be interpreted as zero accounts.

No branding-weight copy is introduced. The only new strings are generic field-level load messages in `Strings`, equivalent to “Could not load dashboard”, “Could not refresh dashboard”, and “Retry”.

### 2.2 Loading and error contract

The screen derives presentation from the snapshot status and whether a matching snapshot exists.

| Store state | Data rendered | Loading/error treatment |
| --- | --- | --- |
| `idle` or `initialLoading`, no matching snapshot | No financial values are authoritative | Preserve the current Dashboard shell and existing card-shaped skeleton geometry. Do not show the accounts empty state. |
| `initialError`, no matching snapshot | No zero placeholders and no stale month | Show one centered HeroUI `Alert` with a HeroUI/project-button retry action. Header and settings navigation remain available. |
| `ready`, matching snapshot | Snapshot values | No loading or error affordance. |
| `refreshing`, matching snapshot | Last successful snapshot | Keep every card and account row mounted. `RefreshControl` shows progress; card `isLoading` props remain `false`. |
| `refreshErrorWithData`, matching snapshot | Last successful snapshot | Stop the refresh indicator and show one compact HeroUI `Alert` with retry as an absolute overlay. It must not participate in scroll layout or move cards. |
| Calendar month changed, old snapshot exists | Old snapshot is not rendered under the new month label | Treat the new key as a cold load. The old month is cleared from presentation rather than preserved across keys. |

The refresh alert follows the established `TransactionLoadError` pattern: HeroUI `Alert`, one action, absolute positioning, and no custom parallel alert primitive. Query errors are logged once at the store boundary and are represented by status; they are not rethrown into a deferred task.

### 2.3 UI geometry invariants

The implementation must preserve these invariants:

- Root remains `Screen edges={['top']}` and body remains `ScreenScroll`; Android Fabric layout-critical flex styles remain in `style`.
- Header minimum height remains `Size.headerHeight`; the separator and tabs retain their current placement and spacing.
- Overview card order, horizontal margins, internal card dimensions, progress tracks, typography, and skeleton min-heights do not change.
- `ready -> refreshing -> ready` and `ready -> refreshing -> refreshErrorWithData` do not replace or remount Hero, Stat, Transactions, Budget, Commitments, account cards, or the breakdown sheet.
- The warm error alert is overlaid, not inserted into the vertical flow. Its appearance cannot change scroll offset or card coordinates.
- Account groups retain `TYPE_ORDER`, section headings, count chips, trailing Add Account card, no snap behavior, hidden scroll indicator, and the current 55% viewport card width.
- Carousel content keeps the current scaled geometry: `Spacing.md` horizontal inset (16 baseline), `Spacing.xxs` vertical inset (4), `Spacing.xs` inter-item gap (8), and the existing 4-baseline leading card margin. The large-list path must produce the same first-card offset and next-card peek as the small-list path.
- Existing account cards and Add Account cards remain HeroUI `Card` + `PressableFeedback` compositions. No replacement UI primitive is introduced.

### 2.4 Account-list virtualization threshold

Virtualization is selected per account type, excluding the trailing Add Account item:

- **0–7 accounts in a group:** retain the current horizontal `ScrollView`. At this size, the setup cost and two rendering paths of a virtualized list do not buy meaningful memory savings.
- **8 or more accounts in a group:** use React Native `FlatList` horizontally. Eight cards are over four viewport widths at the existing 55% card width and are the point at which mounting every heavy card is no longer justified.

The large-list data is a discriminated union of account items plus one trailing Add Account item. Keys are `account:<id>` and `add:<account-type>`. `renderItem`, `keyExtractor`, separators, and press callbacks are stable. `getItemLayout` uses the measured card width plus the existing leading-margin/inter-item spacing, with `initialNumToRender=3`, `maxToRenderPerBatch=3`, and `windowSize=3`. `removeClippedSubviews` is enabled on Android only. The fixed-width layout must be verified at 320, 390, and 430 baseline viewport widths and with large font scaling.

HeroUI Native has no list virtualization primitive in the installed v1.0.3 catalog, so React Native `FlatList` is list infrastructure rather than a Team Law 7 exception. `@shopify/flash-list` is already installed, but is not needed for this bounded horizontal case; using core `FlatList` keeps exact `getItemLayout` support and avoids adding another behavior surface.

## 3. Financial Logic

This PR preserves existing formulas. The consolidated query must prove parity against the current query tests before the old Dashboard calls are removed.

### 3.1 Account and net-worth values

- Active accounts are rows where `is_archived = 0`, ordered by `sort_order`, then `created_at`, exactly as `getAccounts(...)` does today.
- Non-credit-card balances are assets. Credit-card balances are liabilities.
- USD account balances are converted with the current shared currency rate; EGP balances are unchanged.
- `netWorthEgp = assetsEgp - liabilitiesEgp`.
- Liquidity and reserve grouping, liability ordering, account counts, negative-credit-card defensive handling, and per-card account stats remain in the existing pure helpers.
- The Dashboard snapshot stores account-native rows and account stats. It does not freeze the exchange rate. An intentional currency-store change re-derives rate-dependent view models without re-querying SQLite.

### 3.2 Consolidated month facts

One range-bounded SQL query covers `[previousMonthStart, nextCurrentMonthStart)` and returns rows grouped by month and, for the current month only, category. Its reducer produces current and previous month facts.

For each transaction row:

- Cash income contributes to `incomeEgp` only when `type = income` and the source account is not a credit card.
- Expense contributes positively to `expenseEgp`.
- Income on a credit-card account is a card credit: it subtracts from `expenseEgp` and does not contribute to cash income.
- Transfers and `cc_payment` rows contribute to neither income nor expense totals.
- `netEgp = incomeEgp - expenseEgp`.
- Month-spend `totalEgp` is the same net expense fact used by transaction totals.
- Month-spend `usdNative` adds USD expense native amounts and subtracts USD card-credit native amounts.
- Month-spend `count` includes expense rows and credit-card income rows, preserving the current contributing-row count even when credits make net expense negative.
- Historical EGP values come from persisted `egp_amount`; the current currency-store rate is not retroactively applied to transaction history.
- Historical transactions remain included when their source account is now archived. The account join determines credit-card policy but does not filter `account_row.is_archived`, matching the existing totals/spend queries.

The `WHERE` clause uses date ranges and the existing `transactions(transaction_date)` index. `substr(transaction_date, 1, 7)` is not used in the predicate. A `CASE` assigns the two month keys after the range has bounded the scan.

### 3.3 Budget summary

The snapshot reads only budget limits where `effective_from = currentYearMonth`, grouped by category. It does not load all budget history.

- `budgeted` is the sum of all named budget limits in the current month.
- `categoryCount` is the number of distinct categories with at least one current-month budget row.
- Current-month category spend comes from the consolidated transaction-facts scan.
- Per-category card credits subtract from spend and each category is clamped to zero before entering the budget summary, matching `getCategorySpendByMonth(...)`.
- `spent` sums only current-month categories that have a budget limit.
- `left = budgeted - spent`.
- `pct = budgeted > 0 ? spent / budgeted : 0`.

Named-budget assignment does not change this Dashboard card: the existing card is category-budget based, so `budget_id` remains irrelevant to this summary.

### 3.4 Commitments and account activity

- Commitment rows remain the current-month `commitment_payments` ordered by due date/status.
- Paid/overdue/due/upcoming/skipped counts and per-currency amount rules remain unchanged. Skipped rows remain excluded from `total` and currency totals.
- Account stats preserve current native-currency semantics for month/week in/out, transfers, cross-currency destination `to_amount`, and credit-card payments.
- The snapshot repository passes one captured clock to month-range and account-stat boundary calculation so a request cannot split across midnight.

Legitimate empty aggregates produce zero-valued fields inside a successful `ready` snapshot. Exceptions produce an error status and never fabricate a successful zero snapshot.

## 4. Architecture

### 4.1 Decision and alternatives

**Selected: a Dashboard-owned read projection.** The Dashboard repository reads active accounts and all Dashboard-only aggregates, returns one immutable snapshot, and the Dashboard store owns request lifecycle and publication.

Alternatives considered:

1. **Keep shared account-store data outside the snapshot and consolidate only card aggregates.** This saves one cheap account query, but account-store publication and later account-stats publication can still expose mismatched account/card data. It does not meet the coherent-snapshot requirement.
2. **Selected — include active accounts in the Dashboard read projection while currency remains external.** This duplicates a read view, not mutation authority. It yields one consistent Dashboard publication and keeps all writes in their canonical stores/repositories.
3. **Introduce a cross-domain cache/query framework.** Rejected. It adds dependency and invalidation complexity to a local-only app when one focused read model solves the measured problem.

The Dashboard snapshot is read-only. Account, transaction, budget, and commitment stores remain mutation authorities. The Dashboard never writes through its repository.

### 4.2 Data model

No table, column, index, migration, or persisted cache is added.

The in-memory contract is:

```ts
type DashboardSnapshotStatus =
  | 'idle'
  | 'initialLoading'
  | 'ready'
  | 'refreshing'
  | 'refreshErrorWithData'
  | 'initialError';

interface DashboardMonthFacts {
  totals: { incomeEgp: number; expenseEgp: number; netEgp: number };
  spend: { totalEgp: number; usdNative: number; count: number };
}

interface DashboardSnapshot {
  key: string; // current local YYYY-MM
  yearMonth: string;
  previousYearMonth: string;
  accounts: Account[];
  statsMap: Record<string, AccountStats>;
  currentMonth: DashboardMonthFacts;
  previousMonth: DashboardMonthFacts;
  budgetSummary: BudgetDashboardSummaryVM;
  commitmentPayments: CommitmentPayment[];
  loadedAt: number; // Date.now() epoch milliseconds; metadata, not financial data
}
```

The snapshot owns:

- the active account rows rendered by Dashboard;
- per-account month/week activity rendered by account cards;
- current/previous transaction totals and spend comparison facts;
- the current budget-card summary;
- current-month commitment payment rows.

The snapshot deliberately does not own:

- currency `rate` or `isManualOverride` (shared currency-store authority from PR 1);
- `selectedSegment` or breakdown-sheet visibility (screen UI state);
- navigation, gestures, animation values, form drafts, or mutation state;
- full transaction, budget, commitment, or archived-account collections.

### 4.3 Query consolidation

`DashboardRepository.getSnapshot({ yearMonth, now })` opens the existing singleton database once and performs this bounded read set:

1. Active accounts via the canonical account query.
2. One consolidated current/previous transaction-facts query.
3. Current-month budget limits grouped by category.
4. Current-month commitment payments via the canonical commitment-payment query.
5. Account stats for the active account IDs, using boundaries calculated from the same captured `now`.

The account query runs first because account IDs are required by account stats. The remaining reads may be awaited together by the repository, but they have one owner and one result boundary. With no accounts, account stats returns `{}` without a SQL call, so the maximum becomes four reads.

The transaction-facts query replaces these current Dashboard reads:

- two `getMonthExpenseStats(...)` calls;
- two `getPeriodTotals(...)` calls;
- the transaction scan inside `getCategorySpendByMonth(...)`.

The bounded budget query replaces `budgetRepository.getRows()` for this screen. Existing general-purpose queries remain available to their owning screens and are not rewritten by this PR.

The repository either returns a complete snapshot or rejects. It never returns partial sections. Snapshot assembly and budget/month reducers are pure functions under the Dashboard module so their financial parity can be tested without React.

This is a logical application snapshot, not a long-lived exclusive SQLite transaction. MoneyApp has no background writer and its mutation UI serializes user writes away from the visible Dashboard; an exclusive multi-query read would add write blocking without a demonstrated benefit. If background writes are introduced later, database-level snapshot isolation needs a separate design and measurement pass.

### 4.4 State and request generations

`dashboard.store.ts` remains a small Zustand store that follows the project’s top-level field/action convention. Signals are not introduced.

```ts
interface DashboardStoreShape {
  snapshot: DashboardSnapshot | undefined;
  status: DashboardSnapshotStatus;
  requestedKey: string | undefined;
  requestGeneration: number;
}

interface DashboardStoreActions {
  ensureSnapshot(input: DashboardLoadInput): Promise<void>;
  refresh(input: DashboardLoadInput): Promise<void>;
  retry(input: DashboardLoadInput): Promise<void>;
  invalidate(): void;
  reset(): void;
}
```

The store is exposed through `createDashboardStore(repository)` for deterministic tests and one production singleton.

Request ownership rules are exact:

1. The request key is the captured local `YYYY-MM`. Accounts are inside the repository result, so account IDs are not a second ownership key.
2. Every new owned request increments a private monotonic generation. The public `requestGeneration` records that generation for diagnostics/tests.
3. A same-key request already in flight returns the existing promise, including a pull-to-refresh that races a scheduled focus load.
4. `ensureSnapshot` is a no-op only when the same-key snapshot is fresh for the current focus session. `refresh` and `retry` force a request unless the same key is already in flight.
5. Starting a same-key request with a successful snapshot sets only `status='refreshing'`; the snapshot reference is preserved.
6. Starting a request without a same-key snapshot clears presentation data and sets `initialLoading`. An old month is never preserved under a new key.
7. Success may publish only when its generation is still current. It publishes `snapshot`, `status='ready'`, `requestedKey`, and metadata in one `set(...)` call.
8. Failure may publish only when its generation is still current. With a same-key snapshot it sets `refreshErrorWithData`; without one it sets `initialError`. The prior snapshot is never replaced by empty constants.
9. `invalidate()` marks the focus-session snapshot stale, increments the private generation, and drops in-flight ownership without clearing the last snapshot or publishing UI state. SQLite work already submitted may finish, but its result cannot publish.
10. `reset()` also advances the generation before restoring the initial state, so pre-reset completions are ignored.

The store handles repository failures and resolves its public action promise after publishing error status. Deferred focus work therefore cannot create an uncaught rejection. Logging happens once in the store, not once per card.

### 4.5 Freshness, focus, and refresh

There is no arbitrary time-to-live. This app has no background writer or complete cross-domain mutation-generation registry, so a time cache could show stale finances after a fast edit.

- A successful snapshot is fresh while the Dashboard remains focused.
- Focus cleanup cancels work that has not started and calls `invalidate()` without clearing warm data.
- Every later focus revalidates once, because the user may have changed data on another route. The warm snapshot remains mounted while that request runs.
- Repeated focus callbacks in the same focus session do not reload a fresh snapshot.
- Pull-to-refresh and retry start immediately rather than waiting for post-navigation scheduling.
- Month keys are recomputed at each focus, refresh, and retry; the current code’s mount-only month memo is removed.

This conservative focus-session boundary preserves mutation visibility without wiring PR 2 into every cross-domain mutation store. A future shared mutation-generation design would require its own cross-section specification.

### 4.6 Hook and publication flow

`useDashboard()` becomes an adapter rather than a query coordinator:

- subscribe to the Dashboard snapshot/status with one shallow selector;
- subscribe to currency rate/manual-override only;
- schedule one `ensureSnapshot(...)` on focus using PR 1’s safe cancellable scheduler;
- call store `refresh(...)` directly for pull-to-refresh;
- derive net worth, liquidity, grouped accounts, deltas, commitment counts/totals, and card props from one snapshot reference;
- expose one `retry` action;
- retain navigation actions and UI-state actions.

The separate account-store subscription, `loadAccounts()` refresh call, four summary loaders, and account-stats `useEffect` are removed from the Dashboard hook. The screen does not call repositories or database functions.

Publication batching means:

- at most one status-only publication when a request starts;
- exactly one data-bearing publication when an owned request succeeds;
- at most one status-only publication when an owned request fails;
- no per-section loaded flags or setters;
- no partial financial state visible between query completions.

Zustand’s single object `set(...)` is the batch boundary; React `unstable_batchedUpdates` or a new batching abstraction is unnecessary.

### 4.7 Folder layout and file ownership

PR 2 owns only the following production surfaces:

```text
src/modules/dashboard/
  database/dashboard_snapshot.ts                 # new bounded aggregate queries
  repositories/dashboard.repository.ts           # new read-only snapshot coordinator
  screens/dashboard/
    dashboard.helpers.ts                         # snapshot reducers + existing financial helpers
    dashboard.hook.ts                            # one focus/refresh adapter
    dashboard.presentation.ts                    # new pure status-to-UI mapping
    dashboard.state.ts                           # UI state only; remove refreshing
    dashboard.store.ts                           # owned snapshot/generation state
    index.tsx                                    # consume presentation; preserve layout
    components/
      account_carousel.tsx                       # thresholded FlatList path
      dashboard_load_error.tsx                   # new HeroUI Alert composition
src/modules/accounts/database/account_stats.ts   # additive captured-clock input only
src/constants/strings.ts                         # generic Dashboard load/retry strings
```

PR 2 owns these test surfaces:

```text
__tests__/dashboard_snapshot.query.test.ts
__tests__/dashboard.repository.test.ts
__tests__/dashboard.store.test.ts
__tests__/screens/dashboard/dashboard_hook.test.ts
__tests__/screens/dashboard/dashboard_helpers.test.ts
__tests__/screens/dashboard/dashboard_presentation.test.ts
__tests__/screens/dashboard/account_carousel.helpers.test.ts
__tests__/account_stats.query_executor.test.ts    # captured-clock coverage
```

The legacy `__tests__/screens/dashboard/dashboard_screen.test.tsx` must not be expanded. Its cold/warm/error assertions move to the logic-only `.ts` presentation test, after which the obsolete render test is deleted. Existing component `.tsx` tests unrelated to this state transition remain untouched; no new `.tsx` render tests are added.

PR 2 does not modify app routes, migrations, shared scheduler implementation, currency/category/startup files, mutation repositories/stores, HeroUI wrappers, native projects, package manifests, or PR 3 Budget/Commitment workload files.

### 4.8 PR 1 dependency assumptions

PR 2 is rebased onto PR 1 before implementation review. It assumes PR 1 provides all of the following:

- Fatal database/migration startup failures prevent the Dashboard from mounting as a usable empty app.
- The persisted currency rate/manual override is loaded before rate-dependent UI is declared ready, and a late remote request cannot overwrite newer manual state.
- The post-navigation scheduler has a cancellable, error-safe contract. PR 2 consumes the final PR 1 API and does not edit or recreate scheduler behavior.
- Category-store ownership changes do not alter Dashboard snapshot inputs; Dashboard budget facts depend on transaction category IDs and budget rows, not the category list store.

If PR 1 changes these contracts, PR 2 must update this specification or adapt only its call site after rebase. It must not carry a compatibility copy of the old unsafe scheduler.

### 4.9 Acceptance tests

All new tests are logic-only `.ts` tests.

#### Query and financial parity

- Current and previous month boundaries include the first day and exclude the next month’s first day, including January/year rollover.
- EGP/USD expense, cash income, credit-card credits, transfers, `cc_payment`, commitment-linked expenses, null categories, and out-of-range rows match current query behavior.
- Current `monthSpend.totalEgp === currentTransactionTotals.expenseEgp` for the same fixture.
- A credit-only category is clamped to zero for budget spend while month/transaction net expense may remain negative.
- Only current-month budget limits are read; multiple named budgets in one category sum correctly; only budgeted categories contribute to Dashboard budget `spent`.
- Empty tables return a successful, legitimate zero snapshot.
- Account ordering, archived exclusion, account native stats, cross-currency transfer destination amounts, and shared captured-clock boundaries remain unchanged.
- `EXPLAIN QUERY PLAN` on the transaction-facts query shows a range search using the transaction-date index; no function-wrapped date predicate is accepted.

#### Store ownership and publication

- Initial load follows `idle -> initialLoading -> ready` and makes one data-bearing publication.
- Same-key warm load preserves the exact snapshot reference while `refreshing`.
- Same-key warm failure preserves the exact snapshot and ends in `refreshErrorWithData`.
- Cold failure ends in `initialError` with `snapshot === undefined`, never a zero snapshot.
- A newer generation wins when deferred requests resolve out of order.
- Blur invalidation and `reset()` prevent late publication.
- Same-key in-flight focus/refresh calls share one repository promise.
- New-month requests do not display the old-month snapshot.
- A successful repository load issues no more than five SQL reads and only one transaction-history aggregate read.

#### Hook and presentation

- Focus schedules one snapshot request, resets the segment, and cancels/invalidate on cleanup.
- Pull-to-refresh and retry are immediate and do not use the focus scheduler.
- `refreshing` with data sets the refresh indicator but all card loading flags are false.
- Initial loading uses skeletons; initial error uses one retryable error surface; warm error keeps content and selects one overlay alert.
- Successful zero accounts selects the existing accounts empty state; initial error does not.
- Currency-rate changes re-derive account/net-worth values without a SQLite snapshot request.

#### Virtualization

- The pure threshold helper returns `false` for 7 and `true` for 8.
- Account/add discriminated items have stable unique keys and the Add Account item is last.
- Item length and offsets include the existing card width, leading margin, and inter-item gap.
- No source-string or exact Tailwind-class assertions are added.

#### Repository verification

- Targeted tests pass.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test -- --ci`, `npx --yes expo-doctor`, and Android `expo prebuild --no-install` all pass before any requested push.

### 4.10 Performance measurements

Performance evidence is collected before and after implementation on the same physical mid-range Android device, using the audit fixture:

- 5,000 transactions across at least 24 months;
- 100 active accounts distributed across all five account types;
- 100 commitments with current-month payments;
- 24 months of budget rows.

Use the same Hermes/New Architecture development client for React commit profiling and the same release-like Android build for elapsed-time/frame measurements. Record device model, Android API, build profile, fixture seed, and run count in the PR description.

Measure:

| Measurement | Method | Acceptance |
| --- | --- | --- |
| SQL reads per successful snapshot | Repository/query spy plus development trace | At most 5; exactly 1 transaction-history aggregate scan. |
| Successful data publications | Zustand subscription trace | Exactly 1 data-bearing publication per owned load. |
| Dashboard commits caused by one warm load | React Native DevTools Profiler, 20 focus cycles | No per-card completion cascade; at most the start-status and success-status commits attributable to the snapshot store. |
| Warm focus elapsed time | Focus callback to ready publication, 20 runs after 5 warmups | Median <= 100 ms and p95 <= 200 ms on the fixture. |
| Pull-to-refresh elapsed time | Refresh start to ready publication, 10 runs | Median and p95 improve from baseline; p95 <= 250 ms. |
| JS responsiveness | Android frame/Perfetto trace during focus and horizontal scroll | No Dashboard-caused JS long task >= 50 ms; no visible tab-switch stall. |
| Mounted account cards | React/native inspector on the 100-account fixture | Large groups do not mount all cards; mounted cells remain bounded to the FlatList render window. |
| Warm refresh geometry | Screen recording/layout inspection | No skeleton remount, scroll jump, card coordinate change, or account-carousel reset. |

Numeric latency targets are guardrails for the specified device fixture, not universal device SLAs. If the unchanged baseline hardware cannot meet them, the PR must still show before/after median and p95, query/publication targets must pass, and Tariq must review the trace before recommending merge. The global cold-start budget remains under two seconds and must not regress, but PR 2 does not claim startup ownership.

Physical-device QA remains mandatory before merge:

- first Dashboard entry, tab away/back, and pull-to-refresh;
- forced initial database query failure and warm refresh failure;
- zero-account database;
- 7-account and 8-account same-type boundaries;
- 100-account fixture with fast horizontal flings and account opening;
- 320/390/430-width devices or emulations plus large font scaling;
- month rollover using a controlled clock/build.

### 4.11 Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Consolidated SQL subtly changes card-credit or budget math | Financial trust regression | Preserve formulas above; parity fixtures cover every transaction type, negative expense, USD native values, and category clamp behavior. |
| Dashboard account read projection diverges from canonical mutation store | Stale balances/accounts after edits | Snapshot is read-only, invalidated on every blur, and reloaded on focus; all Dashboard mutation entry points leave/freeze the tab before returning. |
| A request finishes after blur/reset/month rollover | Old data or wrong month publishes | Monotonic generation ownership; invalidation/reset advances generation; key mismatch clears old-month presentation. |
| One subquery fails after others succeed | Partial cards or false zeroes | Repository is all-or-error and store performs one data publication only. Warm snapshot is retained. |
| Parallel reads on one SQLite connection do not improve latency | Lower-than-expected timing gain | Query count/scan consolidation is the primary gain; measure, then serialize if traces show queue churn. No index migration in this PR. |
| Conditional ScrollView/FlatList boundary resets horizontal position when count crosses 8 | Minor carousel jump | Account mutations occur off-screen and focus reload returns a new snapshot; stable keys and identical geometry are verified at 7/8. |
| FlatList clips shadows or computes offsets incorrectly | Visual regression on Android Fabric | Preserve card overflow/elevation behavior, use exact item length, test first/last items and flings on device with `removeClippedSubviews` Android-only. Disable clipping if evidence shows clipping; keep virtualization. |
| Warm error alert overlaps the global FAB or content | Retry becomes hard to use | Use the established absolute Alert treatment, verify touch targets and FAB clearance on device, and keep it outside scroll layout. |
| PR 1 scheduler API differs from the assumed cancellable contract | Rebase conflict or uncaught error path | Rebase first and consume PR 1’s final API; store actions resolve after owned error publication. Do not fork the helper. |

## 5. Open questions

There are no blocking architecture, UX, or financial questions. User sign-off authorizes plan-writing only; it does not authorize production changes, dependency/native/migration work, push, merge, or skipping the physical-device QA gate.

No immediate critical trigger is introduced by this specification: there is no new dependency, native change, migration, auth/secure-store change, data-loss risk, or branding copy. The mandatory physical-device QA gate will become a critical trigger after implementation and automated verification.
