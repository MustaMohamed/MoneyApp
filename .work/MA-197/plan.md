# MA-197 — One shared fact row for the account detail, the transaction detail and the add and edit sheet, with MA-097's last two strings
base: 10f0caac7bc8272bfd79a1a9aa7cf29be78d3796 · verify: emulator · flags: user copy · expected diff: ~375 lines

## Steps
### 1. The fact row's geometry lives in `src/components/ui`, and the detail skeleton reads it
- File: `src/components/ui/fact_row.geometry.ts` (new); `src/modules/transactions/screens/transactions/detail/components/detail.geometry.ts` (`DETAIL_FACT_*` at `:31-38`, `resolveDetailFactRowHeight` at `:115-123`, `buildDetailSkeletonGeometry` at `:182-195`); `detail/components/detail_fact_row.tsx` (imports only)
- Change: move the six constants as `FACT_ROW_FONT_SIZE` (`Type.body`), `FACT_ROW_BADGE_FONT_SIZE` (`Type.compactBadge`), `FACT_ROW_PADDING` (`Spacing.xs`), `FACT_ROW_TILE` (`ms(20)`), `FACT_ROW_VALUE_GAP` (`Spacing.xs`), `FACT_ROW_FITTED_PADDING` (`FACT_ROW_PADDING - FITTED_LINE_SLACK / 2`), and `resolveDetailFactRowHeight`'s body unchanged as `resolveFactRowHeight(fontScale: number): number` (required argument, never `null`). Add `resolveFactRowGeometry(shape: FactRowShape, fontScale: number): FactRowGeometry`. `FactRowShape` has five required booleans, none `null`: `fitsValue`, `holdsAmount`, `hasCaption`, `wrapsValue`, `holdsField`. `holdsAmount` marks an amount or a count beside the label, as Decision 3 (2026-10-17) rules. It is set apart from `fitsValue` because the detail's Rate row is fitted but holds its label (`detail.helpers.ts:360-365`). `FactRowGeometry` has `height: number | undefined`, `minHeight: number | undefined`, `paddingVertical: number` and `labelGivesWay: boolean`, with exactly one of `height` and `minHeight` defined. Precedence: `holdsField` gives `{ minHeight: H, paddingVertical: 0, labelGivesWay: false }`. `hasCaption` or `wrapsValue` gives `{ minHeight: H, paddingVertical: FACT_ROW_PADDING }`. `fitsValue` gives `{ height: H, paddingVertical: FACT_ROW_FITTED_PADDING }`. Any other shape gives `{ height: H, paddingVertical: FACT_ROW_PADDING }`. Here H is `resolveFactRowHeight(fontScale)`, and `labelGivesWay` is `!holdsField && !wrapsValue && (holdsAmount || hasCaption)`. `detail.geometry.ts` drops the moved exports and `buildDetailSkeletonGeometry` calls `resolveFactRowHeight`. `detail_fact_row.tsx` imports the new names.
- Test: `first` · new `__tests__/components/ui/fact_row.geometry.test.ts`. Move the `resolveDetailFactRowHeight (MA-181)` cases from `__tests__/screens/transactions/detail/detail.geometry.test.ts:201-235` onto `resolveFactRowHeight` at 0.85, 1.0, 2.0 and 3.0: the touch floor at or below 1, the padded line in whole device pixels above it, and the fitted line plus slack inside the fitted padding at 1, 2, 3. Add `resolveFactRowGeometry` for each of the five shapes at 1.0, 2.0 and 3.0, covering which of `height` and `minHeight` is set, `paddingVertical` and `labelGivesWay`. A fitted shape without `holdsAmount`, which is the Rate row, keeps `labelGivesWay` `false`. A fitted shape with `holdsAmount` sets it `true`. `detail.geometry.test.ts:243, :348` and `detail_skeleton.test.tsx:117` read `resolveFactRowHeight`.

