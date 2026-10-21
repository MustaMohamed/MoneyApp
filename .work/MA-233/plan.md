# MA-233 — Filter sheets share the Amount accordion, the footer and the selection helpers
base: 75a4bdbdfe20799930c189c69baef142ff9033b1 · verify: emulator · flags: none · expected diff: ~205 lines

## Steps
### 1. The four selection helpers live once, in the transactions utils, and both sheets read them
- File: `src/modules/transactions/utils/filter_selection.ts` (new); `src/modules/transactions/screens/transactions/filter/filter.helpers.ts` (`formatSelectionSummary` :51, `NamedEntity` :58, `sameStringSet` :60, `hasAmountFilter` :67, `selectedNames` :82, inline checks :12 and :45); `src/modules/commitments/screens/commitments/filter/filter.helpers.ts` (`NamedEntity` :15, `sameStringSet` :17, `hasAmountFilter` :24, `formatCommitmentSelectionSummary` :113, `selectedNames` :120); `src/modules/transactions/screens/transactions/filter/filter.hook.ts` (:12); `src/modules/commitments/screens/commitments/filter/filter.hook.ts` (:12-16, calls :68, :74, :82, :88)
- Change: the new file exports, bodies taken from the transactions copies unchanged:
  - `type NamedEntity = { name: string }`, `name` required, not nullable.
  - `formatSelectionSummary(names: readonly string[], allLabel: string): string`. Both arguments are required and not nullable, and so is the return.
  - `sameStringSet(a: readonly string[], b: readonly string[]): boolean`. Both arguments are required and not nullable. It takes the commitments `AmountType[]` and `RecurrencePreset[]` with no generic.
  - `hasAmountFilter(bounds: AmountRangeBounds): boolean`. The argument is required and not nullable. `AmountRangeBounds` is a type import from `./amount_range_filter`, since ADR 2026-10-18 §2 bars a `utils/` file from importing the screens' `AdvancedFilters`. Both filter types extend it (`transactions/.../filter.store.ts:10`, `commitments/.../filter.store.ts:10`).
  - `selectedNames(ids: readonly string[], source: ReadonlyMap<string, NamedEntity>): string[]`. Both arguments are required and not nullable, and so is the return.

  The transactions helpers import all five, so the file is §3's split form with no re-export. `countActiveFilters` :12 and `toQueryFilters` :45 call `hasAmountFilter` in place of their inline `amountMin !== undefined || amountMax !== undefined`, per the Acceptance line "written once". The commitments helpers import `sameStringSet` and `hasAmountFilter`, and delete their own copies, `NamedEntity`, `formatCommitmentSelectionSummary` and the uncalled `selectedNames`. Both hooks import `formatSelectionSummary` from `@/modules/transactions/utils/filter_selection`, and the commitments hook's four calls rename to it.
- Test: `first` · `__tests__/transactions/filter_selection.test.ts`, new:
  - `formatSelectionSummary`: 0 names gives `allLabel`; 1 name, 2 names, 3 names give `a, b +1`, and 4 give `+2`.
  - `sameStringSet`: order-insensitive; a length mismatch is false; `['a','a']` against `['a','b']` is false.
  - `hasAmountFilter`: none is false; min only and max only are true; `amountMin: 0` is true.
  - `selectedNames`: keeps the order of the ids and drops an id missing from the map.
  - The existing `filter_helpers.test.ts` suites (both modules) and `transactions_store.test.ts` pass unchanged.

