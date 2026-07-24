# Budget and Commitments Workload Design

**Date:** 2026-07-23
**Status:** Awaiting user sign-off; no implementation plan or production code is authorized yet
**Audit slice:** PR 3 — Budget and Commitments workload
**Source audit:** `docs/superpowers/reviews/2026-07-23-whole-app-quality-performance-audit.md`
**Implementation branch:** `perf/budget-commitment-workload`

## 1. Feature summary

This audit PR reduces repeated SQLite and render work in Budget and Commitments without changing any financial result, navigation capability, database schema, or visual hierarchy.

The selected approach is:

1. Give each selected month one store-owned snapshot load and deduplicate concurrent work by month plus domain-data generation.
2. Bound Budget rows to the same 12-month history window already used for spend, while loading arbitrary copy-source months through a separate targeted preview query.
3. Replace Commitment store loops with one repository-owned housekeeping transaction whose read-query count does not grow with the number of commitments.
4. Keep successful content mounted during same-month focus refresh and pull-to-refresh; skeletons are only for a cold screen or a month with no matching snapshot.
5. Make both Budget copy entry points exclusive, serial, and atomic while retaining their current copy rules.

This is preferred over hook-only guards because Budget detail, Commitment startup, mutation, and deep-link callers can bypass a screen hook. It is preferred over a cache library or new indexes because those add dependency/schema blast radius and are not required to remove the duplicate work. Query/index changes remain audit PR 5.

### Goals

- One owned Budget load for a month selection, even when focus and other consumers request the same month concurrently.
- No full Budget history read; the primary snapshot contains exactly 12 calendar months ending at the selected month.
- No per-commitment due-date or paid-count query loop on focus.
- No old-month financial values under a newly selected month header.
- No warm-content skeleton remount on focus or manual refresh.
- No partially applied Budget copy.
- No change to recurrence, amount, spending, allocation, expiry, or copy outcomes.

### Non-goals

- No migration, index, table, or entity change.
- No conversion of transaction month predicates from `substr()` to date ranges; that remains PR 5.
- No new dependency, native code, Expo configuration, Signals migration, or query library.
- No redesign of Budget lenses, Commitment filtering, Commitment detail history, or payment posting.
- No change to existing payment statuses beyond assigning status to newly generated rows, matching current behavior.
- No implementation plan or production implementation before this spec is signed off.

## 2. Product & UX

This slice preserves the shipped information architecture: Budget keeps its month filter, three HeroUI-backed tabs, summaries, ledgers, tools, and sheets; Commitments keeps its month/status rail, summary, search/filter controls, sections, and empty states. The audit supplies the UX correction: valid content stays visible while it is revalidated.

### Budget presentation states

| Event/state | Required presentation | Geometry and interaction |
| --- | --- | --- |
| First entry, no successful snapshot | Current selected-lens `BudgetScreenSkeleton` | Header, separator, month filter, and tabs remain mounted. The skeleton owns only the content track. |
| Month changes and no matching snapshot is loaded | Skeleton for the newly selected lens | The month label changes immediately. Old income, budget, spend, plans, and 50/30/20 values are hidden. Expanded category/group state resets as it does today. |
| Same-month focus revalidation | Keep the full successful lens mounted | No skeleton remount and no expansion collapse. Background focus work does not start the native pull indicator. |
| Pull-to-refresh with warm data | Keep the full successful lens mounted | Only `RefreshControl.refreshing` changes. Summary, rows, rings, and tabs keep their existing dimensions and identities. |
| Revalidation fails with warm data | Keep the successful lens and show one retry rail | A HeroUI `Alert` with a HeroUI/project `Button` is overlaid above bottom navigation. Its minimum geometry is tokenized and does not shift or replace content. |
| Initial/new-month load fails without a matching snapshot | Stable inline error and Retry in the content track | Header/filter/tab geometry remains. No empty financial values are presented as authoritative data. |

