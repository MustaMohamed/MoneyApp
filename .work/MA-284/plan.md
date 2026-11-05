# MA-284 — The commitments list reads a commitment's rows once per trigger
base: fadaa567b5179badff1027309d45b97250a74403 · verify: none · flags: none · expected diff: ~80 lines

## Steps
### 1. The commitments data store publishes `rowsVersion`, which moves only when the stored rows can have changed
- File: `src/modules/commitments/store/commitment.store.ts` (`CommitmentStoreState` `:33`, `initialState` `:91`, `invalidateData` `:181`, `ensureHousekeepingCurrent` `:223-237`, `announceExternalWrite` `:330`, `reset` `:452`)
- Change: Add `rowsVersion: number` to `CommitmentStoreState`: never `null`, never optional, `0` at creation, only ever increases. `initialState(generation = 0, rowsVersion = 0)`; `reset` passes `get().rowsVersion + 1`, so a reset never moves it back. Three closure values: `signalledGeneration = 0` (the newest data generation whose change has been published), `rowsExtent: { today: string; throughDate: string } | undefined` (the widest pass landed on the newest local day in `signalledGeneration`), and a helper `signalPassSettled(today: string, generation: number, throughDate: string, landed: boolean): void`, all four arguments required, in that order. `rowsExtent` is keyed to the data generation, the way `housekeepingCoverage` is (`:130-134`). The helper is one exclusive chain, so one pass bumps at most once: `if (a) return; else if (b) …; else if (landed && (c)) …`. (a) `generation !== dataGeneration`: return and change nothing. (b) `generation > signalledGeneration`: set `signalledGeneration = generation`, set `rowsExtent = { today, throughDate }` when `landed` and `rowsExtent = undefined` when not (never widen), add 1 to `rowsVersion`, and stop. (c) Reached only when `generation === signalledGeneration`, and only when `landed`: if `rowsExtent` is `undefined`, or `today > rowsExtent.today`, or (`today === rowsExtent.today` and `throughDate > rowsExtent.throughDate`), set `rowsExtent = { today, throughDate }` and add 1. Anything else does nothing. In `ensureHousekeepingCurrent`, put `await getHousekeepingRequest(...)` in a `try`. Its `catch` calls the helper with `landed: false`, then rethrows. On success, call the helper with `landed: true` before the generation check at `:231`. A pass that `isHousekeepingCovered` skips at `:227` calls nothing. `invalidateData` keeps its body: an own write (add, update, deactivate, pay, skip, undo) gets its single bump when its follow-up pass settles, after any rows that pass writes. `announceExternalWrite` becomes `invalidateData()`, then `signalledGeneration = dataGeneration` and one bump, because no pass follows it until a focus. Invariant: one bump per data generation, plus one per new local day or wider window within that generation. Two awaiters of one shared pass bump once.
- Test: `first` · `__tests__/commitment.store.test.ts`, new `describe('commitment store rows signal')`, with `makeRepository` and `deferred`:
  - `markAsPaid` with a deferred `runHousekeeping` leaves `rowsVersion` unchanged until the pass resolves, then +1. Set an aggregate scope first, so snapshot and aggregate share the pass. Repeat for `skipPayment`, `undoSkip`, `addCommitment`, `updateCommitment` and `deactivateCommitment`.
  - A rejected follow-up pass still adds 1.
  - `announceExternalWrite` adds 1 at once, and the next `loadMonthSnapshot` pass in that generation adds 0.
  - `ensureHousekeepingCurrent(DAY_ONE)` twice adds 1 in total; `DAY_TWO` adds 1 more.
  - `loadMonthSnapshot('2026-12', DAY_ONE)` after the day's first pass adds 1; `loadMonthSnapshot('2026-06', DAY_ONE)` then adds 0.
  - A pass that settles after a second write adds 0, and the second write's pass adds 1.
  - After `loadMonthSnapshot('2026-12', DAY_ONE)` widens the window, `addCommitment` and its settled pass add 1; `loadMonthSnapshot('2026-12', DAY_ONE)` then adds 1 more, because that generation's pass extends the window.
  - `reset` leaves `rowsVersion` above its value before the reset.
  - Add `rowsVersion: 0` to the cold-state `toMatchObject` at `:141`.