### 2. One `FactRow` draws a fact, and the transaction detail's row maps onto it
- File: `src/components/ui/fact_row.tsx` (new); `src/components/ui/fact_row.geometry.ts` (two resolvers); `src/modules/transactions/screens/transactions/detail/components/detail_fact_row.tsx` (`DetailFactRow`, `:73-135`)
- Change: `FactRow(props: FactRowProps): React.ReactElement`. Props:
  - `label: string` is required and never `null`.
  - The value props are all optional and never `null`. `value?: string` draws no text when `undefined`. `valueFace?: 'sora' | 'inter'` defaults to `'sora'`. `valueColor?: string` is a runtime hex set as the style colour. `valueClassName?: string` is merged by `cn` after the face's classes. `valueFontSize?: number` defaults to `FACT_ROW_FONT_SIZE`. `fitsValue?: boolean`, `holdsAmount?: boolean` and `wrapsValue?: boolean` all default to `false`. `holdsAmount` marks an amount or a count, whose label gives way first.
  - Every other prop is optional. `leading?: ReactNode` and `trailing?: ReactNode` sit either side of the value. `labelCaption?: ReactNode` goes under the label. `children?: ReactNode` takes the value's place. `showDivider?: boolean` defaults to `true`. `inset?: boolean` defaults to `true` and sets `px-4`, or `px-0` when `false`. `testID?: string`.
  - `press?: { onPress?: () => void; disabled: boolean; accessibilityLabel: string; accessibilityHint?: string }`. `disabled` and `accessibilityLabel` are required inside it.

  The row builds its shape from those props and takes its root style from `resolveFactRowGeometry`. The root is the `ListGroup.Item` with `py-0` and `gap-3`, and it carries the `testID` and the style. When `children` is given, the root is a plain `View` with the same classes, so the Note's Input keeps its own focus, accessibility node and touch lock (`transaction_form_body.tsx:399-438`). With `press`, the root takes `accessibilityRole="button"`, the label and hint, `accessibilityState={{ disabled }}` and `disabled`, and gets `onPress` only while not disabled. Without `press`, it has no handlers, as `DetailFactRow` today.

  The label is one line from `resolveOneLineTextProps(scaledTextStyle(FACT_ROW_FONT_SIZE, fontScale))` in `font-inter text-content-secondary`. The value's text props come from `resolveFactRowValueTextProps(shape: FactRowShape, fontSize: number, fontScale: number): FitAmountTextProps | OneLineTextProps | FactRowWrappedTextProps`, a new export in `fact_row.geometry.ts`. All three arguments are required and none is `null`. It checks `wrapsValue` first and `fitsValue` second:
  - A wrapped value gets `FactRowWrappedTextProps`, which is `{ allowFontScaling: true; style: ScaledTextStyle }` with `style` set to `{ fontSize, lineHeight: lineHeightFor(fontSize) }` and no `numberOfLines` key.
  - A fitted value gets `resolveFitAmountTextProps(fontSize, fontScale)`.
  - Any other value gets `resolveOneLineTextProps(scaledTextStyle(fontSize, fontScale))`.

  The row's flex comes from `resolveFactRowFlex(labelGivesWay: boolean): { label: FactRowFlexStyle; group: FactRowFlexStyle }`, also new in `fact_row.geometry.ts`. Its argument is required and both return fields are never `null`. `FactRowFlexStyle` is `Pick<ViewStyle, 'flex' | 'flexGrow' | 'flexShrink' | 'flexBasis' | 'minWidth'>`, with every field optional and never `null`. Leading, value and trailing sit in one row with `FACT_ROW_VALUE_GAP` between them.
  - Giving way (`true`): `label` is `{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }` and goes on the label, or on its column when a caption is present. `group` is `{ flexGrow: 0, flexShrink: 1, flexBasis: 'auto' }`, so the value group shrinks only once the label is spent.
  - Holding (`false`): `label` is `{ flexShrink: 0 }`, so the label stays whole. `group` is `{ flex: 1, minWidth: 0 }` and takes the rest.

  Values are right-aligned. `FactRow` spreads both resolvers and adds the classes and colour. `DetailFactRow` keeps its props `{ fact: DetailFact; showDivider?: boolean }`, `FactLeading` and `BADGE_CHIPS`. It passes `label`, `value`, `valueFace` and `fitsValue`, and `holdsAmount={fact.kind === 'amount'}`, so the Rate row keeps its label whole and its value fitted, as shipped. It also passes the leading node, and the badge `Chip` as `trailing`, sized by `FACT_ROW_TILE` and `FACT_ROW_BADGE_FONT_SIZE`.