`hasLoadedForSelectedMonth` is true only when categories are available and the Budget snapshot's `loadedMonth` equals the UI `selectedMonth`. A snapshot for another month is warm cache, not renderable financial content.

### Budget copy sheet

The source-month picker remains unrestricted. Bounded primary history must not turn an older valid source month into a false empty result.

- Opening the sheet requests a targeted source/target preview and selects all returned source budgets.
- Changing source month changes the source label immediately, clears selection, and hides rows from the previous source. Compact HeroUI `Skeleton` rows preserve the checklist track until the matching preview arrives.
- Preview failure keeps the sheet open, disables Apply, and shows a HeroUI `Alert` plus Retry in a reserved status track.
- Apply is idempotent while busy. Source selection, row selection, close, overlay dismissal, and swipe-down are disabled until persistence settles by passing `isDismissable={!copyBusy}` to the existing HeroUI-backed `Sheet`.
- The touched footer uses the existing HeroUI-backed project `Button` instead of parallel button-like `PressableFeedback` styling. Checklist rows continue to compose HeroUI `Checkbox` with `PressableFeedback` because the full row is the accessible checkbox target.
- Transaction failure keeps the sheet, source month, and selected IDs intact and shows a copy error. Successful persistence closes the sheet once; a later snapshot refresh failure is a screen refresh error, not a copy failure, so the UI never invites the user to repeat an already committed copy.

### Commitments presentation states

| Event/state | Required presentation | Geometry and interaction |
| --- | --- | --- |
| First entry, no selected-month snapshot | Existing row and summary skeletons | Header and `FilterRail` remain mounted. Empty states wait for a successful snapshot. |
| Month changes | Cold content for the new month until its snapshot arrives | Old payments, counts, and totals are hidden under the new month label. Search/filter selections remain controlled. |
| Warm focus | Existing summary, search, sections, and rows remain mounted | Housekeeping runs only if stale. No summary skeleton and no native pull indicator. |
| Pull-to-refresh with warm data | Existing summary and rows remain mounted | The native `RefreshControl` is the progress affordance; `SummaryHeader` does not receive `isLoading=true`. |
| Revalidation fails with warm data | Preserve all matching-month content and show one retry rail | The retry rail uses HeroUI `Alert` and `Button`, is anchored without shifting list geometry, and never substitutes financial zeroes. |
| Initial/new-month load fails | Stable error/retry content in the list body | No welcome/month-empty state is shown until a matching snapshot succeeds. |
| Successful empty month | Existing month-empty state | It appears only from a successful selected-month snapshot. A warm refresh does not swap it for skeletons. |
| Successful zero active commitments | Existing full Commitments empty state | It stays mounted during later warm revalidation instead of flashing the list shell. |

The status rail is a single bounded surface per screen, not one alert per card or section. Text comes from `Strings`; it is operational copy, not new branded/hero copy.

### HeroUI and layout constraints

- Full-screen roots remain `Screen`/`ScreenScroll`; no direct `SafeAreaView` is introduced.
- Alerts, Buttons, Checkboxes, Skeletons, tabs, and sheets use the installed HeroUI Native primitives or existing HeroUI-backed project wrappers.
- The copy sheet remains the project `Sheet`, controlled by `isOpen`/`onOpenChange`; it does not add an imperative gorhom wrapper.
- Layout-critical flex styles remain explicit `style` props where Fabric requires them.
- No arbitrary hex, spacing, radius, or fixed typography is added. Status/skeleton geometry uses `Size`, `Spacing`, and existing theme tokens and must allow accessibility text growth rather than clipping it to a hard height.

## 3. Financial Logic

This PR is a workload rewrite only. The following invariants are binding.

### Budget invariants