### 2. The commitments list reads the rows on `rowsVersion`, and a refresh reads them once, after its month reads
- File: `src/modules/commitments/screens/commitments/commitments.hook.ts` (store selector `:69-82`, rows effect `:168-172`, `readSelectedMonth` `:345-362`, `onRefresh` `:364-368`)
- Change: Add `rowsVersion: s.rowsVersion` to the `useCommitmentStore` `useShallow` selection. Swap `payments` for `rowsVersion` in the rows effect's deps, and rewrite its one-line comment to name `rowsVersion` as the trigger. `readSelectedMonth` awaits `Promise.allSettled([loadMonthSnapshot(selectedMonth), loadMonthAggregate(selectedMonth, heroAccountId)])`, then, when `commitmentId` is defined, awaits one `loadCommitmentRows(commitmentId)` in its `try`. The rows read starts after the month passes settle, so a pass that writes rows (a new day, a wider window) lands before it. `allSettled` keeps a failed month read from skipping the rows read. Add `refreshingRowsRef = useRef(false)` (`useRef` is already imported, `:2`): `readSelectedMonth` sets it `true` at entry and clears it in `finally`. While it is `true`, the rows effect skips a run whose `commitmentId` equals the last id it read for (a second `useRef<string | undefined>`), so a `rowsVersion` move from that refresh's own pass starts no read. A `commitmentId` change still reads, and clearing the filter still calls `resetCommitmentRows` and reads nothing. `onRefresh` and `retryLoad` keep awaiting `readSelectedMonth`, so `setRefreshing(false)` runs after the one rows read lands or fails. `useCommitmentsScreenStore` (`commitments.store.ts`) does not change.
- Test: `first` · `__tests__/screens/commitments.hook.test.ts`. Add `rowsVersion = 0` to `setup` and to the `useCommitmentStore` mock. Replace `:2152` "reads the rows once per payments publish" with "reads the rows once per rowsVersion change and none on a payments publish": rerender with a new `payments` array, count stays 1; rerender with `rowsVersion: 1`, count 2. New cases, all with `FILTERED`:
  - A month swipe (`selectedMonth`, `loadedMonth` and `payments` new, same `rowsVersion`) reads no rows.
  - A pull to refresh with a deferred `loadMonthSnapshotMock`: mid-refresh, `setup` with `rowsVersion: 1` and a new `payments` array, rerender, then resolve the deferred. `loadCommitmentRowsMock` was called once beyond the mount's read, and only after `loadMonthSnapshotMock` resolved.
  - A pull to refresh with a deferred `loadCommitmentRowsMock`: `setRefreshingMock` gets `false` only after it resolves.
  - Try again on held rows (`rowsRead: READ`, `source.ready`) after a rejected first `loadMonthSnapshotMock`, with `rowsVersion: 1` set mid-refresh: one rows read, after the month reads.
  - A `rowsVersion` move after the refresh's `finally` reads once.
  - A focus with a fresh month calls no `loadCommitmentRows` beyond the mount's one.
  - `:2126` (Try again with a failed month reads once) stays as written.

### 3. A commitment's detail reads its rows on `rowsVersion`, and a saved edit reads once
- File: `src/modules/commitments/screens/commitments/detail/detail.hook.ts` (`payments` selector `:90`, read effect `:124-162`, `goToEdit` `:343-353`)
- Change: Add `const rowsVersion = useCommitmentStore((s) => s.rowsVersion)`. Swap `payments` for `rowsVersion` in the read effect's deps at `:162`, and rewrite the comment at `:124`. `payments` stays for `overlayStorePayments`, `loadingCycleHint` and `skeletonCards`. In `goToEdit`, drop `onSaved: reload` from the landing, which becomes `{ onStopped: () => finishStop(commitment.name) }`, and drop `reload` from its deps. A saved edit then reads once, through the bump `updateCommitment`'s pass makes before the form calls `onSaved` (`edit_commitment.hook.ts:66-83`). `CommitmentEditLanding.onSaved` stays optional (`commitment_form_host.state.ts:30-33`). `reload` stays for `useLocalDayChange` and the retry.
- Test: `first` · `__tests__/screens/commitments_detail.hook.test.ts`. Add `rowsVersion` to `setup`'s `useCommitmentStore` mock, from a module `let` reset in `beforeEach`. Every case that drives a re-read through a `paymentsState` change and `rerender` moves `rowsVersion` too. These are the cases at `:524`, `:711`, `:753`, `:867`, `:890` and `:1455`, and any other the run turns up. Their overlay assertions stay. Cases `:597` and `:620` publish a new `paymentsState`, move `rowsVersion`, then `runHostLanding('onSaved')`, and assert `mockGetPaymentsByCommitment` exactly once. New cases:
  - "a payments publish alone re-reads nothing".
  - "a Pay publish with one rowsVersion move re-reads once".