- Test: `first` · `__tests__/components/ui/fact_row.geometry.test.ts`.
  - `resolveFactRowValueTextProps` at 1 and 2:
    - a fitted shape equals `resolveFitAmountTextProps(FACT_ROW_FONT_SIZE, s)`, with `adjustsFontSizeToFit` `false` at 1 and `true` at 2;
    - a wrapped shape has no `numberOfLines`, keeps `allowFontScaling: true` and sets `lineHeight` to `lineHeightFor(fontSize)` at `Type.caption`;
    - a wrapped and fitted shape takes the wrapped props;
    - any other shape equals `resolveOneLineTextProps(scaledTextStyle(FACT_ROW_FONT_SIZE, s))`.
  - `resolveFactRowFlex(true)` gives the label a zero basis that grows and gives the group an auto basis with no grow. `resolveFactRowFlex(false)` holds the label at `flexShrink: 0`.
  - The component itself gets no suite, since the repo bars a new `.tsx` file. The detail suites `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx` and `detail_hook.test.ts` stay green at 1.0.

### 3. The account detail and the archived detail draw their facts through `FactRow`, amounts and counts fitted
- File: `src/modules/accounts/screens/accounts/detail/components/account_facts.helpers.ts` (`AccountFact` `:11-15`, the three builders `:41-115`); `detail/index.tsx:165-173`; `detail/components/archived_detail_body.tsx:57-67`; delete `detail/components/account_fact_row.tsx`
- Change: `AccountFact` gains `fitsValue: boolean`, required and never `null`. `label: string` and `value: string` stay required, and `valueColor?: string` stays optional. Set `fitsValue: true` on Balance, Credit limit, Minimum payment, month In and Out in both branches of `buildMonthFacts`, and on the Transactions and Commitments counts. Set it `false` on Currency, Due day and APR. Both screens render `<FactRow key={fact.label} label value valueColor fitsValue holdsAmount={fact.fitsValue} showDivider />` from the fact, since every fitted account fact is an amount or a count. Strings, formatters and the `buildMonthRows` colours stay as they are.
- Test: `first` · `__tests__/screens/accounts/account_facts.helpers.test.ts`. Each `toEqual` array carries `fitsValue`. A new case checks that the amounts and counts are fitted and that the currency code, due day and APR text are not. In `__tests__/screens/accounts/account_detail.hook.test.ts:571-574`, the two unset month rows in `monthFacts` carry `fitsValue: true`.

