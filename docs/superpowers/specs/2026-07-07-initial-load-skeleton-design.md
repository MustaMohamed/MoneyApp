# Initial Load Skeleton Design

## Context

Some numeric summary UI paints before its async data is ready. The first render uses real-looking empty values such as `0`, `—`, empty maps, or `null`; once database queries finish, the text expands into the actual amounts and counts. That creates a visible layout shift on first load.

HeroUI Native v1.0.3 includes `Skeleton` and `SkeletonGroup`. The installed docs recommend `SkeletonGroup` when multiple placeholders share one loading state, with `SkeletonGroup.Item` wrapping each placeholder/content slot. This matches the MoneyApp summary cards: a card or header should keep its final footprint while only the number slots shimmer until the data is ready.

## Goals

- Prevent first-load layout shifts in numeric summary surfaces.
- Distinguish real zero values from data that has not loaded yet.
- Use HeroUI Native `SkeletonGroup` and `SkeletonGroup.Item`; do not build custom skeleton primitives.
- Keep skeletons local to presentational summary components while loading readiness stays in hooks/stores.
- Preserve the approved dashboard, Transactions, and Commitments layouts after data is ready.

## Non-Goals

- Do not redesign card layouts, colors, typography, or copy.
- Do not add new data fetching.
- Do not change transaction, commitment, or dashboard financial calculations.
- Do not add skeletons to every list row; this task targets numeric summary shift only.
- Do not replace existing full-screen/list empty states or spinners where the whole screen genuinely has no content yet.

## Scope

### Dashboard Overview

Add skeleton support for async summary numbers:

- `StatCards` month-spent values and previous-month delta area.
- `TransactionsCard` current totals, progress rail, comparison row, and previous-month label.
- `CommitmentsCard` total committed line, progress badge/rail, and status counts.

The account-derived hero and net-worth values remain outside this pass unless implementation evidence shows they have the same not-ready state. Those values derive from the account store already mounted by the app shell and should not be blocked by dashboard-only async query readiness.

### Transactions Screen

The `TotalsStrip` area should keep a fixed summary-card footprint while totals load. The screen should not simply omit the strip, because insertion after the query completes shifts the search row and list.

### Commitments Screen

`SummaryHeader` should render with skeleton number slots while monthly payments are loading. It should not display `0%`, `—`, and zero status counts as if those are final values.

## Root Cause

Dashboard async data in `useDashboardStore` currently starts as empty values:

- `currentMonthSpend = { totalEgp: 0, usdNative: 0, count: 0 }`
- `currentTransactionTotals = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 }`
- `previousTransactionTotals = null`
- `currentMonthCommitmentPayments = []`

Those are valid loaded states for a user with no activity, but they are also used before async queries finish. The UI cannot tell the difference, so it paints final-looking numbers, then changes once data arrives.

Transactions totals already use `null` locally before loading, but the UI hides `TotalsStrip` until the value exists. That prevents wrong numbers but still shifts the layout when the card is inserted.

Commitments already expose `paymentsLoaded`, but `SummaryHeader` only renders after commitments exist and then computes from `payments`, so it can show empty numeric summaries while the selected month payments are still loading.

## Architecture

### Loading State Contract

Readiness should be explicit and granular:

- Dashboard store gains loaded flags for async numeric sections:
  - `monthSpendLoaded`
  - `transactionTotalsLoaded`
  - `commitmentPaymentsLoaded`
- Set each flag to `true` only after its loader succeeds.
- Reset relevant flags when the dashboard store resets.
- Refresh should keep existing loaded data visible while refreshing; skeletons are for initial load or section reload where no ready data exists.

Transactions keeps its local `totals === null` readiness, but the screen should render a skeleton totals card in that state.

Commitments uses existing `paymentsLoaded` for `SummaryHeader` skeleton state.

### Component Contract

Presentation components receive a boolean loading prop:

- `StatCards`: `monthSpendLoading`
- `TransactionsCard`: `isLoading`
- `CommitmentsCard`: `isLoading`
- `TotalsStrip`: `isLoading`
- `SummaryHeader`: `isLoading`