1. A Budget row remains an exact `(category_id, effective_from, name COLLATE NOCASE)` monthly allocation. Multiple named budgets per category/month remain valid.
2. Category planned amount remains the sum of all named Budget rows for that category and selected month.
3. Named-budget spend remains attributed only when transaction `budget_id`, transaction category, transaction type, and calendar month match the referenced Budget row.
4. Category spend remains EGP-denominated expense spend, including commitment-payment expenses; credit-card income remains an expense offset; displayed net spend remains clamped at zero.
5. Expected income and category-group snapshots remain exact-month values. No fallback from another month is introduced.
6. The 50/30/20 lens keeps its current Need/Want/Savings grouping, target, planned, actual, variance, and ungrouped-category formulas.
7. Spending Plans remain selected by their existing date-overlap rules and keep their current category allocation/spend formulas.
8. Category history remains the 12 calendar months ending at the selected month, oldest first. Months without a Budget remain absent from the category result history, as today.

### Atomic Budget copy semantics

For `copyBudgetsToMonth(sourceMonth, targetMonth, budgetIds)`:

- Duplicate input IDs are deduplicated in first-seen order.
- An ID is copied only if it resolves to a Budget in `sourceMonth`; missing IDs and IDs from another month remain ignored.
- A target with the same category and case-insensitive name is updated in place. Its `id` and `created_at` remain unchanged so existing transaction `budget_id` links survive.
- A missing target receives a new UUID and the source amount/name/category.
- Month category-group snapshots are copied only for categories represented by successfully selected source Budget rows.
- Expected income and Spending Plans are not copied.
- Source selection, target reads, serial Budget writes, and category-group copies execute inside one `withExclusiveTransactionAsync` boundary. Any thrown write rolls back every Budget/group change.

The legacy `copyLimitsToMonth(sourceMonth, targetMonth, categoryIds)` entry point receives the same exclusive/serial all-or-nothing guarantee and bounded source/target reads. It keeps its existing output semantics: all source Budget rows for the selected categories are copied by natural key, without adding the group-snapshot behavior owned by `copyBudgetsToMonth`.

If persistence commits but the target snapshot reload fails, the copy is still successful. The store invalidates its generation and exposes a revalidation error while retaining the last matching snapshot; retry performs a read, not a second financial write.

### Commitment invariants

1. `computeDueDates` remains the sole recurrence calculator, including end-of-month/leap-year behavior, `AfterCount`, `UntilDate`, `Forever`, and the current `maxCount: 64` cap.
2. Housekeeping evaluates one captured UTC ISO timestamp/date for the whole transaction, preserving the current ISO `YYYY-MM-DD` lexical comparison semantics.
3. Existing due dates for a commitment suppress generation regardless of payment status. Existing paid/skipped rows are never deleted or rewritten by housekeeping.
4. New payment rows keep the commitment's amount (including `null` for unestimated variable commitments), currency, and default account. Paid amount, exchange-rate snapshot, transaction link, and notes remain null at generation.
5. A newly generated due date is `overdue` when before the captured date, `due` when equal, and `upcoming` when after it. This PR does not age statuses on existing rows.
6. `UntilDate` deactivates only when the captured date is strictly later than non-null `end_date`.
7. `AfterCount` deactivates only when its paid-payment count is greater than or equal to non-null `end_after_count`.
8. `Forever`, inactive, and incomplete-duration rows retain current behavior.
9. Payment posting remains the existing atomic payment/transaction/account operation. EGP/native conversion, archived-account rejection, credit-card liability deltas, and retry idempotency do not change.
10. Monthly counts keep excluding skipped payments from `total`; totals keep excluding skipped rows, using `amount_paid ?? amount_due` for paid rows and `amount_due` for unpaid rows, and excluding null estimates.

Housekeeping runs generation before expiry deactivation inside the transaction, matching the current focus order. If any housekeeping write fails, no generated payment or deactivation from that run commits, and the stale key is not marked current.

## 4. Architecture

### Selected boundaries

- Repositories own complete database work units and transaction boundaries.
- Zustand domain stores own request generation, in-flight deduplication, staleness, and coherent publication.
- Screen hooks own focus/month/manual-refresh intent and view-model derivation.
- `.state.ts` stores own only UI state such as selected month, refresh gesture, expansion, sheet visibility, copy busy/error, and selections.
- Screens choose presentation from explicit matching-snapshot state and compose HeroUI primitives.

