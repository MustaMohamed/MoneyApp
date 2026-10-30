# MA-265 — Detail Payments card
base: 4b28fa70 · verify: emulator · flags: money path, user copy · expected diff: ~265 lines

## Steps
### 1. A pure builder returns the Payments rows: the cut, the ended rule and each row's model
- File: `src/modules/commitments/screens/commitments/detail/detail.helpers.ts` (`resolveCycleDayLine`, `:236`, stays private and gains this caller; `buildCommitmentCycleCard`, `:274`, is the amount pattern)
- Change: Export `buildCommitmentPaymentRows(input: CommitmentPaymentRowsInput): CommitmentPaymentRowModel[]`, one object argument, returning `[]` with no row, never `null`.
  - `CommitmentPaymentRowsInput`, every field required, none `null`: `payments: readonly CommitmentPayment[]`, `commitment: Commitment`, `cycle: CommitmentPayment | undefined` (the shown cycle), `cycleCardShown: boolean`, `lifecycle: CommitmentLifecycle`, `today: string` (local `YYYY-MM-DD`).
  - `CommitmentPaymentRowModel`, every field required, none `null` or `undefined`: `id`, `dotColor`, `day`, `line`, `amountText`, `amountCode`, `amountAccessibilityLabel` (strings), `lineTone: DayIndicatorTone`, `dimmed: boolean`.
  - Cut, in this order: leave out `cycle.id` when `cycleCardShown`, and on `lifecycle === 'ended'` only while `isUnpaidPayment(cycle)`; keep `due_date < today`; sort by `due_date` descending; take `PAYMENTS_CARD_ROW_LIMIT`, 3.
  - Row: `dotColor` is `STATUS_COLORS[resolvePaymentState(row, today)]`; `day` is `formatShortWeekdayDate(row.due_date, today)`; `line` and `lineTone` come from `resolveCycleDayLine(resolvePaymentDayDistance(row, today))`; `code` is `CURRENCY_CONFIG[row.currency].code`; the amount fields come from `composeCommitmentAmount(resolveDisplayAmount(row, commitment), row.currency, code)`; `dimmed` is `isPaidPayment(row)`.
- Test: `first` · `__tests__/screens/commitments_detail.helpers.test.ts`, new `describe('buildCommitmentPaymentRows (MA-265)')`.
  - Cut: five rows before today with the shown cycle newest lists the next three, newest first; a shown cycle in the middle still yields three; rows due today and later are absent; `cycleCardShown: false` leaves no row out on a `stopped` and an `ended` commitment; `ended` with an unpaid shown cycle leaves it out; `ended` with a paid and with a skipped shown cycle lists it; the same row due today stays absent; `cycle: undefined` lists the rest; no rows returns `[]`.
  - Dates: today `2028-03-01` lists due `2028-02-29` as `Tue 29 Feb`, `1 day late`; today `2028-02-29` omits it; today `2026-09-30`, due `2026-08-31` reads `Mon 31 Aug`, `30 days late`; a row from another year reads `Wed 1 Oct 2025`.
  - Ended dates, an `it.each` on `lifecycle: 'ended'`, `cycleCardShown: true`, a paid shown cycle: due `2028-02-29` is absent at today `2028-02-29` and listed at `2028-03-01`; due `2026-08-31` is absent at today `2026-08-31` and listed at `2026-09-01`.
  - Model: an overdue row reads `STATUS_COLORS[Overdue]`, tone `danger`, `dimmed: false`; a paid row reads `paid · 2 days late`, tone `success`, the amount paid, `dimmed: true`; a skipped row reads `skipped · on the day`, tone `caption`, `dimmed: false`; a variable unpaid row reads `~ 600`, with no estimate `~`, a variable skipped row `~ 600`, a variable paid row no `~`; a USD row carries `USD` and label `<amount> USD`.

