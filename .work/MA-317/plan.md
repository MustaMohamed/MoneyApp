# MA-317 — Plan sheet field faults
base: 95bec52a9ae71ec8fba1e6df95f03c72599ecf07 · verify: emulator · flags: money path · expected diff: ~130 lines

## Steps
### 1. Pure helpers decide each submit-only fault, the fault count and the footer line
- File: `src/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.helpers.ts` (beside `resolvePlanDailyLine`, `:29`)
- Change: add `export interface SpendingPlanFieldFaults { name: string | undefined; total: string | undefined; endDate: string | undefined; categories: string | undefined; allocations: Readonly<Record<string, string | undefined>> }`. Every key is required and every value can be `undefined`; none is `null`. This is the shape of `SetBudgetFaults` (`components/set_budget_sheet.helpers.ts:3-7`). Add three functions:
  - `resolvePlanScheduleFaults(startDate: string, endDate: string, selectedCategoryCount: number): { endDate: string | undefined; categories: string | undefined }`. It is ungated. `endDate` is `Strings.budgetPlanDateInvalid` when `endDate < startDate`, using the ISO string comparison of `budget.schema.ts:84`. `categories` is `Strings.budgetPlanCategoryRequired` when the count is 0.
  - `countSpendingPlanFaults(faults: SpendingPlanFieldFaults): number`. It counts the defined scalar keys plus the defined values in `allocations`.
  - `resolvePlanFooterLine(faults: SpendingPlanFieldFaults, submitError: string | undefined, overLine: string | undefined): string | undefined`. It returns `Strings.fixFieldsMarkedAbove(count)` while the count is above 0. Otherwise it returns `submitError ?? overLine`.
- Test: `first` · `__tests__/screens/budget/spending_plan_sheet_helpers.test.ts`. Cases:
  - Schedule faults: an end one day before the start faults; the same day is clear; month end `2026-01-31` → `2026-02-01` is clear; leap day `2028-02-29` → `2028-02-28` faults; zero categories faults and one is clear.
  - The count with one scalar and two allocation faults is 3, and an `undefined` allocation value is not counted.
  - The footer reads `fixFieldsMarkedAbove(1)` over a standing `submitError` and over line; with no faults it reads `submitError`, then `overLine`, then `undefined`.

### 2. The hook marks every field at a refused Save and drops the blanket footer messages
- File: `src/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.state.ts`, `src/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.hook.ts` (`useSpendingPlanSheet`, submit `:184-256`, return `:292-317`)
- Change, state: rename `allocationSubmitAttempted` to `submitAttempted` and `setAllocationSubmitAttempted` to `setSubmitAttempted`, since the flag now gates every submit-only fault. The setter still clears `lastTypedAllocationId`. The only references are in these two files.
- Change, hook, reading the form: take `formState` from `useZodForm` and read `formState.errors` during render, as `set_budget_sheet.hook.ts:129-131` does. RHF re-validates a field on change once it has been submitted, and `holdStillTypingDecimal` clears a held total, so a fixed name or total clears at once and `48.` stays quiet.
- Change, hook, the faults object: build `SpendingPlanFieldFaults` in render.
  - `name` is `errors.nameText?.message` and `total` is `errors.totalText?.message`.
  - `endDate` and `categories` come from `resolvePlanScheduleFaults(startDate, endDate, selectedCategoryIds.length)`, shown only while `submitAttempted`.
  - `allocations` is the existing `allocationErrors`; its rule at `:125-134` stays.
