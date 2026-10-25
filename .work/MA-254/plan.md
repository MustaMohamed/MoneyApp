# MA-254 — Shared form tabs, content inset, category cells at large font
base: 647ceccc89fc68d454607cf958da02d1f09471de · verify: emulator · flags: none · expected diff: ~350 lines

Count, outside tests: `commitment_form_body.tsx` ~198 (159 of them the cards block `:280-438` re-indented one level into the inset `View`), `form_type_tabs.tsx` ~80, `type_tabs.tsx` ~23, `form_sheet.geometry.ts` ~22, `category_picker_sheet.tsx` ~9, `transaction_form_body.tsx` ~6, `commitment_form.geometry.ts` ~3, the three features files ~7, the ADR ~2. Eleven files: the ten of the `Size:` line and `form_sheet.geometry.ts` (step 1), which it missed.

## Steps

### 1. One resolver gives the support line its text props, one line or wrapping
- File: `src/components/ui/form_sheet.geometry.ts` (beside `resolveTypeTabsGeometry`, `:117`)
- Change: add `export type FormSupportLines = 'one' | 'wrap'` and `export function resolveFormSupportLineTextProps(lines: FormSupportLines, fontScale: number): FormSupportLineTextProps`, both arguments required, never `null`. Return, never `null`: `numberOfLines: 1 | undefined` (`1` for `'one'`, `undefined` for `'wrap'`), `allowFontScaling: boolean` (`true` at or below scale 1, `false` above), `style: { fontSize: number; lineHeight: number; flexShrink?: 1 }`: `Type.micro` and `lineHeightFor(Type.micro)` at or below 1, `scaledTextStyleAboveOne(Type.micro, fontScale)` above, with `flexShrink: 1` for `'one'` only. The `'one'` branch returns what `transaction_form_body.tsx:140,165-172` resolves today; the `'wrap'` branch what `commitment_form_body.tsx:108,240-248` resolves.
- Test: `first` · `__tests__/components/ui/form_sheet.geometry.test.ts`, a `resolveFormSupportLineTextProps` describe: at 1, `'one'` gives `numberOfLines` 1, `allowFontScaling` true, the `Type.micro` pair and `flexShrink` 1, `'wrap'` gives no `numberOfLines` and no `flexShrink`; at 2, both give `allowFontScaling` false and `scaledTextStyle(Type.micro, 2)`'s pair, `'wrap'` still no `numberOfLines`.

### 2. The transaction sheet draws its tabs, support line and strip row from the shared piece
- File: `src/components/ui/form_type_tabs.tsx` (new), `src/modules/transactions/screens/transactions/transaction_form/components/type_tabs.tsx` (`TypeTabs`), `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx` (`:158-199`)
- Change: `form_type_tabs.tsx` exports `FormTypeTabs<T extends string>` and `FormStripRow`. `FormTypeTabs` props, all required unless marked, none `null`: `segments: TabSegment<T>[]`, `value: T`, `onValueChange: (value: T) => void`, `accessibilityLabel: string`, `isDisabled?: boolean` (optional, `undefined` reads enabled), `supportText: string`, `supportLines: FormSupportLines`, `children: React.ReactNode` (the strip). It returns a fragment of three siblings in this order: the tabs wrapper and `SegmentedTabs` exactly as `type_tabs.tsx:46-60` draws them (`resolveTypeTabsGeometry(fontScale)` for `listStyle` and `triggerHitSlop`); the support line `View` and `Text` of `transaction_form_body.tsx:164-176` with `testID="form-type-tabs-support-line"` and `resolveFormSupportLineTextProps(supportLines, fontScale)` spread; then `<FormStripRow>{children}</FormStripRow>`. `FormStripRow({ children: React.ReactNode })`, required, is the wrapper of `transaction_form_body.tsx:177-180` with `testID="form-strip-row"`, exported for the pay sheet (MA-259). `TypeTabs` keeps `active`, `incomeLabel`, `onSelect`, `isDisabled: boolean` and its `TYPE_SEGMENTS` mapping, adds `supportText: string` and `children: React.ReactNode`, both required, and renders `FormTypeTabs` with `supportLines="one"` and `Strings.addTxTypeSelectorA11y`; it is the transaction adapter, as `TransactionAmountHero` adapts `AmountHero`, not a re-export. The body passes `typeSupportingText` and its strip conditional `:181-198` as children, unchanged, and drops `supportingLine`, its `fontScale` read and the imports only they used. Only `transaction_form_body.tsx:158` and the suite below mount `TypeTabs` (LSP references).
- Test: `first` · `__tests__/screens/transactions/transaction_form/type_tabs.test.tsx`: the three cases pass `supportText` and a child; a case that `form-type-tabs-support-line` holds the text with `resolveFormSupportLineTextProps('one', fontScale)`'s `numberOfLines`, `allowFontScaling` and style, and that the child renders inside `form-strip-row` styled `paddingVertical: ACCOUNT_STRIP_WRAPPER_PADDING_Y`; a case that mounts `FormTypeTabs` itself with `supportLines="wrap"` and asserts the `Text` `form-type-tabs-support-line` carries `resolveFormSupportLineTextProps('wrap', fontScale)`'s `allowFontScaling` and style, with no `numberOfLines` and no `flexShrink` (reviewer-1 finding 4): the wiring Acceptance 2 names, so the Render-suite policy (`.claude/rules/tests.md:19`) admits it in this existing suite. `fontScale` is `Dimensions.get('window').fontScale`, as the suite reads it today. `__tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx:80-83`: the `TypeTabs` mock returns its `children`, or the strip cases (`:149`-`:436`) lose `account-strip`.