No Signals compatibility layer is introduced. All store fields/actions remain top-level per `AGENTS.md`, and consumers use shallow grouped reads with actions read from `getState()`.

### Data model, schema, and migrations

There is no schema migration.

The implementation uses existing structures:

- `budgets` has `idx_budgets_month` and a case-insensitive unique natural key on category/month/name.
- `commitment_payments` has indexes on commitment, due date, and status.
- Existing Budget month-profile, Spending Plan, transaction, commitment, and payment entities remain unchanged.

No index may be added in this PR. If `EXPLAIN QUERY PLAN` or device evidence demonstrates an index requirement, that is a PR 5 proposal and a schema-migration critical trigger requiring user sign-off.

### Budget repository snapshot and bounded reads

`BudgetRepository` gains one logical month snapshot API:

```ts
interface BudgetMonthSnapshot {
  loadedMonth: string;
  rows: Budget[];
  spendByMonth: Record<string, Record<string, number>>;
  spendByBudgetId: Record<string, number>;
  expectedIncome: number | null;
  budgetGroupByCategoryId: BudgetMonthGroupMap;
  spendingPlans: SpendingPlanWithCategories[];
  spendingPlanSpendById: Record<string, Record<string, number>>;
  incomeSuggestion: number | null;
}

getMonthSnapshot(anchorMonth: string, historyMonths?: number): Promise<BudgetMonthSnapshot>;
getCopyPreview(sourceMonth: string, targetMonth: string): Promise<Budget[]>;
```

`getMonthSnapshot` computes `lastMonths(anchorMonth, 12)` once and uses it for Budget rows, category spend, and named-budget spend. `getBudgetRowsForMonths(db, months)` returns only those explicit months using the existing month index; empty input returns immediately. Expected income, group snapshots, active Spending Plans, and the trailing income suggestion retain their current selected-month rules.

`getCopyPreview` reads only `sourceMonth` and `targetMonth`. Copy persistence uses targeted selected-source and target-month reads inside its transaction; neither path calls full-history `getBudgetRows()`.

Category metadata stays in the Category store. Budget only requests it when Category has no successful data; category mutations continue to own their reload. PR 1's Category request ownership remains authoritative.

### Budget store ownership

The Budget store keeps its current financial fields and adds fetched-data state, not UI state:

```ts
interface BudgetStoreShape {
  // existing financial snapshot fields
  loadedMonth: string | undefined;
  loaded: boolean;
  loadError: boolean;
  incomeSuggestion: number | null;

  copyPreviewRows: Budget[];
  copyPreviewSourceMonth: string | undefined;
  copyPreviewTargetMonth: string | undefined;
  copyPreviewLoaded: boolean;
  copyPreviewError: boolean;
}
```

Store-private closure state contains:

- a monotonically increasing domain-data generation;
- the latest publication request ID/month;
- `Map<month:generation, Promise<BudgetMonthSnapshot>>` for in-flight month work;
- an equivalent source/target/generation map and publication token for copy preview.

Concurrent callers for the same key share one repository promise. Every caller still receives an ownership token; only the latest requested month/generation may publish. Different-month work may finish but cannot overwrite the latest month. `finally` removes settled promises so later focus/refresh performs a real revalidation.

Every successful Budget mutation increments the data generation before requesting a reload. It therefore cannot join a pre-mutation snapshot promise. Reset increments the generation, clears both in-flight ownership surfaces, and restores initial state.

Month selection has one owner: `useBudget().setSelectedMonth` mutates `budget.state.ts` only. The focused hook effect keyed by `selectedMonth` initiates the month snapshot. It does not also call `load()` from the setter. Pull-to-refresh and mutation follow-up may call the same store action; in-flight deduplication absorbs overlap.

The income suggestion moves from `budget.state.ts` and direct hook database access into the owned Budget snapshot. This removes its parallel request counter and prevents another duplicate month query path.