### 4. The sheet's picker rows draw through `FactRow`
- File: `src/modules/transactions/screens/transactions/transaction_form/components/form_picker_row.tsx` (`FormPickerRow`, `:35-135`)
- Change: `FormPickerRow` keeps every prop but the unused `valueStyle` (`git grep valueStyle -- src` finds no caller), so `date_row.tsx`, `rate_row.tsx` and `transaction_form_body.tsx` stay as they are. It renders `FactRow` with `inset={false}` and `showDivider={divider}`, `prefix` as `leading` and `suffix` as `trailing`. `labelCaption` passes through. `wrapsValue` is `valueNumberOfLines !== 1`. `valueClassName` and `valueFontSize` pass through. It sets `press={{ onPress, disabled, accessibilityLabel, accessibilityHint }}`, where `accessibilityLabel` still defaults to `Strings.addTxPickerAccessibility(label, value)`. It stops reading `FACT_ROW_MIN_HEIGHT`. The cell wrapper `FACT_CELL_CLASS` (`transaction_form_body.tsx:101`) still draws the inset and divider and holds the `DangerRing`.
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx` runs at the suite's font scale above 1. Category, To, the loaded Budget, the fresh Rate row and Date read `height: resolveFactRowHeight(fontScale)` at `:208`, `:225`, `:300`, `:336` and `:519`. The stale Rate row case at `:536` and the budget lookup failure case at `:431` add `minHeight: resolveFactRowHeight(fontScale)`. Four cases hold unchanged: the ring, hint and no-message case at `:185`, the To ring at `:214`, the press case at `:274`, and the locked To row with `accessibilityState { disabled: true }` and no press at `:317`. `__tests__/screens/transactions/transaction_form/date_picker_sheet.test.tsx:208, :212` reads `date-row` at `height: resolveFactRowHeight(fontScale)`.

### 5. The Note and the sheet's skeleton rows stand at the shared height
- File: `transaction_form/transaction_form_body.tsx:399-438`; `transaction_form/components/transaction_form.geometry.ts` (`FACT_ROW_MIN_HEIGHT` `:23`, `resolveNoteInputGeometry` `:96-102`, `TRANSACTION_FORM_SKELETON_GEOMETRY` `:132-143`, `resolveTransactionFormSkeletonBars` `:151-169`); `transaction_form/components/transaction_form_loading.tsx:93-108`
- Change: the Note becomes `<FactRow testID="note-row" label={Strings.addTxNoteLabel} showDivider={false}>`, with the shipped `Input` as its child. `resolveNoteInputGeometry` returns `minHeight: resolveFactRowHeight(fontScale)`, a number, never `null`, and keeps `text: ScaledTextStyle | undefined` as today. Delete `FACT_ROW_MIN_HEIGHT` and the skeleton's `factRow` entry. `resolveTransactionFormSkeletonBars` adds `factRow: number`, set to `resolveFactRowHeight(fontScale)`, and each skeleton fact row stands at `height: bars.factRow` in place of `minHeight`. This matches the detail skeleton (`detail.geometry.ts:182-195`).
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_form.geometry.test.ts:22-26, :157-168`.
  - `resolveNoteInputGeometry(s).minHeight` equals `resolveFactRowHeight(s)` at 1, 2, 3 and 4. At 4 that replaces `lineHeightFor(4 * Type.body)` at `:164-168`, since the floor now adds the 2 × `FACT_ROW_PADDING`.
  - The Note's `text` is unchanged.
  - `resolveTransactionFormSkeletonBars(s).factRow` equals `resolveFactRowHeight(s)` at 1, 2 and 3.
  - The `toEqual` objects at `:69-75` and `:84-93` gain `factRow: resolveFactRowHeight(1)` and `factRow: resolveFactRowHeight(2)`. In `transaction_form_body.test.tsx:376` the Note's `Input` reads `minHeight: resolveFactRowHeight(fontScale)` and still takes `changeText`. At `:931` each skeleton fact row reads `height: resolveFactRowHeight(fontScale)`.

