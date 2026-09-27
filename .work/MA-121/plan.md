# MA-121 — Search tally: count, sum and applied filters under the search field
base: 488d74dd72689fcd8abe25f9b0645196c3634ee4 · verify: emulator · flags: money path, user copy · expected diff: ~230 lines

Size recount, 8 files outside tests: `src/constants/strings.ts` ~6, `filter/filter.helpers.ts` ~8, `transactions.helpers.ts` ~55, `transactions.hook.ts` ~30, `components/search_tally.tsx` (new) ~75, `index.tsx` ~12, `.claude/skills/emulator-verify/features/transactions.md` ~8, `docs/adr/2026-09-27-transactions-search-tally.md` (new) ~35. The ticket's `Size:` line names `components/search_row.tsx` and `src/components/ui/search_filter_row.tsx`, which this plan does not change, and misses the ADR.

## Steps

### 1. The placeholder and the tally copy exist as strings
- File: `src/constants/strings.ts` (`searchTransactionsPlaceholder`, `:930`)
- Change: `searchTransactionsPlaceholder` reads `Search transactions`. Add three keys beside the `transactionsHero*` block (`:1255-1266`): `transactionsTallyResults: (month: string) => 'results in <month>'`, `transactionsTallyOneResult: (month: string) => 'result in <month>'`, `transactionsTallyNoResults: (month: string) => 'No results in <month>'`. The count and the dash print as their own node before the first two, so the line reads `<n> results in <Month>`, `1 result in <Month>` and `— results in <Month>`; the dash is the existing `transactionsHeroUnavailable`. `searchCommitmentsPlaceholder` (`:1026`) stays.
- Test: `after` · `__tests__/screens/transactions/search_row.test.tsx:26, 27, 57, 75` read `Search transactions` in place of the old literal. No new case; `__tests__/screens/commitments/search_row.test.tsx` passes unedited.

### 2. The filter summary can leave out a lone account's name
- File: `src/modules/transactions/screens/transactions/filter/filter.helpers.ts` (`formatAppliedFilterSummary`, `:146`)
- Change: a fourth, optional parameter `options?: { omitSingleAccount?: boolean }`. With `omitSingleAccount` true and `f.accountIds.length === 1` the accounts part is skipped; categories and amount print as before, and the result is `null` when nothing else is on. Two or more accounts print through `formatSelectionSummary` as today. Without the option the output is byte-identical to today's, so `transactions_store.test.ts:256`, `transactions_hook.test.ts:283-294` and `filter_helpers.test.ts:67-135` pass unedited.
- Test: `first` · `__tests__/screens/transactions/filter/filter_helpers.test.ts`, in `describe('formatAppliedFilterSummary')`. Cases with the option on: one account alone returns `null`; one account plus a category returns `Food`; one account plus an amount floor returns `From 500 EGP`; two accounts return `CIB, Wallet`; three accounts return `CIB, Wallet +1`, read from an accounts map local to the new cases that adds `['a3', { name: 'Cash' }]`, since the shared fixture at `:68-71` holds `a1` and `a2` only and `selectedNames` drops an id with no label. The six existing cases and the shared fixture stay unedited.

