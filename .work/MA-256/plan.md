# MA-256 — Form status track, flat Save, toasts, failed save
base: e355eaa76f85bba22ed3faa2481c160db035eaf4 · verify: emulator · flags: user copy · expected diff: ~300 lines

## Steps
### 1. One `FormFactCell` draws every fact cell of the three sheets
- File: `src/components/ui/form_fact_cell.tsx` (new), `src/components/ui/form_sheet.geometry.ts:27-28`, `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx:253-341`, `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx:195-308`, `src/modules/commitments/screens/commitments/detail/components/pay_sheet.tsx:174-190`, `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` § 1
- Change: `FormFactCell` renders a `View` with the string `border-separator border-b px-4` inline on its `className`, its children, then a `DangerRing` while `fault !== undefined`. The string's canvas comment moves with it, `FORM_FACT_CELL_CLASS` leaves the geometry file with no re-export and no constant of that name in the new file, and the 13 cells take the piece with their 9 ring testIDs unchanged. Add a dated `**Extended 2026-10-31 (#856, MA-256).**` paragraph at the end of ADR § 1, after the `Amended 2026-10-29` paragraph, naming the piece and its home, saying it supersedes the class's home in `:52` and `:54`, and, as `:56` says of a new file, that § 3's `git mv` does not apply.
  - Props, by a union so a fault cannot lack its ring id: `children: React.ReactNode` required, not nullable. `fault: string | undefined` and `ringTestID: string` are absent together or present together, `fault` never `null`, `ringTestID` never `null`.
  - One-line doc comment `No HeroUI primitive fits`, as `danger_ring.tsx:10`.
- Test: `none` · markup with no logic, and `.claude/rules/tests.md` bars a new `.tsx` file. `__tests__/screens/commitments/pay_sheet_rate_error.test.tsx:202-206` keeps `rate-ring`, and the Screens rows read all three sheets.

### 2. Ends earlier than Starts is refused on Save, and its ring stands exactly while it holds
- File: `src/constants/strings.ts`, `src/modules/commitments/screens/commitments/commitment_form.shared.ts` (`superRefine`, :49-75), `src/modules/commitments/screens/commitments/commitment_form.helpers.ts`, `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx` (Starts `onChange`, :306), `src/modules/commitments/screens/commitments/components/duration_picker.tsx` (:66, :142)
- Change: add `commitmentsErrEndsBeforeStarts: 'End date must be on or after start date'`, and a `superRefine` issue on path `['endDate']` while `durationType` is `UntilDate`, `endDate` is non-empty and `endDate < startDate`. `SET_OPTS` validates on a `setValue` before any Save, which would ring Ends at the pick, so both date writes go through the two helpers below, and `isSubmitted` comes from `useCommitmentFormBodyFaults`, the subscribed read `commitment_form_body.tsx:165` already uses.
  - `setCommitmentStartDate(form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue' | 'trigger'>, next: string, isSubmitted: boolean): void`, all required, none nullable: `setValue('startDate', next, SET_OPTS)`, then `void form.trigger('endDate')` only when `isSubmitted`.
  - `setCommitmentEndDate(form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue'>, next: string, isSubmitted: boolean): void`, all required, none nullable: `setValue('endDate', next, { shouldDirty: true, shouldValidate: isSubmitted })`.
  - `DurationPicker` gains `onEndDateChange: (next: string) => void`, required, not nullable, called at both sites, and drops its `SET_OPTS` import.
- Test: `first` · `__tests__/commitment_form_shared.test.ts` § `COMMITMENT_SCHEMA`: Until a day before Starts fails on `endDate` with the new message, equal dates pass, Forever with a stale earlier `endDate` passes, an emptied Every still reports it. `__tests__/screens/commitments/commitment_form.helpers.test.ts` on `useAddWithBodyFaults`: an earlier date before a Save leaves `faults.endDate` undefined; a Save sets it; Starts moved on or before Ends clears it, past Ends sets it, Ends moved clears it, with `2028-02-29` as the boundary day.