- Change, hook, state keys: add `nameFault`, `totalFault`, `endDateFault` and `categoriesFault` (each `string | undefined`, required). Keep `allocationErrors`. Set `footerLine` to `resolvePlanFooterLine(faults, submitError, overLine)`; `overRingedCategoryId` is never counted.
- Change, hook, the valid callback: compute the ungated schedule faults. If any allocation fails or either schedule fault stands, call `setSubmitAttempted(true)` and `setSubmitError(undefined)`, then return before the `isOver` return at `:196`. This replaces the `budgetPlanAllocationInvalid` write at `:192`.
- Change, hook, the invalid callback (`:249-255`): call `setSubmitAttempted(true)` and `setSubmitError(undefined)`, with no field message. The `SpendingPlanValidationError` path at `:240-244` stays, so the overlap copy still reaches the footer.
- Test: `first` · `__tests__/screens/budget/spending_plan_sheet_hook.test.ts`.
  - The `useZodForm` mock gains `formState: { errors: mockFormErrors }`. Its `handleSubmit` copies `mockInvalidErrors` into `mockFormErrors` before `onInvalid`, as RHF does, and `beforeEach` clears it. Rename every `allocationSubmitAttempted` read; there are none in tests today.
  - Rewrite the cases at `:174` and `:189`: RHF refusing the name reads `nameFault` and `fixFieldsMarkedAbove(1)`; refusing both reads both faults and `fixFieldsMarkedAbove(2)`.
  - Rewrite the case at `:846`: a stale save error gives way to the count, never `budgetPlanAllocationInvalid`.
  - New: an end before the start refuses with `endDateFault` and a count of 1, and `setSpendingPlan` is not called; `setEndDate` past the start clears the fault and the footer.
  - New: the only category toggled off refuses with `categoriesFault`; toggled back on, it clears.
  - New: a `0.005` limit refuses with the row's `budgetPlanAllocationBelowMin` and a count of 1.
  - New: before any Save, an end before the start shows no fault.
  - New: limits over plus a refused name count 1 and hide the over line; once the name error clears, the footer reads the over line.
  - New: `setSpendingPlan` rejecting with `new SpendingPlanValidationError(Strings.budgetPlanOverlapError('Food', 'Trip'))` puts that message in `footerLine` and leaves `isOpen` true.
- Test, a second file: `first` · new logic-only `__tests__/screens/budget/spending_plan_sheet_faults_hook.test.ts`.
  - It keeps the real `useZodForm` and the real `holdStillTypingDecimal`, as `__tests__/screens/budget/set_budget_sheet.hook.test.ts:590-610` does. It mocks only `@/components/ui/sheet` and a `useBudgetStore` `setSpendingPlan` spy.
  - It types through the hook's returned `setValue`, with `{ shouldValidate: true }` standing in for `Controller`'s re-validation after a submit. The total goes through `holdStillTypingDecimal({ setValue, clearErrors }, 'totalText', text, PLAN_TOTAL_REFUSES_ZERO)`, as `SpendingPlanTotalHero` calls it.
  - Case: with the total `500`, a blank name refused at Save reads `nameFault` and `fixFieldsMarkedAbove(1)`. Typing `Trip` clears both, and `setSpendingPlan` was not called at the refusal.
  - Case: after a refused Save, the total typed `48.` reads no `totalFault`.
  - Case: after a refused Save, the total typed `0.001` reads `Strings.budgetPlanAmountInvalid` before the next Save.

### 3. DateRow passes a fault hint to its row
- File: `src/components/ui/date_row.tsx` (`Props`, `:14-26`; `FormPickerRow`, `:47-58`)
- Change: add `accessibilityHint?: string` (optional, `undefined` when absent) and pass it to `FormPickerRow`'s `accessibilityHint` (`form_picker_row.tsx:17`). The other four consumers pass nothing and are unchanged.
- Test: `none` · a pass-through prop with no render suite for `DateRow`, and the rules forbid a new `.tsx` file; the `fields marked` screen state reads the ring.

### 4. The sheet rings Name, Ends and Categories and writes the total's message under the hero
- File: `src/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_sheet_fields.tsx` (`SpendingPlanTotalHero`, `SpendingPlanFactCard`), `src/modules/budget/screens/budget/spending_plan_sheet/index.tsx` (`:49-65`)
- Change, the hero: `SpendingPlanTotalHero` gains `totalFault: string | undefined` (required). `AmountHero`'s `invalid` becomes `totalFault !== undefined || totalCarriesOverRing`. A `ValidationSlot` follows the hero with `testID="spending-plan-total-error-slot"`, `liveTestID="spending-plan-total-error-live"` and `message={totalFault}`, as built in `set_budget_sheet.tsx:107-111`.
- Change, the fact card: `SpendingPlanFactCard` gains `nameFault`, `endDateFault` and `categoriesFault` (each `string | undefined`, required).
  - Name: its `FormFactCell` takes `fault={nameFault} ringTestID="spending-plan-name-ring"`, and `NoteFactRow` takes `accessibilityHint={nameFault}`.
  - Ends: `fault={endDateFault} ringTestID="spending-plan-ends-ring"`, and `DateRow` takes `accessibilityHint`.
  - Categories: `fault={categoriesFault} ringTestID="spending-plan-categories-ring"`, and `FormPickerRow` takes `accessibilityHint`.
  - This is the built ring and hint of `set_budget_sheet.tsx:115-153`.