Copy preview data lives in the Budget store. Copy visibility, source selection, selected IDs, `copyBusy`, and `copyError` stay as top-level UI fields/actions in `budget.state.ts`.

### Commitment repository housekeeping

`CommitmentRepository` gains:

```ts
interface CommitmentMonthSnapshot {
  loadedMonth: string;
  commitments: Commitment[];
  payments: CommitmentPayment[];
}

runHousekeeping(asOfIso: string): Promise<void>;
getMonthSnapshot(yearMonth: string): Promise<CommitmentMonthSnapshot>;
```

`runHousekeeping` opens one `withExclusiveTransactionAsync` and performs:

1. One active-commitments read from the transaction.
2. One joined read of `(commitment_id, due_date)` for all active commitments; no `IN` placeholder growth and no per-commitment query.
3. Pure `computeDueDates`/missing-date planning in JS with one captured timestamp and injected UUID factory in tests.
4. Serial `INSERT OR IGNORE` payment-row writes through a low-level helper that does not open a nested transaction.
5. One SQL deactivation update. `UntilDate` uses `end_date < asOfDate`; `AfterCount` uses a correlated paid-count subquery backed by the existing commitment index. There is no store loop and no per-commitment paid-count call.

Generation precedes deactivation to preserve current outcomes. The exclusive transaction makes the whole housekeeping run atomic.

`getMonthSnapshot` reads active commitments and the exact due-date range for the requested month, then returns them as one repository result. The store publishes both arrays in one Zustand `set`, eliminating intermediate full-screen states.

### Commitment store ownership and staleness

The current top-level arrays and compatibility booleans remain to minimize consumer churn, with two ownership fields added:

```ts
interface CommitmentStoreState {
  commitments: Commitment[];
  payments: CommitmentPayment[];
  selectedMonth: string;
  commitmentsLoaded: boolean;
  paymentsLoaded: boolean;
  loadedMonth: string | undefined;
  loadError: boolean;
}
```

`loadedMonth === selectedMonth` is the only proof that counts, totals, rows, or empty states belong under the selected header. The booleans remain compatibility state and are set together by coherent snapshot publication.

Store-private state contains:

- `dataGeneration`, incremented after every successful commitment/payment mutation and on reset;
- `lastSuccessfulHousekeepingKey`, formatted as `<UTC-date>:<dataGeneration>`;
- one in-flight housekeeping promise per key;
- one in-flight month-snapshot promise per `<month>:<dataGeneration>`;
- latest request ID/month for publication ownership.

`ensureHousekeepingCurrent()` shares an in-flight promise. It skips repository housekeeping only when the exact UTC day/generation key succeeded. Failure leaves the key stale. A mutation that settles while older housekeeping is in flight increments generation; the old transaction cannot mark the new generation current, and the next owner reruns it.

`loadMonthSnapshot(yearMonth, { ensureHousekeeping: true })` performs stale housekeeping first, then one resulting month snapshot read. A warm same-month load never clears arrays or loaded flags. A different month may retain the old snapshot internally, but presentation is cold until `loadedMonth` matches. An owned failure sets `loadError`, preserves prior data, and rethrows so PR 1's deferred error boundary receives it.

`setSelectedMonth` synchronously changes the selected month and invokes this unified load once. Focus and manual refresh call the same action; concurrent same-key calls share work. The old `loadCommitments`/`loadPaymentsForMonth` combination is removed from canonical callers rather than retained as a second orchestration path.

Mutation actions own invalidation and their required follow-up:

- Add marks the generation stale and ensures housekeeping; the add hook no longer calls generation separately.
- Update keeps its schedule-regeneration semantics, then invalidates and reloads the selected snapshot.
- Paid/skip/deactivate operations invalidate and reload once; pay-sheet callers do not issue a second payment read.
- Payment posting remains repository-atomic and unchanged.

### PR 1 integration dependency

