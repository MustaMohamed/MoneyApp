# MA-120 — Account chips: one tap scopes the list and the hero to one account
base: b8646b45 · verify: emulator · flags: money path, user copy · expected diff: ~240 lines

## Steps
### 1. The filter helpers can count for the funnel, toggle one account and drop an inactive one
- File: `src/modules/transactions/screens/transactions/filter/filter.helpers.ts` (beside `countActiveFilters`, `:9-15`, which stays as it is)
- Change: add three pure exports. `countFunnelFilters(f: AdvancedFilters): number` counts categories and the amount range as `countActiveFilters` does and counts accounts as 1 only when `f.accountIds.length >= 2`. `toggleAccountFilter(f: AdvancedFilters, accountId: string | undefined): AdvancedFilters` returns `f` with `accountIds` set to `[]` when `accountId` is `undefined` or is the only applied id, and to `[accountId]` otherwise, every other field kept. `pruneAccountFilter(f: AdvancedFilters, activeAccounts: readonly Account[]): AdvancedFilters` drops every id not in `activeAccounts` and returns `f` itself, same identity, when it drops nothing.
- Test: `first` · `__tests__/screens/transactions/filter/filter_helpers.test.ts`: `countFunnelFilters` with no account, one account (0), two accounts (1), one account plus a category and an amount (2), two accounts plus a category (2); `countActiveFilters` still 3 at `:136`; `toggleAccountFilter` off to on, on to off, from two applied to the tapped one, `undefined` from two applied to none, categories and amount kept in each; `pruneAccountFilter` with the only id archived (empty), one of two archived (the other kept), an id absent from the list (deleted), nothing dropped (`toBe` the input).

### 2. The chip list is a pure function of the active accounts and the applied account ids
- File: `src/modules/transactions/screens/transactions/transactions.helpers.ts` (new exports only; the four helpers and three types `transactions_card.tsx:11-19` imports keep their names and return shapes)
- Change: add `interface AccountChipModel { accountId: string | undefined; label: string; dotColor: string | undefined; selected: boolean }` and `buildAccountChips(accounts: readonly Account[], accountIds: readonly string[]): AccountChipModel[]`. Entry 0 is All accounts: `accountId: undefined`, `label: Strings.filterAllAccounts`, no dot, `selected` when `accountIds` is empty. Then one entry per account in list order: `label` from `resolveAccountName`, `dotColor` from `resolveAccountGlyphColor(account.color)`, `selected` only when `accountIds` holds exactly that one id.
- Test: `first` · `__tests__/screens/transactions/transactions_helpers.test.ts`: no id applied (All accounts on, no other), one id (that chip on, All accounts off), two ids (no chip on), a blank-named account reads `Strings.unnamedAccount`, an account with `color: null` still gets a dot colour.

### 3. `SelectablePill` takes a hit slop
- File: `src/components/ui/chip.tsx` (`SelectablePillProps` `:10-22`, `SelectablePill` `:25`)
- Change: add optional `hitSlop?: PressableProps['hitSlop']`, forwarded to `Chip`, no default. Classes, sizes and every other prop stay, so `filter_accordion.tsx:119`, `recurrence_picker.tsx:43, 87` and `duration_picker.tsx:62` render as before.
- Test: `none` · a hit area under HeroUI's pressable is proved on the emulator (MA-085), and the repo adds no render tests.

### 4. The chip row exists as a component
- File: `src/modules/transactions/screens/transactions/components/account_chips.tsx` (new)
- Change: `AccountChips({ chips, onToggle }: { chips: readonly AccountChipModel[]; onToggle: (accountId: string | undefined) => void })`, a horizontal `ScrollView` with no scroll indicator and `keyboardShouldPersistTaps="handled"`, `testID="transactions-account-chips"`, one `SelectablePill` per chip with `dotColor`, `selected`, `style={{ minHeight: Size.compactChipHeight }}` and a vertical `hitSlop` of `(TouchSize.min - Size.compactChipHeight) / 2`, horizontal at most half the gap. Frame A1 geometry: gap 6, horizontal padding 16, 10 above the chips and 8 below, all through `ms()` or `Spacing`; the vertical padding lives on the scroll content so the slop stays inside the parent's bounds. No state, no store read, no `isDisabled`.
- Test: `none` · component, no render tests; pixels and the hit area are emulator states in Screens.