### 2. The detail hook publishes the rows
- File: `src/modules/commitments/screens/commitments/detail/detail.hook.ts` (`useCommitmentDetail`, after `cycleCard`, `:225`; `NO_FACTS`, `:44`)
- Change: Add `state.paymentRows: readonly CommitmentPaymentRowModel[]`, required, never `null` or `undefined`. It is a memo of `buildCommitmentPaymentRows({ payments: historyRows, commitment, cycle: payment, cycleCardShown: cycleCard !== undefined, lifecycle, today })`, and a frozen `NO_PAYMENT_ROWS` beside `NO_FACTS` while `commitment`, `today` or `lifecycle` is `undefined`. `state.allPayments` stays, since `commitments_detail.hook.test.ts` reads it.
- Test: `first` · `__tests__/screens/commitments_detail.hook.test.ts`, in `useCommitmentDetail lifecycle (MA-266)`: an ended commitment opened at an overdue cycle reads `paymentRows` empty, then lists `payment.id` once the row is paid and once it is skipped (the `it.each` at `:1201`); a stopped commitment at a paid cycle lists the shown row; an active commitment at an unpaid cycle leaves it out.

### 3. The detail draws the Payments card
- File: `src/constants/strings.ts` (`:1143`), `src/modules/commitments/screens/commitments/detail/components/payment_history.tsx`, `src/modules/commitments/screens/commitments/detail/components/payment_row.tsx`, `src/modules/commitments/screens/commitments/detail/index.tsx` (`:95-99`)
- Change:
  - `commitmentsDetailPaymentHistory` reads `Payments`; the key stays.
  - `PaymentHistory` props: `{ rows: readonly CommitmentPaymentRowModel[] }`, required. Empty `rows` return `null`, header included. Otherwise an `Animated.View entering={historyEntering}` with no margin classes holds `SectionHeader` over `DetailRowsCard testID="commitment-detail-payments"`, the `account_activity_card.tsx:46-58` pair, and `rows.map` replaces the `FlatList`.
  - `PaymentRow` props: `{ row: CommitmentPaymentRowModel; showDivider: boolean }`, both required. Frame C1 `.prow`: padding `Spacing.xs + Spacing.xxxs` by `Spacing.md`, min height 48, an 8 dp `dotColor` dot, `Spacing.xs` to the next box.
  - Beside the dot, a `flex: 1` box with `flexDirection: 'row'`, `flexWrap: 'wrap'`, `alignItems: 'center'` and a `Spacing.xs + Spacing.xxxs` column gap holds the day (`Type.meta`, `font-inter`, `flexGrow: 1`) and the line (`Type.micro`, `DAY_INDICATOR_CLASS[row.lineTone]`). The line falls under the day where both do not fit, and neither takes `numberOfLines`.
  - The amount group sits `Spacing.xs + Spacing.xxxs`, 10 dp, after the wrap box (frame C1 `.prow` gap) and follows `current_cycle_card.tsx:165-190`: `accessible`, `accessibilityLabel={row.amountAccessibilityLabel}`, `resolveFitAmountTextProps(Type.meta, fontScale)` with `font-sora tabular-nums`, the code in `Type.micro` `font-inter text-content-secondary`.
  - Day and line take `allowFontScaling={false}` and `scaledTextStyle(size, fontScale)`. `dimmed` turns the day and the amount `text-foreground/60` (`.prow.paid`, `commitment_row.tsx:39-48`), else `text-foreground`. `showDivider` is `index < rows.length - 1`.
  - `index.tsx` passes `rows={state.paymentRows}`.
- Test: `first` · `__tests__/screens/commitments_detail.strings.test.ts`, new `describe('commitment detail Payments copy (MA-265)')`: `commitmentsDetailPaymentHistory` byte-exact `Payments`. The view takes no test of its own: the detail has no `.tsx` suite and `.claude/rules/tests.md` forbids a new one; steps 1 and 2 carry the logic and the emulator pass covers the pixels.