PR 3 implementation must be based on `fix/startup-async-ownership` as inspected at `239185bf176d04109740d3e7e15f71ef59cd80cf`, or rebased onto its merged equivalent before production work starts. It is not safe to implement against the current PR 3 branch base and resolve the overlap later by choosing one side.

The exact overlaps are:

1. `src/modules/commitments/screens/commitments/commitments.hook.ts`: PR 1 changes the focus call to `runAfterInteractions(callback, { onError })`. PR 3 replaces only the callback workload with the unified owned month snapshot and preserves the `onError` option/cancellation behavior. The store records the owned UI error and rethrows; PR 1's handler contains/logs the deferred failure without a timer throw.
2. `src/utils/use_layout_init.hook.ts`: PR 1's `scheduleCommitmentHousekeeping()` is optional post-ready work. PR 3 changes its two calls (`generatePayments` then `checkAndDeactivateExpired`) to one `ensureHousekeepingCurrent()` call. It remains queued after app-ready, is never awaited by the splash gate, and keeps PR 1's local warning boundary.
3. `__tests__/use_layout_init.test.ts` and `__tests__/screens/commitments.hook.test.ts`: PR 3 updates expectations on top of PR 1's safe deferred-task contract; it must not restore asynchronous throws or drop `onError` coverage.

Because startup and the Commitments screen use the same singleton store closure, a successful post-ready housekeeping run makes the first same-day tab focus current. The tab performs the month snapshot reads but no housekeeping transaction or per-commitment loop.

### Folder layout and file ownership

No route file changes. Canonical work stays in modules.

Budget-owned production surface:

- `src/modules/budget/database/budgets.ts` — bounded/targeted Budget-row queries.
- `src/modules/budget/repositories/budget.repository.ts` — month snapshot, copy preview, and atomic copy transaction APIs.
- `src/modules/budget/store/budget.store.ts` — generation, in-flight ownership, snapshot/copy-preview publication.
- `src/modules/budget/screens/budget/budget.hook.ts` — single month-load owner and presentation inputs.
- `src/modules/budget/screens/budget/budget.state.ts` — UI-only refresh/copy busy/error/selection state.
- `src/modules/budget/screens/budget/budget.helpers.ts` — pure matching-snapshot/copy presentation decisions where needed.
- `src/modules/budget/screens/budget/index.tsx` — warm-content and error-rail composition.
- `src/modules/budget/screens/budget/components/budget_copy_sheet.tsx` — targeted preview, busy/error geometry, HeroUI controls.

Commitment-owned production surface:

- `src/modules/commitments/database/commitments.ts` — transaction-safe expiry update.
- `src/modules/commitments/database/commitment_payments.ts` — batched due-date facts and non-nesting payment inserts.
- `src/modules/commitments/repositories/commitment.repository.ts` — housekeeping transaction and month snapshot.
- `src/modules/commitments/repositories/commitment_housekeeping.helpers.ts` — small pure planner for missing payment rows; no new abstraction layer.
- `src/modules/commitments/store/commitment.store.ts` — stale key, in-flight ownership, coherent snapshot, mutation invalidation.
- `src/modules/commitments/screens/commitments/commitments.hook.ts` — PR 1-compatible focus/manual-refresh orchestration.
- `src/modules/commitments/screens/commitments/commitments.state.ts` — UI-only manual refresh/filter state.
- `src/modules/commitments/screens/commitments/index.tsx` — matching-snapshot, warm summary/list, and error rail.
- `src/modules/commitments/screens/commitments/add_commitment/add_commitment.hook.ts` and `detail/components/pay_sheet.hook.ts` — remove duplicate follow-up reads/generation.

Narrow integration surface:

- `src/utils/use_layout_init.hook.ts` — PR 1 optional housekeeping call-site update.
- `src/modules/transactions/screens/transactions/detail/detail.hook.ts` — deep-link preparation uses the unified selected-month load instead of parallel commitment/month reads.
- `src/constants/strings.ts` and, only if no existing semantic size fits, `src/constants/theme.ts` — operational errors and shared non-clipping status minimum geometry.