### 3. The commitment top spans the sheet from the shared piece, its cards sit in the content inset
- File: `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx` (`:211-439`), `src/modules/commitments/screens/commitments/components/commitment_form.geometry.ts` (`:53-64`)
- Change: the scroll drops `contentContainerStyle` and the bleed `View` `:220`. Its children in order: `FormTypeTabs<AmountType>` with today's two segments, `amountType`, `handleAmountTypeChange`, `Strings.commitmentsAmountTypeSelectorA11y`, `isDisabled={locked}`, today's support text ternary `:249-251` and `supportLines="wrap"`, its child the `AccountStrip` of `:258-266` unchanged; `CommitmentAmountHero`; the `ValidationSlot`; then `<View testID="commitment-form-card-inset" style={FORM_SHEET_CONTENT_CONTAINER_STYLE}>` holding the cards `:280-437` and `{afterFields}`, the same `View` the transaction facts sit in (`transaction_form_body.tsx:218`). Delete `COMMITMENT_FORM_CONTENT_CONTAINER_STYLE` and `COMMITMENT_FORM_TOP_BLEED_STYLE`, which no other file reads, and the imports only they and the moved top used (`resolveTypeTabsGeometry`, `ACCOUNT_STRIP_WRAPPER_PADDING_Y`, `scaledTextStyleAboveOne`, `useWindowDimensions`, `Spacing`). `SegmentedTabs` and `COMMITMENT_FORM_TABS_SLOP` stay for the Currency card. `CommitmentFormFooter` `:68-101` stays as it is: `scripts/validate-structural-guards.js:354-360` requires its live region. `CommitmentFormBody`'s props do not change.
- Test: `none` · no render suite mounts `CommitmentFormBody` (`git grep CommitmentFormBody -- __tests__` finds only the hook and state suites) and a new `.tsx` suite is barred; the inset is `FORM_SHEET_CONTENT_CONTAINER_STYLE`, pinned at `__tests__/components/ui/form_sheet.geometry.test.ts:38-45`; the support line is step 1's case. The emulator states prove the geometry.

### 4. Category picker cell names scale in the app and end in a whole `…`
- File: `src/modules/categories/components/category_picker_sheet.tsx` (`:46`, `:62`, `:96-101`)
- Change: read `fontScale` from the `useWindowDimensions()` call at `:46`. The `BottomSheetScrollView` at `:62` takes `testID="category-picker-scroll"`, so step 5's rows can scroll the grid with `--in` (reviewer-1 finding 1); no file reads that id today. The cell name `Text` takes `allowFontScaling={false}`, keeps `numberOfLines={1}`, and its size moves from the class `text-[10px]` to `style={scaledTextStyle(Type.pillLabel, fontScale)}` (`text_scale.geometry.ts:26-33`, the MA-121 shape of `search_tally.tsx:42,77`, ADR `docs/adr/2026-09-27-transactions-search-tally.md:36`); `font-inter mt-1` and the colour class stay. Props and the five mounts do not change.
- Test: `none` · no suite renders the cells: `set_budget_sheet.test.tsx:80` and `transaction_form_sessions.test.tsx:104` mock the sheet, and a new `.tsx` suite is barred; `scaledTextStyle` has its own cases in `__tests__/components/ui/text_scale.geometry.test.ts`. The ellipsis is a device read (Screens).

