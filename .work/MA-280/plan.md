# MA-280 — Ends previews and the Repeats next day
base: a3e0cf426fab63b21d90fb11764b3107aab3d84f · verify: emulator · flags: money path, user copy · expected diff: ~276 lines

Size recount: 15 files outside tests. The ticket's 14, plus the decision record in step 7: helpers ~100, housekeeping ~20, strings ~12, ends hook ~15, ends sheet ~10, repeats hook ~12, repeats sheet ~6, body ~22, host state ~10, host hook ~3, host index ~1, edit session ~4, detail hook ~6, features file ~15, ADR ~30.

## Steps

### 1. The save's selection of new due dates is one exported function
- File: `src/modules/commitments/repositories/commitment_housekeeping.helpers.ts` (`planMissingCommitmentPayments`, the `remaining` loop at `:46-71`)
- Change: export `selectNewDueDates(dates: readonly string[], existing: ReadonlySet<string>, schedule: { durationType: DurationType; endAfterCount: number | null }): string[]`. All three arguments are required, in that order, and none is optional. `endAfterCount` can be `null`. It returns a new array, never `null`, in `dates` order. The body is the loop as it stands: a date in `existing` is skipped. When `durationType` is `AfterCount` and `endAfterCount` is not `null`, it takes at most `max(0, endAfterCount - existing.size)` dates. `planMissingCommitmentPayments` maps its result to rows, and every row it writes stays byte-identical.
- Test: `first` · `__tests__/commitment_housekeeping.helpers.test.ts`: a `selectNewDueDates` describe with these cases: no existing returns every date; an existing date is skipped; After 5 holding 2 existing dates returns 3; After N whose existing set holds N or more returns `[]`; `AfterCount` with `endAfterCount` `null` returns every date not held; `Forever` ignores `endAfterCount`. The whole `planMissingCommitmentPayments` suite passes unchanged.