### 2. One Amount section serves both sheets, and its three errors are required keys at both mounts
- File: `src/components/ui/filter_amount_accordion.tsx` (`git mv` of `src/modules/transactions/screens/transactions/filter/components/amount_accordion.tsx`); `src/components/ui/filter_accordion.tsx` (`AmountRangeFilterContentProps` :48-50); `git rm` of `src/modules/commitments/screens/commitments/filter/components/amount_accordion.tsx`; both sheets' `index.tsx` (imports :11, mounts :78 and :80); `scripts/validate-structural-guards.js` (:227, :230)
- Change:
  - Export `FilterAmountAccordion`. Its props, in order, are all required, and none can be `null`: `amountCurrency: Currency`, `minValue: string`, `maxValue: string`, `summary: string`, `active: boolean`, `expanded: boolean`, `onToggleSection: () => void`, `onChangeCurrency: (currency: Currency) => void`, `onChangeMinText: (value: string) => void`, `onChangeMaxText: (value: string) => void`, `currencyAccessibilityLabel: string`, `minError: string | undefined`, `maxError: string | undefined`, `rangeError: string | undefined`. The last three are keys the caller must write, though each value can be `undefined`.
  - The section passes `currencyAccessibilityLabel` to `AmountRangeFilterContent`'s `accessibilityLabel`. The rest of the body is unchanged.
  - In `AmountRangeFilterContentProps`, `minError`, `maxError` and `rangeError` become required keys typed `string | undefined`.
  - The transactions sheet passes `Strings.filterAmountCurrencyAccessibility`, and the commitments sheet passes `Strings.commitmentFilterAmountCurrencyAccessibility`.
  - In the guard row, `${UI}/filter_amount_accordion.tsx` replaces the two amount paths, because `:480` fails lint on a named path that is gone.
- Test: `first` · six changes:
  - `__tests__/components/ui/filter_amount_accordion_props.test.ts`, new. A type-level check that `npm run typecheck` runs: `type IsRequired<P, K extends keyof P> = Partial<Pick<P, K>> extends Pick<P, K> ? false : true`, asserted `true` for `minError`, `maxError` and `rangeError`. It checks `ComponentProps<typeof FilterAmountAccordion>` and `ComponentProps<typeof AmountRangeFilterContent>`, and one `it` holds the tuple. At base the keys are optional and the assignment fails tsc.
  - `__tests__/components/ui/filter_accordion.test.tsx`: the call at :179 and `baseProps` at :205-213 gain `minError: undefined`, `maxError: undefined` and `rangeError: undefined`. Add one case: `FilterAmountAccordion` with `currencyAccessibilityLabel="Commitment amount currency"` draws the tabs under `getByLabelText` of that label.
  - `__tests__/screens/transactions/filter/filter_sheet.test.tsx`: the mock at :102 moves to `@/components/ui/filter_amount_accordion` / `FilterAmountAccordion`, and captures its props.
  - `__tests__/screens/commitments/filter/filter_sheet.test.tsx`: the mock at :108 moves the same way. The MA-212 errors case is unchanged apart from the mock.
  - Each sheet suite asserts its own `currencyAccessibilityLabel` string. This is render-only wiring, which an Acceptance line names.

### 3. One Accounts section serves both sheets, labelled by the sheet
- File: `src/components/ui/filter_account_accordion.tsx` (`git mv` of `src/modules/transactions/screens/transactions/filter/components/account_accordion.tsx`); `git rm` of `src/modules/commitments/screens/commitments/filter/components/account_accordion.tsx`; both sheets' `index.tsx` (imports :10, mounts :60 and :62); `scripts/validate-structural-guards.js` (:225, :228)
- Change:
  - Export `FilterAccountAccordion`. Its props, in order, are all required, and none can be `null`: `accounts: Account[]` (`@/modules/accounts/entities/account.entity`), `selectedIds: string[]`, `selectedCount: number`, `summary: string`, `expanded: boolean`, `onToggleSection: () => void`, `onToggleId: (id: string) => void`, `optionAccessibilityLabel: (name: string) => string`.
  - Each option's `accessibilityLabel` is `optionAccessibilityLabel(resolveAccountName(account))`. The rest of the body is unchanged, `TYPE_OPTIONS` through `@/components/account_type_pill` included, as both clones read it.
  - The transactions sheet passes `Strings.filterAccountAccessibility`, and the commitments sheet passes `Strings.commitmentFilterAccountAccessibility` (`strings.ts:1330,1332`).
  - In the guard row, `${UI}/filter_account_accordion.tsx` replaces the two paths.