### 3. A pure builder turns the month's figures into the tally model
- File: `src/modules/transactions/screens/transactions/transactions.helpers.ts` (new exports `SearchTallyMode`, `SearchTallyInput`, `SearchTallyModel`, `buildSearchTally`; `heroNet` `:237`, `fullMonthName` `:281`)
- Change: add
  - `type SearchTallyMode = 'empty' | 'skeleton' | 'failed' | 'figures'`
  - `interface SearchTallyInput { isOn: boolean; figuresMode: TransactionsHeroMode; matchCount: number | null; matchNetEgp: number | null; yearMonth: string; filterSummary: string | null }`
  - `interface SearchTallyModel { mode: SearchTallyMode; count: string | undefined; label: string; sum: string | undefined; sumPolarity: PolaritySignal; currencyCode: string | undefined; filterSummary: string | undefined }`
  - `function buildSearchTally(input: SearchTallyInput): SearchTallyModel`

  Mode, first match wins: `isOn` false is `empty`; `figuresMode` `skeleton` is `skeleton`; `figuresMode` `dashes`, or a null `matchCount` or `matchNetEgp`, is `failed`; else `figures`. `empty` and `skeleton` return `count`, `sum` and `filterSummary` undefined and `label` `''`. `failed` returns `count` `—`, the plural label, no sum, and the summary. `figures` returns `count` through `formatAmount(matchCount)`, the label by count (0 gives `count` undefined and the No results label, 1 the singular, else the plural), and the summary. `sum` is undefined at 0 matches; otherwise it takes the sign and polarity rule `heroNet` applies to Net, shared with `heroNet` and not copied: `formatDisplayMagnitude(matchNetEgp, Currency.EGP)`, `PLUS_SIGN` above 0 with `good`, `MINUS_SIGN` below 0 with `bad`, no sign and `neutral` when the text prints as zero. `sum` carries no currency code; `currencyCode` is `CURRENCY_CONFIG[Currency.EGP].code` when `sum` is defined and undefined whenever `sum` is undefined. The month is `fullMonthName(yearMonth)`, which stays private. No existing export changes name or return shape (the dashboard card imports four of them).
- Test: `first` · `__tests__/screens/transactions/transactions_helpers.test.ts`, new `describe('buildSearchTally')`, `yearMonth: '2026-09'`. Cases: 2 matches, net −2100, no summary gives `count` `2`, label `results in September`, `sum` `−2,100` (U+2212), `bad`, `currencyCode` `EGP`, `filterSummary` undefined; the same with `filterSummary: 'Food'` carries `Food`; 1 match gives `result in September` with its sum; 0 matches gives `count` undefined, `No results in September`, `sum` and `currencyCode` undefined, summary kept; net +300 gives `+300` and `good`; net 0 with 2 matches gives `0`, `neutral`; net −2100.49 gives `−2,100`; 1240 matches gives `count` `1,240`; `figuresMode: 'skeleton'` with `isOn` gives `skeleton`, no text fields and `currencyCode` undefined; `figuresMode: 'dashes'` gives `count` `—`, plural label, `sum` and `currencyCode` undefined, summary kept; `isOn: false` gives `empty` with `currencyCode` undefined in every `figuresMode`.

### 4. The hook publishes `state.tally` from the applied filter and the held figures
- File: `src/modules/transactions/screens/transactions/transactions.hook.ts` (`appliedFilterSummary` `:413`, `hasAdvancedFilters` `:417`, `displayTotals` `:452`, `heroMode` `:460`, return `:571-601`)
- Change: `state.tally: SearchTallyModel`, memoised on primitives so a keystroke that changes nothing keeps its identity. Inputs: `isOn` is `transactionQuery.search !== undefined || hasAdvancedFilters` (the debounced, trimmed search the aggregate ran with; a type tab alone does not turn it on); `figuresMode` is `heroMode`; `matchCount` and `matchNetEgp` are `displayTotals`' or null, and null as well when `displayTotalsStatus === 'refreshErrorWithData'` and `displayTotals.queryKey !== activeQueryKey`, so a failed load for this query reads `failed` through step 3's null rule and never prints another query's count and sum; while a load is in flight the held figures stay; `filterSummary` is `formatAppliedFilterSummary(effectiveFilters, accountLabelsById, categoriesById, { omitSingleAccount: true })`. `state.appliedFilterSummary` and `state.searchDisabled` are untouched. The tally reads `effectiveFilters`, never a selection of its own. In the same commit `baseTransactionsState` in `__tests__/screens/transactions.screen.test.tsx:112-155` gains a `tally` in mode `empty`, or typecheck fails on the hook's return type.
- Test: `first` · `__tests__/screens/transactions/transactions_hook.test.ts`, new `describe('useTransactions search tally')`, the aggregate mocked through `mockGetMonthAggregate` as the file does today. Cases: a search `coffee` with `matchCount` 2 and `matchNetEgp` −2100 reads mode `figures`, `count` `2`, `sum` `−2,100`, no summary; one account through `setAppliedFilters` with no search reads `figures` with `filterSummary` undefined while `state.appliedFilterSummary` still reads the account's name; two accounts read both names in `tally.filterSummary`; one account plus a category reads the category alone; the account filter emptied through `setAppliedFilters(EMPTY_FILTERS)` with no search reads `empty`; a type tab alone reads `empty`; a whitespace-only search reads `empty`; a first load that never resolves with one account applied reads `skeleton`; a first load that rejects with one account applied reads `failed` with `count` `—`; the month resolves with `matchCount` 45, the search changes to `coffee` and the aggregate rejects, and the tally reads `failed` with `count` `—` and `sum` undefined while `state.hero.mode` stays `figures`; a refresh of the same query that rejects keeps mode `figures` with the held count.