### 2. The day and count resolvers read the whole schedule
- File: `src/modules/commitments/screens/commitments/commitment_form.helpers.ts`
- Change: export `interface CommitmentFormSchedule { startDate: string; recurrenceEvery: number | null | undefined; recurrencePeriod: RecurrencePeriod; durationType: DurationType; endAfterCount: number | null | undefined; endDate: string | undefined }`. Every field is required. `recurrenceEvery` and `endAfterCount` can be `null` or `undefined`. `endDate` can be `undefined`. Give `resolveCommitmentFirstPaymentFootnote`'s inline parameter type this name, with no change to its body. Export `NO_SETTLED_DUE_DATES: readonly string[]`, one frozen empty array. Add three exports. Each reads `recurrenceEvery ?? 1`, as `:239` does. Each passes `settledDueDates` to step 1's `selectNewDueDates` as `existing`, a `Set` of distinct dates. Each takes its dates from `computeDueDates`, always with a bound:
  - `resolveEndsLastDueDate(schedule: CommitmentFormSchedule, count: number, settledDueDates: readonly string[]): string | undefined`: the schedule's Starts and cadence as After `count`, with `maxCount: count`. It ignores the schedule's own Ends fields. It returns the latest of `settledDueDates` and the selected dates. It returns `undefined` only when both are empty.
  - `countEndsThroughDate(schedule: CommitmentFormSchedule, day: string, settledDueDates: readonly string[]): number`: the schedule as On `day`, with `endDate: day` and `throughDate: day`. It returns the count of distinct settled dates `<= day` plus the selected dates, never `null`. A `day` earlier than Starts gives the settled count through it, 0 with none.
  - `resolveRepeatsNextDueDate(schedule: CommitmentFormSchedule, settledDueDates: readonly string[], today: string): string | undefined`: the schedule with its own Ends fields. It returns the first selected date `> today`, or `undefined` when none exists. The bound is `maxCount` = (the schedule's date count with `throughDate: today`) + the settled count + 1. Of the s + 1 schedule dates after today, at most s are settled, so this bound reaches the first unpaid date after today whenever one exists. It also bounds `Forever`, and `UntilDate` with an empty `endDate`.
- Test: `first` · `__tests__/screens/commitments/commitment_form.helpers.test.ts`, three describes:
  - `resolveEndsLastDueDate`: Starts `2026-10-20` monthly, 12, reads `2027-09-20` (F3). Month-end Starts `2026-01-31` monthly, 3, reads `2026-03-31`. `2028-02-29` yearly, 2, reads `2029-02-28`. A Starts in the past. On edit, settled `2026-10-20` and `2026-12-20` with count 1 read `2026-12-20`. A settled date past the last new date wins.
  - `countEndsThroughDate`: `2026-10-20` monthly through `2026-12-31` counts 3, not F4's 14. Daily from `2026-01-01` through `2028-12-31` counts 1096, past the three-month window. A day earlier than Starts counts 0 on add, and on edit counts the settled dates through it. `2026-01-31` monthly through `2026-02-28` counts 2. `2028-02-29` yearly through `2029-03-01` counts 2.
  - `resolveRepeatsNextDueDate` with today `2026-10-20`: Starts today monthly reads `2026-11-20`. Every 2 weeks reads `2026-11-03`. A past Starts `2026-01-31` monthly reads `2026-10-31`. `2028-02-29` yearly with today `2028-03-01` reads `2029-02-28`. After 1 with Starts today reads `undefined`. An end date earlier than Starts reads `undefined`. A settled `2026-11-20` reads `2026-12-20`. After 2 with both settled reads `undefined`. Daily `Forever` from `2020-01-01` reads `2026-10-21`. `UntilDate` with `endDate` `''` reads `2026-11-20`.

### 3. The Ends sheet shows its preview line, and its track and row show the preview forms
- File: `src/constants/strings.ts` (beside `commitmentsEndsStepperUnit`, `:1121`), `commitment_form.helpers.ts` (`resolveEndsRowValue`, `:194-205`), `components/ends_sheet.hook.ts` (`useEndsSheet`), `components/ends_sheet.tsx` (`EndsSheet`), `components/commitment_form_body.tsx` (Ends row `:247`, `EndsSheet` `:300-307`)
- Change: strings:
  - `commitmentsEndsLastPayment: (day: string) => string` reads `Last payment ${day}`.
  - `commitmentsEndsAfterPreview: (n: number, count: string, day: string) => string` reads `After 1 payment · last ${day}` at 1, else `After ${count} payments · last ${day}`.
  - `commitmentsEndsThroughLine: (n: number, count: string, day: string) => string`, all three required, reads `1 payment through ${day}` / `${count} payments through ${day}`.
  - `commitmentsEndsOnDatePreview: (n: number, count: string, day: string) => string`, all three required, reads `On ${day} · 1 payment` / `On ${day} · ${count} payments`, so 0 reads `0 payments`.
  - Each takes `count` as `formatAmount(n)` (`src/utils/format_amount.ts:44`, the count precedent at `commitments.helpers.ts:104`) and `day` as `formatWeekdayDate` (`src/utils/format_date.ts:24`).

  Helpers:
  - `resolveEndsRowValue(schedule: CommitmentFormSchedule, settledDueDates: readonly string[]): string`, both arguments required, replaces the three-argument signature. `Forever` reads `Never`. `AfterCount` with `endAfterCount` >= `ENDS_AFTER_COUNT_MIN` reads the After preview from `resolveEndsLastDueDate`. `UntilDate` with a non-empty `endDate` reads the On preview from `countEndsThroughDate`. Any other input reads `buildCommitmentEndsLabel` as today (`After N payments`, `Until date`).
  - New `resolveEndsSheetLine(schedule: CommitmentFormSchedule, settledDueDates: readonly string[]): string | undefined`: `undefined` for `Forever` and for an incomplete count or date, else the Last payment line or the through line.

  `useEndsSheet(owner: string, form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue' | 'trigger'>, isSubmitted: boolean, schedule: CommitmentFormSchedule, settledDueDates: readonly string[])`: all five arguments are required. It overlays the draft onto `schedule` as `durationType`, `endAfterCount` and `endDate`. It returns `state.track` (`string | undefined`, `resolveEndsRowValue`) and `state.line` (`string | undefined`, `resolveEndsSheetLine`), both `undefined` while no draft is held, memoized on the draft, `schedule` and `settledDueDates`.

  `EndsSheet` props `schedule: CommitmentFormSchedule` and `settledDueDates: readonly string[]`, both required, replace `startDate`. `minimumDate` becomes `schedule.startDate`. Both `CommitmentChoiceBlock`s take `line={line}` (`commitment_choice_sheet.tsx:159`, testIDs `ends-after-line` and `ends-date-line`).

  The body takes an optional `settledDueDates?: readonly string[]` prop, defaulting to `NO_SETTLED_DUE_DATES`. It builds `schedule` with `useMemo` from the watched fields `:56-81`. The Ends row and `EndsSheet` read it, so the row follows a later Starts or Repeats change.
- Test: `first` · `commitment_form.helpers.test.ts`: the `resolveEndsRowValue (MA-255)` table moves to the new signature, and its three incomplete rows stay on it (`:493`, `:496`, `:497`): `AfterCount` with `endAfterCount` `undefined` reads `After N payments`, and `UntilDate` with `endDate` `undefined` and with `''` each read `Until date`. The `''` row proves an empty day never reaches `countEndsThroughDate`. The cases:
  - `After 12 payments · last Mon 20 Sep 2027`, `After 1 payment · last Tue 20 Oct 2026` and `After 1,096 payments · last Sun 31 Dec 2028`.
  - `On Thu 31 Dec 2026 · 3 payments`, and `On Mon 19 Oct 2026 · 0 payments` on add.
  - On edit, `· 1 payment` with one settled date through that day.
  - `resolveEndsSheetLine` reads `undefined` on `Forever`, `Last payment Mon 20 Sep 2027`, `1 payment through Tue 20 Oct 2026`, `3 payments through Thu 31 Dec 2026` and `1,096 payments through Sun 31 Dec 2028`.
  - The `:474-485` case reads the held-day row as `On Mon 19 Oct 2026 · 0 payments`.

  `first` · `__tests__/screens/commitments/ends_sheet.hook.test.ts`: the harness passes a `useMemo` schedule from `useWatch`, plus settled dates.
  - After 12 reads track `After 12 payments · last Mon 20 Sep 2027` and line `Last payment Mon 20 Sep 2027`, and Done makes the row equal the track.
  - After Done, a `startDate` change and then a `recurrencePeriod` change each move the row's last day.
  - On a date reads `3 payments through Thu 31 Dec 2026` and track `On Thu 31 Dec 2026 · 3 payments`.
  - A held day earlier than Starts reads row `On Mon 19 Oct 2026 · 0 payments` and sheet line `1 payment through Tue 20 Oct 2026`.
  - On edit, settled dates move After 1's last day to the latest settled date.

### 4. The Repeats track and Custom line read the next due day
- File: `src/constants/strings.ts`, `commitment_form.helpers.ts`, `components/repeats_sheet.hook.ts` (`useRepeatsSheet`), `components/repeats_sheet.tsx` (`:75`, `:94`), `components/commitment_form_body.tsx` (`RepeatsSheet` `:294-299`)
- Change: string `commitmentsRepeatsNext: (label: string, day: string) => string` reads `${label} · next ${day}`.

  Helper `resolveRepeatsTrack(schedule: CommitmentFormSchedule, settledDueDates: readonly string[], today: string): string`, never `undefined`: the label `resolveRepeatsRowValue(schedule.recurrenceEvery ?? 1, schedule.recurrencePeriod)`. When `resolveRepeatsNextDueDate` gives a day, it adds `· next` with `formatShortWeekdayDate(day, today)` (`format_date.ts:31`). Otherwise it is the label alone.

  `useRepeatsSheet(owner: string, form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue'>, schedule: CommitmentFormSchedule, settledDueDates: readonly string[], now: Date = new Date())`: the first four arguments are required, and `now` is optional. It keeps `state.label` as the row reads it. It adds `state.track: string | undefined`: `undefined` with no draft, else `resolveRepeatsTrack` over `schedule` with the draft's `every` and `period`, and `today = toLocalDateString(now)`. This is the pattern of `useCommitmentFirstPaymentFootnote` (`commitment_form_body.hook.ts:135`).

  `RepeatsSheetProps` (`repeats_sheet.tsx:28-33`) gains `schedule: CommitmentFormSchedule` and `settledDueDates: readonly string[]`, both required. `RepeatsSheet` passes them to `useRepeatsSheet`, and passes `track` to `footnote` and to the Custom block's `line`. The body passes its `schedule` and `settledDueDates`.
- Test: `first` · `commitment_form.helpers.test.ts` `resolveRepeatsTrack`, with today `2026-10-20`, Starts today:
  - Monthly reads `Every month · next Fri 20 Nov`.
  - Every 2 weeks reads `Every 2 weeks · next Tue 3 Nov`.
  - Today `2026-12-25` with Starts `2026-12-20` monthly reads `Every month · next Wed 20 Jan 2027`.
  - After 1 reads `Every month`.

  `first` · `__tests__/screens/commitments/repeats_sheet.hook.test.ts`: the harness passes the schedule, settled dates and a fixed local `now`.
  - The track reads `Every month · next Fri 20 Nov` on open and `Every week · next Tue 27 Oct` after Weekly, while `label` still equals the row after Done.
  - Custom from Monthly reads `Every 2 months · next Sun 20 Dec`.
  - A settled `2026-11-20` reads `Every month · next Sun 20 Dec`.

### 5. The edit sheet carries the commitment's settled due dates
- File: `src/modules/commitments/store/commitment_form_host.state.ts` (`openEdit` `:45`, `:88-99`), `commitment_form/commitment_form_host.hook.ts` (`:20-27`, `:63-75`), `commitment_form/index.tsx` (`:53-60`), `commitment_form/components/edit_commitment_session.tsx`, `detail/detail.hook.ts` (`goToEdit` `:290-297`)
- Change: host state field `editingSettledDueDates: readonly string[]`, never `undefined`. It is `NO_SETTLED_DUE_DATES` in `INITIAL_STATE`, `openAdd` and `completeClose`. `openEdit(commitment: Commitment, landing?: CommitmentEditLanding, settledDueDates?: readonly string[])` keeps its first two arguments in order. Its third argument is optional, defaults to `NO_SETTLED_DUE_DATES`, and is stored in the field, so every existing caller compiles. The host hook selects the field and returns it in `state`. The index passes it to `EditCommitmentSession` as the required prop `settledDueDates: readonly string[]`, which passes it to `CommitmentFormBody`. `goToEdit` passes `historyRows.filter((p) => !isUnpaidPayment(p)).map((p) => p.due_date)`, with `isUnpaidPayment` from `domain/payment_state.ts:42`. These are the paid and skipped rows the save keeps as `existing` (`commitment.repository.ts:157-164`). `historyRows` joins the callback's deps.
- Test: `first`, in three files:
  - `__tests__/screens/commitments/commitment_form_host.state.test.ts`: `openEdit(rent, landing, ['2026-09-20'])` holds them. `openEdit(rent)`, `openAdd` and `completeClose` hold `[]`.
  - `__tests__/screens/commitments/commitment_form_host.hook.test.ts`: `state.editingSettledDueDates` mirrors the host.
  - `__tests__/screens/commitments_detail.hook.test.ts`: with one paid, one skipped and one unpaid row, `goToEdit` leaves the host holding the paid and skipped due dates only.

  The index-to-session-to-body pass-through is `none`: render-only wiring with no existing `.tsx` suite, which the emulator state `Repeats and Ends sheets, edit with settled rows` proves.

### 6. The features file reads the previews and gains two states
- File: `.claude/skills/emulator-verify/features/add_commitment.md` (States rows `:22-28`, `:53-54`, the intro line `:3`)
- Change: the intro names `ends-after-line` and `ends-date-line`. The add sheet's Starts is today, T. Rows are rewritten as follows:
  - `Repeats sheet, presets`: the track reads `Every month · next <T plus one month>`, then `Every week · next <T plus 7 days>`. Drop the "next day is MA-277's" clause. F1's `Sun 1 Nov` loses to Acceptance.
  - `Repeats sheet, custom`: the line and track read `Every 2 months · next …`, `Every month · next …` and `Every 2 weeks · next …`. The seeded edit at 365 days reads `Every 365 days · next <first day after today>`.
  - `Repeats sheet and row, large font`: the force adds `$MQA scroll down --in 'id="commitment-form-scroll"' --until 'id="repeats-row"'` before the `mqa bounds` on `repeats-row`. At rest at 2.0 the row sits under the footer at 0 × 0, and the tap misses and closes the sheet. The proof's scroll clause becomes: after Custom, `repeats-sheet-status` and `repeats-custom-line` each show `Every 2 months · next <T plus two months>` whole, wrapped to two lines, never cut. `sheet-footer` grows upward. `repeats-custom-line` and the `repeats-custom` block end above `sheet-footer`'s top, at rest and after the scroll.
  - `Ends sheet, after a number of payments, without the preview line` is renamed `Ends sheet, after a number of payments`. `ends-after-line` reads `Last payment <T plus 11 months, with year>`, and the track reads `After 12 payments · last …`. At the floor they read `Last payment <T>` and `After 1 payment · last <T>`. After Done the row reads `After 2 payments · last <T plus one month>`.
  - `Ends sheet, on a date, without the preview line` is renamed `Ends sheet, on a date`. `ends-date-line` reads `<n> payments through Thu 31 Dec <Starts year>`, n being the monthly days from T through it, and the track reads `On … · <n> payments`. After Done the row reads `On <day> · <n> payments`. F4's 14 loses to Rule 2.
  - `Ends sheet and row, large font` adds the line, whole, inside its block. The force ends with `$MQA tap 'id="ends-option-after_count"'`, whose draft keeps 12 (`ends_sheet.hook.ts:25`), then `$MQA tap 'label="Done"'`, `$MQA scroll down --in 'id="commitment-form-scroll"' --until 'id="ends-row"'` and `mqa bounds` on `ends-row`. The proof adds: before Done, `ends-sheet-status` reads `After 12 payments · last <T plus 11 months, with year>` whole, never cut. After Done, `ends-row` reads that value whole, wrapped or not, never cut, and is at least 44 dp high.
  - `status track idle, Ends earlier than Starts` adds `ends-row` reading `On Wed 11 Nov 2026 · 0 payments`.
  - `Ends earlier than Starts on Save`: `ends-row` reads `On Wed 11 Nov 2026 · 0 payments` after the Save. The sheet after the Save reads `1 payment through Wed 18 Nov 2026`.

  New rows, `no frame, MA-280`:
  - `Repeats sheet, no due day after today`. Force: the add sheet (Reach it); `$MQA scroll down --in 'id="commitment-form-scroll"' --until 'id="ends-row"'`, `$MQA tap 'id="ends-row"'`, `$MQA tap 'id="ends-option-after_count"'`, `$MQA tap 'id="ends-stepper-decrease"'` eleven times, `$MQA tap 'label="Done"'`; then `$MQA tap 'id="repeats-row"'`; then `$MQA tap 'id="repeats-option-custom"'`. Proof: on open, `repeats-sheet-status` reads `Every month` with no `· next`. After Custom, `repeats-custom-line` and `repeats-sheet-status` read `Every 2 months` with no `· next`. One shot open, one after Custom. `repeats-row` is no proof: it reads the label alone in every state (`commitment_form_body.tsx:220`).
  - `Repeats and Ends sheets, edit with settled rows`: a seed, README § Seeding and forcing states, of a `forever` monthly commitment that starts one month before today, with three rows. The start row is paid, today's row is unpaid, and the row one month after today is skipped. In its edit sheet, the Repeats track reads `Every month · next <T plus two months>`, never the skipped day. Ends After at 1 reads `Last payment <T plus one month>` and `After 1 payment · last <T plus one month>`, where add would read the start day.
- Test: `none`: a doc. The render lens runs it.

### 7. The decision record
- File: `docs/adr/2026-11-04-schedule-previews-share-the-save-selection.md`, new, in the shape of `docs/adr/2026-11-03-commitment-generation-window.md`
- Change: §1: every form preview, the Ends last day and count and the Repeats next day, comes from `computeDueDates` and `selectNewDueDates`, the save's own selection. §2: a preview reads the whole schedule with a bound of its own, never `generationWindowEnd`, and states the next-day bound and why it suffices. §3: on edit, the commitment's paid and skipped due dates are the `existing` set, as the edit save holds them. §4: today is `toLocalDateString`, and the Ends previews take no today. Applies to: steps 1-5's files.
- Test: `none`: a doc.

## Screens
- `.claude/skills/emulator-verify/features/add_commitment.md`: Repeats sheet, presets, with the proof step 6 rewrites
- `.claude/skills/emulator-verify/features/add_commitment.md`: Repeats sheet, custom, with the proof step 6 rewrites
- `.claude/skills/emulator-verify/features/add_commitment.md`: Repeats sheet, no due day after today, new, which step 6 adds
- `.claude/skills/emulator-verify/features/add_commitment.md`: Repeats sheet and row, large font, with the force and proof step 6 rewrites
- `.claude/skills/emulator-verify/features/add_commitment.md`: Ends sheet, after a number of payments, without the preview line, which step 6 renames `Ends sheet, after a number of payments` and gives the line
- `.claude/skills/emulator-verify/features/add_commitment.md`: Ends sheet, on a date, without the preview line, which step 6 renames `Ends sheet, on a date` and gives the line
- `.claude/skills/emulator-verify/features/add_commitment.md`: Ends sheet and row, large font, with the force and proof step 6 rewrites
- `.claude/skills/emulator-verify/features/add_commitment.md`: status track idle, Ends earlier than Starts
- `.claude/skills/emulator-verify/features/add_commitment.md`: Ends earlier than Starts on Save
- `.claude/skills/emulator-verify/features/add_commitment.md`: Repeats and Ends sheets, edit with settled rows, new, which step 6 adds
- The invariant pass of #802 Rule 4 runs on `add_commitment.md`.

## Decision record
- `docs/adr/2026-11-04-schedule-previews-share-the-save-selection.md`: form previews read the whole schedule through the save's own selection of new due dates, with the settled rows as `existing` on edit. Step 7 adds the file.

## Non-goals
- The Ends sheet's option rows, stepper, Date row, Done, close, the Save ring and the 44 dp targets (MA-277). The Repeats sheet's layout and the stepper (MA-276).
- The detail's Ends fact: `buildCommitmentEndsLabel` and `detail.helpers.ts:576` are unchanged.
- No change to `computeDueDates`, `generationWindowEnd`, `CommitmentRepository.update` or `runHousekeeping`, or any SQL. No migration.
- No change to `DateRow` or `DatePickerSheet`, so the transaction sheet and the pay sheet need no check.
- The form's status track footnotes (`useCommitmentFirstPaymentFootnote`, `commitmentsEditScheduleFootnote`) are unchanged. No string is deleted.
- No new `.tsx` test, and no case in a `.tsx` suite.

## Untested inputs
- A local today that differs from the UTC slice: the Jest config sets no `TZ`, so no case fails under UTC. Step 4 reads `toLocalDateString` as the first-payment footnote does.
- An On a date day decades out on a daily cadence, one generated date per day on each draft change. Step 3's memo bounds it, and no test times it.
- The row value of an `AfterCount` count below 1 that a legacy edit holds: step 3 falls back to `buildCommitmentEndsLabel`, and no case covers 0.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- Step 1 touches the loop that writes every payment row, on the edit save and on housekeeping (`commitment.repository.ts:164`, `:204`, `:316-323`). The existing `planMissingCommitmentPayments` suite is the guard and must pass untouched.
- `add_commitment.md · Repeats sheet and row, large font`: probed at 2.0 with T Wed 4 Nov 2026, after Custom the track `Every 2 months · next Mon 4 Jan 2027` wraps to two lines (60.19 dp). `StatusTrack` grows the footer upward by 30.1 dp (`status_track.tsx:24`), its top at 582.9. The wrapped `repeats-custom-line` ends at 557.0, 25.9 dp above it, and the `repeats-custom` block at 571.5, 11.4 dp above it, with no scroll.
- `add_commitment.md · Ends sheet and row, large font`: `FormPickerRow` sets no `numberOfLines`, so `After 12 payments · last Mon 20 Sep 2027` may wrap and heighten `ends-row` at 2.0.
- `add_commitment.md · Repeats and Ends sheets, edit with settled rows`: needs a seeded DB with a skipped future row. Its figures are relative to the emulator's today.
- `goToEdit` reads `historyRows`, the detail's rows overlaid with the store. A row settled after the detail's last read is missing from the edit previews until the detail re-reads.
- `openEdit`'s third argument sits after an optional landing. A caller with settled dates and no landing passes `undefined` second.
- not probed: add_commitment.md · Ends sheet, after a number of payments, without the preview line
- not probed: add_commitment.md · Ends sheet, on a date, without the preview line
- not probed: add_commitment.md · Ends sheet and row, large font
- not probed: add_commitment.md · Ends earlier than Starts on Save
- not probed: add_commitment.md · Repeats and Ends sheets, edit with settled rows

## Self-assessment
The step I am least sure about is step 2's next-day bound. It rests on an argument that a prefix of the schedule holds the first unpaid date after today: the selection is greedy in date order, so the prefix's selection is a prefix of the whole selection. The After N remaining cap applied over a truncated list could break that argument. The `After 2 with both settled` and the daily-`Forever` cases are the ones that test it. Step 6's emulator figures are relative to today, so the render lens must compute them per run.
