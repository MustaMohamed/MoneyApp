# Transaction State Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make transaction list, totals, detail, and form lifecycle states query-safe, refresh-stable, retryable, and persistent across navigation without changing the approved visual design.

**Architecture:** The transaction data store owns a deterministic query key and the snapshot produced by that key. The screen hook derives a presentation state only when the active controls and snapshot key match, while screen-only persistence such as scroll offset and totals request state remains in `transactions.state.ts`. Detail data remains in its store, explicit load/revalidation state remains in its state file, and form sheets close through save-aware state actions that defer resets until the close transition completes.

**Tech Stack:** React Native, Expo Router, TypeScript strict, Zustand v5, React Hook Form/Zod, HeroUI Native `Sheet`, Jest, React Native Testing Library.

---

### Task 1: Query-Keyed Transaction Snapshots

**Files:**
- Create: `src/modules/transactions/store/transaction_query.helpers.ts`
- Modify: `src/modules/transactions/store/transaction.store.ts`
- Modify: `src/modules/transactions/index.ts`
- Test: `__tests__/transactions/transaction_query.test.ts`
- Test: `__tests__/transaction.store.test.ts`

- [ ] **Step 1: Write deterministic query-key tests**

Add tests proving that equivalent filters generate the same key after trimming search and sorting/deduplicating ID arrays, and that financial/date/type changes generate different keys:

```ts
expect(
  getTransactionQueryKey({ search: ' rent ', accountIds: ['b', 'a', 'a'] }),
).toBe(getTransactionQueryKey({ search: 'rent', accountIds: ['a', 'b'] }));
expect(getTransactionQueryKey({ amountMin: 10 })).not.toBe(
  getTransactionQueryKey({ amountMin: 11 }),
);
```

- [ ] **Step 2: Run the query-key test and verify RED**

Run: `npm test -- --runInBand __tests__/transactions/transaction_query.test.ts`

Expected: FAIL because `transaction_query.helpers.ts` does not exist.

- [ ] **Step 3: Implement normalized query keys**

Create a pure helper with a stable property order:

```ts
export function getTransactionQueryKey(filters: TransactionListFilters): string {
  return JSON.stringify({
    type: filters.type ?? null,
    search: filters.search?.trim() || null,
    accountIds: normalizeIds(filters.accountIds),
    categoryIds: normalizeIds(filters.categoryIds),
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    amountMin: filters.amountMin ?? null,
    amountMax: filters.amountMax ?? null,
    amountCurrency: filters.amountCurrency ?? null,
  });
}
```

`normalizeIds` returns `null` for no IDs and otherwise returns a sorted, deduplicated copy without mutating caller input.

- [ ] **Step 4: Run the query-key test and verify GREEN**

Run: `npm test -- --runInBand __tests__/transactions/transaction_query.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing store transition tests**

Extend `transaction.store.test.ts` to require this top-level state contract:

```ts
type TransactionListStatus =
  | 'idle'
  | 'initialLoading'
  | 'ready'
  | 'empty'
  | 'firstLoadError'
  | 'refreshing'
  | 'refreshErrorWithData';
