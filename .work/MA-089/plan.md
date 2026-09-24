# MA-089 — Returning from a detail keeps the loaded pages and the scroll offset (M41)
base: 4ec4342386ab55d2a5070e24d6a46d46b4b7fd47 · verify: emulator · flags: none · expected diff: ~30 lines outside tests (~300 in tests)

## Steps

### 1. A preserving refresh refetches every loaded page
- File: `src/modules/transactions/store/transaction.store.ts` (`replaceSnapshot`, :76-123; the fetch at :105, `hasMore` at :107)
- Change: when `canPreserve` is true, fetch at offset 0 with `limit = PAGE_SIZE * max(1, ceil(current.transactions.length / PAGE_SIZE))`, the count read from `current` (:80) before the first `set`; when false, `limit = PAGE_SIZE` as today. `hasMore = rows.length === limit`. Request guards, both error branches, `refresh`/`retry`/`setQuery` and the post-mutation paths (:191-210) stay as they are and inherit the window through `refresh()`. No public name or type changes (`PAGE_SIZE`, `refresh(): Promise<void>`, `mutationVersion`, `announceExternalWrite`).
- Test: `first` · `__tests__/transaction.store.test.ts`, new `describe('transactionStore refresh window (MA-089)')` on `makeRepo` with 95 rows `t0..t94`:
  - partial last page (repo of 75, three pages loaded, `hasMore` false): `refresh()` calls `{ limit: 90, offset: 0 }`, 75 rows, `hasMore` stays false.
  - failed refresh at 90 rows: rows kept, `status` `refreshErrorWithData`; `retry()` then calls `{ limit: 90, offset: 0 }` and lands `ready` with 90.
  - `setQuery({ type: TransactionType.Income })` after three pages calls `{ type, limit: PAGE_SIZE, offset: 0 }`.
  - mutations at 90 rows, each after flushing the fire-and-forget refresh: `updateTransaction('t60', …)` leaves 90 rows with the new amount on `t60`; `addTransaction` leaves 90 rows headed by `tx-new`.
  - The existing `re-fetches page 1 with the current query` (:403) stays as is: 3 rows is one page, so the limit is still `PAGE_SIZE`.
- Test: `first` · new `__tests__/transaction.store.refresh_window.test.ts`, real SQLite: `bridgeBetterSQLite(getExpoSQLiteTestDatabase(), realDb)`, schema from `MIGRATIONS`, `withTransactionAsync` mapped to real BEGIN/COMMIT as in `__tests__/account.repository.delete.test.ts:176`, store `createTransactionStore(new TransactionRepository())`. Seed one active EGP bank account and 95 July-2026 expenses on it (category `cat_food`, since FKs are enforced) plus one June row, through `insertTransactionRow(sqlite.database, makeTestTransaction({...}))` with fixed timestamps. Expected order is `SELECT id … ORDER BY transaction_date DESC, transaction_time DESC, created_at DESC, id DESC` on `realDb`. Query `{ dateFrom: '2026-07-01', dateTo: '2026-07-31' }`, three pages loaded (90) in each case:
  - detail round-trip: `refresh()` returns the same 90 ids in the same order, `hasMore` true; `loadMore()` ends with ids equal to the 95 DB ids, no duplicate, no gap.
  - write made elsewhere: insert a July row dated after every seed straight into the database, then `announceExternalWrite()`; `refresh()` puts it first followed by the old first 89; `loadMore()` ends with ids equal to the 96 DB ids.
  - delete from the detail: `deleteTransaction(<id at index 45>)` leaves 90 rows, that id absent, the other 89 old ids in order, the 91st DB row appended.

### 2. The hook's gate and restore hold across the round-trip
- File: `src/modules/transactions/screens/transactions/transactions.hook.ts`, no source change in this step (step 4 touches only `onRefresh` and `refreshing`). The gate (`shouldRefreshSnapshot`, :262-265, re-checked at :279-284) already refreshes only a snapshot current for the active key, the blur cleanup (:297-309) writes only the scroll offset, and the restore (:182-210) is keyed by the query key.
- Test: `first` · `__tests__/screens/transactions/transactions_hook.test.ts`, in `describe('useTransactions query ownership')`, 90 July rows `tx-0..tx-89`, `status: 'ready'`, `hasMore: true`, `listRef.current` stubbed with `scrollTo` as at :777:
  - three-page detail round-trip: focus, `onListScrollEnd` at y 2400, blur; `setQuery` never called with a key other than July's, `reset` not called; refocus: `scrollTo({ y: 2400, animated: false })`, never `{ y: 0 }`; run the last interaction task: `refresh` called once; swap in a refreshed 90-row snapshot (new objects, same ids) and rerender: 90 rows across `state.sections`, `state.hasMore` true, still no `{ y: 0 }`; then `setSelectedMonth('2026-06')`: `scrollTo({ y: 0, animated: false })` and `setQuery(JUNE_QUERY)` (Acceptance line 7, the reset at :220-222).
  - It passes at base as well; it pins the Rules on blur, gate and restore. The gate that fails at base is step 1's real-SQLite suite.