- Change, `index.tsx`: pass `state.totalFault`, `state.nameFault`, `state.endDateFault` and `state.categoriesFault`. `SpendingPlanAllocations` is unchanged: its rows already ring and hint from `errors`.
- Test: `none` · the plan sheet has no render suite and the rules forbid a new `.tsx` test file; step 2 asserts the values and the Screens states assert the pixels.

### 5. budget.md carries the marked-field states and drops the footer message it read until MA-317
- File: `.claude/skills/emulator-verify/features/budget.md` (States, row `:42`; new rows after `:50`)
- Change, row `:42`: rewrite the Proof of `spending plan sheet, total and category amount half-typed`.
  - After the refused Save the footer reads `Fix the 3 fields marked above.`, `spending-plan-name-ring` stands and `Enter a plan amount` reads in `spending-plan-total-error-slot`.
  - In the hero, `48.`, `0` and `0.0` draw no line and no slot message, and the count reads 2. `0.001` puts `Amount must be at least 0.01` in the slot at once, and the count reads 3.
  - In the row pass, `48.` and `48.5` are silent, and `0.005` reads `0 or min 0.01` and counts.
  - Keep the Force and the one shot per pass.
- Change, new row `spending plan sheet, fields marked`, Frame `MixS20PlanValidation`, MA-317:
  - Force: start from `spending plan sheet, add plan at rest`.
    - Name: `$MQA tap 'id="note-row"'`, then `$MQA type '   '`, since `mqa fill` refuses a spaces-only text.
    - Starts: move it to the 5th through `id="spending-plan-starts-row"` and the native picker (`$MQA tap 'label="5"'`, `$MQA tap 'label="OK"'`), leaving Ends on the 1st.
    - Categories: `$MQA tap 'id="spending-plan-categories-row"'`, toggle the picked `cat_housing` off and close the picker.
    - Then `Save`.
  - Proof: `spending-plan-name-ring`, `spending-plan-ends-ring` and `spending-plan-categories-ring` present; `amount-hero-error-line` and `Enter a plan amount` in `spending-plan-total-error-slot`; `spending-plan-status` reading `Fix the 4 fields marked above.` with no daily line; `mqa db "select count(*) from spending_plans"` unchanged.
  - Proof, fixing in turn: Name `Trip`, total 5000, `cat_housing` picked, and Ends moved past Starts drop one ring and one count each. The count passes through `Fix the 1 field marked above.` and ends on the daily line.
  - Each ring sits inside the `ListCard`'s corners. One shot after the Save.
- Change, new row `spending plan sheet, fields marked, large font`, MA-317:
  - Force: the `Font scale` force at 2.0, run under `MQA_UI=uiautomator` after `mqa down`, since the agent-device engine fails after the scale change. Then the 2.0 reach of `spending plan sheet fields, large font`.
    - Keep `Housing` picked, add `Groceries`, and turn Allocate by category on.
    - Type `0.005` in `cat_housing` and `5.` in `cat_groceries`.
    - Name three spaces, by `tap 'id="note-row"'` and `type '   '`; the total empty; then `Save`.
  - Proof: in a crop at 2.0, `0 or min 0.01` and `Numbers only.` under their rows, `Enter a plan amount` in the slot and `Fix the 4 fields marked above.` in the footer all read whole. No text box overlaps another by more than 1 dp, and every ring sits inside the corners.
  - The Categories ring carries no visible text, so the 1.0 row covers it.
- Test: `none` · a verification recipe, not code.

### 6. The rounding ADR records that the sheet refuses field faults before its own safeParse
- File: `docs/adr/2026-08-22-money-rounding-layer.md` (Addendum A §2, `:378-391`)
- Change: append an `Amended 2026-11-23 (#971, MA-317).` paragraph of about five lines, in the shape MA-315 added to §4 (`481564d5`). It says:
  - The hook refuses an end before the start, no category, and a limit that is neither 0 nor at least 0.01 on their fields before its own `safeParse`.
  - The floor (`n === 0 || n >= MIN_MONEY_AMOUNT`) and the integer-cents over check are unchanged.
  - Both `safeParse` calls stay. The hook's now reaches the footer only with an issue no field carries (duplicate category).