```

Cover these behaviors directly:

1. `setQuery()` immediately stores `queryKey`, clears `snapshotKey`, clears old rows, and enters `initialLoading`.
2. A successful response stores the same `snapshotKey` and resolves to `ready` or `empty`.
3. An initial failure resolves to `firstLoadError` and exposes `retry()` without converting the error to empty data.
4. `refresh()` keeps rows and `snapshotKey` visible while status is `refreshing`.
5. A refresh failure keeps rows and resolves to `refreshErrorWithData`.
6. `loadMore()` preserves existing rows and ignores stale pages after a query change.
7. Out-of-order query responses cannot replace the active snapshot.

- [ ] **Step 6: Run the store tests and verify RED**

Run: `npm test -- --runInBand __tests__/transaction.store.test.ts`

Expected: FAIL because the current store has only `loading`/`hasLoaded` and writes query ownership after fetch.

- [ ] **Step 7: Implement the snapshot state machine**

Refactor `transaction.store.ts` so it owns:

```ts
interface TransactionListState {
  transactions: Transaction[];
  query: TransactionListFilters;
  queryKey: string;
  snapshotKey: string | undefined;
  status: TransactionListStatus;
  hasMore: boolean;
  loadingMore: boolean;
  mutationVersion: number;
}
```

Use separate request counters for replacement/refresh and pagination. New queries invalidate both counters. `setQuery()` is a no-op only when the active key already has a current or in-flight snapshot. `refresh()` never clears current rows. `retry()` repeats the current query. Mutation refresh failures remain logged but leave the successful mutation resolved and the list in `refreshErrorWithData`.

Export `TransactionListStatus` and `getTransactionQueryKey` through `src/modules/transactions/index.ts`.

- [ ] **Step 8: Run focused store tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/transactions/transaction_query.test.ts __tests__/transaction.store.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

```bash
git add src/modules/transactions/store/transaction_query.helpers.ts src/modules/transactions/store/transaction.store.ts src/modules/transactions/index.ts __tests__/transactions/transaction_query.test.ts __tests__/transaction.store.test.ts
git commit -m "refactor: key transaction list snapshots"
```

### Task 2: Stable List, Totals, and Navigation Context

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transactions.state.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/screens/transactions/transactions_state.test.ts`
- Test: `__tests__/screens/transactions/transactions_hook.test.ts`
- Test: `__tests__/screens/transactions.screen.test.tsx`

- [ ] **Step 1: Write failing screen-state tests**

Require `transactions.state.ts` to store scroll context and a keyed totals state:

```ts
interface TransactionsUiStateShape {
  scrollOffset: number;
  totals: MonthlyTotals | null;
  totalsYearMonth: string | null;
  totalsStatus: 'idle' | 'initialLoading' | 'ready' | 'refreshing' | 'firstLoadError' | 'refreshErrorWithData';
}
```

Test that same-month refresh preserves totals, a failed refresh preserves totals with `refreshErrorWithData`, a new month clears stale totals and enters `initialLoading`, and `setScrollOffset()` survives a route blur because no blur reset occurs.

- [ ] **Step 2: Run screen-state tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/transactions_state.test.ts`

Expected: FAIL because keyed statuses and scroll persistence do not exist.

- [ ] **Step 3: Implement explicit UI state actions**

Add narrow actions rather than generic nullable setters:

```ts
beginTotalsLoad(yearMonth: string, preserveData: boolean): void;
resolveTotals(yearMonth: string, totals: MonthlyTotals): void;
failTotals(yearMonth: string): void;
setScrollOffset(offset: number): void;
```

Each completion action ignores a result whose month no longer matches the active totals request. `failTotals` distinguishes first-load from refresh failure and never writes financial zeroes.

- [ ] **Step 4: Write failing hook tests for query ownership and lifecycle**

Update the mocked transaction store contract and test:

1. Rows are rendered only when `snapshotKey === getTransactionQueryKey(transactionQuery)`.
2. Changing controls immediately hides the old snapshot behind initial loading even before the effect dispatches `setQuery`.
3. Pull-to-refresh keeps current rows and totals visible.
4. Totals failures produce an error status, not `{ incomeEgp: 0, expenseEgp: 0, netEgp: 0 }`.
5. Unmount/blur does not reset month, search, filters, list snapshot, or scroll offset.
6. First-load and refresh failures expose separate retry-capable presentation states.

- [ ] **Step 5: Run hook tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/transactions_hook.test.ts`

Expected: FAIL against the current reset-on-blur and zero-fallback behavior.

- [ ] **Step 6: Refactor the transactions hook**

Compute `activeQueryKey` from the current debounced controls. Derive `currentTransactions` only when the store's `snapshotKey` matches it. Remove the destructive `useFocusEffect` cleanup. Return declarative presentation fields:

```ts
listState: TransactionListStatus;
showInitialSkeleton: boolean;
showFirstLoadError: boolean;
showRefreshError: boolean;
isRefreshing: boolean;
retryList: () => Promise<void>;
retryTotals: () => Promise<void>;
```

