# MA-279 — One shared radio option row for the picker sheets
base: dd5b786ce460bf04ac38ffa6ee7f7e0feadc5936 · verify: emulator · flags: none · expected diff: ~90 lines

## Steps
### 1. One radio option row and one drawn-only radio live in the shared UI folder
- File: `src/components/ui/radio_option_row.tsx` (new)
- Change: exports two components. `RadioOptionMark({ testID })`: `testID?: string`, optional, never `null`; renders HeroUI `Radio` with `testID`, `pointerEvents="none"`, `accessible={false}`, `importantForAccessibility="no-hide-descendants"` and `accessibilityElementsHidden`, the props MA-276 put on its copy (`commitment_choice_sheet.tsx:119-125`). HeroUI's `Trigger` spreads them onto the `Pressable` (`node_modules/heroui-native/src/primitives/radio/radio.tsx:88-101`). It must sit inside a `RadioGroup.Item`, which supplies its selection and variant. `RadioOptionRow(props)` takes, in order: `value: string`, required, never `null`; `testID: string`, required, where the mark takes `` `${testID}-selected` ``; `accessibilityLabel?: string`, optional, `undefined` passes nothing; `density?: 'compact' | 'roomy'`, optional, default `'compact'` (`py-2.5`), with `'roomy'` giving `py-3`; `separator?: boolean`, optional, default `true` (`border-separator border-b`); `children: ReactNode`, required, the leading content. It returns a `RadioGroup.Item` with base classes `min-h-14 gap-3 px-4`, composed with `tv` (`.claude/rules/ui.md` § Styling, prior art `src/components/ui/type_badge.tsx:33`), and `style={{ flexDirection: 'row', alignItems: 'center' }}`. It draws `children`, then `RadioOptionMark`. It passes no `variant`, so HeroUI's surface detection (`radio-group.tsx:116-125`) keeps the radio `secondary` inside `ListCard` and `primary` on the flat sheets. It adds no margin, so the parent `RadioGroup` keeps its own gap.
- Test: `none` · a suite for this file would be a new `.tsx` file and its classes are `className` strings, both barred by `.claude/rules/tests.md`. Step 2's case asserts the row through the budget picker.

### 2. The budget picker's rows draw through the shared row
- File: `src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx` (`BudgetPickerSheet`, the `renderItem` at `:79-116`)
- Change: `renderItem` returns `RadioOptionRow` with `value={budget.id}`, `` testID={`budget-picker-row-${budget.id}`} `` and today's `accessibilityLabel`, using the default density and separator. Its children are the icon tile and the name and limit column, unchanged. `Radio` leaves the `heroui-native` import, and `RadioGroup` stays as the root.
- Test: `first` · `__tests__/screens/transactions/transaction_form/budget_picker_sheet.test.tsx`, add a case: three budgets with `selectedId="budget-1"`. `screen.getAllByRole('radio')` maps to exactly the three `budget-picker-row-budget-<n>` testIDs. `screen.queryByTestId('budget-picker-row-budget-1-selected')` is `null`, and the same id with `{ includeHiddenElements: true }` is found. At base the role query returns six nodes and the plain query finds the mark, so the case fails there. This is a render-only wiring case under the Render-suite policy (Acceptance line 4) and asserts no style.

### 3. The replacement account sheet's rows draw through the shared row
- File: `src/modules/accounts/screens/accounts/detail/components/replacement_account_sheet.tsx` (`ReplacementAccountSheet`, `:123-136`)
- Change: each option is `RadioOptionRow` with `value={item.id}`, `` testID={`replacement-account-row-${item.id}`} ``, `density="roomy"` and the default separator, holding `<AccountRowContent account={item} />`. The `RadioGroup` keeps `isDisabled={busy}` and takes no `gap-0`, so HeroUI's 12 dp root gap stays (`node_modules/heroui-native/src/styles/components/radio-group.css:1-3`). `Radio` leaves the import.
- Test: `none` · no `.tsx` suite renders this sheet and `.claude/rules/tests.md` bars a new one. `archived_account.md · delete blocked by commitments` proves it.

### 4. The Repeats sheet's option rows draw through the shared row, and `CommitmentChoiceOptions` keeps its signature
- File: `src/modules/commitments/screens/commitments/components/commitment_choice_sheet.tsx` (`CommitmentChoiceOptions`, `:86-131`)
- Change: each option is `RadioOptionRow` with `value={option.value}`, `` testID={`${testIDPrefix}-${option.value}`} ``, `accessibilityLabel={option.label}`, the default density and `separator={index < options.length - 1}`, holding today's label `Text`. `ListCard`, the `RadioGroup` with `gap-0` and its comment, and `handleValueChange` stay. `CommitmentChoiceOptionsProps<T>` is unchanged, which MA-277 relies on. `Radio` and `cn` leave the import, since `cn`'s only reader was the row class at `:106-109`. The drawn-only comment at `:118` moves with the mark into step 1's file.
- Test: `none` · no `.tsx` suite renders it (`repeats_sheet.hook.test.ts` covers the hook only) and a new one is barred. `add_commitment.md · Repeats sheet, presets` proves it.