### 4. The filter-rows decision record names `rowsVersion` as the trigger
- File: `docs/adr/2026-10-31-commitment-filter-rows.md` (§3, Applies to)
- Change: In §3, replace the sentence naming the list's `payments` publish, and the closing sentence on the focus gate, with these facts:
  - The commitments data store's `rowsVersion` triggers the read on the list and on the detail. It moves once per own write, when that write's follow-up housekeeping pass settles, and at once on an external write. It also moves when a pass runs for a new local day or past the widest window generated that day.
  - Setting the filter, a pull to refresh and Try again read the rows directly, and a refresh awaits that read.
  - A focus or a month swipe that moves no signal reads no rows.
  - Keep the request-guard and error sentences.
  - Add `src/modules/commitments/store/commitment.store.ts` and `src/modules/commitments/screens/commitments/detail/detail.hook.ts` to Applies to. Write it under the `unslop` contract; `npm run lint` checks `.md` files outside `docs/scopes/` and `docs/superpowers/`.
- Test: `none` · a decision record has no test layer.

## Non-goals
- The six commitments tests that pass with their code reverted (MA-285, #929).
- The workflow changes from the same audit (MA-283, #927).
- Any change to `useCommitmentsScreenStore` (`commitments.store.ts`), its request guard or its error handling.
- A focus loader or staleness gate for the rows read. No overlay of store `payments` onto the filtered list.
- Moving `dashboard.hook.ts` off `generation`, or `generation` semantics, or the housekeeping coverage keys.

## Untested inputs
- A local day change on the filtered list. Step 1 covers the store bump and step 2 covers the effect on `rowsVersion`. No test drives `mockOnDayChange` through to a read, because the hook suite mocks the store. Steps 1 and 2.
- A cold open with the real store, where the startup pass (`use_layout_init.hook.ts:13-24`) has not landed before the list mounts. Step 1.
- An add of a commitment with the list filtered to a different commitment: one read when the pass settles, which is the expected count. Step 2.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A list mounted before the startup pass lands reads twice: once at mount, once when that first pass bumps. The rows did change, so the second read is correct.
- An own write's rows now reach the filtered list when the follow-up pass settles, not at the optimistic `set`. The filtered list has no overlay, so a Pay shows on it one pass later than today.
- `rowsExtent` resets with each new generation, so a far swipe after any own write re-runs that generation's pass and bumps once. The filtered list reads once more even when the filtered commitment gains no rows. Rule "a trigger can change the stored rows when … housekeeping … extends the generated window" allows that read, and it is what shows an added commitment's far rows when the filter is set to it.
- A failed pass of a new generation clears `rowsExtent`, so the next landed pass of that generation bumps once more. That is a second read for one write, after a failure only.
- Detail tests that lean on the `payments` publish as the re-read trigger are more than the six named. The implementer finds the rest by running the suite after step 3.

## Self-assessment
Step 1 is the step I am least sure of. The bump rule depends on every own write starting a follow-up pass in its new generation. `revalidateSnapshot` does this today for add, update, deactivate, pay, skip and undo. A write path added later without a revalidation would never bump, and the list would hold stale rows until the next day or swipe. The test that sets an aggregate scope, so snapshot and aggregate share one pass, guards the one-bump-per-generation count. It does not guard a write that skips the pass.