### 3. The edit session opens from the commitment the detail holds
- File: `src/modules/commitments/store/commitment_form_host.state.ts`, `src/modules/commitments/screens/commitments/commitment_form/commitment_form_host.hook.ts`, `src/modules/commitments/screens/commitments/commitment_form/index.tsx`, `src/modules/commitments/screens/commitments/commitment_form/components/edit_commitment_session.tsx`, `src/modules/commitments/screens/commitments/commitment_form/edit_commitment.hook.ts`, `src/modules/commitments/screens/commitments/detail/detail.hook.ts:306`
- Change: the session takes the loaded entity, prior art `transaction_form_host.state.ts:148-156`, so nothing reads `useCommitmentStore.commitments` and no empty session closes itself. `useRouteDraft` stays, with `id: commitment.id` and `entity: commitment`.
  - `openEdit(commitment: Commitment, landing?: CommitmentEditLanding): void`: `commitment` required, not nullable; `landing` optional, not nullable.
  - State `editingCommitment: Commitment | undefined` replaces `editingCommitmentId`; `undefined` while closed or on add, never `null`. The host hook returns it as `state.editingCommitment` and drops `handleClose`.
  - `useEditCommitment(options: { commitment: Commitment; onSaved: () => void; onDeactivated: () => void })`, all required, none nullable. `onMissing`, its effect, `draftStartDate` and `state.hasDraft` go.
  - `EditCommitmentSession` takes `commitment: Commitment`, required, not nullable, in place of `commitmentId`, and drops `onClose` and its `if (!state.hasDraft) return null` gate.
- Test: `first` · `__tests__/screens/commitments_edit.hook.test.ts`: `mount` takes a commitment, and with the store's `commitments` empty the form reads every field of `buildEditDefaults`, Save updates that id, Stop deactivates that id. The `onMissing` and `hasDraft` cases at :219-271, :556-562 and :629-660 go with the behaviour; the MA-188 rerender cases keep their redraft assertions on a `commitment` prop. `__tests__/screens/commitments/commitment_form_host.state.test.ts` and `commitment_form_host.hook.test.ts`: `openEdit(makeTestCommitment({ id: 'c-1' }))`, `editingCommitment`, and `handleClose` calls at :268, :292, :298 become `handleOpenChange(false)`. `__tests__/screens/navigation/tabs.hook.test.ts:75`: `openEdit(makeTestCommitment({ id: 'c-1' }))`, imported from `@/test_helpers/commitment`, or the per-commit typecheck fails. `__tests__/screens/commitments_detail.hook.test.ts:217` reads `editingCommitment`, plus a case with an empty store `commitments`.

### 4. A landed edit closes, and the detail re-reads at the edited cycle
- File: `src/modules/commitments/store/commitment.store.ts:319-329`, `src/modules/commitments/screens/commitments/detail/detail.hook.ts:297-307`
- Change: `updateCommitment(id: string, data: UpdateCommitmentInput): Promise<void>` keeps its signature and rejects only when `repo.update` rejects. A failed `loadMonthSnapshot` after the write logs and resolves, and that load has already published `loadError`, prior art `account.store.ts:65`. `goToEdit` sets `onSaved: reload` on the tabbed and the stacked detail, so the detail re-reads by id even when the failed snapshot left `payments` unpublished, and `resolveCommitmentDetailCycle` picks the cycle. `onDeactivated` stays as today on both.
- Test: `first` · `__tests__/commitment.store.test.ts:442`: the case becomes a resolved edit with `runHousekeeping` rejecting, `repository.update` called once and `loadError` true, plus a case where `repository.update` rejects and `updateCommitment` rejects. `__tests__/screens/commitments_detail.hook.test.ts:540`: splits, `onDeactivated` keeps `dismissTo('/commitments')`, and `onSaved` on the tabbed copy runs `expectNoNavigation()`, reads `getPaymentsByCommitment` once more with `paymentsState` unchanged, and lands on the regenerated row with the held due date. The stacked case at `:554-562` keeps `expectNoNavigation()` and adds the same read of `getPaymentsByCommitment` with `paymentsState` unchanged. The cycle order is `__tests__/screens/commitments_detail.helpers.test.ts:135`, which takes no change.