Out of ownership: `src/app/`, migrations, entities, transaction financial policy/amount modules, Dashboard PR 2 files, package manifests, native projects, and shared `Sheet` internals.

### Key API pattern

The stores use one reusable ownership shape, not a new generic framework:

```ts
const key = `${month}:${dataGeneration}`;
const request = ++latestRequest;
latestRequestedMonth = month;
const promise = inFlight.get(key) ?? startRepositorySnapshot(month, key);

try {
  const snapshot = await promise;
  if (request !== latestRequest || month !== latestRequestedMonth) return;
  set({ ...snapshot, loaded: true, loadError: false });
} catch (error) {
  if (request === latestRequest && month === latestRequestedMonth) {
    set({ loadError: true });
  }
  handleOwnedError(error);
}
```

The concrete Budget and Commitment stores implement this directly in small closures. Budget consumes expected read failures into `loadError`; Commitment records the error and rethrows to PR 1's supplied deferred-task handler. This avoids a speculative shared async framework while making ownership and error delivery explicit and testable.

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Same-month dedupe accidentally becomes a permanent cache | Remove each in-flight promise in `finally`; dedupe only concurrent work. |
| A mutation joins a stale pre-mutation request | Include domain-data generation in the key and increment it immediately after successful persistence, before reload. |
| Old-month data appears under a new header | Gate all render/empty/error decisions on `loadedMonth === selectedMonth`, not on arrays or generic loaded booleans. |
| Startup and focus both run housekeeping | Share the singleton day/generation key; startup success makes focus a no-op for housekeeping. |
| Nested Expo SQLite transactions behave unexpectedly | Low-level insert/update query helpers never open a transaction when called by repository housekeeping/copy transactions. |
| Large first housekeeping insert is still expensive | Eliminate N read queries, use one transaction, reuse bounded computations, schedule startup work post-ready, and measure the 100-commitment fixture. Optimize writes only with evidence. |
| Bounded Budget history breaks old copy sources | Use a targeted arbitrary source/target preview and targeted transaction reads rather than constraining the picker. |
| Copy commits but reload fails | Treat persistence as success, close once, retain warm content, expose read retry, and never retry the write implicitly. |
| PR 1 conflict drops safe async handling | Rebase before implementation and preserve `runAfterInteractions(..., { onError })` plus post-ready startup semantics. |
| Profiling suggests a new index | Stop and escalate it to PR 5; do not add a migration in this PR. |

## Tests

All new behavioral coverage is logic-only `.ts`. No new `.tsx` render test is added. Existing legacy `.tsx` suites may receive only the minimum expectation maintenance required by changed presentation contracts; new state/geometry coverage belongs in pure helpers, stores, repositories, and hooks.

### Budget

- Extend `__tests__/budgets.query.test.ts`: empty month list, explicit 12-month inclusion, exclusion of month 13/24, and targeted source/target rows.
- Add/extend repository `.ts` coverage: snapshot passes one 12-month list to row/spend queries; arbitrary copy preview; copy ID filtering; case-insensitive target replacement with identity preservation; selected-category group copy; exclusive transaction; serial stop-on-failure; and all-or-nothing behavior for both copy APIs.
- Add/extend Budget store `.ts` coverage: concurrent same month/generation shares one repository call; different months do not share; A/B and A/B/A stale publication; mutation generation supersedes in-flight work; reset invalidation; warm failure preserves data; initial/new-month failure is not an empty success; copy preview source switching cannot publish old rows.
- Update Budget hook/state `.ts` coverage: month setter does not call load directly; focused selected month owns one load; refresh keeps matching snapshot present; income suggestion comes from the snapshot; copy source resets selection until matching preview; copy busy is idempotent; transaction failure preserves sheet state; commit plus reload failure does not re-run copy.
- Preserve current helper tests for all formulas, named Budget identity, copy status, 50/30/20, and 12-month category history.