Keep loaded totals visible while `totalsStatus === 'refreshing'`. Account lookup IDs must be derived from `currentTransactions`, never an old snapshot.

Add a hook-owned `SectionList` ref, `onListScroll`, and focus restoration callback. Persist `contentOffset.y` in `transactions.state.ts`; on focus, restore through the native scroll responder only after the matching snapshot has rows. Do not reset explicit filter state during ordinary navigation.

- [ ] **Step 7: Write failing screen rendering tests**

Require the screen to:

1. Render row skeletons only for `initialLoading` without current rows.
2. Keep rows and totals mounted during refresh.
3. Render a retry action for first-load failure.
4. Render a compact non-blocking retry affordance for refresh failure without changing list geometry.
5. Forward the list ref and scroll callback from the hook.

- [ ] **Step 8: Run screen tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions.screen.test.tsx`

Expected: FAIL because the current screen infers state from nullable values and has no error rendering.

- [ ] **Step 9: Implement declarative list/error rendering**

Use existing `EmptyState`, HeroUI `Button`/`Alert` where suitable, and centralized strings. Keep the current outer geometry; this PR does not move the summary/search hierarchy. Wire `RefreshControl.refreshing` to stale-while-refresh state and do not pass `refreshing` into `TotalsStrip.isLoading` when totals already exist.

- [ ] **Step 10: Run Task 2 tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/screens/transactions/transactions_state.test.ts __tests__/screens/transactions/transactions_hook.test.ts __tests__/screens/transactions.screen.test.tsx`

Expected: PASS.

- [ ] **Step 11: Commit Task 2**

```bash
git add src/modules/transactions/screens/transactions/transactions.state.ts src/modules/transactions/screens/transactions/transactions.hook.ts src/modules/transactions/screens/transactions/index.tsx src/constants/strings.ts __tests__/screens/transactions/transactions_state.test.ts __tests__/screens/transactions/transactions_hook.test.ts __tests__/screens/transactions.screen.test.tsx
git commit -m "fix: preserve transaction screen state"
```

### Task 3: Detail Revalidation Without Content Loss

**Files:**
- Modify: `src/modules/transactions/screens/transactions/detail/detail.store.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.state.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/components/not_found_state.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/screens/transactions/detail/detail_store.test.ts`
- Test: `__tests__/screens/transactions/detail/detail_state.test.ts`
- Test: `__tests__/screens/transactions/detail/detail_hook.test.ts`
- Test: `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx`

- [ ] **Step 1: Write failing detail state/store tests**

Replace `Transaction | null | undefined` inference with explicit state:

```ts
type TransactionDetailStatus = 'idle' | 'initialLoading' | 'ready' | 'notFound' | 'firstLoadError';

interface TxDetailStateShape {
  status: TransactionDetailStatus;
  revalidating: boolean;
  refreshError: boolean;
  // existing confirm/delete fields
}
```

The data store holds `tx: Transaction | null` and `txId: string | undefined`. Tests must prove a same-ID revalidation does not clear `tx`, while a new ID begins a fresh load.

- [ ] **Step 2: Run detail state/store tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/detail/detail_store.test.ts __tests__/screens/transactions/detail/detail_state.test.ts`

Expected: FAIL because loading/not-found are currently encoded in `tx`.

- [ ] **Step 3: Implement explicit detail state actions**

Add `beginLoad(id, hasCurrentTx)`, `resolve(tx)`, `resolveNotFound(id)`, and `failLoad(id, hasCurrentTx)` actions. A revalidation failure leaves `status: 'ready'`, keeps the transaction, and sets `refreshError: true`; a first-load failure sets `firstLoadError`.

- [ ] **Step 4: Write failing detail hook tests**

Cover:

1. Initial request shows `initialLoading`.
2. Missing transaction shows `notFound`.
3. Repository rejection shows `firstLoadError`, not not-found.
4. `reload()` preserves current derived content while `revalidating`.
5. Failed revalidation preserves current content and exposes retry.
6. Switching IDs cannot render the prior transaction.

- [ ] **Step 5: Run detail hook tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/detail/detail_hook.test.ts`

