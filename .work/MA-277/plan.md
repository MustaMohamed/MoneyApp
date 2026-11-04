# MA-277 — Ends sheet
base: dd5b786c · verify: emulator · flags: user copy · expected diff: ~330 lines

## Steps
### 1. The shared date row takes a floor day
- File: `src/components/ui/date_row.tsx` (~5), `src/components/ui/date_picker_sheet.hook.ts` (`useDateRowPicker`, ~5), `src/components/ui/date_picker_sheet.tsx` (~2)
- Change: `DateRow` takes `minimumDate?: string`, optional, never `null`, a local `YYYY-MM-DD`. It passes the value to `useDateRowPicker(ownerId: string, value: string, onChange: (next: string) => void, options: { capsAtToday: boolean; minimumDate?: string })`. The hook returns `state.minimumDate: Date | undefined`: the local start of that day, `new Date(\`${minimumDate}T00:00:00\`)`, or `undefined` when the option is absent. `DateRow` hands `picker.state.minimumDate` to the Android `DateTimePicker` (`date_row.tsx:56-64`) and to `DatePickerSheet`. `DatePickerSheet` takes `minimumDate?: Date`, optional, never `null`, and passes it to its iOS `DateTimePicker` (`date_picker_sheet.tsx:56-64`). The three rows that mount `DateRow` today pass no floor and stay unchanged: `commitment_form_body.tsx:229`, `detail/components/pay_sheet.tsx:174`, `transaction_form_body.tsx:301`.
- Test: `first` · `__tests__/screens/transactions/transaction_form/date_picker_sheet.test.tsx`, one case beside MA-255's cap case at `:169`: a `DateRow` with `minimumDate="2026-10-20"`, pressed on Android, hands `date-picker-android` a `minimumDate` on local 20 Oct 2026 at hour 0; without the prop it hands `undefined`. The Render-suite policy allows it: "On a date's earliest day is the Starts day" names the binding to the native picker, which only a render observes, and the suite exists.

### 2. The shared stepper draws a unit inside its border
- File: `src/components/ui/stepper.tsx` (`Stepper`, ~14)
- Change: `Stepper` takes `unit?: string`, optional, never `null`. When it is set, a `Text` with testID `${testID}-unit` follows the increase button inside the bordered row. It uses `className="font-inter text-content-secondary"`, F3's `.stp .su` colour `--content-secondary` and the class of `status_track.tsx:73` and `form_label_text.tsx:68`, not `text-muted`, which F3 gives the `STOP AFTER` overline (`.cus .cl`, probe 1). It takes `fontSize: Type.meta` with `lineHeight: lineHeightFor(Type.meta)`, `paddingLeft: Spacing.xxs` and `paddingRight: Spacing.sm` (F3 `.stp .su`: 13 px, padding 0 12 0 4, inside `.stp`'s border). The count reads `formatAmount(value)` (`src/utils/format_amount.ts:44`), comma-grouped per `.claude/rules/ui.md` § Design System, Numbers. The Repeats stepper (`repeats_sheet.tsx:118`) passes no unit, and its count stays at most 365, so it draws as before.
- Test: `none` · no suite renders `Stepper`, and `.claude/rules/tests.md` bars a new `.tsx` suite; the Screen checks `Ends sheet, after a number of payments, without the preview line` and `Ends sheet and row, large font` prove it.

### 3. The Ends draft is seeded from the form and Done applies it
- File: `src/modules/commitments/screens/commitments/commitment_form.shared.ts` (~10), `src/modules/commitments/screens/commitments/commitment_form.helpers.ts` (~40), `src/constants/strings.ts` (~7)
- Change: `commitment_form.shared.ts` adds, beside `RepeatsDraft`, `interface EndsDraft { type: DurationType; count: number; date: string }`. Every field is required and none is `null`: `count` is a whole number of at least 1, and `date` is a local `YYYY-MM-DD`. It also adds `ENDS_AFTER_START_COUNT = 12` and `ENDS_AFTER_COUNT_MIN = 1`.
- Change: `seedEndsDraft(values: Pick<CommitmentFormValues, 'durationType' | 'endAfterCount' | 'endDate' | 'startDate'>): EndsDraft` sets each field:
  - `type` is `durationType`.
  - `count` is `endAfterCount` when that is a number of at least `ENDS_AFTER_COUNT_MIN`. Otherwise it is 12: for `null`, for `undefined`, and for a count below 1, which the schema refuses (`commitment_form.shared.ts:59`).
  - `date` is `endDate` when it is non-empty and not earlier than `startDate`. It is `startDate` when `endDate` is non-empty and earlier. Otherwise it is `${startDate.slice(0, 4)}-12-31`.