### 5. The tally line renders in a reserved slot under the search row
- File: `src/modules/transactions/screens/transactions/components/search_tally.tsx` (new, `SearchTally`, `SEARCH_TALLY_SLOT_HEIGHT`); `src/modules/transactions/screens/transactions/index.tsx` (`listHeaderComponent`, `:116-139`)
- Change: `SearchTally({ model }: { model: SearchTallyModel })`, `React.memo`, no state, root `testID="transactions-search-tally"`. The root has one fixed height in every mode, `SEARCH_TALLY_SLOT_HEIGHT = Spacing.xxs + lineHeightFor(Type.micro)`, and `px-4`; every text is `numberOfLines={1}`. Frame A3 geometry: a row, the count group at the left, the sum at the right edge. Left group: `count` in `font-sora-semibold text-foreground`, the label in `font-inter-semibold text-content-secondary`, then `filterSummary` as its own node after a `Spacing.xs` gap, the only node that shrinks and truncates. Right: `sum` in `font-sora-semibold tabular-nums` coloured by `sumPolarity` (`good` success, `bad` danger, `neutral` foreground, the hero's `FLOW_CLASS` mapping), then `currencyCode` in `text-content-secondary`. All text at `Type.micro` with `lineHeightFor(Type.micro)`. `skeleton` renders one HeroUI `Skeleton` bar inside the slot; `empty` renders the slot alone. No separator glyph and no literal copy in the file. `index.tsx` mounts `<SearchTally model={state.tally} />` after `<SearchRow>` inside `transactions-list-header`, as a memoised element keyed on `state.tally` like `hero`. `SearchRow`, `SearchFilterRow` and `DateHeader`'s `contextLabel` are not edited.
- Test: `none` · the repo forbids new render tests (`.claude/rules/tests.md`); the model is asserted in steps 3 and 4 and the pixels in Screens.

### 6. The feature file carries the tally's states
- File: `.claude/skills/emulator-verify/features/transactions.md` (States table; the intro line's frame list gains A3)
- Change: append the five rows named under Screens, each with Frame, Force and Proof. Add one Gotchas line: the search field is disabled while the hero skeleton shows, so the tally skeleton is reached with an account applied through `See all`, never by typing.
- Test: `none` · a skill file.

### 7. The decision record
- File: `docs/adr/2026-09-27-transactions-search-tally.md` (new; header fields as `docs/adr/2026-09-27-transactions-account-chips.md`)
- Change: records the decisions listed under Decision record.
- Test: `none` · a document.

## Screens
- `emulator-verify/features/transactions.md`: `hero, skeleton` (the search field not live, already in the table), `hero, unchanged by tabs and search`
- States the file lacks, added by step 6:
  - `search tally, results`, frame A3. Force: seed two expenses this month whose notes share a word, type the word. Proof: `mqa read transactions-search-tally` reads `2`, `results in <Month>`, `−<sum>` with U+2212 and `EGP`; the sum equals the `mqa db` net of the two rows; the clear glyph answers `Clear search`; the placeholder reads `Search transactions` once cleared; then a word matching one row reads `1`, `result in <Month>` and that row's signed amount, and a word matching none reads `No results in <Month>` with no count node, no sum node and no `EGP` node, the slot's bounds unchanged across all three; one shot each.
  - `search tally, empty slot`, frame A1. Force: no search, `All accounts`, no sheet filter. Proof: the slot has no text node, and the first date header's top bound reads the same ± 1 dp before and after a chip tap turns the tally on; two shots.
  - `search tally, filter summary`, no frame. Force: two accounts and one category applied in the sheet; then one chip on with the same category. Proof: the first reads both account names then the category, the second the category alone with the account in the hero title; the sum stays at the right edge and the line stays one line high; two shots.
  - `search tally, skeleton`, no frame. Force: the `hero, skeleton` source force, arriving through `See all`. Proof: one bar in the slot, the slot's bounds equal to `search tally, results`; one full shot, since `mqa ui` returns nothing while it shimmers.
  - `search tally, figures failed`, no frame. Force: the `hero, figures failed` first-load throw, arriving through `See all`. Proof: reads `—`, `results in <Month>`, no sum node; one shot.

## Decision record
- `docs/adr/2026-09-27-transactions-search-tally.md`: the tally prints `matchCount` and `matchNetEgp` from the month aggregate unchanged, so transfers and card payments count 0 and a card credit reduces Out; the sum is a net, signed and coloured as the hero's Net under money-colour decision 5, EGP at 0 dp through `formatDisplayMagnitude`; the line is on for an applied search, one applied account or a sheet filter, and a type tab alone leaves it off; its summary omits a lone account's name because the hero title carries it; a failed load whose kept figures belong to another query reads the dash form, while a failed refresh of the same query keeps its figures. Step 7 adds the file.

## Non-goals
- The account chips, the funnel count, pruning an archived or deleted account (MA-120, merged at this base).
- Retiring or changing `DateHeader`'s `contextLabel` or `state.appliedFilterSummary` (MA-092).
- Blanking or marking the tally while another query's figures are held and its load is in flight: a search keystroke, a scope change (MA-107).
- The no-results and no-transactions blocks (MA-093), the month row and type tabs (MA-109), the sheet footer (MA-100), the hero (MA-098), the aggregate SQL (MA-088).
- A tally slot or any other edit in `SearchFilterRow`, `SearchRow` or the commitments `CommitmentSearchRow`.
- A USD sum, a per-type tally, a separator glyph or any string beyond the three keys in step 1.
- Exporting `fullMonthName` or renaming any `transactions.helpers.ts` export.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- Frame A3 shows the funnel at 1 and draws no filter summary, so the summary's place (left group, after the label, gap and no glyph) is this plan's choice; a ruling that places it elsewhere amends step 5 and the `filter summary` state.
- "A search is on" is read as the debounced, trimmed search. A ruling for the raw field value changes `isOn` in step 4 and shows the held month count for 300 ms after the first keystroke.
- The slot adds `SEARCH_TALLY_SLOT_HEIGHT` under the search row in every state, so the first date header sits lower than frame A1 draws it; the render lens measures zero-shift, not A1's gap.
- MA-092 or MA-107 merging first moves `transactions.hook.ts:413-417` and the return block; rebase, the steps hold.
- `__tests__/screens/transactions.screen.test.tsx` mounts the real `SearchTally`; if HeroUI `Skeleton` fails under that suite's mocks, mock `components/search_tally` there as `account_chips` is mocked.

- Amended after review, 2026-09-27: step 4 nulls the tally's figures on a failed load for another query (the ticket gives MA-107 the in-flight hold only), step 2's three-account case names its own fixture, and the `search tally, results` state covers 1 and 0 matches. The 0-match proof reads step 5's right group as rendered only when `sum` is defined, the currency code included.
- Amended after review round 2, 2026-09-27: step 3's `currencyCode` is undefined whenever `sum` is, asserted in the 0-match, `failed`, `skeleton` and `empty` cases, so Jest fails if `EGP` prints beside a missing sum.

## Self-assessment
Step 5 is the least certain. The ticket gives the reading order of the line and frame A3 gives the count at the left and the sum at the right, but no frame draws the filter summary, the skeleton or the dash form, so the summary's position, its truncation and the absence of a separator are choices made here to stay inside the approved copy. The component has no unit test by repo policy, which leaves the emulator states as the only check on that layout. Steps 2 to 4 rest on signatures stated in full and on figures the aggregate already returns.