- Test: `first` · four changes:
  - `__tests__/components/ui/filter_accordion.test.tsx`: add one case. `FilterAccountAccordion` with one `makeTestAccount` named `Cash` and `optionAccessibilityLabel={(n) => \`${n}, x\`}` gives `getByLabelText('Cash, x')`.
  - Both sheet suites move their Accounts mock (:90, :96) to `@/components/ui/filter_account_accordion` / `FilterAccountAccordion`, and assert `optionAccessibilityLabel` is the sheet's own `Strings` function.
  - `__tests__/scripts/validate_structural_guards.test.ts:261` targets `src/components/ui/filter_account_accordion.tsx`.

### 4. One Categories section serves both sheets, labelled by the sheet
- File: `src/components/ui/filter_category_accordion.tsx` (`git mv` of `src/modules/transactions/screens/transactions/filter/components/category_accordion.tsx`); `git rm` of `src/modules/commitments/screens/commitments/filter/components/category_accordion.tsx`; both sheets' `index.tsx` (imports :12 and :13, mounts :69 and :71); `scripts/validate-structural-guards.js` (:226, :229)
- Change:
  - Export `FilterCategoryAccordion`. Its props, in order, are all required, and none can be `null`: `categories: Category[]` (`@/modules/categories/entities/category.entity`), `selectedIds: string[]`, `selectedCount: number`, `summary: string`, `expanded: boolean`, `onToggleSection: () => void`, `onToggleId: (id: string) => void`, `optionAccessibilityLabel: (name: string) => string`.
  - Each option's `accessibilityLabel` is `optionAccessibilityLabel(category.name)`.
  - The glyph draws `color={category.color}`, as the commitments copy does. This drops the `?? CoreTokens.text2` fallback, its `oxlint-disable` line and the `CoreTokens` import. The fallback draws nothing different: `color` is `NOT NULL` (`src/database/migrations/003_create_categories.ts:9`) and typed `string` (`src/modules/categories/entities/category.entity.ts:8`).
  - The transactions sheet passes `Strings.filterCategoryAccessibility`, and the commitments sheet passes `Strings.commitmentFilterCategoryAccessibility` (`strings.ts:1331,1333`).
  - In the guard row, `${UI}/filter_category_accordion.tsx` replaces the two paths.
- Test: `first` · two changes:
  - `__tests__/components/ui/filter_accordion.test.tsx`: add one case. `FilterCategoryAccordion` with one `makeTestCategory` gives the category's label through `optionAccessibilityLabel`.
  - Both sheet suites move their Categories mock (:96, :102) to `@/components/ui/filter_category_accordion` / `FilterCategoryAccordion`, and assert the sheet's own `Strings` function.

### 5. One filter-sheet frame draws both sheets' snap points, title, scroll body and flat footer
- File: `src/components/ui/filter_sheet_frame.tsx` (new); `src/modules/transactions/screens/transactions/filter/index.tsx` (`FILTER_SHEET_ACTION_STYLE` :15, `Sheet` :21-59, `BottomSheetScrollView` :57-59); `src/modules/commitments/screens/commitments/filter/index.tsx` (`COMMITMENT_FILTER_SHEET_ACTION_STYLE` :17, :23-61); `scripts/validate-structural-guards.js` (row :220-232)
- Change:
  - Export `FILTER_SHEET_ACTION_STYLE = { flex: 1 } as const` and `FilterSheetFrame(props): React.ReactElement`.
  - Its props, in order, are all required, and none can be `null`: `isOpen: boolean`, `onClose: () => void`, `testIDPrefix: string`, `canReset: boolean`, `canApply: boolean`, `draftCount: number`, `onReset: () => void`, `onApply: () => void`, `children: ReactNode`.
  - The body is the `Sheet` block of the transactions index, moved as it is:
    - `snapPoints={['45%', '92%']}`, `scrollable`, `blursInputOnClose` and `title={Strings.filterTitle}`.
    - `onOpenChange` calls `onClose` on `false`.
    - The footer row holds two boxes with the testIDs `${testIDPrefix}-reset-action` and `${testIDPrefix}-apply-action`. Reset is `variant="secondary" flat`, disabled at `!canReset`. Apply is `variant="primary" flat`, labelled `filterApplyWithCount(draftCount)` above 0 and else `filterApply`, disabled at `!canApply`.
    - `children` sit inside the `BottomSheetScrollView` with its `contentContainerStyle`.
  - The frame holds no hook.
  - The transactions sheet passes `testIDPrefix="filter"`, and the commitments sheet passes `"commitment-filter"`. Each index drops its style constant and its `Sheet`, `Box`, `Button`, `SHEET_FOOTER_CLEARANCE` and `BottomSheetScrollView` imports.
  - `${UI}/filter_sheet_frame.tsx` joins the filter-component guard row.