### 5. The footer reads the status track over the flat Save
- File: `src/constants/strings.ts`, `src/modules/commitments/screens/commitments/commitment_form.helpers.ts`, `src/modules/commitments/screens/commitments/components/commitment_form_body.hook.ts`, `src/modules/commitments/store/commitment_form_host.state.ts`, `src/modules/commitments/screens/commitments/commitment_form/commitment_form_host.hook.ts`, `src/modules/commitments/screens/commitments/commitment_form/components/add_commitment_session.tsx`, `src/modules/commitments/screens/commitments/commitment_form/components/edit_commitment_session.tsx`, `src/modules/commitments/screens/commitments/commitment_form/index.tsx:30-38`, `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx:69-102`
- Change: delete `CommitmentFormFooter`, and draw the footer in `commitment_form/index.tsx` as `transaction_form/index.tsx:36-52`: `StatusTrack` with `testID="commitment-form-status"`, the `FORM_SHEET_STATUS_GAP` spacer, then a flat primary `Button` with `isLoading={state.saving}`. Rewrite `commitmentsSave: 'Save'` and `commitmentsSaveError: "Couldn't save this commitment. Nothing was changed. Try again."`; add `commitmentsFirstPaymentDue: (day: string) => string` and `commitmentsEditScheduleFootnote`, the Copy lines. The add session publishes the first-payment footnote, the edit session the edit footnote, each with `errorMessage` from `useCommitmentFormStatus`.
  - `resolveCommitmentFirstPaymentFootnote(schedule: { startDate: string; recurrenceEvery: number | null | undefined; recurrencePeriod: RecurrencePeriod; durationType: DurationType; endAfterCount: number | null | undefined; endDate: string | undefined }, today: string): string | undefined`, in the helpers file, every key present. It calls `computeDueDates` with `every: recurrenceEvery ?? 1`, `endAfterCount: endAfterCount ?? undefined`, `maxCount: 1`, and returns `undefined` on no entry, else the copy over `formatShortWeekdayDate(first, today)`.
  - `countCommitmentFormFaults(faults: Record<BodyFaultField, string | undefined>): number`, in the body hook file beside `resolveCommitmentFormStripError`: `endAfterCount ?? endDate` counts as one Ends row, every other key as one. The strip error is outside `faults`.
  - `resolveCommitmentFormStatus(faults: Record<BodyFaultField, string | undefined>, saveError: string | undefined): string | undefined`: `Strings.fixFieldsMarkedAbove(n)` at `n > 0`, else `saveError`.
  - `useCommitmentFormStatus(form: UseFormReturn<CommitmentFormValues>, saveError: string | undefined): string | undefined`, over `useCommitmentFormBodyFaults`.
  - `useCommitmentFirstPaymentFootnote(form: UseFormReturn<CommitmentFormValues>, now: Date = new Date()): string | undefined`: `useWatch` on the six schedule fields, `today` from `toLocalDateString(now)`.
  - `CommitmentFormFooterState`: `saving: boolean` required; `errorMessage?: string`, the track's error line; `footnote?: string`, its idle line. Neither optional field takes `null`.
  - The host hook's `state.saveError` becomes `state.statusMessage: string | undefined`, and it adds `state.statusFootnote: string | undefined`.
- Test: `first` · `__tests__/screens/commitments/commitment_form.helpers.test.ts`: the footnote at `Sun 1 Nov` and `Mon 1 Feb 2027` against today `2026-10-31`, on a leap day, with `recurrenceEvery: null`, with a `null` count reading Starts, with Until and no date (`endDate` `''`, as `undefined`) reading Starts, with Ends equal to Starts reading Starts, and `undefined` with Until before Starts and with a count of 0. On `useAddWithBodyFaults` plus `useCommitmentFormStatus` and `useCommitmentFirstPaymentFootnote(form, new Date(2026, 9, 31))`: moved Starts reads the new day, then Until with Ends before it reads `undefined`; name, category and amount missing read `Fix the 3 fields marked above.`, a failed account lookup adds none, a Save with only Ends earlier than Starts reads `Fix the 1 field marked above.`, a save error returns at zero faults. `__tests__/screens/commitments_form.strings.test.ts`: every new or rewritten key byte-exact. `__tests__/screens/accounts/account_failure_copy.strings.test.ts`: `commitmentsSaveError` leaves `UNREDESIGNED_OLD_VOICE_KEYS`. `__tests__/screens/commitments/commitment_form_host.hook.test.ts:243-248`: `statusMessage`, and `statusFootnote` from a published footer.

### 6. A saved add and a saved edit toast after the close, a Stop does not
- File: `src/constants/strings.ts`, `src/modules/commitments/store/commitment_form_host.state.ts`, `src/modules/commitments/screens/commitments/commitment_form/commitment_form_host.hook.ts`
- Change: add `commitmentsAddedToast: 'Commitment added'` and `commitmentsUpdatedToast: 'Commitment updated'`. `handleSaved` marks by `mode`, `handleDeactivated` passes no mark, and `handleCloseComplete` shows `{ label, variant: 'success' }` through `useToast`, as `transaction_form_host.hook.ts:53-59`.
  - `export type CommitmentFormPostCloseToast = 'added' | 'updated'`, state `postCloseToast: CommitmentFormPostCloseToast | undefined`, cleared by `openAdd`, `openEdit` and `completeClose`, never `null`.
  - `completeSave(sessionId: number, postCloseToast?: CommitmentFormPostCloseToast): boolean`: `sessionId` required; the mark optional, not nullable.
  - `completeClose(sessionId: number): CommitmentFormPostCloseToast | undefined`: the mark, or `undefined` on a stale session or a close with none.