- Change: `applyEndsDraft(form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue' | 'trigger'>, draft: EndsDraft, isSubmitted: boolean): void` writes the draft in this order:
  1. `durationType`, with `SET_OPTS`.
  2. On After, `endAfterCount` with `SET_OPTS`. On a date, `endDate` through `setCommitmentEndDate` (`commitment_form.helpers.ts:177`).
  3. Once a Save has run, `void form.trigger(['endAfterCount', 'endDate'])`, so a ring re-reads, as `setCommitmentDurationType` does today (`:198`).
  It leaves the field of the type not chosen as the form holds it, with no `resetField`: both saves null that field (`commitment_form/add_commitment.hook.ts:62-64`, `edit_commitment.hook.ts:76-78`), and the wipe at `:195-197` is what loses the count and day the sheet starts from (#908 Context).
- Change: `resolveEndsOptions(): { value: DurationType; label: string }[]`, beside `resolveRepeatsOptions` (`commitment_form.helpers.ts:138-150`), returns the rows in the order of an `ENDS_OPTION_RANK` table `satisfies Record<DurationType, number>` through `orderByRank`: `Forever` with `commitmentsEndsOptionNever`, `AfterCount` with `commitmentsEndsOptionAfterCount`, `UntilDate` with `commitmentsEndsOptionUntilDate`. Neither field is `null` or optional.
- Change: strings adds `commitmentsEndsOptionNever: 'Never'`, `commitmentsEndsOptionAfterCount: 'After a number of payments'`, `commitmentsEndsOptionUntilDate: 'On a date'`, `commitmentsEndsUntilLabel: 'Last payment on or before'`, `commitmentsEndsDateRow: 'Date'` and `commitmentsEndsStepperUnit: (n: number) => (n === 1 ? 'payment' : 'payments')`, the plural shape of `n4PillOpeningBal` (`strings.ts:128`). `commitmentsDurationStopAfter` (`Stop after`) stays and gets its new reader in step 5.
- Test: `first`, in three files:
  - `__tests__/screens/commitments/commitment_form.helpers.test.ts`, a `seedEndsDraft` table: Never with nothing held reads `{ forever, 12, '2026-12-31' }` from Starts `2026-10-20`; an After count of 5 held; counts `null`, `undefined` and `0` each read 12; a held day on or after Starts is kept; a held day earlier than Starts reads the Starts day while `resolveEndsRowValue` still reads `Until` with the stored day; `endDate` `''` reads 31 December; Starts `2028-02-29` reads `2028-12-31`; Starts `2026-01-31` reads `2026-12-31`.
  - The same file, a `resolveEndsOptions` case beside `resolveRepeatsOptions (MA-276)` (`:374`): one `toStrictEqual` on `Never`, `After a number of payments` and `On a date`, in that order, with their `DurationType` values.
  - The same file, `applyEndsDraft` cases in the `useCommitmentFormBodyFaults` harness (`:506-536`): after the refused Save of `mountRefused` (`:692`), Done on a date at the Starts day clears `endDate`'s ring, and Done with Never or After clears it too. Done with After writes 12 and leaves `endDate` as held. Before any Save no draft rings.
  - `__tests__/screens/commitments_form.strings.test.ts`, a byte-exact Ends sheet copy case: the six keys above and the title `Ends`.

### 4. The draft sits in the owner's slot and the row seeds it
- File: `src/modules/commitments/screens/commitments/components/commitment_form_body.state.ts` (~11), `src/modules/commitments/screens/commitments/components/commitment_form_body.hook.ts` (`useCommitmentFormBodyPickers`, ~8), `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx` (~5), `src/modules/commitments/screens/commitments/components/repeats_sheet.hook.ts` (~1)
- Change: the entry adds `endsDraft: EndsDraft | undefined`, `undefined` in `INITIAL_PICKER_ENTRY`. The state's actions change:
  - `openEndsSheet(owner: string, draft: EndsDraft): void` sets `choiceSheet: 'ends'` and `endsDraft` in one write, as `openRepeatsSheet` does (`:62-63`).
  - `setEndsDraft(owner: string, draft: EndsDraft): void` replaces the draft.
  - `setChoiceSheet` becomes `closeChoiceSheet(owner: string): void`, which sets `choiceSheet: undefined` and keeps both drafts for the close animation. Its consumers are, by find-references, `commitment_form_body.hook.ts:67`, `repeats_sheet.hook.ts:38` and `__tests__/screens/commitments_form_body_state.test.ts:29,74`.
  - `showEndDatePicker` stays until step 6.
- Change: the body hook returns `openEndsSheet(values: Pick<CommitmentFormValues, 'durationType' | 'endAfterCount' | 'endDate' | 'startDate'>): void`, which calls `state.openEndsSheet(owner, seedEndsDraft(values))`, and `closeChoiceSheet(): void` in place of `setChoiceSheet`.
- Change: in the body, `ends-row`'s `onPress` (`commitment_form_body.tsx:246`) calls `openEndsSheet({ durationType, endAfterCount, endDate, startDate })` from the watched values. Both `onClose` handlers (`:301`, `:307`) call `closeChoiceSheet()`. `repeats_sheet.hook.ts:38` calls `closeChoiceSheet(owner)`.
- Test: `first`, in three files:
  - `__tests__/screens/commitments_form_body_state.test.ts`: `openEndsSheet` opens Ends and holds the draft in one write; `setEndsDraft` keeps the sheet open; `closeChoiceSheet` keeps the draft. The `:29` action list and `:74` move to `closeChoiceSheet`. `guardedWrites` (`:26-32`) adds `openEndsSheet` and `setEndsDraft` before `openRepeatsSheet`, so the unclaimed and released guards (`:106-126`) run on them and owner-b still ends on `choiceSheet: 'repeats'`. The `toStrictEqual` entries at `:42-47` and `:98-103` add `endsDraft`: `undefined` at claim, the draft `setEndsDraft` wrote on owner-b.
  - `__tests__/screens/commitments_form_body.hook.test.ts`: `openEndsSheet` on one mounted copy seeds its draft and opens its sheet, and the other copy reads neither. The case at `:41-54` moves from `setChoiceSheet('ends')` and `setChoiceSheet(undefined)` (`:44`, `:49`, `:50`) to `openEndsSheet` and `closeChoiceSheet()`.
  - `__tests__/screens/commitments/repeats_sheet.hook.test.ts:42` moves to `closeChoiceSheet()`.

### 5. The Ends row opens the Ends sheet
- File: `src/modules/commitments/screens/commitments/components/ends_sheet.hook.ts` (new, ~55), `src/modules/commitments/screens/commitments/components/ends_sheet.tsx` (new, ~97), `src/modules/commitments/screens/commitments/components/commitment_choice_sheet.tsx` (`CommitmentChoiceBlock`, ~42), `src/modules/commitments/screens/commitments/components/repeats_sheet.tsx` (~7), `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx` (~11)
- Change: `useEndsSheet(owner: string, form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue' | 'trigger'>, isSubmitted: boolean)` returns `{ state: { draft: EndsDraft | undefined; track: string | undefined }, pickType(type: DurationType): void, setCount(count: number): void, setDate(date: string): void, done(): void }`, the shape of `useRepeatsSheet` (`repeats_sheet.hook.ts:11-51`):
  - It stages into `setEndsDraft` only while a draft is held.
  - `setCount` floors at `ENDS_AFTER_COUNT_MIN`.
  - `done` writes nothing unless the owner's entry reads `choiceSheet === 'ends'` with a draft. Then it calls `applyEndsDraft(form, draft, isSubmitted)` and `closeChoiceSheet(owner)`.
  - `track` is `undefined` with no draft, else `resolveEndsRowValue(draft.type, draft.count, draft.date)`: `Never`, `After 12 payments` or `Until Thu 31 Dec 2026`, the detail's Ends fact (#908 Copy).
- Change: `commitment_choice_sheet.tsx` adds `CommitmentChoiceBlock({ testID: string; label: string; line?: string; children: ReactNode })`. `testID`, `label` and `children` are required, `line` is optional, and none is `null`. The block is the Repeats Custom box moved unchanged from `repeats_sheet.tsx:88-154`: the bordered `bg-background` box at `Radius.lg`, the uppercase overline label, the children, and, when `line` is set, the caption `${testID}-line`. F3 and F4 draw the same `.cus` box. The sheet drops `blursInputOnClose` (`:60`): neither sheet holds a text input once `DurationPicker` leaves (`src/components/ui/sheet.tsx:64`). `repeats_sheet.tsx` draws its Custom block through it with `testID="repeats-custom"`, `label={Strings.commitmentsRecurrenceEvery}` and `line={label}`, which keeps `repeats-custom` and `repeats-custom-line`.
- Change: `EndsSheet({ owner: string; form: UseFormReturn<CommitmentFormValues>; startDate: string; isSubmitted: boolean; isOpen: boolean; onClose: () => void })`, every prop required. It draws `CommitmentChoiceSheet` with title `Strings.commitmentsFieldDuration` and testID `ends-sheet`. Its footer is a `FormSheetFooter`: `statusTestID="ends-sheet-status"`, `showsStatusTrack`, `footnote={track}`, label `Strings.commitmentsDone`, `onPress={done}`. With a draft, the body holds:
  - `CommitmentChoiceOptions<DurationType>` with prefix `ends-option`, over `const ENDS_OPTIONS = resolveEndsOptions()` at module scope (step 3), as `repeats_sheet.tsx:32` reads `REPEATS_OPTIONS`: Never, After a number of payments, On a date.
  - On After, block `ends-after`, label `commitmentsDurationStopAfter`, holding `Stepper` `ends-stepper` with `min={ENDS_AFTER_COUNT_MIN}`, no `max`, and `unit={Strings.commitmentsEndsStepperUnit(draft.count)}`.
  - On a date, block `ends-date`, label `commitmentsEndsUntilLabel`, holding one `ListCard` whose one child is `<View className="px-4">` around a `DateRow`, F4's `.fact{padding:0 16px}` and `FormFactCell`'s inset (`form_fact_cell.tsx:14`, probe 1). No `FormFactCell`: its `border-b` draws a second hairline on the one-row card's bottom edge. The `DateRow` takes `ownerId` from `useId()`, `value={draft.date}`, `onChange={setDate}`, `divider={false}`, `label={Strings.commitmentsEndsDateRow}`, `testID="ends-date-row"`, `pickerTitle={Strings.commitmentsFieldDuration}`, `capsAtToday={false}`, `minimumDate={startDate}`.
  - No message line in any state.
  - The option rows, their trailing radio and the Date row's calendar icon stay as they are built (`commitment_choice_sheet.tsx:86-131`, `date_row.tsx:50-52`), per #908 Rules "used as it is there", where F3 and F4 draw a leading radio and a chevron.
- Change: the body mounts `EndsSheet` in place of `CommitmentChoiceSheet` and `DurationPicker` (`commitment_form_body.tsx:303-317`), with `owner`, `form`, `startDate`, `isSubmitted`, `isOpen={choiceSheet === 'ends'}` and `onClose={closeChoiceSheet}`. It drops the `setCommitmentDurationType` and `setCommitmentEndDate` imports.
- Test: `first` · `__tests__/screens/commitments/ends_sheet.hook.test.ts`, new and logic-only, on the harness of `repeats_sheet.hook.test.ts:15-24`, with `useEndsSheet` and a row read through `resolveEndsRowValue`. Cases:
  - The open lights Never with the track `Never`, and Done writes `Never` to the row.
  - `pickType(AfterCount)` reads count 12 and track `After 12 payments`.
  - A form holding count 5 opens on After at 5.
  - `setCount(0)` from 1 holds 1.
  - `pickType(UntilDate)` reads `2026-12-31` from Starts `2026-10-20`, and `Until Thu 31 Dec 2026`.
  - A stored day earlier than Starts opens at the Starts day while the row reads the stored day.
  - Done on After 3 writes `after_count` and 3, the row reads `After 3 payments`, and the sheet closes.
  - A close without Done leaves the form and the row as they were, and the next open re-seeds from the form.
  - A `done` after the close writes nothing.
  - Two owners never share a draft.

### 6. What went with the pills goes
- File: `src/modules/commitments/screens/commitments/components/duration_picker.tsx` (deleted), `commitment_form_body.state.ts` (`showEndDatePicker`, `setShowEndDatePicker`), `commitment_form_body.hook.ts` (`:42-50`, `:64`), `commitment_form_body.tsx` (`:105-107`), `commitment_form.helpers.ts` (`setCommitmentDurationType`, `parseWholeNumberInput`), `commitment_form.shared.ts` (`composeFieldBlur`, the `BlurEvent` import), `src/modules/commitments/screens/commitments/components/commitment_form.geometry.ts` (`COMMITMENT_FORM_PILL_SLOP`, `COMMITMENT_PICKER_FIRST_ROW_EDGE`, `COMMITMENT_PICKER_FIRST_ROW_OVER_ROW_EDGE`, the `chip.geometry` import; `:10`'s comment now names the choice sheets' top padding, ~1), `src/components/ui/chip.geometry.ts` (`SELECTABLE_PILL_BARE_HEIGHT`), `src/utils/format_date.ts` (`formatLongDate`), `src/constants/strings.ts` (`commitmentsDurationForever`, `commitmentDateInputFormat`, `commitmentsAfterCountPlaceholder`, `commitmentsDurationPayments`)
- Change: deletions only, each symbol's last reader being `duration_picker.tsx` or a line it held (grep and find-references at `dd5b786c`). These stay: `setCommitmentEndDate` (read by `applyEndsDraft`), `COMMITMENT_FORM_PICKER_GAP` (`commitment_choice_sheet.tsx:42`), `SELECTABLE_PILL_LABEL_FONT_SIZE`, `SELECTABLE_PILL_PADDING_BLOCK` and `PILL_BORDER_WIDTH` (`account_chips.geometry.ts`, `form_sheet.geometry.ts`), `useTouchFloorGridHitSlop` (`month_filter.tsx`, `filter_accordion.tsx`), `SelectablePill`, and `commitmentsErrAfterCountRequired` and `commitmentsErrEndDateRequired`, the schema's guards (`commitment_form.shared.ts:70-94`).
- Test: `after`, in five files:
  - `__tests__/screens/commitments/commitment_form.geometry.test.ts` drops the `COMMITMENT_FORM_PILL_SLOP` describe.
  - `__tests__/format_date.test.ts` drops `formatLongDate`.
  - `__tests__/screens/commitments/commitment_form.helpers.test.ts` drops the `parseWholeNumberInput` describe and reads `null` where it passed `parseWholeNumberInput('')`. The `Ends earlier than Starts (MA-256)` block's `chooseEnds` (`:677`) goes through `seedEndsDraft` and `applyEndsDraft`, the sheet's path. Cases whose state that path cannot reach are deleted, each named in the commit: Until with no day held (`:789`, `:802`), and back on Until with the kept day (`:767`, `:776`), where the sheet now seeds the Starts day.
  - `__tests__/screens/commitments_form_body_state.test.ts` (`:28`, `:44`, `:100`, `:130`) and `__tests__/screens/commitments_form_body.hook.test.ts` (`:33-38`, `:88`) drop `showEndDatePicker`; their per-owner cases use `openEndsSheet` instead.

### 7. The add_commitment walk reads the Ends sheet
- File: `.claude/skills/emulator-verify/features/add_commitment.md` (~8), `.claude/skills/emulator-verify/features/commitments.md` (`:132`, ~1)
- Change: `add_commitment.md:3` replaces the Duration group sentence. It now names `components/ends_sheet.tsx` with `ends-option-forever`, `-after_count` and `-until_date`, the `ends-after` block with `ends-stepper` and its `-unit`, the `ends-date` block with `ends-date-row` floored at Starts, `ends-sheet-status` over a flat `Done`, and `ends-sheet-scroll` above scale 1.
- Change: retire rows `:16` (pills, no adornment), `:23` (pill hit areas) and `:41` (Ends choice refused on Save), whose After with no count and On a date with no day can no longer be forced. Drop the pill Gotchas at `:74-75`.
- Change: rewrite three rows:
  - `:49` takes an Ends half: `ends-option-after_count` before the close, so the track reads `After 12 payments`. After the close `ends-row` reads `Never` as before the open, and the next open lights `Never`.
  - `:52` drops its count-0 half.
  - `:53`'s force sets the Ends day first: `ends-row`, `ends-option-until_date`, `ends-date-row`, the picker's previous-month arrow to November, Wed 11 Nov on the grid of § Gotchas, `OK`, `Done`. Then it moves Starts to Wed 18 Nov. In the proof, in place of the message in `ends-sheet`: `ends-row` reads `Until Wed 11 Nov 2026`, and the Ends sheet opened after the Save has no message line and `ends-date-row` at `Wed 18 Nov 2026`. Ends moved to Wed 25 Nov goes through the sheet.
- Change: add four rows, MA-277, each brought clear of the footer by `$MQA scroll down --in 'id="commitment-form-scroll"' --until 'id="ends-row"'` (`:49`):
  - `Ends sheet, never`, frame F3's option card: `sheet-header` reads `Ends`, and one card holds three rows at a 56 dp pitch with trailing radios, `Never` lit. `ends-sheet-status` reads `Never`, and no `ends-after` or `ends-date` block shows. After Done, `ends-row` reads `Never`.
  - `Ends sheet, after a number of payments, without the preview line`, F3 layout only: `STOP AFTER` over the stepper at `12` with `payments` inside its border, in the track's tone and lighter than `STOP AFTER`, and the track `After 12 payments`. No line under the block. Eleven decreases read `1 payment` with the decrease button disabled, and a twelfth leaves 1. Done writes `After 2 payments` after one increase. On edit, a seeded `end_after_count` of 5 opens lit on After at 5. One crop shows the block's corners inside `Radius.lg`.
  - `Ends sheet, on a date, without the preview line`, F4 layout only: `LAST PAYMENT ON OR BEFORE` over one card holding `Date` and `Thu 31 Dec 2026`, `Date` starting 16 dp right of the card's inner edge, at x 52.2 dp, and the track `Until Thu 31 Dec 2026`. No line under the block. In the picker, every day before Starts reads greyed in the month of Starts, and a tap on one leaves the pick. After a pick and Done, `ends-row` reads `Until <Ddd d Mon yyyy>`.
  - `Ends sheet and row, large font`, at 2.0: `mqa bounds` on `ends-row`, the three option rows, the stepper buttons, `ends-date-row` after the scroll in `ends-sheet-scroll`, and `Done`. Each is at least 44 dp, the buttons 44 × 44. `payments` is whole inside the stepper's border, and no text box overlaps another by more than 1 dp.
- Change: `commitments.md:132` says the adornment-free pill branch has no measured state since MA-277 retired `add_commitment.md`'s pill rows. `account_chips.tsx:136` still draws it.
- Test: `none` · a features file is the walk's recipe, not code.

## Screens
- `add_commitment.md`: `Ends sheet, never`. New: F3's option card, and step 7 adds it.
- `add_commitment.md`: `Ends sheet, after a number of payments, without the preview line`. New: `F3EndsAfter`, and step 7 adds it.
- `add_commitment.md`: `Ends sheet, on a date, without the preview line`. New: `F4EndsOnDate`, and step 7 adds it.
- `add_commitment.md`: `repeats or ends sheet, close the sheet does not carry out`. Step 7 rewrites its Ends half.
- `add_commitment.md`: `Ends sheet and row, large font`. New: no frame, and step 7 adds it.
- `add_commitment.md`: `Ends earlier than Starts on Save`. Step 7 rewrites its force and proof.
- `add_commitment.md`: `status track idle, Ends earlier than Starts`. Step 7 drops the count-0 half.
- `add_commitment.md`: `Repeats sheet, custom`. A regression read of the row as MA-276 shipped it: step 2 changes the `Stepper` count, and step 5 moves the Custom box into `CommitmentChoiceBlock`.
- `transaction_form.md`: `date sheet, large font`.
- `commitment_detail.md`: `pay sheet, date picker`.
- The invariant pass (README § Invariant pass, #802 Rule 4) runs on `add_commitment.md`, `transaction_form.md` and `commitment_detail.md`.

## Non-goals
- The line `Last payment {day}`, and the track and row `After {n} payments · last {day}`: MA-280 (#915).
- The line `{n} payments through {day}`, and the track and row `On {day} · {n} payments`: MA-280.
- The row and line counts while the stored day is earlier than Starts, on add and on edit: MA-280.
- The row following a later change to Starts or Repeats: MA-280.
- The Repeats track and Custom line `{label} · next {day}`, including the case with no due day after today: MA-280.
- Settled rows passed to the edit host (`detail.hook.ts`, `commitment_form_host.state.ts`, `edit_commitment_session.tsx`): MA-280.
- The Repeats sheet and the stepper's floor and ceiling logic: MA-276 (#907). The ring and the save refusal: MA-256 (#856). The rolling window: MA-278 (#910).
- No change to `computeDueDates`, `buildCommitmentEndsLabel`, the detail's Ends fact or `resolveEndsRowValue`.
- No ceiling on the After stepper, and no comma grouping in the track, which reads the detail's fact as it is.
- No leading radio and no Date-row chevron to match F3 and F4: the built option rows and `DateRow` stay.
- No MA-250 (#849) count or date input work: those inputs leave with `DurationPicker`.

## Untested inputs
- The stepper's unit and its comma-grouped count (step 2): no suite renders `Stepper`. Screen checks only.
- The Ends sheet drawing no message line under a refused Save (step 5): proven only by the Screen check `Ends earlier than Starts on Save`.
- The 44 dp targets at font scale 2.0 (step 5): proven only by the Screen check `Ends sheet and row, large font`.
- `EndsSheet`'s `minimumDate={startDate}` (step 5): proven only by the Screen check `Ends sheet, on a date, without the preview line`.
- `seedEndsDraft` with an empty `startDate` (step 3) cannot be reached: `buildAddDefaults` sets today (`commitment_form.shared.ts:124`), and `DateRow` cannot clear a day.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `add_commitment.md` · `Ends sheet, on a date, without the preview line`: the Android dialog could grey out the Starts day itself, or leave the day before it open, if it reads the local-midnight `minimumDate` against another clock.
- `add_commitment.md` · `Ends earlier than Starts on Save`: the force now crosses a month in the native picker, and the arrow's px are not in § Gotchas yet.
- `add_commitment.md` · `Repeats sheet, custom`: the Custom box moves into `CommitmentChoiceBlock` and must draw as MA-276 shipped it.
- iOS only: a third sheet over the Ends sheet (`DatePickerSheet`) is not walked, since the emulator runs Android.
- Steps 5 and 6 each compile on their own. If lint reports the unimported `duration_picker.tsx` between them, they go in one commit.
- not probed: `add_commitment.md` · `repeats or ends sheet, close the sheet does not carry out`
- not probed: `add_commitment.md` · `Ends sheet and row, large font`
- not probed: `add_commitment.md` · `Ends earlier than Starts on Save`
- not probed: `add_commitment.md` · `Repeats sheet, custom`

## Self-assessment
I am least sure about step 6's test migration. The MA-256 `Ends earlier than Starts` block drives Ends through `setCommitmentDurationType` in six cases. Through the sheet's path, Until always holds a day and opens at Starts when the stored day is earlier, so four cases lose their state. The test writer has to tell a case that is now unreachable from one that still guards the Starts-move re-read, and keep the latter (`:715-738`, the Starts moves, and `:740-754`, which still drive `setCommitmentEndDate`), not delete it with the former.