- Test: `first` · four changes:
  - Both sheet suites import `FILTER_SHEET_ACTION_STYLE` from `@/components/ui/filter_sheet_frame`. The commitments suite drops `COMMITMENT_FILTER_SHEET_ACTION_STYLE` (:6, :154-161).
  - The testID, label and press assertions are unchanged. The `@/components/ui/sheet` and `@/components/ui/button` mocks resolve to the frame's imports.
  - `__tests__/screens/commitments/filter/filter_sheet.test.tsx`: add one case beside the MA-212 Reset case (:175), with `canApply: false` and `draftCount: 0`. It asserts that `getByText(\`primary:flat:${Strings.filterApply}\`)` is disabled. This covers Apply's `isDisabled={!canApply}` binding and the bare label at a count of 0. It is render-only wiring that Acceptance line 4 names, so `.claude/rules/tests.md:19` allows it.
  - `__tests__/screens/transactions/transactions_shared_copy.test.ts`: the readers column of `filterTitle`, `filterReset`, `filterApply` and `filterApplyWithCount(2)` names `components/ui/filter_sheet_frame.tsx`, and the three section rows name their `components/ui/filter_*_accordion.tsx` homes. The values are unchanged.

### 6. The ADR and both features files name the moved pieces
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` (Applies to :6, §1 after :24); `.claude/skills/emulator-verify/features/commitments.md` (:3, :46, Gotchas :61); `.claude/skills/emulator-verify/features/transactions.md` (:3, Gotchas after :122)
- Change:
  - Add `**Extended 2026-10-22 (#816, MA-233).**` to §1. It names each piece and its home:
    - `FilterSheetFrame` and `FILTER_SHEET_ACTION_STYLE`, with the testID prefix.
    - `FilterAccountAccordion`, `FilterCategoryAccordion` and `FilterAmountAccordion` in `src/components/ui/`. The transactions files moved by `git mv`, and the commitments clones were deleted.
    - The four helpers and `NamedEntity` in `src/modules/transactions/utils/filter_selection.ts`, with `hasAmountFilter` on `AmountRangeBounds` under §2.
  - The extension also records three facts:
    - A shared ui piece may read the accounts and categories entities, `resolveAccountGlyphColor` and `TYPE_OPTIONS`. `moneyapp/screens-import-boundary` bars only screens folders, as the #781 extension holds.
    - The three amount errors are required keys.
    - The category glyph fallback was dropped, with the reason from step 4.
  - The Applies-to line gains the five new paths.
  - In both features files, the header names the frame and the three sections beside `filter_accordion.tsx`. Each Gotchas list says that a read of the frame or the sections holds on the other module's sheet, and that a divergence is a caller override.
  - In commitments.md, :46 names `FilterAmountAccordion` in place of `AmountRangeFilterContent`.
- Test: `none` · docs only; `npm run lint` runs `validate:agent-assets` over them.

## Screens
- `emulator-verify/features/commitments.md`: filter sheet footer, flat
- `emulator-verify/features/commitments.md`: filter sheet footer, large font
- `emulator-verify/features/commitments.md`: filter sheet sections
- `emulator-verify/features/commitments.md`: filter sheet option pill, with adornment
- `emulator-verify/features/commitments.md`: filter sheet, amount errors, large font
- `emulator-verify/features/commitments.md`: filter sheet walk, large font
- `emulator-verify/features/transactions.md`: filter sheet footer, flat
- `emulator-verify/features/transactions.md`: filter sheet footer, large font
- `emulator-verify/features/transactions.md`: filter accordion, category glyph
- `emulator-verify/features/transactions.md`: filter sheet, amount errors, large font
- `emulator-verify/features/transactions.md`: filter sheet walk, large font

## Non-goals
- No restyle. The `paddingHorizontal: 16` literal, the `{ flexDirection: 'row' }` footer and `gap-2` move as they are. There is no token swap.
- No shared hook, store or state. `useFilterSheet`, `useCommitmentFilterSheet`, both `filter.store.ts` and both `filter.state.ts` stay per sheet (epic R14).
- `countActiveFilters`, `countActiveCommitmentFilters`, `advancedFiltersEqual`, `commitmentFiltersEqual` and the commitments Amount type and Repeats sections stay in their modules.
- No change to `amount_range_filter.ts`.
- No re-export at an old path, and no `index.ts`.
- No `@/components/account_type_pill` swap.
- No commitment dimension or See all (MA-213). No `SelectablePill` corners or form pieces (MA-206).

## Untested inputs
- The frame's `onOpenChange(false)` to `onClose`, for a swipe or backdrop close (step 5). No suite exposes it at base either. The walk rows close the sheet on device.
- The category glyph colour after the fallback goes (step 4). This is `transactions.md · filter accordion, category glyph`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `test -f` each new suite path before it is cited. Show that `filter_amount_accordion_props.test.ts` fails `npm run typecheck` with the base `AmountRangeFilterContentProps`.

## Risks
- MA-206 (#780) changes `SelectablePill`, extends the same ADR, and edits the rows `transactions.md · filter accordion, category glyph` and `commitments.md · filter sheet option pill, with adornment`. Whichever merges second rebases those lines and takes its render base after the other.
- A `git mv` with too many edits reads as a delete and an add, and `--follow` loses the history (ADR §3). Keep each moved file's edits to its specifiers, name, label prop and error types.
- `transactions.md · filter sheet footer, flat`: the footer now mounts from `FilterSheetFrame`. A button corner cut by `sheet-footer`'s edge means the frame changed the container.
- `commitments.md · filter sheet footer, flat`: the same frame. Apply must still read `Apply (1)` from `countActiveCommitmentFilters`.
- `commitments.md · filter sheet, amount errors, large font`: the commitments sheet now draws the transactions file's Amount section. The 2.0 slot figures must match the transactions row.
- `transactions.md · filter accordion, category glyph`: each glyph must still draw in its category tone after the fallback goes.
- not probed: commitments.md · filter sheet option pill, with adornment
- not probed: commitments.md · filter sheet, amount errors, large font
- not probed: commitments.md · filter sheet walk, large font
- not probed: transactions.md · filter sheet footer, flat
- not probed: transactions.md · filter sheet footer, large font
- not probed: transactions.md · filter accordion, category glyph
- not probed: transactions.md · filter sheet, amount errors, large font
- not probed: transactions.md · filter sheet walk, large font
- REBUILD: package-lock.json package.json patches/expo-router+57.0.29.patch

## Self-assessment
I am least sure of the step 2 type-level suite. The repo has no type-only test, and `IsRequired` must be `false` for an optional key and `true` for a required `string | undefined` key under the repo's tsconfig. If `exactOptionalPropertyTypes` or the oxlint type-aware rules read it differently, the implementer falls back to proving the gate once in the PR: drop `rangeError=` from one mount, see TS2741, restore.