- Test: `first` · `__tests__/screens/commitments/commitment_form_host.state.test.ts`: `completeClose` returns the mark once, `undefined` after a plain close and for a stale session. `__tests__/screens/commitments/commitment_form_host.hook.test.ts`, with the `useToast` mock of `transaction_form_host.hook.test.ts:14-18`: one `Commitment added` after close complete on add, one `Commitment updated` on edit, none before close complete, none after `handleDeactivated`, none after an unsaved close.

### 7. Every See all and the account add path land through one tab jump, and a cleared search applies at once
- File: `src/modules/navigation/utils/jump_to_tab.ts` (new), `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts:30,356-360`, `src/modules/commitments/screens/commitments/detail/detail.hook.ts:52-53,320-331`, `src/modules/transactions/screens/transactions/transactions.hook.ts:153`
- Change: `jumpToTab(navigation: ReturnType<typeof useNavigation>, tabName: 'transactions' | 'commitments'): void`, both required, neither nullable, moves the body of `goToAllPayments`: the `popToTop` on `backgroundTabPushedStackKey(navigation.getState(), tabName)`, then two `router.dismissTo('/(app)/(tabs)/<tabName>')` from the imperative `router`, keeping their two one-line comments. `jumpToTransactionsTab` and `TRANSACTIONS_TAB` go; `useAccountDetail` reads `useNavigation()`, the `(app)` Stack, since `accounts/[id]` has no layout of its own. `goToAllPayments` keeps its seed. In `transactions.hook.ts`, `debouncedSearch` reads `''` while `searchQuery` is empty, as `commitments.hook.ts:114-116`.
- Test: `first` · `__tests__/navigation/jump_to_tab.test.ts` (new): a background tab with a pushed screen dispatches `POP_TO_TOP` on its key before both dismissals; the selected tab, only the tab root, and a navigator with no `(tabs)` route dispatch nothing; each makes two dismissals. `__tests__/screens/accounts/account_detail.hook.test.ts:43-51`: the mock gains `router` and `useNavigation`, the cases at :522-550 keep their assertions, and a case over a background Transactions Stack asserts the pop first for See all and for Add a transaction. `__tests__/screens/transactions/transactions_hook.test.ts:66-67`: the identity mock becomes a `jest.fn`, and one case swaps in the real hook through `jest.requireActual`: an emptied query reaches `setQuery` with no `search` before any timer, a typed one waits 300 ms. `__tests__/screens/commitments_detail.hook.test.ts:1532-1567` passes unchanged.