### Commitments

- Extend payment/query `.ts` coverage: one joined active-commitment due-date read; non-nesting inserts; one expiry update with strict UntilDate and paid-count AfterCount boundaries; paid/skipped rows unchanged.
- Add repository housekeeping `.ts` coverage: exact current due-date/status/amount generation; no duplicate dates on repeat; generation-before-deactivation; exclusive transaction rollback; fixed query count for 1 versus 100 commitments; month snapshot exact range.
- Extend Commitment store `.ts` coverage: startup/focus same-day dedupe; concurrent callers share work; UTC day rollover reruns; successful add/update/pay/skip/deactivate increments generation; in-flight old generation cannot mark new current; failure remains stale; month A/B stale suppression; coherent one-set publication; warm error retention; initial/new-month error.
- Update `__tests__/screens/commitments.hook.test.ts`: focus invokes one unified load through PR 1's cancellable `runAfterInteractions` with `onError`; pull refresh invokes it immediately once; month selection invokes it once; warm UI derivation does not mark summary loading.
- Update `__tests__/use_layout_init.test.ts`: housekeeping remains post-ready/nonblocking, calls only `ensureHousekeepingCurrent`, and its failure remains optional/contained.
- Preserve existing recurrence, payment posting, account delta, monthly totals/counts, search/filter, and detail-history tests.

## Performance measurements and acceptance

Use the same physical mid-range Android device, Hermes build, and seeded database before and after this PR. Seed 5,000 transactions, 100 commitments, 100 accounts, and 24 months of Budget rows. Record at least 20 repetitions per action and report median/p95 plus SQL/repository call counts in the PR evidence.

### Structural acceptance

- Budget month switch starts at most one repository month snapshot for a given month/generation and publishes at most one coherent Budget snapshot.
- The Budget primary row query returns at most the requested 12 months; copy preview/transaction reads only source and target.
- No frame renders old-month Budget/Commitment financial values under a new month header.
- Current Commitment housekeeping performs zero repository/SQL work on warm same-day focus.
- Stale Commitment housekeeping uses two batched reads, one expiry update, and only the required inserts; read-query count is the same for 1 and 100 commitments.
- Commitment snapshot publishes commitments and month payments together once.
- Same-month focus/pull refresh mounts no full Budget skeleton and no Commitment summary/row skeleton.
- Refresh failure preserves the previous matching financial snapshot and presents Retry; it never presents valid-looking zeroes or an uncaught deferred rejection.
- Optional startup housekeeping remains after app-ready, so the app's `<2s` cold-start budget is not extended by Commitment IO.

### Device evidence

- Capture React DevTools Profiler/Performance Monitor traces for Budget tab entry, alternating month switches, Commitments first stale focus, Commitments current warm focus, and pull-to-refresh on both screens.
- Capture SQLite statement counts for those actions and `EXPLAIN QUERY PLAN` for the new bounded Budget-row query plus the two Commitment housekeeping reads. This PR may use existing indexes only.
- Acceptance requires no JS long task over 50 ms attributable to snapshot assembly/housekeeping on the seeded fixture, no visible tab/month-selection stall, and p95 action time no worse than baseline. Budget month-switch and current Commitment warm-focus p95 must improve versus the audit baseline; report the measured delta rather than hiding it behind a pass/fail label.
- Manual physical-device geometry QA is still required before merge: rapid month changes, refresh failure/retry, overnight stale housekeeping, copy preview outside the 12-month window, copy failure/retry, large text, and Android Fabric sheet dismissal while busy.

## 5. Open questions

None before spec sign-off. The design deliberately avoids all current critical implementation triggers: no dependency, native change, migration, data deletion, auth/secure-store work, or branded copy.

Two conditional triggers remain explicit:

1. If implementation or profiling requires an index/schema change, stop this PR and request user sign-off for the PR 5 migration.
2. Manual physical-device QA is a mandatory user-facing gate before any merge recommendation.