### 4. A resolver reads the cycle line from the due day and today
- File: `src/constants/strings.ts` (after `:1178`), `src/modules/commitments/screens/commitments/detail/components/pay_sheet.helpers.ts`
- Change:
  - Add `commitmentsPayCycleLead: (day: string) => `${day} · `` and `commitmentsPayCycleLine: (day: string, distance: string) => `${day} · ${distance}``.
  - Export `resolvePayCycleLine(dueDate: string, today: string): PayCycleLine`, in that order, both required and non-null, `today` the local `YYYY-MM-DD`; the return is never `null`.
  - `PayCycleLine extends CommitmentStatusTag`, adding `lead: string`, `distance: string`, `distanceTone: DayIndicatorTone`, `line: string`, every field required and non-null.
  - It reads the unpaid view `{ due_date: dueDate, paid_date: null, skipped_date: null }`: the tag from `resolveCommitmentStatusTag(resolvePaymentState(view, today))`, the distance from `resolveDayIndicator(resolvePaymentDayDistance(view, today))`, the day from `formatWeekdayDate(dueDate)`. The sheet opens only on an unpaid cycle (`detail.helpers.ts:258`), so the type cannot read `Paid`.
- Test: `first` · `__tests__/screens/commitments/pay_sheet.helpers.test.ts`, new `describe('resolvePayCycleLine (MA-265)')`: due `2026-10-01`, today `2026-10-20` reads `Overdue`, `alert-circle`, `Thu 1 Oct 2026 · `, `19 days late`, `danger`, `Thu 1 Oct 2026 · 19 days late`; due and today `2028-02-29` reads `Due`, `Tue 29 Feb 2028 · `, `Due today`, `gold`; due `2026-10-30`, today `2026-10-20` reads `Upcoming`, `Fri 30 Oct 2026 · `, `in 10 days`, `caption`; due `2028-03-01`, today `2028-02-29` reads `in 1 day`; due `2028-02-29`, today `2028-03-01` reads `1 day late`; due `2026-01-31`, today `2026-03-01` reads `29 days late`; `lead + distance` equals `line` in every case. `__tests__/screens/commitments_detail.strings.test.ts`, in step 3's describe: `commitmentsPayCycleLead('Thu 1 Oct 2026')` reads `Thu 1 Oct 2026 · ` and `commitmentsPayCycleLine('Thu 1 Oct 2026', '19 days late')` reads `Thu 1 Oct 2026 · 19 days late`, byte-exact.

### 5. The pay sheet draws the cycle line in the type tabs' row
- File: `src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts` (`usePaySheet`, returned `state`), `src/modules/commitments/screens/commitments/detail/components/pay_sheet.tsx` (first child of `BottomSheetScrollView`, `:94`)
- Change:
  - `state.cycleLine: PayCycleLine | undefined`, never `null`, `undefined` while `payment` or `today` is `undefined`. It is a memo of `resolvePayCycleLine(payment.due_date, today)` keyed on the due date and `today`, the sheet's `openedOn`, so a paid `payment` prop changes nothing until the next open.
  - `pay_sheet.tsx`, inside the branch that holds the scroll view, so the no-accounts state draws none: `FormTypeTabsRow` (`form_type_tabs.tsx:70`) holds a row with `flexDirection: 'row'`, `alignItems: 'center'`, `gap: Spacing.xs` (frame D1 `.cyl`).
  - The row holds `StatusBadge size="tagMd" fontScale={fontScale}` from the tag fields, as `current_cycle_card.tsx:125-132`, then `Text testID="pay-sheet-cycle-line"` with `flex: 1`, no `numberOfLines`, `accessibilityLabel={line}`, class `DAY_INDICATOR_CLASS.caption`, holding `lead` and a nested `Text` of `distance` in `DAY_INDICATOR_CLASS[distanceTone]`.
  - Both `Text` nodes take `allowFontScaling={false}` and `scaledTextStyle(Type.caption, fontScale)`: without them the nested node keeps the wrapper's 15 px default (`text.tsx`; `ready_hero_card.tsx:148-150` is the nested shape).