### 8. The feature files read the new footer, landings and states
- File: `.claude/skills/emulator-verify/features/add_commitment.md`, `.claude/skills/emulator-verify/features/commitment_detail.md`, `.claude/skills/emulator-verify/features/transaction_form.md`, `.claude/skills/emulator-verify/features/transactions.md`, `.claude/skills/emulator-verify/features/account_detail.md`
- Change: append the 11 `new` rows of Screens. In `add_commitment.md`: `Save Commitment` becomes `Save` on all 10 lines, `:3` loses `until MA-256`, `save failed` reads the new copy on `commitment-form-status`, whole at 1.3 under the `Font scale` force, `Repeats or Ends choice refused on Save` reads the track's count, and Outbound `:53` lands on the tabbed detail with Back on `/commitments`. In `commitment_detail.md`: `:65` and `:81` drop the `until MA-256 (#856) merges` workaround, and `see all from the stacked detail` names the shared jump. In `account_detail.md`: Back at `:67` and `:69` reads the previous tab, never this detail.
  - `first payment due on the status track` and `status track on edit`, Proof: the dot before the line is the shared track's idle glyph (`status_track.geometry.ts:43`), as `pay-sheet-status` draws it. `E2AddFilled` and `E4Edit` draw the line with no glyph, and the ticket's Rule on the built status track settles it.
  - `Ends earlier than Starts on Save`, Force: after a valid fill, drag the list with `adb -s <serial> shell input swipe 540 1500 540 700 400`, not `mqa scroll`: Name keeps focus after `$MQA tapxy 540 596`, and `mqa scroll` then sends Back and closes the sheet. Then `$MQA tap 'id="ends-row"'`, `$MQA tap 'label="Until date"'`, `$MQA tap 'label="YYYY-MM-DD"'`. The native day cells are not in agent-device's tree, so `$MQA tap '~30 October 2026'` misses: pick by `adb -s <serial> shell input tap`, then `$MQA tap 'label="OK"'`. On October 2026 at 1.0, px (540, 1000) picks Wed 7 Oct, px (540, 1130) picks Wed 14 Oct and px (540, 830) is a blank cell. These px hold for that month's layout only, so read the row's label after each pick. Close with a tap on the overlay at px (540, 300), a 1 s pause, then Save by `adb` at px (540, 1794).
  - Same row, Proof: before a Save no `*-ring` and no `Fix the` line; after Save `Fix the 1 field marked above.`, `ends-ring` only, no row written, and `End date must be on or after start date` in `ends-sheet`; with Starts moved from 31 Oct to 14 Oct and Ends on 7 Oct, the ring and the count stand; both clear with Starts moved on or before Ends, and both clear with Ends moved past Starts. No walk has seen either clear: the probe's Starts tap hit the blank cell, and its Ends pick at (900, 1130) with `OK` left the row at `Until Wed 7 Oct 2026` and the ring standing, cause not judged. Read a second Ends pick that does not land against `openEndDatePicker` in `duration_picker.tsx`. Step 2's hook test is the only proof of the clears until then.
  - `missing name and category`, Proof names both counts: the row's force, an empty form, reads `Fix the 3 fields marked above.`, amount included, with `name-ring` and `category-ring` only; E5's `Fix the 2 fields marked above.` reads after `$MQA fill 'id="amount-hero-value"' 8000` and `$MQA tapxy 540 596`.
  - `:46`: at 1.0 at rest `ends-row` reads 0 × 0 at y 624.8, the footer's top, so `633.9` becomes `624.8`. The `377.1 by 48.00 at y 659.4` of `:18` holds.
- Test: `none` · docs. `git grep -n "Save Commitment" -- src .claude` prints nothing at head, 11 lines at base.

## Screens
- `emulator-verify/features/add_commitment.md`: first payment due on the status track · new, step 8, `E2AddFilled`
- `emulator-verify/features/add_commitment.md`: status track on edit · new, step 8, `E4Edit`
- `emulator-verify/features/add_commitment.md`: status track idle, Ends earlier than Starts · new, step 8, `no frame`
- `emulator-verify/features/add_commitment.md`: missing name and category · a clipped or rounded container
- `emulator-verify/features/add_commitment.md`: amount half-typed
- `emulator-verify/features/add_commitment.md`: Repeats or Ends choice refused on Save · a clipped or rounded container
- `emulator-verify/features/add_commitment.md`: Ends earlier than Starts on Save · new, step 8, `E5AddValidation` · a clipped or rounded container
- `emulator-verify/features/add_commitment.md`: save button, large font · a font scale above 1.0
- `emulator-verify/features/add_commitment.md`: save failed · a font scale above 1.0
- `emulator-verify/features/add_commitment.md`: add and edit sheet, lift and close · a swipe or a drag
- `emulator-verify/features/add_commitment.md`: toast after add and after edit · new, step 8, `no frame`
- `emulator-verify/features/add_commitment.md`: save whose close the sheet does not carry out
- `emulator-verify/features/add_commitment.md`: add sheet over the dashboard, FAB hidden
- `emulator-verify/features/add_commitment.md`: variable estimate
- `emulator-verify/features/add_commitment.md`: edit sheet over the tabbed detail, FAB hidden, then a second commitment's
- `emulator-verify/features/add_commitment.md`: edit sheet over the stacked detail, save closes onto the detail
- `emulator-verify/features/commitment_detail.md`: after an edit at an unpaid cycle · new, step 8, `no frame`
- `emulator-verify/features/add_commitment.md`: edit from a deep-linked detail · new, step 8, `no frame`
- `emulator-verify/features/commitment_detail.md`: bottom Edit
- `emulator-verify/features/commitment_detail.md`: edit sheet from a transaction's stacked detail, Commitments tab unopened · new, step 8, `no frame`
- `emulator-verify/features/add_commitment.md`: fact rows card, add · a new component, a font scale above 1.0, a clipped or rounded container
- `emulator-verify/features/transaction_form.md`: add expense · a new component, a clipped or rounded container
- `emulator-verify/features/transaction_form.md`: validation · a new component, a clipped or rounded container
- `emulator-verify/features/commitment_detail.md`: pay sheet, fixed EGP · a new component, a clipped or rounded container
- `emulator-verify/features/commitment_detail.md`: pay sheet, USD commitment, rate row · a new component, a clipped or rounded container
- `emulator-verify/features/transactions.md`: see all, target tab holds a pushed detail · new, step 8, `C5TransactionsFiltered`, A2
- `emulator-verify/features/transactions.md`: see all, leftover search · new, step 8, `C5TransactionsFiltered`, A2
- `emulator-verify/features/transaction_form.md`: add from an account, target tab holds a pushed detail · new, step 8, `no frame`
- `emulator-verify/features/commitment_detail.md`: see all from the stacked detail
- Invariant pass, #802 Rule 4: `add_commitment.md`, `commitment_detail.md`, `transaction_form.md`, `transactions.md`, `account_detail.md`.

