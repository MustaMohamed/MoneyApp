# MA-107 — Hero shows the previous scope's totals while an account filter loads
base: 8f16d59b · verify: emulator · flags: money path · expected diff: ~65 lines

## Steps
### 1. The store keeps totals only inside one month and one accounts filter, and names the month that has loaded
- File: `src/modules/transactions/screens/transactions/transactions.store.ts` (`StateShape` `:25-34`, `beginTotalsRequest` `:83-94`, `resolveTotals` `:95-105`, `hasTotalsForMonth` `:110-113`); `src/modules/transactions/screens/transactions/transactions.hook.ts` (`loadTotals` `:203-204` and `:250`; `:96` and `:259` follow the rename)
- Change:
  - `beginTotalsRequest(queryKey: string, yearMonth: string, accountIds: readonly string[] | undefined, preserveData: boolean): number`. Four required arguments in that order, none `null`. `accountIds` `undefined` and `[]` both mean all accounts. It returns the request id, never `null`. It stamps `totalsScope` with `totalsScopeKey(yearMonth, accountIds)` (`transactions.helpers.ts:214-216`) and keeps `totals` only when `preserveData` is true and the held `totalsScope` equals the new one. Otherwise `totals` is `null`.
  - `totalsScope: string | undefined`, new, `undefined` until the first request. Neither new field maps a column, so both follow `failedTotalsScope` (`transactions.state.ts:16`), not the `| null` fields at `transactions.store.ts:30-32`.
  - `totalsLoadedYearMonth: string | undefined`, new. `resolveTotals` sets it to `totalsYearMonth` in the `set` that publishes `totals`, mapping `null` to `undefined`, since `totalsYearMonth` is `string | null` (`transactions.store.ts:31`). A request for the same month keeps it, a request for another month sets it to `undefined`. `initialState()` starts both new fields at `undefined`.
  - `hasTotalsForMonth` becomes `hasTotalsForScope(yearMonth: string, accountIds: readonly string[] | undefined): boolean`, both arguments required, true when the held `totalsScope` is that pair's key and `totals` is not `null`.
  - `totalsYearMonth` stays, since `resolveTotals` reads it for `totalsLoadedYearMonth`. `resolveTotals`, `failTotals` and `TransactionTotalsState` keep their signatures.
  - `loadTotals` passes `query.accountIds` to `beginTotalsRequest` at `:204` and to `hasTotalsForScope` at `:203` and `:250`, so a scope change reaches `beginTotalsLoad(false)` and a failure under it reaches `failTotalsLoad(false, scopeKey)`.
  - The store imports `totalsScopeKey` from `./transactions.helpers`, which imports no store (`transactions.helpers.ts:1-26`).
- Test: `first` · `__tests__/screens/transactions/transactions_store.test.ts`. Every `beginTotalsRequest` call gains the `accountIds` argument, and `:114` and `:118` read `hasTotalsForScope`. New cases: under `preserveData` true, the same month with another `accountIds` drops `totals`, and the same ids in another order keep them; `hasTotalsForScope` is false for another filter in the held month; `totalsLoadedYearMonth` is `undefined` before a resolve and after a first load that only failed, the request's month after `resolveTotals`, unchanged by a same-month request with another filter, `undefined` after a request for another month. `__tests__/screens/transactions/transactions_hook.test.ts:1129` gains the argument.