- Test: `none` · a document.

## Screens
- `emulator-verify/features/budget.md` · spending plan sheet, fields marked: `new`, added by step 5.
- `emulator-verify/features/budget.md` · spending plan sheet, fields marked, large font: `new`, added by step 5.
- `emulator-verify/features/budget.md` · spending plan sheet, total and category amount half-typed: its Proof is rewritten by step 5.

## Decision record
- `docs/adr/2026-08-22-money-rounding-layer.md`: the plan sheet refuses date, category and limit faults on their fields before its `safeParse`, and the money floor and over check are unchanged. Step 6 amends the existing addendum, as MA-315 did, instead of adding a file.

## Non-goals
- The over ring, the limits summary and the over line (MA-315); the hero, the fact rows, the daily line, Save busy and the failed-save copy (MA-316).
- Plan detail (MA-304); the FAB on the Plans segment (MA-300).
- No change to `budget.schema.ts`. `budgetPlanAllocationInvalid` stays for its refine at `:77`, and `budgetPlanAllocationOver` stays.
- No change to `strings.ts`: every fault string and `fixFieldsMarkedAbove` exist.
- No change to `spending_plan_allocations.tsx`. The `Size:` line's `spending_plan_date_range.tsx` and `spending_plan_category_selector.tsx` no longer exist after MA-316.
- No scroll-to-first-fault and no focus move on a refused Save.

## Untested inputs
- A duplicate category id reaching the hook's `safeParse`: it still shows `issues[0]` in the footer; the picker cannot produce one. Step 2.
- The `accessibilityHint` on Name, Ends and Categories: no test, and read only where `mqa read` prints hints. Steps 3 and 4.
- `Controller`'s `field.onChange` re-validating a fixed name or total after a submit (RHF `reValidateMode`): the faults test stands in `setValue(..., { shouldValidate: true })`, and the `fields marked` row is its proof. Steps 2 and 4.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: `npm run ci:local`.

## Risks
- `budget.md · spending plan sheet, add plan at rest`: the always-present 16 dp `ValidationSlot` under the hero moves the fact card down. The row's bounds checks hold, but a shot compared with `MixD3PlanSheet` shows the gap.
- `budget.md · spending plan sheet, fields marked, large font`: the slot and the limit row's error are `numberOfLines={1}`. A hint that does not fit at 2.0 ellipsizes, against Invariant 3.
- `budget.md · spending plan sheet, fields marked`: frame S20 draws only the over state and holds no fault copy. The rings and hints follow the built `set-budget sheet, validation` (`MixS08AddValidation`).
- `budget.md · spending plan sheet, fields marked`: the probe saw the name ring at the card's top-left and the categories ring at its bottom-left drawn square over the rounded `ListCard`. The built rows draw the same way: `FormFactCell` puts `DangerRing` at radius 0 (`form_fact_cell.tsx:17`, `danger_ring.tsx:24`) in the first and last cells of `commitment_form_body.tsx:206` and `set_budget_sheet.tsx:115,143`, with no clip. Step 4 uses the ring as built, and the row's "inside the corners" proof can fail for every one of those sheets alike.
- `budget.md · spending plan sheet, total and category amount half-typed`: the probe did not run the limit-row pass (row `5.`, `48.`, `48.5`, `0.005`), so its footer counts of 2 and 3 are unchecked.
- not probed: budget.md · spending plan sheet, add plan at rest
- If the hook test mock's `formState` is a plain object, it misses RHF's proxy subscription. A render that reads `errors` before the Save must still see the post-Save errors after the re-render that `setSubmitAttempted` causes.

## Self-assessment
Step 2 is the step I am least sure of. It moves the name and total faults from the invalid callback onto RHF's `formState.errors` and relies on RHF's default `reValidateMode: 'onChange'`, through `Controller`'s `field.onChange` and the hold's `clearErrors`, to clear a fixed field at once. The faults test drives the real form through `setValue` with `shouldValidate`, not through `Controller`, so only the `fields marked` screen state sees the `Controller` path. If `useZodForm` or the hero bypasses `field.onChange` for a typed value, a fixed total keeps its fault until the next Save.