### 6. MA-097's last strings ship, and the shared keys are named with their readers
- File: `src/constants/strings.ts` (`addTxBudgetLookupError` `:532`, `addTxBudgetRetryA11y` `:533`, `addTxPickFromTitle` `:933`)
- Change: `:532` reads `Couldn't load budgets.` and `:533` reads `Try again`. The key names stay, so `add_transaction.hook.ts:385`, `edit_transaction.hook.ts:308` and the budget row at `transaction_form_body.tsx:353-364` do not change. Delete `addTxPickFromTitle`, which has no reader. No other key changes.
- Test: `first`, in four files, beside the assertions that already hold.
  - Already holding: `transaction_form_copy.test.ts:5-11` pins `Add transaction`, `Edit transaction`, `Save` and `Save changes`. `:49` pins `No Accounts Yet`. `transactions_list_copy.test.ts:13` pins the empty state's `Add transaction`. `transaction_form_body.test.tsx:304` pins `Select Category` on the row.
  - New `__tests__/screens/transactions/transactions_copy_note.test.ts` holds one `it.each` row per Copy note string, from the canvas note `r2copy`. Each row gives the key and the value at base, and function keys are called with a worked input.
    - The keys are `transactionsHeroTitle`, `transactionsHeroIn`, `transactionsHeroNet`, `transactionsHeroLeftOfIncome`, `transactionsHeroShareSpent`, `transactionsHeroDaysLeft`, `searchTransactionsPlaceholder`, `transactionsTallyResults`, `emptyTransactionsHeadline`, `emptyTransactionsDescription`, the `emptyTransactionsMonth*` three at `strings.ts:1216-1219`, `emptyFiltered*`, the failure set at `:1276-1283` and `:1356-1359`, `deleteConfirmTitle`, the delete bodies per type at `:981-990`, `deleteCancel`, `addTxRateSourceStored`, `addTxRateLastUpdated`, `addTxRateSourceCustomPerUsd`, `addTxRateResetToStored`, `addTxRateStale`, `filterAllAccounts` (`:1017`), `deleteTransaction` (`:979`, the dialog's Delete), `detailHeader` (`:959`), `detailAmountOverline` (`:968`), `detailManualSource` (`:974`), `capturedBadge` (`:977`), `viewCommitment` (`:546`), `detailDeleteButton` (`:1352`), `transactionAccountArchived`, `detailNotFoundTitle` and `detailNotFoundBody`.
    - The rest of the note's Detail list is already pinned by `__tests__/screens/transactions/detail/detail.strings.test.ts`: Account, Category, Budget, Date, Time, Rate, Amount in EGP, Amount in USD, Source, Note and Edit. `Deleting…` and `Transaction deleted.` are pinned at `transactions_list_copy.test.ts:5` and `:9`, and `Transaction saved.` at `transaction_form_copy.test.ts:43`.
    - The two departures are pinned: `emptyTransactionsCta` reads `Add transaction`, and `detailAmountInEgp` and `detailAmountInUsd` stand where the note writes `Original amount`.
    - `Clear Filters`, `Select Category` (`addTxPickCategoryTitle`) and `Add Account` (`addTxNoAccountsCta`) are pinned as shipped. No suite pins the last of these today.
  - `__tests__/screens/transactions/transaction_form/transaction_form_copy.test.ts` gets an `MA-097` describe. It checks the two values and that the four approved strings are present: `transactionsTotalsLoadError` at `:1280`, `transactionsAccountLookupError` at `:1282`, and the two above. It checks that no string value holds `Could not load matching budgets` or `Retry matching budget lookup`, and that `Object.hasOwn(Strings, 'addTxPickFromTitle')` is `false`.
  - New `__tests__/screens/transactions/transactions_shared_copy.test.ts` holds one `it.each` row per shared key in the #553 Context. Each row names the key's readers in its title and checks its base value, with function keys checked by a call. The keys are `deletedAccount`, `typeBadgeCommitment`, `todayLabel`, `yesterdayLabel`, the `emptyFiltered*` three, the `filter*` titles, Reset, Apply, the section and summary families, `swipeEdit`, `swipeDelete`, `fixFieldsMarkedAbove`, `transactions`, `totalsExpenseShareA11y`, `addTxNotePlaceholder`, `addTxErrRateInvalid`, `currencyRateLabel`, `addTxRateReset`, `addTxRateSourceCustom`, `addTxPickAccountTitle`, `addTxPickCategoryTitle` and `filterCcPayment`.
  - In `transaction_form_body.test.tsx`, `:234` and `:432` read `Strings.addTxBudgetLookupError` in place of the old literal. The failed lookup's `budget-row` carries `accessibilityLabel` `Strings.addTxBudgetRetryA11y`, which is render-only wiring named by Acceptance.

### 7. The four features files name the shared row and its states
- File: `.claude/skills/emulator-verify/features/account_detail.md`, `archived_account.md`, `transaction_detail.md`, `transaction_form.md`
- Change:
  - `account_detail.md`: the header's `account_fact_row.tsx` becomes `src/components/ui/fact_row.tsx`. Add a `facts, large font` row with frames C1 and C2b and MA-197. Its seed is a bank with month activity and a card with a limit, a minimum payment, a due day and an APR, read under the `Font scale` force at 1.0 and 2.0. In `mqa bounds`, each fact row is `resolveFactRowHeight(scale)` ± 1, which is 44.19 and 54.86 on the 411 dp emulator. At 2.0 each amount shows every digit on one line, with its label ending in a whole `…` first. Currency, Due day and APR are whole or end in a whole `…`. No box crosses another. Take one crop per scale.
  - `archived_account.md`: add the same `facts, large font` row on the `archived bank, read-only` seed (C4), for Currency and the two counts.
  - `transaction_detail.md`: the header and rows `:32` and `:33` replace `resolveDetailFactRowHeight` with `resolveFactRowHeight` (`src/components/ui/fact_row.geometry.ts`), and `detail_fact_row.tsx` is drawn over `fact_row.tsx`. In `:32`, "each label whole and its value ending first" stays for every row but Amount in EGP and Amount in USD. On those two, the label ends in a whole `…` before the amount shrinks. The Rate row keeps `Rate` whole and its value fitted, as shipped.
  - `transaction_form.md`:
    - The header names `form_picker_row.tsx` over `fact_row.tsx`.
    - `:19` and `:29` replace "44 or more" with `resolveFactRowHeight(scale)` ± 1.
    - `:30` gives the label `Try again`, the value `Couldn't load budgets.` on one caption line at 1.0, and the row `resolveFactRowHeight(1)` ± 1. The force line cites `add_transaction.hook.ts:385`.
    - `:41` logs each skeleton fact row at `resolveFactRowHeight(scale)` ± 1.
    - `:64` puts the stale Rate row at or above `resolveFactRowHeight(2)` at 2.0. The fresh `exchange-rate-row` on the `add, USD account` seed reads `resolveFactRowHeight(2)` ± 1, 54.86 on the 411 dp emulator.
    - `:66` gives the new value and label, with the row at or above the shared height at 2.0.
    - `:67` puts the Note's one-line floor at `resolveFactRowHeight(2)`. In `mqa bounds` at 2.0, `category-row`, `to-account-row`, the loaded `budget-row` and `date-row` each read `resolveFactRowHeight(2)` ± 1, which is 54.86.
    - The figures these rows print are re-read at head.
- Test: `none` · docs. The emulator pass under Screens runs these rows.

## Screens
- `.claude/skills/emulator-verify/features/account_detail.md` · bank with recent activity
- `.claude/skills/emulator-verify/features/account_detail.md` · credit card, under limit
- `.claude/skills/emulator-verify/features/account_detail.md` · facts, large font (new, no frame beyond C1 and C2b, step 7 adds it)
- `.claude/skills/emulator-verify/features/archived_account.md` · archived bank, read-only
- `.claude/skills/emulator-verify/features/archived_account.md` · facts, large font (new, C4, step 7 adds it)
- `.claude/skills/emulator-verify/features/transaction_detail.md` · expense
- `.claude/skills/emulator-verify/features/transaction_detail.md` · USD expense
- `.claude/skills/emulator-verify/features/transaction_detail.md` · archived account
- `.claude/skills/emulator-verify/features/transaction_detail.md` · deleted account
- `.claude/skills/emulator-verify/features/transaction_detail.md` · detail rows and transfer card, large font
- `.claude/skills/emulator-verify/features/transaction_detail.md` · skeleton, large font
- `.claude/skills/emulator-verify/features/transaction_form.md` · add transfer, To row
- `.claude/skills/emulator-verify/features/transaction_form.md` · edit, deleted counterparty
- `.claude/skills/emulator-verify/features/transaction_form.md` · validation
- `.claude/skills/emulator-verify/features/transaction_form.md` · add, note focused
- `.claude/skills/emulator-verify/features/transaction_form.md` · rate row and editor, large font
- `.claude/skills/emulator-verify/features/transaction_form.md` · budget lookup failed
- `.claude/skills/emulator-verify/features/transaction_form.md` · budget lookup failed, large font
- `.claude/skills/emulator-verify/features/transaction_form.md` · add and edit walk, large font
- `.claude/skills/emulator-verify/features/transaction_form.md` · loading bars, large font

## Non-goals
- The commitment detail's iconed `DetailRow` and `DetailRowsCard` (`src/components/ui/detail_row.tsx`), MA-166 (#610). The pay sheet's `ExchangeRateRow`.
- Changes to `date_row.tsx`, `rate_row.tsx`, `transfer_flow_card.tsx`, `note_card.tsx` or the list's `transaction_row.tsx`.
- Token changes in `src/constants/theme.ts`. A `DangerRing` inside `FactRow`, which stays in the form's cell wrapper.
- Recasing `fabMenuAddTransaction` (`strings.ts:224`), Select Category, Clear Filters, No Accounts Yet or Add Account.
- Old-voice strings outside the transactions module, which are MA-201 (#768).
- A new `.tsx` test file.

## Untested inputs
- The claim that no key the transactions module reads holds Could not, Please try again or a Retry button (step 6). A Jest case cannot list the module's reads without reading source (M35). `git grep` at `10f0caac` finds only `addTxBudgetLookupError` and `addTxBudgetRetryA11y` among the 32 old-voice keys. None of the 32 is read from `src/components`, `src/utils` or the account and category picker sheets the module mounts.
- Where each Copy note string shows on screen (step 6). Step 6 pins values only. Placement stays with the suites MA-091 to MA-096 shipped and the four features files, as #553's Out of scope says, so this task asserts placement and does not redo it.
- The 44.19 and 54.86 dp figures (steps 1 and 7). Jest's window is 750 wide at pixel ratio 2, so only the emulator reads them.
- An amount or a count whose value group alone is wider than its row (step 2). The label's zero basis then leaves it at no width, with no `…` showing, before the fitted amount shrinks. The probe's 2.0 shot of the bank facts never reached this width: in it, `1,250,000 EGP` reads about 222 dp.
- A label longer than its row at 2.0 on a row that holds its label whole: Currency, Due day, APR, Category, To, Date and Note (step 2). No Acceptance line names it.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `account_detail.md · bank with recent activity`: rows that stood at `minHeight: 44`, which Yoga rounds to 115 or 116 px, now stand at `resolveFactRowHeight(1)`, 116 px or 44.19 dp. That is at most one device pixel taller, inside the files' ± 1 dp. The same holds for the form's one-line rows and the Note at 1.0.
- `FACT_ROW_PADDING` and `FACT_ROW_VALUE_GAP` are `ms(8)`, where the account and form rows used raw `py-2` and `gap-2`. They are equal at 411 dp. On a 430 dp phone they are 9 against 8, so a growing row there, the stale Rate row or the budget failure, is 2 dp taller.
- `transaction_detail.md · detail rows and transfer card, large font`: the Amount in EGP and Amount in USD labels now take the ellipsis before their amounts shrink, which departs from MA-181's shipped order. The Rate row keeps that order.
- `account_detail.md · facts, large font`: the label giving way first relies on Yoga shrinking the value group only after the label's zero basis is spent. If `adjustsFontSizeToFit` measures before the group's final width, an amount ends in `…`.
- `transaction_form.md · add and edit walk, large font`: a one-line Note at 2.0 stands 54.86 high, where it was 43.81. Where the EditText places one line in the taller box is not probed.
- `transaction_form.md · add, note focused`: the Note's root is a plain `View`, while every other fact row roots on `ListGroup.Item`. A later fix made to only one of `FactRow`'s two root branches misses the other, and the Note row's floor and its Input's `minHeight` are two values that must both stay at `resolveFactRowHeight`.
- `transaction_form.md · budget lookup failed`: the shorter copy fits one caption line at 1.0, so the row drops from 48 to the shared height, and the file's 48 and 32 figures go.
- not probed: archived_account.md · archived bank, read-only
- not probed: archived_account.md · facts, large font
- not probed: transaction_detail.md · expense
- not probed: transaction_detail.md · USD expense
- not probed: transaction_detail.md · archived account
- not probed: transaction_detail.md · deleted account
- not probed: transaction_detail.md · detail rows and transfer card, large font
- not probed: transaction_detail.md · skeleton, large font
- not probed: transaction_form.md · add transfer, To row
- not probed: transaction_form.md · edit, deleted counterparty
- not probed: transaction_form.md · validation
- not probed: transaction_form.md · add, note focused
- not probed: transaction_form.md · rate row and editor, large font
- not probed: transaction_form.md · budget lookup failed
- not probed: transaction_form.md · budget lookup failed, large font
- not probed: transaction_form.md · add and edit walk, large font
- not probed: transaction_form.md · loading bars, large font
- REBUILD: none, the probe's build verdict at `10f0caac` is REUSE

## Self-assessment
Step 2 is where I am least sure. It sets the order that makes an amount's label give way first: the label takes the free space at zero basis, and the value group takes auto basis and shrinks. I derived that order from Yoga's flex rules and from the stale-line branch `FormPickerRow` ships (`form_picker_row.tsx:103-106`). No fitted value sits in that arrangement today, so Android's `adjustsFontSizeToFit` might not fit inside a group that shrinks only after the label is spent. If it measures first, the amount ends in `…` at 2.0. Only `account_detail.md · facts, large font` and the detail's Amount rows on the emulator settle it.