### 5. The features files carry the new states and name both sheets
- File: `.claude/skills/emulator-verify/features/transaction_form.md`, `.claude/skills/emulator-verify/features/add_commitment.md`, `.claude/skills/emulator-verify/features/budget.md`
- Change: `transaction_form.md` § States gains `category picker, expense and income, large font` (no frame, MA-254; the FAB on the Transactions tab, not Home, per the MA-175 Gotcha; `category-row` tapped at 1.0 and 2.0 under the `Font scale` force, then the Income trigger by position and `category-row` again; the expense set's 23 cells run to six rows, past the `lg` sheet's viewport (reviewer-1 finding 1), so after the read at the grid's top, `$MQA scroll down --in 'id="category-picker-scroll"'`, repeated until the last cell's box reads whole, at most three, and where a scroll moves the sheet and not the grid, the 95 dp `adb` drag of § Gotchas `List drags` started inside the grid; proof: each `category-picker-cell-*` judged at a viewport where its box reads whole (README § Invariant pass), its name's `TextView` box inside the cell's box, cells square ± 1, at 2.0 #818's four names and `Transfer In` each end in a whole `…` or read whole, one crop of the grid per viewport per set and scale). § Gotchas gains a line: the type tabs, the support line and the strip row are `FormTypeTabs` (`src/components/ui/form_type_tabs.tsx`), drawn by the add and edit commitment sheet too, so one read holds on both and a divergence is a caller override. `add_commitment.md` § States gains `cards in the content inset, add and edit` (`E2AddFilled`, `E4Edit`, MA-254; the add sheet, then the edit sheet from the list (Reach it); proof, on nodes the tree lists (reviewer-1 finding 2): the tab list (`label="Amount type"`) at x 16, w 379.4, as the `type tabs` row reads it, and `form-strip-row` at x 0, the screen's full width; `commitment-form-card-inset` at x 0, full width, its top at `amount-error-slot`'s bottom ± 1, as `transaction-form-fact-inset` reads against its own slot on the same device; the `Category` button, taken by its centre (MA-220 Gotcha), at the x and width `transaction-form-fact-group` reads on the same device ± 1, 17.1 and 377.1 on `Pixel_2_API_34` (probe 1)) and `category picker, large font` (no frame, MA-254; the Category button by its centre (MA-220 Gotcha) at 1.0 and 2.0; the scroll and the proof of the transaction row on the expense set), and the same `FormTypeTabs` Gotcha line. `budget.md` § Gotchas gains one line: the picker cells are `CategoryPickerSheet`'s, read on `transaction_form.md` and `add_commitment.md`, and that read holds on the set-budget and spending-plan mounts.
- Test: `none` · docs.

### 6. The ADR names the shared piece and its home
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` (§1 after `:40`; Applies-to `:6`)
- Change: add `src/components/ui/form_type_tabs.tsx` to Applies to, and a paragraph `**Extended 2026-10-25 (#853, MA-254).**`: `FormTypeTabs` and `FormStripRow` live in `form_type_tabs.tsx` because both form sheets draw the tabs, the support line and the strip row (epic #777 R25) and MA-259 mounts the strip row on the pay sheet; `resolveFormSupportLineTextProps` lives in `form_sheet.geometry.ts`; `TypeTabs` stays in the transactions module as the adapter that maps the types to segments, and no re-export remains; the commitment cards sit in `FORM_SHEET_CONTENT_CONTAINER_STYLE`, and its bleed and content constants are deleted. The piece reads no module code, so §2 holds.
- Test: `none` · docs. `npm run lint` runs the banned-phrase check over the tracked `.md` files.

## Screens
- `emulator-verify/features/transaction_form.md`: add expense
- `emulator-verify/features/transaction_form.md`: edit
- `emulator-verify/features/transaction_form.md`: type tabs, large font
- `emulator-verify/features/transaction_form.md`: type tabs hit area
- `emulator-verify/features/transaction_form.md`: add and edit walk, large font
- `emulator-verify/features/transaction_form.md`: category picker, expense and income, large font (new, no frame, step 5 adds it)
- `emulator-verify/features/add_commitment.md`: type tabs
- `emulator-verify/features/add_commitment.md`: tabs, strip and amount, large font; its clause `at 2.0 the Currency card's EGP and USD whole with no …` (`add_commitment.md:33`) is MA-255's (#855; parent #796 Acceptance, its `currency row, large font` check) and reads as at base on this head, not a defect of this PR (reviewer-1 finding 3)
- `emulator-verify/features/add_commitment.md`: cards in the content inset, add and edit (new, `E2AddFilled`, `E4Edit`, step 5 adds it)
- `emulator-verify/features/add_commitment.md`: category picker, large font (new, no frame, step 5 adds it)
- The invariant pass (`features/README.md` § Invariant pass, #802 Rule 4) on `add_commitment.md` and `transaction_form.md`.

## Non-goals
- The rows card and its rows, the Currency row at 2.0, MA-255; the status track, flat Save, toasts and failed save, MA-256.
- No change to the cards' contents: step 3 moves them into the inset, and MA-255 replaces them.
- No change to the picker's grid, cell size, icon, columns or title; no budget sheet edit.
- No row in `budget.md` § States.

## Untested inputs
- The commitment top's edge-to-edge span and the cards' inset and gap: no Jest suite renders the body; step 3, proven by `cards in the content inset, add and edit`.
- `FormTypeTabs` with `isDisabled` `undefined`, the only value the commitment sheet passes (no caller passes `locked`): step 3.
- The cell name at font scale 2.0, the four #818 names: step 4, device only.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- If the 2.0 crop still shows a cut `…` on a cell with the JS-scaled size, the cause is the typeface half of the bug (MA-141), which is native: report it, patch nothing (`CLAUDE.md` trigger 4).
- `Type.pillLabel` is `msFont(10)`, about 10.7 dp on the 411 dp emulator against today's 10 px class, so at 1.0 every cell name grows on all five mounts, both budget sheets included.
- MA-259 (#860) landing first with its own strip row: step 2 imports that piece instead of declaring `FormStripRow`, an amendment.
- The cards' re-indent is 159 of the ~350 lines; an implementer who restructures the cards instead of wrapping them pushes the count toward the gate.
- `transaction_form.md · type tabs, large font`: the shared piece must keep `py-2` and the `resolveTypeTabsGeometry` slop, or the 2.0 track and the `type tabs hit area` taps move.
- `transaction_form.md · add and edit walk, large font`: the `'one'` branch must keep `flexShrink: 1`, or the support line overflows the sheet at 2.0.
- `add_commitment.md · cards in the content inset, add and edit`: the rounded `bg-default rounded-2xl` cards move from an 8 to a 16 gap below the slot; the Deactivate link (`afterFields`) moves into the inset with them.
- `add_commitment.md · category picker, large font` and `transaction_form.md · category picker, expense and income, large font`: the cell is 89.36 dp square, not a whole dp, so a name box can read 1 px past the cell edge from rounding alone.
- not probed: `transaction_form.md` · type tabs hit area
- not probed: `transaction_form.md` · add and edit walk, large font
- not probed: `transaction_form.md` · category picker, expense and income, large font
- not probed: `add_commitment.md` · type tabs
- not probed: `add_commitment.md` · tabs, strip and amount, large font
- not probed: `add_commitment.md` · cards in the content inset, add and edit
- not probed: `add_commitment.md` · category picker, large font

## Self-assessment
Step 4 is the one I am least sure of. The JS-scaled size is the MA-121 shape and fixes the cut ellipsis where the OS scaling was the cause, but this repo also found a native typeface half (MA-141), and nothing at this checkout tells me whether Inter at 20 dp in an 87 dp box hits it. The second doubt is the token: `Type.pillLabel` grows the 1.0 name on the budget sheets too, and a reviewer may want the 1.0 read held at exactly 10 px, which no token gives.