## Non-goals
- The rows and their Name and Category rings, MA-255.
- The Stop dialog, its toast, its failed copy and the exit after Stop, MA-224 (#798). `onDeactivated` keeps its landings.
- The Save gate shared with the transaction sheet, MA-245 (#840).
- The Ends sheet drawing its date message one change late, MA-250 (#849), and its redraw, MA-223 (#797).
- `dashboard.hook.ts:212,214`, which stay on `push`, and the budget `openEdit` sites.
- A status track or toast on `add_commitment.hook.ts`, which takes no change.

## Untested inputs
- The error's wrap at font scale 1.3: step 5, `save failed` on the emulator.
- A tab Stack opened by deep link, which holds no navigator state: step 7, unpopped as today.
- A commitment-owned row, View commitment, See all, the Home tab, an account card, See all: step 7, unwalked, no deep link reaches it.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- At head, `git grep -nE "dismissTo\((TRANSACTIONS|COMMITMENTS)_TAB\)" -- src` prints nothing and `git grep -n "className={FORM_FACT_CELL_CLASS}" -- src` prints nothing; at base they print 4 and 13.

## Risks
- `transactions.md · see all, target tab holds a pushed detail`: with Transactions selected the jump depends on the second `dismissTo`, read on device for Commitments only, the third walk of `see all from the stacked detail`. A second list on this walk means `stacked_route.ts:39` must stop excluding the selected tab, and an `--amend`.
- `transactions.md · see all, target tab holds a pushed detail`: hold the detail by a row tap. A deep-linked tab Stack has no navigator state and its detail stays under the landing.
- `add_commitment.md · save failed`: two lines at 1.3 raise the footer, and the rows card's last row depends on the shell padding by the measured footer.
- `add_commitment.md · edit from a deep-linked detail`: `openEdit` hands over the detail's last read, so a re-read landing after the tap leaves that open on the older object.
- MA-224 (#798) changes `goToEdit`, `commitment_form_host.hook.ts`, `commitment_form/index.tsx` and `strings.ts`; the second to merge rebases.
- Recount at `e355eaa7`: 27 files, ~296 lines. `add_commitment.hook.ts` and `stacked_route.ts` of the `Size:` line take no change.
- not probed: add_commitment.md · save button, large font
- not probed: add_commitment.md · save failed
- not probed: add_commitment.md · add and edit sheet, lift and close
- not probed: add_commitment.md · fact rows card, add
- not probed: transaction_form.md · add expense
- not probed: transaction_form.md · validation
- not probed: commitment_detail.md · pay sheet, fixed EGP
- not probed: commitment_detail.md · pay sheet, USD commitment, rate row
- not probed: transactions.md · see all, target tab holds a pushed detail
- not probed: add_commitment.md · edit from a deep-linked detail

## Self-assessment
Step 7 is the one I trust least. The unit table pins `backgroundTabPushedStackKey` to `undefined` for the selected tab and the code reaches the landing by the second `dismissTo`, but `getNavigateAction` only shows that the first call is a `POP_TO` on the `(app)` Stack with nested params. What the tab's Stack does with those params is a device fact, read for Commitments and never for Transactions under an account detail. The `Size:` line naming `stacked_route.ts` suggests the sizer expected an edit there. The Screens row tests it, and the fix is one clause.