- Test: `first` · `__tests__/screens/commitments_pay_sheet.hook.test.ts`: `usePaySheet(OWNER, egpCommitment, duePayment, TODAY)` reads `cycleLine.lead` `Fri 1 May 2026 · ` and `distance` `172 days late`; `undefined` with no payment or no today; a rerender with `paid_date` set keeps `Overdue` and the distance. `__tests__/screens/commitments/pay_sheet_rate_error.test.tsx`, under the Render-suite policy, since the no-accounts branch is the render-only wiring an Acceptance line names: `PaySheet with no active accounts` asserts `queryByTestId('pay-sheet-cycle-line')` is null, and a new case with `payAccount` reads `Fri 1 May 2026 · 172 days late`.

### 6. The features file and its index name what ships
- File: `.claude/skills/emulator-verify/features/commitment_detail.md`, `.claude/skills/emulator-verify/features/README.md` (`:34`)
- Change:
  - `:3`: the `MA-265` sentence names `payment_history.tsx`, `payment_row.tsx`, `id="commitment-detail-payments"`, `buildCommitmentPaymentRows` and `pay-sheet-cycle-line`. `:26` and `:57`: `payment history` becomes `Payments card`, and both Forces add a row due before today beside the shown cycle, since a commitment whose only row is the shown cycle draws no card. `:57`'s proof reads `mt-4` clear of the `PAYMENTS` header, the node now under the note card.
  - New rows. `payments, large font` (C1 at 1.0, a shown cycle plus four earlier rows, one unpaid, one paid, one skipped; 1.0 and 2.0): `PAYMENTS` over three rows newest first, the shown cycle absent, each with dot, day, line, amount and code, the paid row dim, each text whole at 2.0, no text box crossing another, 16 dp corners whole. `no earlier payments` (C1, a commitment whose one row is the shown cycle, its `start_date` on that row's due day, since launch housekeeping plans missing dates from `start_date`, `commitment_housekeeping.helpers.ts:33-34`): `PAYMENTS` and `id="commitment-detail-payments"` read `no match`. `payments, USD commitment` (no frame, Decision 2026-10-30, a variable USD seed with paid, skipped and unpaid earlier rows): each amount at 2 decimals beside `USD`, `~` on the unpaid and the skipped, none on the paid. `pay sheet, cycle due today` (D1 for the row, a seed due today): the `Due` tag and `pay-sheet-cycle-line` reading `<Ddd d Mon yyyy> · Due today`, the distance gold.
  - Rewritten proofs. `stopped commitment`: its paid row due before today and listed. `ended commitment, unpaid cycle, after Pay`: the settled row listed under the restated card after Pay and after Skip. `pay sheet, fixed EGP`: the Force pins a cycle due before today; the `Overdue` tag and `pay-sheet-cycle-line` with the due day in the caption tone and `<n> days late` in danger (D1). `pay sheet, variable, amount empty`: the Force pins a cycle due after today; the `Upcoming` tag and the line with `in <n> days` in the caption tone (D2). `pay sheet, USD commitment, rate row`: the Force pins a cycle due before today; the `Overdue` tag and the line as `pay sheet, fixed EGP` reads it (D3). `pay sheet, large font`: tag, due day and distance whole with no `…`, the line wrapped beside the tag. `pay sheet, no account chosen`: the ring's box figure re-read at head. `pay sheet, no accounts`: `pay-sheet-cycle-line` reads `no match`.
  - `README.md:34`: `the hero, the This cycle card and the Payments card`.
- Test: `none` · a recipe file has no Jest suite; the render lens runs it.

### 7. The derived-state decision records both new reads
- File: `docs/adr/2026-10-21-derived-payment-state.md`
- Change: Append `**Extended 2026-10-30 (#875, MA-265).**`: `buildCommitmentPaymentRows` derives each Payments row's status, line and amount from the row and today on the This cycle card's resolvers, and `resolvePayCycleLine` derives the pay sheet's tag and distance from the due day and the sheet's `openedOn`, which a Pay does not move.
- Test: `none` · a decision record.

## Screens
- `emulator-verify/features/commitment_detail.md`: payments, large font (new, step 6)
- `emulator-verify/features/commitment_detail.md`: no earlier payments (new, step 6)
- `emulator-verify/features/commitment_detail.md`: payments, USD commitment (new, step 6)
- `emulator-verify/features/commitment_detail.md`: ended commitment, unpaid cycle, after Pay
- `emulator-verify/features/commitment_detail.md`: stopped commitment
- `emulator-verify/features/commitment_detail.md`: pay sheet, fixed EGP
- `emulator-verify/features/commitment_detail.md`: pay sheet, variable, amount empty
- `emulator-verify/features/commitment_detail.md`: pay sheet, USD commitment, rate row
- `emulator-verify/features/commitment_detail.md`: pay sheet, cycle due today (new, step 6)
- `emulator-verify/features/commitment_detail.md`: pay sheet, large font
- `emulator-verify/features/commitment_detail.md`: pay sheet, no account chosen
- `emulator-verify/features/commitment_detail.md`: pay sheet, no accounts

## Decision record
- `docs/adr/2026-10-21-derived-payment-state.md`: Payments rows and the pay sheet's cycle line derive their state from today and are never stored; step 7 adds it as a dated extension, as MA-262 and MA-266 did.

## Non-goals
- See all and the `SectionHeader` `action`, MA-213.
- A press on a Payments row; frames C1 to C5 draw none, so this ticket adds no href.
- Payments rows in `detail_skeleton.tsx`.
- Any change to `DetailRowsCard`, `SectionHeader`, `FormTypeTabsRow` or `StatusBadge`.
- Removing `state.allPayments`.
- The This cycle card's own day line, and the pay sheet below the strip caption.

## Untested inputs
- Payments row layout at font scale 2.0, step 3: emulator only.
- Cycle line layout at font scale 2.0, step 5: emulator only.
- A detail left open across midnight, step 2: the cut reads `loadedOn`, which moves only on a re-read.
- A pay sheet left open across midnight, step 5: the line keeps `openedOn`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-213, MA-215 or MA-272 merging first moves the lines steps 3 and 5 cite; the second to merge rebases.
- `commitment_detail.md` · payments, large font: the probe read the wrap row. At 1.0 rows read 48.00 high with the line on the day's row at the right of the box. At 2.0 with `8,000 EGP` the line drops under the day, row 87.24, and `skipped · 2 days late` takes two lines in a 188.2 box, row 116.57. At 2.0 with `1,250,000 EGP`, a seed past the plan's row, the box narrows to 125.3, `Thu 20 Aug` and `Mon 20 Jul` each take two lines, `skipped · 12 days early` three, row 183.62. Invariants 3 and 4 hold at both scales: every text whole, no `…`, no box crossing another.
- `commitment_detail.md` · payments, large font: `SectionHeader` over `DetailRowsCard` gaps 24 dp where frame C1 draws 8; the account detail ships the same 24 (`account_detail_touch.geometry.ts:42`).
- `commitment_detail.md` · pay sheet, fixed EGP: the new row pushes the body down inside the 75% sheet (`sheet.helpers.ts:46`), so `note-row` may need a scroll at 1.0.
- `commitment_detail.md` · pay sheet, no account chosen: the ring's box moves down by the row's height, so step 6 takes the figure from the render at head.
- not probed: `commitment_detail.md` · payments, USD commitment
- not probed: `commitment_detail.md` · ended commitment, unpaid cycle, after Pay
- not probed: `commitment_detail.md` · stopped commitment
- not probed: `commitment_detail.md` · pay sheet, fixed EGP
- not probed: `commitment_detail.md` · pay sheet, variable, amount empty
- not probed: `commitment_detail.md` · pay sheet, USD commitment, rate row
- not probed: `commitment_detail.md` · pay sheet, cycle due today
- not probed: `commitment_detail.md` · pay sheet, large font
- not probed: `commitment_detail.md` · pay sheet, no account chosen

## Self-assessment
Step 5 is the step I am least sure of: the `StatusBadge` beside a `flex: 1` nested `Text` at font scale 2.0 has no device read. Step 3's wrap row, the earlier doubt, held on the probe, and its reads sit under Risks.