### 3. The feature file carries the round-trip state
- File: `.claude/skills/emulator-verify/features/transactions.md` (States table; the intro sentence that says the file carries only pill states)
- Change: append the row under Screens below to States and name MA-089's list state in the intro sentence.
- Test: `none` · documentation.

### 4. Only a user pull turns on the refresh indicator
- File: `src/modules/transactions/screens/transactions/transactions.state.ts` (`TransactionsStateShape`, `INITIAL_STATE`); `src/modules/transactions/screens/transactions/transactions.hook.ts` (`onRefresh` :344-349, `refreshing` in the return at :452)
- Change: add `pullRefreshing: boolean` (initial false, cleared by `reset`) and `setPullRefreshing(value: boolean): void`, the shape of `commitments.state.ts:13,20,38`. `onRefresh` sets it true before its `Promise.all` and false in `finally`. The hook returns `refreshing: pullRefreshing && presentation.showRefreshIndicator`, so the focus and post-mutation refreshes keep `status: 'refreshing'` without starting `RefreshControl`; on iOS, `RCTPullToRefreshViewComponentView.mm:238-242` moves the offset by the control height on every programmatic start.
- Test: `first` · `__tests__/screens/transactions/transactions_hook.test.ts`: the existing `keeps ready rows available while the current snapshot refreshes` (:454) asserts `state.refreshing` false with the rows kept; a new case calls `onRefresh` with `refresh` pending and the snapshot at `status: 'refreshing'`: `state.refreshing` true, then false once it settles. `__tests__/screens/transactions/transactions_state.test.ts`: `setPullRefreshing(true)` then `reset()` reads false.

## Screens
- `emulator-verify/features/transactions.md`: page two after a detail round-trip (missing; `no frame`; appended by step 3):

| State | Frame | Force | Proof |
|---|---|---|---|
| page two after a detail round-trip | no frame, MA-089 | seed push 45 or more expenses dated in the current month, each with a distinct note; open the tab and scroll until a row past the 30th is on screen | before the tap, `mqa ui` records the topmost fully visible row's note and bounds; tap a row, Back, and let the focus refresh settle, with no refresh spinner shown: the same row sits at the same bounds ± 1 dp and a row past the 30th is still on screen; two shots, before the tap and after Back |

## Non-goals
- The hero replacing the totals strip and its keystroke re-render (M25, MA-091); the day cards (MA-092).
- Any change to the hook's gate, restore or blur cleanup.
- A version- or time-gated focus refresh; the focus refresh keeps running on every return with a current snapshot.
- Keyset pagination, a new `PAGE_SIZE`, changes to `getTransactions`, or to the screen store (`seedAccountFilter`).
- Keeping an in-flight `loadMore` alive across a refresh.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Gate: `test -f __tests__/transaction.store.refresh_window.test.ts && npx jest __tests__/transaction.store.refresh_window.test.ts` fails at base 4ec43423 with only step 1's tests applied (refresh returns 30 of 90) and passes at head.
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- Context names the hook's gate as a second touch; the code needs none (step 2). If the render pass shows the offset moving with step 1 in place, the restore at :182-210 is the amendment point: re-arm it when the focus refresh publishes.
- The limit rounds up to whole pages instead of Context's `max(PAGE_SIZE, loaded)`: the same rows when nothing changed, and a partial last page keeps `hasMore` false instead of flipping it true and spending one empty `loadMore`.
- Each return now refetches every loaded row: 300 rows at ten pages, against 30 today.
- A write elsewhere that adds k rows above the window pushes the last k loaded rows past it; the next `loadMore` (offset = loaded count) brings them back, no gap, but they are off screen until then.
- A `loadMore` in flight when the user taps a row is dropped by the focus refresh (`pageRequestId++`, :79), and VirtualizedList does not refire `onEndReached` at the same content length until the user scrolls out of the end threshold and back.
- Amended round 1: step 4 added because the focus refresh started iOS `RefreshControl` and moved the offset; step 2 gained the month-change reset to the top and lost the `mutationVersion` case, which the focus callback never reads; step 1 lost the unit round-trip and delete cases that the real-SQLite suite already covers.

## Self-assessment
Step 2 is the one I am least sure of. It claims the hook needs no change because freezeOnBlur (`src/app/(app)/(tabs)/transactions/_layout.tsx`) keeps the list mounted with its native offset, and because the SectionList holds that offset when the refresh replaces every row object with the same ids. No unit test can see either; the render pass on the page-two state is the only evidence, and a drift there moves the fix into the hook's restore.