### 2. The hook prints only the applied scope's figures, the search stays live across a scope change, and the tally's view drops a label its model no longer has
- File: `src/modules/transactions/screens/transactions/transactions.hook.ts` (store read `:78-88`, display gate `:453-455`, `:463`, `searchDisabled` `:643`); `src/modules/transactions/screens/transactions/components/search_tally.tsx` (`SearchTally`, the slot's `View` `:93-99`)
- Change:
  - The store read takes `totalsScope` and `totalsLoadedYearMonth` in place of `totalsYearMonth`. `displayTotals` and `displayTotalsStatus` gate on `totalsScope === totalsScopeKey(period.yearMonth, transactionQuery.accountIds)`, the key `:463` builds, so the render between a filter change and the totals effect reads `null` and `'initialLoading'`. `searchDisabled` is `heroMode === 'skeleton' && totalsLoadedYearMonth !== period.yearMonth`. The returned `state` keeps its fields and their types.
  - `SearchTally`'s slot passes `model.accessibilityLabel ?? ''` as `accessibilityLabel`, under a one-line comment that names the constraint. `accessible` stays `model.accessibilityLabel !== undefined`. `SearchTallyModel` and `buildSearchTally` keep their shapes, so the label stays `string | undefined`, `undefined` in the `'skeleton'` and `'empty'` modes (`transactions.helpers.ts:432-438`, `:457-458`). `SearchTally` mounts once, at `index.tsx:124`.
  - Why `''`: React Native writes a view's content description only when the label is non-null (`node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/BaseViewManager.java:445-446`), so an `undefined` label leaves the previous scope's count and sum on the view.
- Test: `first` · `__tests__/screens/transactions/transactions_hook.test.ts`, one new `describe`. Each case starts from landed July figures, `hero.out` `'9,400'`.
  - `it.each` over one account applied, two applied, back to all, `toggleAccountChip`, `seedAccountFilter`, `resetFilters`, the applied account moved to `archivedAccounts`, the applied account in neither list. With the next aggregate pending: `hero.mode` `'skeleton'`, `state.totals` `null`, `searchDisabled` `false`.
  - Every render's `hero` collected across a chip tap, the aggregate pending: none after the tap has `mode` `'figures'`.
  - Rows on screen under the new key, set as `searchCoffee` does at `:1964-1969`. Pending: `tally.mode` `'skeleton'` and each `sections[].figures` `{ mode: 'skeleton' }`. After the load rejects: `totalsStatus` `'firstLoadError'`, `hero.mode` `'dashes'`, `hero.out` `Strings.transactionsHeroUnavailable`, `loadErrorVariant` `'totals'`, `tally.mode` `'failed'`, each day `mode` `'failed'`, `searchDisabled` `false`. A `retryTotals` pending under them keeps the dashes and the live search. A further scope change pending reads `'skeleton'` with `searchDisabled` `false`.
  - The new scope lands: `hero.mode` `'figures'` with its own `out`.
  - `it.each` over a type tab, a search keystroke, `categoryIds`, `amountMin`. With the aggregate pending: `state.hero` is the held object.
  - `it.each` over a `mutationVersion` bump, `onRefresh`, the focus task. With the aggregate pending: `hero.mode` `'figures'` and the same `out`.
  - `setSelectedMonth('2026-06')` pending: `'skeleton'` and `searchDisabled` `true`. Back to July while June is pending: still `true`.
  - `__tests__/screens/transactions.screen.test.tsx`, one case, under the Render-suite policy for Acceptance line 4, since only a render sees the prop that reaches the view. With the suite's base `tally` (`:167-174`, `mode` `'empty'`, `accessibilityLabel` `undefined`), the `transactions-search-tally` view has `accessibilityLabel` `''` and `accessible` `false`. The suite renders the real `SearchTally`. A `'skeleton'` model runs the same expression and would need `Skeleton` in the suite's `heroui-native` mock (`:18-38`).

### 3. The decision record names the scope in the keep rule
- File: `docs/adr/2026-09-24-transactions-month-aggregate.md` (`:40`, `:46`); `docs/adr/2026-09-27-transactions-search-tally.md` (`:28`)
- Change: Amend in place with a paragraph that opens `**Amended <date>, MA-107 (#572).**`, the form at `docs/adr/2026-09-27-account-strip-one-write.md:14`. `:40` states the four-argument signature and that it stamps the scope. `:46` narrows the keep to a key change inside one month and one `accountIds`. A change of either drops `totals` and starts as a first load, skeleton in flight and dashes with the figures alert on failure. The amendment names `totalsLoadedYearMonth` as what the search's disabled state reads. The last sentence of the tally record's `:28` says the hero's skeleton disables the search on a month's first load only.
- Test: `none` · prose. `npm run lint` greps both files for the banned phrases.

### 4. The features file carries the scope-change state
- File: `.claude/skills/emulator-verify/features/transactions.md` (States `:41`, Gotchas `:103`)
- Change:
  - A new States row after `:41`, `hero, across a scope change`, frame `no frame, MA-107`. Force: the `hero, scoped from the sheet` seed (`:33`), the two accounts' month sums unequal; a source force in `loadTotals` that awaits a promise that never resolves before `getMonthAggregate` when `query.accountIds` is set; the tab opened until the all-accounts figures land, then a chip tap; reverted after. Proof, in three parts:
    - Under the force: one full shot with five bars in the hero shell at the loaded height, the tapped chip in the accent tint and none of the all-accounts figures; the search `ReactEditText` has the `E` flag in `adb shell dumpsys activity top`.
    - With the force reverted and the filter sheet closed, where `label="<account>, account filter"` matches the chip alone (`:102`): `mqa tap` on one seeded account's chip, then the other's, then the pair again, each tap followed at once by `mqa read transactions-list-header`. No read carries the all-accounts Out beside a selected chip, and in none does `transactions-search-tally` carry the count or sum of the scope just left.
    - Last, `mqa tap 'label="All accounts"'`. Once the figures land, `grep -c 'results in'` over `mqa read transactions-list-header` reads 0. The implementer runs this part on step 1's commit, before step 2's label edit, after one chip tap whose figures landed, and the row states the count it reads. A count of 0 there is a discrepancy that amends the plan, not a pass.
  - Row `:41` gains a third force, a throw before `getMonthAggregate` when `query.accountIds` is set, reached by a chip tap over landed figures. Its proof gains: dashes, the alert and the rail's content-desc as on a first load, the search live, none of the all-accounts figures, three shots. It loses `the account filter unchanged across both loads` and `nothing is asserted across a scope change (MA-107)`.
  - Gotcha `:103` reads `while the hero skeleton shows on a month's first load`.
- Test: `none` · a recipe file. `npm run lint` resolves its path citations.

## Screens
- `emulator-verify/features/transactions.md`: hero, across a scope change. New, `no frame`; step 4 adds it.
- `emulator-verify/features/transactions.md`: hero, figures failed. Step 4 rewrites its force and proof.

## Decision record
- `docs/adr/2026-09-24-transactions-month-aggregate.md`: the store keeps held totals only across a key change inside one month and one accounts filter, and a scope change starts as a first load. Step 3 amends the file in place; the ticket's Context names its `:40` and `:46`.

## Non-goals
- The doubled accessibility sentence on the hero's rail, MA-108 (#573).
- `getMonthAggregate`, `getScopedTotals` and their SQL, MA-088 (#544). No resolver or formatter changes.
- The month's first load disabling the search, MA-091 (#547). It stays as shipped.
- A cache of totals per scope. Returning to a scope loads it again.
- The totals effect's `preserveData` precheck at `transactions.hook.ts:336-338`. The store's keep decision overrides it, and MA-093 (#549) edits that effect.
- `transactions.state.ts`, `transactions.helpers.ts`, and every `.tsx` but the label prop in `components/search_tally.tsx`. No new status, resolver arm, string or component.
- A spoken loading label on the tally. Its skeleton and its empty slot stay unlabelled and not accessible, as `__tests__/screens/transactions/transactions_helpers.test.ts:739-748` and `:761-773` pin. A label there is new copy, and the ticket's Copy is `none`.

## Untested inputs
- The Android view's content description once the tally's label is dropped, step 2. Jest renders no native view, so the render case pins the prop alone; the reads in step 4's row cover the view on the device.
- Nothing else. A save and a delete reach the hook as one `mutationVersion` bump, which step 2 covers.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-093 (#549) edits the totals effect and `loadTotals` in `transactions.hook.ts`. If it merges first, the `:line` cites in steps 1 and 2 move, and its `loadTotals` must pass `query.accountIds`.
- A new caller of `beginTotalsRequest` or `hasTotalsForMonth` before merge. `git grep -n 'beginTotalsRequest\|hasTotalsForMonth' -- src __tests__` finds `loadTotals` and the two suites only. LSP `findReferences` returned nothing at this checkout.
- `transactions.md · hero, across a scope change`: a real load lands inside a second, so only the source force holds the skeleton for a shot, and `mqa ui` returns nothing while it shimmers (`transactions.md:95`).
- `transactions.md · hero, across a scope change`: no device run has shown an empty label clearing the tally view's description. Step 2 rests on `BaseViewManager.java:445-446`. If the read after `All accounts` still carries `results in`, the label change is wrong and the plan needs an amend.
- `transactions.md · hero, across a scope change`: a read taken at once after a chip tap races the load, and one that lands after it passes with or without step 2's label change. The read after `All accounts` does not race. No run has taken it at base, where it rests on `transactions.helpers.ts:457` returning the same unlabelled model as `:458`.
- The ticket's `Size:` line lists 4 files. Step 2 adds `src/modules/transactions/screens/transactions/components/search_tally.tsx`, ~2 lines, and step 3 adds `docs/adr/2026-09-27-transactions-search-tally.md`, one line.

## Self-assessment
Step 2's label change is the part I am least sure of. The tally's view keeps the previous scope's count and sum as its content description while the skeleton shows, and the fix comes from React Native's Java: `updateViewContentDescription` writes a description only for a non-null label, so the slot passes `''`. No run has shown the empty string reaching the view and clearing it. The read after `All accounts` in step 4's row decides it on the device and does not race a load. If that read still carries a label, the fallback is a `key` on the slot's `View` by `model.mode`. View recycling is off in this build (`node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/internal/featureflags/ReactNativeFeatureFlagsDefaults.kt:120`, `node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/ViewManager.java:66-70`), so the remount creates a view with no description (`ViewManager.java:211-223`) and adds no copy. A label string for the skeleton and the empty slot comes after that, as new copy and a question for the ticket. Step 1's `totalsLoadedYearMonth` comes second. The ticket ties the search's disabled state to the month's first load and names no mechanism. Once a scope change drops `totals`, the fields the store and `transactions.state.ts` hold today read the same for a month's first load and for a scope change in a loaded month, so the store gains the field, since `__tests__/screens/transactions/transactions_state.test.ts:8-15` keeps the month stamp out of the state file. A reviewer who reads "a month with no totals at all" as "the store holds none now" would drop it, and the search would then disable on every chip tap, against the second Acceptance line.