Expected: FAIL because reload currently sets `tx` to `undefined` and errors become `null`.

- [ ] **Step 6: Refactor detail loading behavior**

Make the effect call explicit state actions around `getById`. Preserve the request cancellation guard. Derive `viewState` from `status`, not from `tx`. Load account lookups from preserved data during revalidation. Keep edit-success `reload()` behavior but do not replace loaded content with a spinner.

- [ ] **Step 7: Write failing detail screen tests**

Test distinct retryable first-load error and not-found states, plus the rule that ready content remains rendered when `revalidating` or `refreshError` is true.

- [ ] **Step 8: Run detail screen tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/detail/detail_screen_actions.test.tsx`

Expected: FAIL because the screen only handles loading/not-found/ready.

- [ ] **Step 9: Implement stable detail rendering**

Reuse the current loaded layout for revalidation. Extend the existing empty/error component with centralized title/body/retry labels rather than introducing a parallel custom primitive. Preserve current header and action geometry; PR3 owns visual refinement.

- [ ] **Step 10: Run Task 3 tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/screens/transactions/detail/detail_store.test.ts __tests__/screens/transactions/detail/detail_state.test.ts __tests__/screens/transactions/detail/detail_hook.test.ts __tests__/screens/transactions/detail/detail_screen_actions.test.tsx`

Expected: PASS.

- [ ] **Step 11: Commit Task 3**

```bash
git add src/modules/transactions/screens/transactions/detail src/constants/strings.ts __tests__/screens/transactions/detail
git commit -m "fix: preserve transaction detail while refreshing"
```

### Task 4: Save-Safe Add and Edit Sheet Lifecycle

**Files:**
- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.state.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.state.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/index.tsx`
- Test: `__tests__/screens/transactions/transaction_form/add_transaction_state.test.ts`
- Test: `__tests__/screens/transactions/transaction_form/edit_transaction_state.test.ts`
- Test: `__tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts`
- Test: `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts`
- Test: `__tests__/screens/transactions/transaction_form/add_transaction_sheet.test.ts`

- [ ] **Step 1: Write failing lifecycle state tests**

Require both state stores to expose save-aware actions:

```ts
requestClose(): boolean; // false and no state change while saving
completeSave(): void; // closes, clears saving/error, retains mounted form data for animation
completeClose(): void; // resets transient state after the close animation
```

Test that dismissal is rejected while saving, duplicate save cannot begin, successful completion closes exactly once, and reopening begins with no prior saving/error/picker state.

- [ ] **Step 2: Run lifecycle state tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/transaction_form/add_transaction_state.test.ts __tests__/screens/transactions/transaction_form/edit_transaction_state.test.ts`

Expected: FAIL because `close()` currently replaces all state immediately even while saving.

- [ ] **Step 3: Implement save-aware state transitions**

Keep `visible` false during the close animation but do not reset the form data store in `requestClose`/`completeSave`. Reset UI state from `completeClose` only. Preserve the special add `pendingOpen` semantics. Ensure `setSaving(true)` is idempotent through the hook's synchronous store guard.

- [ ] **Step 4: Write failing hook and sheet tests**

Test:

1. A second `handleSave()` while the first promise is pending does not call the repository twice.
2. Successful save invokes one completion callback and leaves `saving` true until close begins, preventing a dismissal race.
3. Failed save keeps the sheet/form open and preserves values.
4. `Sheet` receives `isDismissable={false}` while saving.
5. Overlay/back callbacks do nothing while saving.
6. Form stores reset only after `onCloseComplete`, not when `visible` first becomes false.