Components remain presentational:

- no Zustand reads
- no async calls
- no local React state
- no financial calculation changes beyond existing derived display logic

### Skeleton Pattern

Use `SkeletonGroup` around each summary component that has multiple number slots under one loading flag.

Use `SkeletonGroup.Item` for:

- primary number text
- secondary number text
- percentage/delta badges
- progress rails when the final rail width depends on unloaded data
- compact status count slots

Skeleton item dimensions should approximate the loaded content and preserve card height. The final content stays inside each `SkeletonGroup.Item`, following HeroUI Native docs, so when `isLoading` flips to `false`, layout stays in the same position.

## Data Flow

Dashboard:

1. Initial store values render with loaded flags set to `false`.
2. `useDashboard` exposes derived booleans:
   - `monthSpendLoading = !monthSpendLoaded`
   - `transactionsLoading = !transactionTotalsLoaded`
   - `commitmentsLoading = !commitmentPaymentsLoaded`
3. Loaders set their loaded flag when their async work completes successfully.
4. Components render skeleton number slots while their loading prop is true.

Transactions:

1. `useTransactions` keeps `totals` as `null` until current and previous period totals load.
2. `TransactionsScreen` always reserves the totals-strip region.
3. `TotalsStrip` renders skeleton slots when `isLoading` is true, otherwise renders numbers.

Commitments:

1. `useCommitments` already exposes `paymentsLoaded`.
2. `SummaryHeader` receives `isLoading={!paymentsLoaded}`.
3. It renders skeleton slots until the selected month payments are loaded.

## Testing

Add or update tests before implementation:

- Dashboard store tests:
  - initial loaded flags are false.
  - setters mark loaded flags true.
  - reset clears loaded flags.

- Dashboard hook tests:
  - exposes dashboard loading flags before setters run.
  - exposes loaded state when mocked store flags are true.

- Component tests:
  - `TransactionsCard` shows skeleton placeholders when loading and hides amount text.
  - `CommitmentsCard` shows skeleton placeholders when loading and hides final totals/counts.
  - `TotalsStrip` can render as a skeleton while `current`/`previous` are unavailable.
  - `SummaryHeader` skeleton state does not render `—`, `0%`, or zero status counts as final data.

- Screen tests:
  - Transactions screen keeps the totals region mounted while totals are loading.
  - Commitments screen passes loading state to `SummaryHeader` while payments are loading.

Mock updates:

- Extend `__mocks__/heroui-native.tsx` or local test mocks with minimal `SkeletonGroup` support where needed.

## Manual QA Gate

Device QA is required after implementation:

- Open Dashboard from cold start and confirm summary cards do not jump when numbers appear.
- Open Transactions from cold start and confirm the totals card area stays in place before totals appear.
- Open Commitments from cold start and confirm the summary card keeps its size before totals/counts appear.
- Pull to refresh after data is loaded and confirm existing data remains visible instead of flashing skeletons.
- Check empty-real-data cases: a month with no transactions or no commitment payments should show real zero/empty summaries after loading, not an endless skeleton.

## Risks and Mitigations

- Risk: confusing real zero with loading.
  - Mitigation: loaded flags are explicit and separate from numeric values.

- Risk: skeleton wrappers change card dimensions.
  - Mitigation: use fixed skeleton dimensions matching the existing text slots and keep card containers mounted.

- Risk: hiding useful refresh data.
  - Mitigation: skeletons are only for not-yet-loaded sections; refresh keeps already loaded data visible.

- Risk: adding logic to presentational components.
  - Mitigation: components only receive `isLoading`; stores/hooks own readiness.

## Acceptance Criteria

- First-load numeric summary surfaces use HeroUI Native skeletons instead of final-looking placeholder numbers.
- Dashboard, Transactions, and Commitments summary regions keep stable vertical footprint while data loads.
- Real zero values display normally after loading completes.
- Refreshing loaded data does not flash skeletons.
- No custom skeleton primitive is introduced.
- Automated tests cover loading and loaded states for the affected stores, hooks, components, and screens.