### 5. The welcome step's currency rows draw the drawn-only radio
- File: `src/modules/onboarding/screens/onboarding/welcome/components/currency_choice.tsx` (`CurrencyChoice`, `:105`)
- Change: `<Radio />` becomes `<RadioOptionMark />` with no testID, since the rows carry none today. The row's `CURRENCY_ROW_STYLE`, its fill and its border stay. `Radio` leaves the `heroui-native` import.
- Test: `none` · no `.tsx` suite renders the welcome step and a new one is barred. `onboarding.md · N1 currency rows` proves it.

### 6. ADR 2026-10-18 names the piece and its home
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` (Applies to, line 6; §1 after the MA-256 extension at line 60)
- Change: append `src/components/ui/radio_option_row.tsx` to Applies to. Add one paragraph, `**Extended <commit date> (#913, MA-279).**`, saying: `RadioOptionRow` and `RadioOptionMark` live in `src/components/ui/radio_option_row.tsx` (epic #777 R25); the budget picker, the replacement account sheet and `CommitmentChoiceOptions` draw their rows through `RadioOptionRow`; the welcome step's currency rows draw `RadioOptionMark`; the mark has no accessibility node, so each row is the one pressable; the file is new, so §3's `git mv` does not apply.
- Test: `none` · a doc.

### 7. The four features files carry this ticket's states
- File: `.claude/skills/emulator-verify/features/transaction_form.md`, `.claude/skills/emulator-verify/features/onboarding.md`, `.claude/skills/emulator-verify/features/archived_account.md`, `.claude/skills/emulator-verify/features/add_commitment.md`
- Change:
  - `transaction_form.md`: add a row after `budget picker sheet, first open` (`:85`). State `budget picker sheet rows`, frame `no frame, MA-279`. Force: two named budgets on one expense category this month, written on the host per README § Seeding and forcing states (`budgets` rows sharing `category_id` and `effective_from`, unique by name at `src/database/migrations/013_named_monthly_budgets.ts:12`); the path of `budget picker sheet, first open` to the sheet; `mqa read`, then one `mqa bounds` on both rows and the texts inside each, and one crop of the rows, at this seed on a `main` build and at head; tap the unlit row, which closes the sheet (`add_transaction.hook.ts:550-555`); reopen with `budget-row`. Proof: `mqa read` lists each `budget-picker-row-<id>` as one radio node and no `-selected` node (agent-device engine; the uiautomator engine lists the hidden mark); each row reads 56.0 high at a 56.0 pitch, nothing between the rows; each mark 24 × 24, its right edge 16 in from its row's; each figure ± 0.5 dp, the marks' from a `mqa bounds` under `MQA_UI=uiautomator`; the text boxes' offsets inside each row equal `main`'s within ± 1 dp; the crops match `main` in label face, the separator under every row, the last included, and the radio lit and unlit; the tapped row is lit after the reopen and the other unlit; one shot at open and one after the reopen.
  - `onboarding.md`: add a row after `N1 footer, large font` (`:15`). State `N1 currency rows`, frame `no frame, MA-279`. Force: a fresh install on N1 at 1.0 (§ Reach it); `mqa read`, then one `mqa bounds` on `'~Egyptian Pound'` and `'~US Dollar'` and the texts inside each, and one crop of both rows, on N1 on a `main` build and at head; then `$MQA tap '~US Dollar'`. Proof: `mqa read` lists each row as one radio node and no other pressable inside either row's box; the row boxes, the text boxes' offsets inside them and the pitch between the rows equal `main`'s within ± 1 dp; EGP is lit and USD unlit on open (business rule 5), and the reverse after the tap; one crop of both rows before the tap and one after, each matching `main` in label face, the row's fill and border, and the radio lit and unlit.
  - `archived_account.md`: in `delete blocked by commitments` (`:23`), the force adds two active accounts or more, then one `mqa bounds` on the replacement rows and the texts inside each, and one crop of the rows, at this seed on a `main` build and at head. The proof adds: `mqa read` lists each `replacement-account-row-<id>` as one radio node and no `-selected` node (agent-device engine; the uiautomator engine lists the hidden mark); each row reads 62.1 high (the last 62.5), at a 74.3 pitch, 12.2 between the rows; each mark 24 × 24 at x 371.4; each figure ± 0.5 dp, the marks' from a `mqa bounds` under `MQA_UI=uiautomator`; the text boxes' offsets inside each row equal `main`'s within ± 1 dp; the crops match `main` in label face, the separator under every row and the radio lit and unlit, the preselected account lit and the others unlit.
  - `add_commitment.md`: in the header paragraph (`:3`), the parenthesis on the four option rows names `CommitmentChoiceOptions` drawing the shared `RadioOptionRow` (`src/components/ui/radio_option_row.tsx`, MA-279), whose trailing radio has no node of its own. In `Repeats sheet, presets` (`:24`), the force adds, on open, one `mqa bounds` on the four option rows and the label inside each, and one crop of the card, at this seed on a `main` build and at head. The proof adds: `mqa read` lists each `repeats-option-<value>` as one radio node and no `-selected` node (agent-device engine; the uiautomator engine lists the hidden mark); each row reads 56.0 high at a 56.0 pitch, x 18.3, w 375.6 inside the card; each mark 24 × 24 at x 353.9; each figure ± 0.5 dp, the marks' from a `mqa bounds` under `MQA_UI=uiautomator`; the label boxes' offsets inside each row equal `main`'s within ± 1 dp; the crops match `main` in label face, the separators, none under `Custom`, where the card's border closes it, and the radio lit and unlit.
- Test: `none` · docs; the render lens runs them.

## Screens
- `.claude/skills/emulator-verify/features/transaction_form.md`: budget picker sheet rows (new, step 7)
- `.claude/skills/emulator-verify/features/archived_account.md`: delete blocked by commitments
- `.claude/skills/emulator-verify/features/add_commitment.md`: Repeats sheet, presets
- `.claude/skills/emulator-verify/features/onboarding.md`: N1 currency rows (new, step 7)
- The invariant pass (README § Invariant pass) on `add_commitment.md`, `transaction_form.md`, `archived_account.md` and `onboarding.md`, ticket Rule 2. The four files name one module each: transactions, accounts, commitments and onboarding (epic R25).

## Non-goals
- The 50/30/20 group picker's default trailing `Radio` (`src/modules/budget/screens/budget/components/set_budget_sheet.tsx:236`). It is parked with the budget findings.
- The Ends sheet (MA-277, #908), which is not on main at the base.
- Any change to the look of a row, its testIDs or `CommitmentChoiceOptionsProps`.
- The 44 dp line at `.claude/skills/emulator-verify/features/README.md:78`. The change satisfies it and leaves its text alone.
- The account and category pickers' check marks (`src/modules/accounts/components/account_picker_sheet.tsx:57-62`, `src/modules/categories/components/category_picker_sheet.tsx:108-114`), which are not radios.

## Untested inputs
- A tap on the mark's own 24 dp area selects through the row via `pointerEvents="none"` (steps 1-5). Only the emulator states reach it.
- The replacement rows while `busy` disables the group (step 3).
- The one-node read and geometry on the replacement, Repeats and currency rows (steps 3, 4, 5). The step 7 states cover them on the emulator.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `transaction_form.md · budget picker sheet rows`: a new component; `renderItem` inside `BottomSheetFlatList` must still sit under the `RadioGroup` context, as the row does today.
- `archived_account.md · delete blocked by commitments`: a new component; a margin or `gap-0` slipping into the shared row would change the 12 dp gap between rows.
- `add_commitment.md · Repeats sheet, presets`: a new component in a clipped, rounded `ListCard`; a `variant` passed by the shared row would turn the radio `primary` on the Surface, and a separator on the last row would double the card's bottom edge.
- `onboarding.md · N1 currency rows`: a rounded, bordered row; only the mark changes, and a tap on the radio must still select its row.
- If HeroUI's `Radio` stopped spreading its rest props onto the `Pressable`, step 2's case would fail at head. They do spread at the installed version (`node_modules/heroui-native/src/primitives/radio/radio.tsx:46`, `:88-101`).
- not probed: `onboarding.md · N1 currency rows`

## Self-assessment
Step 7 is the step I am least sure about. Each proof now needs two engines: the one-node read holds only under agent-device, and the marks' boxes read only under uiautomator, which lists the hidden mark (probe 1). The probe could not run agent-device on its device, so no one-node read has passed yet. The text-box offsets and the crops need a `main` build at the same seed, and that build runs from the primary checkout, not the worktree. The currency rows carry no probe figures, and their "no other pressable" read meets the same uiautomator listing. The budget-rows seed of two named budgets on one category has no recipe of its own in README § Seeding and forcing states.