### 5. The hook prunes, mirrors, toggles and counts for the funnel
- File: `src/modules/transactions/screens/transactions/transactions.hook.ts` (`:112-119` account store read, `:140-149` `transactionQuery`, `:393-398`, `:400-403`, `:427-430`, `:460-464`, return `:543-592`)
- Change: read `hasLoaded` from the account store; `effectiveFilters = hasLoaded ? pruneAccountFilter(appliedFilters, accounts) : appliedFilters`, memoised; an effect calls `setAppliedFilters(effectiveFilters)` when its identity differs from `appliedFilters`. Every reader of `appliedFilters` in the hook (`transactionQuery`, `appliedFilterSummary`, `scopedAccountLabel`, `handleOpenFilter`) reads `effectiveFilters`, so no query carries a dropped id. `state.activeFilterCount` becomes `countFunnelFilters(effectiveFilters)`; `hasAdvancedFilters` becomes `countActiveFilters(effectiveFilters) > 0` and still drives `emptyVariant`. Add `state.accountChips = buildAccountChips(accounts, effectiveFilters.accountIds)`, memoised on those two inputs, and a flat action `toggleAccountChip(accountId: string | undefined): void` that writes `setAppliedFilters(toggleAccountFilter(<current applied filters from the store>, accountId))`. No second selection field anywhere. `__tests__/screens/transactions.screen.test.tsx:122` gains `accountChips` in its base state and `toggleAccountChip` in its hook mock so `typecheck` passes; no assertion added there.
- Test: `first` · `__tests__/screens/transactions/transactions_hook.test.ts`, the account store mock given `hasLoaded: true` in the new cases: `toggleAccountChip('acc-1')` sets applied `accountIds` to `['acc-1']`, that chip on, hero title `Out this month · Wallet`, `getMonthAggregate` called with `accountIds: ['acc-1']`, `activeFilterCount` 0; tapping it again clears it and All accounts is on; `setAppliedFilters` with one id (the sheet's path) lights that chip; two ids light none and `activeFilterCount` is 1; `seedAccountFilter('acc-1', '2026-07')` lights the chip; the only applied id archived (in `archivedAccounts`, not `accounts`) ends with store `accountIds` `[]`, All accounts on, the plain title, `activeFilterCount` 0 and no `getMonthAggregate` call carrying the id; the same for an id in neither list (deleted); two applied with one archived ends with the other's chip on; `hasLoaded: false` leaves the applied ids alone; one chip on with zero rows gives `emptyVariant` `noResults`; no filter, no search, tab `all` and zero rows gives `noData` with `activeFilterCount` 0; a category filter with zero rows gives `noResults` with `activeFilterCount` 1; `accountChips` keeps its identity across a search keystroke and a type tab switch; with `getMonthAggregate` never resolving, `toggleAccountChip` still moves the chip.

### 6. The list header shows the chips between the hero and the search field
- File: `src/modules/transactions/screens/transactions/index.tsx` (`listHeaderComponent`, `:110-131`)
- Change: mount `<AccountChips chips={state.accountChips} onToggle={toggleAccountChip} />` between `{hero}` and `<SearchRow>`, as a memoised element keyed on `state.accountChips`, and add it to the header memo's dependencies. `SearchRow` keeps reading `state.activeFilterCount`. `__tests__/screens/transactions.screen.test.tsx` gains a `jest.mock` of `@/modules/transactions/screens/transactions/components/account_chips`, in the shape of the `search_row` mock at `:72`, because the suite's `heroui-native` mock (`:17-37`) exports no `Chip`; no assertion added there.
- Test: `none` · screen file, no render tests; covered by Screens.

### 7. The feature file carries the chip states
- File: `.claude/skills/emulator-verify/features/transactions.md` (States table; row `hero, scoped to one account`, `:32`)
- Change: in `hero, scoped to one account` the filter button reads `Filter` and the account's chip reads `selected`; `hero, scoped from the sheet` adds that no chip reads `selected`; `hero, skeleton` adds that a chip tap moves the selection while the bars show, read from one shot before the tap and one after, the tapped chip in the accent tint in the second, since `mqa ui` returns nothing while the skeleton shimmers (`:56`); `hero, empty month` (`:35`) adds that the filter button reads `Filter`. Append the three states named under Screens.
- Test: `none` · documentation.

### 8. The decision is on record
- File: `docs/adr/2026-09-27-transactions-account-chips.md` (new)
- Change: the ADR named under Decision record, in the shape of `docs/adr/2026-09-24-transactions-hero-figures.md`: status, ticket, applies-to, then the three decisions and the file each lives in.
- Test: `none` · documentation.

## Screens
- `emulator-verify/features/transactions.md`: hero, scoped to one account, hero, scoped from the sheet, hero, skeleton, hero, empty month, hero, unchanged by tabs and search
- No emulator state: the archived or deleted applied account (Acceptance lines 8 and 9), the funnel keeping its count over a sheet filter that matches nothing (line 11) and one chip on with no rows (line 12) are asserted in `__tests__/screens/transactions/transactions_hook.test.ts`, step 5.
- A state the file lacks: `account chips, all accounts`, frame A1. Force: the walk's seed with four active accounts. Proof: `mqa ui` reads `All accounts` with `selected=true` first, then one node per active account in list order, none for an archived account; the row sits between the hero's caption and the search field; each chip's bounds ÷ 2.625 read `ms(28)` = 30 ± 1 high on the 411 dp Pixel_2; one shot. Step 7 appends it.
- A state the file lacks: `account chip on`, frame A2. Force: tap one account's chip. Proof: that chip reads `selected=true` and `All accounts` does not, the title reads `Out this month · <account>`, Out equals the one-account `mqa db` expense sum, the filter button reads `Filter`; a second tap returns `All accounts` to `selected=true`; two shots. Step 7 appends it.
- A state the file lacks: `account chip hit area`, no frame. Force: tap 18 px above a chip's top bound, then 18 px below its bottom bound, both bounds in pixels from `mqa ui`; on the Pixel_2 the slop is 7 dp, 18.4 px, from `(TouchSize.min - Size.compactChipHeight) / 2` with `TouchSize.min` 44 unscaled and `ms(28)` = 30 (`theme.ts:156, 243`). Proof: each tap moves the selection, read from `mqa ui`. Step 7 appends it.

## Decision record
- `docs/adr/2026-09-27-transactions-account-chips.md`: the chip writes the applied account filter and nothing else, so one tap re-scopes every hero figure through the existing aggregate; the funnel counts an account selection only at two or more; an applied account that is not in the active list leaves the filter once the account store has loaded. Step 8 adds the file.

## Non-goals
- The tally line, its copy and the search field (MA-121); the hero component and `buildTransactionsHeroModel` (MA-098); the month row and type tabs (MA-109); the sheet's footer (MA-100); the aggregate query (MA-088); the empty blocks (MA-093); holding figures across a scope change (MA-107).
- No edit to `transactions.store.ts`, `filter.store.ts` or `account.store.ts`: `seedAccountFilter` keeps its name and shape, `toggleAccountId` stays a multi-select toggle, the archive and delete actions stay unaware of this screen.
- No change to `countActiveFilters`, to `filter.hook.ts` or to the sheet's Apply count.
- No change to `SelectablePill`'s classes, padding or label style, and no new pill component.
- No new string and no edit to `src/constants/strings.ts`: `Strings.filterAllAccounts` exists at `:993`. A chip's accessibility label is its label.
- No chip for an archived account, no disabled chip state, no chip count badge.
- No edit to `DateHeader`'s `contextLabel` at `index.tsx:84` (MA-092, MA-121).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The `Size:` line names `src/constants/strings.ts`; this plan leaves it unchanged and adds `docs/adr/2026-09-27-transactions-account-chips.md`, which the line missed. 8 files either way.
- The ticket's Danger line says the chip writes "the filter store"; the applied account filter lives in `useTransactionsScreenStore.appliedFilters` (`transactions.store.ts:29, 73`) and `filter.store.ts` holds the sheet's draft, re-seeded from applied on open (`filter.hook.ts:51-55`). The plan writes applied. A ruling that means the draft store invalidates steps 1 and 5.
- `hitSlop` on HeroUI `Chip` may not extend the hit area on Android (MA-085 found the same under `PressableFeedback`). If the `account chip hit area` state fails, the fallback is a 44-high pressable wrapper per chip inside `account_chips.tsx`, and step 3 drops out.
- See all from an archived account's detail seeds an id the prune then drops, so it lands on All accounts. The plan takes Acceptance line 8 over line 6 for that case.
- A failed `loadAccounts` leaves `hasLoaded` false, so an archived id stays applied until a load lands.
- MA-121 and MA-092 edit `index.tsx:109-128` and `transactions.hook.ts:394-397, 543-565`; whichever merges second rebases steps 5 and 6.
- The frame draws the raw account colour in the dot; the plan uses `resolveAccountGlyphColor`, which steps a low-contrast colour toward the text colour, as the sheet's account glyph does.
- Amended after review: step 6 mocks `account_chips` in the screen suite (F1), step 7 names the skeleton read and adds the funnel to `hero, empty month` (F2, F4), the hit-area state taps 7 dp out (F3), and Screens names the two states proved by unit test only (F4).
- Amended after review round two: the chip height proof reads `ms(28)` = 30 (N1), the hit-area taps are 18 px from the pixel bounds (N2), and Screens names line 11 as unit-proved and lists `hero, unchanged by tabs and search` (N3).

## Self-assessment
Step 5 is the one I am least sure about. It swaps every read of `appliedFilters` in a 593-line hook for a derived value and adds a write-back effect, and the hook already has three effects keyed on the query. The derived value keeps a dropped id out of every query, but the effect's store write still produces one extra render, and the hook test mocks the account store, so the order of `hasLoaded` against a seeded filter is only as real as the mock. The hit slop in steps 3 and 4 is the second doubt: nothing in the repo proves a slop on HeroUI `Chip`, which is why the fallback sits under Risks.