- [ ] **Step 5: Run hook/sheet tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/add_transaction_sheet.test.ts`

Expected: FAIL because save completion currently calls parent close/reset immediately and `Sheet` has no dismissal lock in these call sites.

- [ ] **Step 6: Extend the project Sheet contract if needed**

Expose HeroUI-backed `isDismissable` and a close-completion callback through `src/components/ui/sheet.tsx`. Forward the dismissal flag to `BottomSheet`/`BottomSheet.Content` using the installed v1.0.3 API already used by HeroUI. Keep the wrapper declarative; do not introduce an imperative gorhom ref.

- [ ] **Step 7: Refactor add/edit completion ownership**

Hooks call a semantic `onSaved` callback after repository/account work succeeds and do not reset forms themselves. Parent screens request close through state actions. Sheet components gate `onOpenChange` with `requestClose`, pass `isDismissable={!saving}`, and reset the corresponding data/UI stores from close completion. Hardware back uses the same request-close path.

- [ ] **Step 8: Run Task 4 tests and verify GREEN**

Run: `npm test -- --runInBand __tests__/screens/transactions/transaction_form/add_transaction_state.test.ts __tests__/screens/transactions/transaction_form/edit_transaction_state.test.ts __tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/add_transaction_sheet.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit Task 4**

```bash
git add src/components/ui/sheet.tsx src/modules/transactions/screens/transactions/transaction_form src/modules/transactions/screens/transactions/index.tsx src/modules/transactions/screens/transactions/detail/index.tsx __tests__/screens/transactions/transaction_form
git commit -m "fix: stabilize transaction sheet lifecycle"
```

### Task 5: Integration Regression Matrix and PR Verification

**Files:**
- Modify: `__tests__/screens/transactions/transactions_hook.test.ts`
- Modify: `__tests__/screens/transactions.screen.test.tsx`
- Modify: `__tests__/screens/transactions/detail/detail_hook.test.ts`
- Modify: `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx`
- Modify: `__tests__/screens/transactions/transaction_form/add_transaction_sheet.test.ts`
- Modify: `docs/superpowers/plans/2026-07-20-transactions-state-stability.md`

- [ ] **Step 1: Add cross-state regression tests**

Add focused scenarios for:

- month A ready → month B initial loading → month B ready, with no month-A rows under month-B controls;
- ready rows → pull-to-refresh → refresh failure, with identical row count and visible totals throughout;
- list context → detail → back, with unchanged month/filter/search/scroll state;
- detail ready → edit save → revalidation, with detail content never disappearing;
- add/edit pending save → overlay/back attempt, with sheet and form still mounted;
- successful close → reopen, with clean transient state and default/new transaction values.

- [ ] **Step 2: Run the transaction regression suite**

Run:

```bash
npm test -- --runInBand \
  __tests__/transaction.store.test.ts \
  __tests__/screens/transactions/transactions_state.test.ts \
  __tests__/screens/transactions/transactions_hook.test.ts \
  __tests__/screens/transactions.screen.test.tsx \
  __tests__/screens/transactions/detail \
  __tests__/screens/transactions/transaction_form
```

Expected: PASS with no console errors or act warnings.

- [ ] **Step 3: Run formatter, lint, and typecheck**

Run:

```bash
npm run format:check && npm run lint && npm run typecheck
```

Expected: all commands exit 0.

- [ ] **Step 4: Run the full unit suite**

Run: `npm test -- --ci`

Expected: all suites pass.

- [ ] **Step 5: Run full local CI parity before push**

Run:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "CI parity green - safe to push"
```

Expected: all six PR jobs pass locally and the final message prints.

- [ ] **Step 6: Commit final test/format adjustments**

```bash
git add -A
git commit -m "test: cover transaction state transitions"
```

Skip this commit only when verification produced no tracked changes.

---

## Self-Review

- **Spec coverage:** Query ownership, explicit first-load/refresh/error states, navigation and scroll preservation, stale-while-refresh totals/rows, detail revalidation, save/dismiss lifecycle, and focused transition tests each map to Tasks 1-5. Broad row/detail visual refinement remains explicitly outside PR2.
- **Placeholder scan:** The plan contains no `TBD`, deferred implementation, or unspecified test step. Every production change is preceded by a named failing test and exact command.
- **Type consistency:** `TransactionListStatus`, `queryKey`/`snapshotKey`, keyed totals statuses, detail statuses, and form lifecycle actions retain the same names throughout all tasks.
