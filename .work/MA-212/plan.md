# MA-212 — The commitments filter sheet takes the transactions filter sheet's shape
base: abcdd61cd37e7ea917fa39a1caa1561804c6373a · verify: emulator · flags: money path · expected diff: ~160 lines

## Steps

### 1. The amount helpers live in the transactions `utils/`, and one resolver gives both sheets their amount view
- File: `src/modules/transactions/utils/amount_range_filter.ts` (new); `src/modules/transactions/screens/transactions/filter/filter.helpers.ts` (`parseAmountInput` :54, `AmountRangeValidation` :60, `exceedsMoneyDecimals` :70, `validateAmountRange` :74, `formatAmountSummary` :113); `src/modules/transactions/screens/transactions/filter/filter.hook.ts` (:57-84); `src/modules/transactions/screens/transactions/filter/filter.store.ts` (:6); `__tests__/screens/transactions/filter/filter_helpers.test.ts` (import at :3-13)
- Change: move the five symbols to the new file, bodies and their two one-line comments unchanged, with no re-export left behind (ADR 2026-10-18 §3). `formatAmountSummary(bounds: AmountRangeBounds): string` replaces its `AdvancedFilters` parameter, because a `utils/` file may not import a screens type (`moneyapp/screens-import-boundary`). The destructure stays `amountCurrency: cur`: a name holding `urrency` or `code` in the second slot trips `HAND_JOIN` in `scripts/validate-money-formatting.js`. New exports:
  - `AmountRangeBounds { amountCurrency: Currency; amountMin?: number; amountMax?: number }`: no field is nullable, the two bounds are optional. Both `AdvancedFilters` and `CommitmentAdvancedFilters` satisfy it as they stand.
  - `resolveAmountRangeDraft(minText: string, maxText: string, bounds: AmountRangeBounds): AmountRangeDraft`, with `AmountRangeDraft { isValid: boolean; hasText: boolean; summary: string; minError: string | undefined; maxError: string | undefined; rangeError: string | undefined }`: every key is required and none is `null`. `isValid` and the three errors come from `validateAmountRange(minText, maxText)`. `hasText` is true when either text trims non-empty. `summary` is `formatAmountSummary(bounds)` while valid, else `Strings.filterSummaryAmountInvalid`.
  - In the transactions `filter.helpers.ts`, `formatAppliedFilterSummary` (:178) imports `formatAmountSummary` back. Drop the imports nothing reads any more: `CURRENCY_CONFIG`, `Strings`, `MONEY_ROUNDING_DECIMALS`, `formatAmount`, `parseDecimalText`.
  - The transactions `filter.hook.ts` calls `resolveAmountRangeDraft(amountMinText, amountMaxText, draft)` once. From it, it derives `canApply` (`isValid` and not equal), `canReset` (`draftCount > 0 || hasText`), `amountActive` (`hasText`), `amountSummary` and the three error fields, and the `applyDraft` guard reads `isValid`. Its returned state keeps every key and type it has today. The transactions `filter.store.ts` imports `parseAmountInput` from the new path.
- Test: `first` · `__tests__/transactions/amount_range_filter.test.ts` (new), cases for `resolveAmountRangeDraft`, each giving `bounds` as the store would parse them:
  - `('', '')` gives `{ isValid: true, hasText: false, summary: 'Any amount' }` with every error `undefined`; `(' ', '')` gives `hasText: false`.
  - EGP `('1,000', '5,000')` gives `'1,000–5,000 EGP'` (U+2013); `('', '5000')` gives `'Up to 5,000 EGP'`; `('1000', '')` gives `'From 1,000 EGP'`.
  - USD `('500', '')` gives `'From 500.00 USD'`; EGP `('99.6', '')` gives `'From 99.60 EGP'`.
  - `('1.234', '')` gives `isValid: false`, `hasText: true`, minError `'Enter a valid amount of 0 or more'` and summary `'Fix amount range'`; `('', '-1')` sets maxError.
  - `('500', '100')` sets rangeError `'Minimum must be less than or equal to maximum'` and summary `'Fix amount range'`.
  - The existing cases in `__tests__/screens/transactions/filter/filter_helpers.test.ts` (`amount range validation`, `formatAppliedFilterSummary`), `filter_hook.test.ts` and `filter_store.test.ts` pass with only the import path changed.
  - The malformed-text case at `__tests__/screens/transactions/filter/filter_hook.test.ts:81` gains two assertions and changes none: `amountSummary` is `Strings.filterSummaryAmountInvalid` and `amountActive` is `true`.

### 2. The Repeats section reads its new copy
- File: `src/constants/strings.ts` (`filterSectionRecurrence` :1014, `filterAllRecurrences` :1019); `src/modules/commitments/screens/commitments/filter/components/recurrence_accordion.tsx` (:39); `src/modules/commitments/screens/commitments/filter/filter.hook.ts` (:88); `__tests__/screens/transactions/transactions_shared_copy.test.ts` (:70-75)
- Change: rename the two keys to `filterSectionRepeats: 'Repeats'` and `filterAllRepeats: 'All'`. They have no reader beyond the accordion, the hook and the pin test (`git grep`). The two readers switch to the new keys.
- Test: `first` · `__tests__/screens/transactions/transactions_shared_copy.test.ts`: the `filterSectionRecurrence` row becomes `filterSectionRepeats`, read by `recurrence_accordion.tsx`, expected `'Repeats'`.

### 3. The commitments sheet validates, summarises and resets its amount the way the transactions sheet does
- File: `src/modules/commitments/screens/commitments/filter/filter.hook.ts`; `src/modules/commitments/screens/commitments/filter/filter.store.ts` (:6, :99-108); `src/modules/commitments/screens/commitments/filter/filter.helpers.ts` (`parseCommitmentAmountInput` :39-45, `formatCommitmentAmountSummary` :47-56); `scripts/validate-money-formatting.js` (`HAND_JOIN_ALLOWLIST` :54); `__tests__/screens/transactions/transactions_shared_copy.test.ts` (:88-105)
- Change:
  - The hook calls `resolveAmountRangeDraft(amountMinText, amountMaxText, draft)` and derives its fields as step 1 does for transactions: `canApply` (`isValid` and not `commitmentFiltersEqual`), `canReset` (`draftCount > 0 || hasText`), `amountActive` (`hasText`) and `amountSummary`.
  - Its state gains `canReset: boolean`, plus `amountMinError`, `amountMaxError` and `amountRangeError`, each `string | undefined`, as required keys.
  - `applyDraft` returns before `setAppliedFilters` and `close` while `!isValid`.
  - The store's two text setters parse through `parseAmountInput` from the new utils path.
  - The helpers file drops both functions and its `Strings` import.
  - The allowlist entry for this file goes, because it now covers no match and a stale entry fails `npm run lint`.
- Test: `first` · `__tests__/screens/commitments/filter/filter_hook.test.ts`, new cases:
  - With an empty draft, the summaries read `'All accounts'`, `'All categories'`, `'Any amount'`, `'All types'` and `'All'`, and `canReset` is false.
  - After `toggleAmountType(AmountType.Variable)`, with no amount text, `canReset` is true.
  - Min `'1000'` and Max `'5000'` give amountSummary `'1,000–5,000 EGP'`.
  - Min `'50abc'` keeps its text, sets `draft.amountMin` to `undefined` and shows the min error; `canApply` is false, `canReset` is true and `amountActive` is true.
  - Min `'1.234'` gives amountSummary `'Fix amount range'`.
  - Min `'500'` with Max `'100'` sets the range error and blocks Apply, and Max `'600'` clears it.
  - `applyDraft` on an invalid draft leaves `appliedFilters` unchanged and `useCommitmentFilterState` visible.
  - `applyDraft` on a valid draft publishes it and closes the sheet.
  - `resetDraft` with all five dimensions and amount text set restores `EMPTY_COMMITMENT_FILTERS` and empty texts.
  - In `__tests__/screens/transactions/transactions_shared_copy.test.ts`, the reader of the `filterSummaryAmountEmpty`, `filterSummaryAmountUpTo` and `filterSummaryAmountFrom` rows becomes `modules/transactions/utils/amount_range_filter.ts, read by both filter sheets`.

### 4. The footer is flat, Reset follows `canReset`, and the Amount section draws its errors
- File: `src/modules/commitments/screens/commitments/filter/index.tsx` (:35-52, :78-89); `src/modules/commitments/screens/commitments/filter/components/amount_accordion.tsx` (`Props` :7-18, :40-48)
- Change:
  - Both footer `Button`s take `flat`, as `src/modules/transactions/screens/transactions/filter/index.tsx:33-52` does, which gives `Radius.cta` and HeroUI `md` 48 (`.claude/rules/ui.md` § CTA).
  - Reset's `isDisabled` reads `!filter.state.canReset`.
  - `CommitmentAmountAccordion` takes optional `minError?: string`, `maxError?: string` and `rangeError?: string` and passes them to `AmountRangeFilterContent`. The sheet passes the three state fields to it.
- Test: `first` · `__tests__/screens/commitments/filter/filter_sheet.test.tsx` (Render-suite policy: the Acceptance line on the flat footer and Reset's enablement is render-only wiring):
  - The `Button` mock prints `flat`, as `__tests__/screens/transactions/filter/filter_sheet.test.tsx:58` does, and the footer asserts `secondary:flat:Reset` and `primary:flat:Apply (3)`.
  - With hook state `draftCount: 0` and `canReset: true`, Reset is enabled and its press calls `resetDraft`.
  - The amount accordion mock records its props: with hook state errors set, it receives them as `minError`, `maxError` and `rangeError`.

### 5. The decision records name the move and the allowlist change
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` (Applies to :6, §1 after :22); `docs/adr/2026-10-04-owned-owed-composers-shared-home.md` (after the allowlist list, :24-26)
- Change: 2026-10-18 gets `src/modules/transactions/utils/amount_range_filter.ts` in Applies to and an `**Extended 2026-10-21 (#786, MA-212).**` paragraph covering the following.
  - The four exports, their home under §1 (they hold copy and the formatter) and their two readers.
  - `AmountRangeBounds` in place of the screens type (§2).
  - `resolveAmountRangeDraft` and `AmountRangeDraft`: both sheets' hooks derive `canReset`, `amountActive`, `amountSummary` and the three errors from it, so a change to that logic lands once.
  - The bodies moved unchanged, and the transactions helpers import `formatAmountSummary` back (§3's split form).
  - The commitments sheet's `parseFloat` parse and hand-joined summary are gone, so its bounds follow `docs/adr/2026-09-27-transactions-search-tally.md`'s rule: past 2 dp refused, whole at `CURRENCY_CONFIG` decimals, fractional at `MONEY_ROUNDING_DECIMALS`.
  - 2026-10-04 gets a one-line `**Extended 2026-10-21 (#786).**` saying `HAND_JOIN_ALLOWLIST` holds two entries, since the commitments filter entry left with `formatCommitmentAmountSummary`.
- Test: `none` · documentation.

### 6. The features files carry the new sheet states
- File: `.claude/skills/emulator-verify/features/commitments.md` (§ States, row :42); `.claude/skills/emulator-verify/features/transactions.md` (:108)
- Change: append four rows to `commitments.md` § States, each on the model of a `transactions.md` row.
  - `filter sheet footer, flat` (B1, B2), from `transactions.md:18`: two accounts picked, Reset and Apply 48 ± 1, `Apply (1)` on one accent fill with no gradient. Each button's four corners are whole at `Radius.cta` and none is cut by `sheet-footer`'s edge. The gap between the two buttons reads 8 dp (`gap-2`), the built footer's, which stands over B1's 12 px under the ticket's last Rules line (probe).
  - `filter sheet footer, disabled` (B1), from `transactions.md:19`: an empty draft, both buttons `enabled=false` at 48 ± 1.
  - `filter sheet sections` (B1): an empty draft with no section expanded. The proof is the five headers in order, `Accounts` · `All accounts`, `Categories` · `All categories`, `Amount` · `Any amount`, `Amount type` · `All types`, `Repeats` · `All`, with no count pill and one shot.
  - `filter sheet, amount errors, large font` (no frame): the force and proof of `transactions.md:108` on `/commitments`, with its 2.0 figures, since both sheets draw the shared `AmountRangeFilterContent` (probe: the 2.0 figures match). The collapsed `Amount` summary reads `Fix amount range` on one line while either error shows, and the last card's bottom sits above `sheet-footer`'s top (probe: about 555 against 651.0).
  - Row :42 drops the clause "this sheet draws no amount error ... at their floors" for: the walk types no amount, so the two amount slots stay at their floors, and `filter sheet, amount errors, large font` reads them filled.
  - `transactions.md:108` names `src/modules/transactions/utils/amount_range_filter.ts` in place of `filter/filter.helpers.ts`.
- Test: `none` · recipe file.

## Screens
- `.claude/skills/emulator-verify/features/commitments.md` · filter sheet footer, flat · new, step 6 · risk: a clipped or rounded container
- `.claude/skills/emulator-verify/features/commitments.md` · filter sheet footer, disabled · new, step 6
- `.claude/skills/emulator-verify/features/commitments.md` · filter sheet footer, large font · risk: a font scale above 1.0
- `.claude/skills/emulator-verify/features/commitments.md` · filter sheet sections · new, step 6
- `.claude/skills/emulator-verify/features/commitments.md` · filter sheet, amount errors, large font · new, step 6 · risk: a font scale above 1.0
- `.claude/skills/emulator-verify/features/commitments.md` · filter sheet walk, large font · proof rewritten in step 6 · risk: a font scale above 1.0

## Decision record
- `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md`: the filter amount helpers and `resolveAmountRangeDraft` live in `src/modules/transactions/utils/amount_range_filter.ts`, and both filter sheets read them. Step 5 adds the dated extension.

## Non-goals
- The commitment dimension and See all (MA-213). The account chips, their reset on a sheet pick and the hero's one-account scope (MA-211).
- `filterTitle` stays `Filters`; B1's `Filter` yields to the built UI.
- No change to `commitmentMatchesAdvancedFilters`, `countActiveCommitmentFilters` or the badge. The badge already counts the five dimensions (`commitments.hook.ts:173-176`, `__tests__/screens/commitments.hook.test.ts:505`).
- No change to `Button`, `FilterAccordionShell`, `AmountRangeFilterContent` or `FilterOptionPillList`. No move of the commitments accordions into shared UI.
- No rename of the `'recurrence'` section id, `recurrencePresets`, `CommitmentRecurrenceAccordion` or the recurrence option labels.
- No re-export at the transactions `filter.helpers.ts`. No edit to the Applies-to lines of older ADRs (2026-08-26, 2026-09-27).

## Untested inputs
- `amount_accordion.tsx` passing the three errors into `AmountRangeFilterContent` (step 4): there is no suite for it and a new `.tsx` is barred, so the emulator state `filter sheet, amount errors, large font` covers it.
- The flat buttons' radius and 48 height (step 4): emulator states `filter sheet footer, flat` and `filter sheet footer, disabled`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `commitments.md · filter sheet footer, flat`: the `Radius.cta` corners clipped by the `sheet-footer` container.
- `commitments.md · filter sheet footer, large font`: the flat label at 2.0 is cut or loses its `…` inside the 48 button.
- `commitments.md · filter sheet, amount errors, large font`: the grown error slots at 2.0 push the last section under `sheet-footer`.
- `commitments.md · filter sheet walk, large font`: `Fix amount range` or a grouped two-bound summary is wider than the header's summary room.
- Step 1 rewrites the transactions hook's amount lines. If any transactions filter test needs an assertion changed, the transactions sheet's behaviour moved.
- `HAND_JOIN_ALLOWLIST` fails lint when the entry outlives `formatCommitmentAmountSummary`, or when either goes without the other, so step 3 removes both together.
- `not probed: commitments.md · filter sheet walk, large font`
- `REBUILD: none` (probe build verdict REUSE)
- LSP `findReferences` at this checkout missed `filter.hook.ts` readers of `formatAmountSummary` and `filterAllRecurrences`, so the consumer lists come from `git grep`.

## Self-assessment
I am least sure about step 1's `resolveAmountRangeDraft`. Context asks only that the helpers move. The resolver also moves the transactions hook's validation, `hasText` and summary lines into shared code, so the Rules line ("a change to it lands once, in the shared piece") holds for the hook logic too. The cost is a body change on the transactions side that a reviewer may read as scope. The other path copies about six lines into the commitments hook and leaves the transactions hook at an import change. The key rename in step 2 is the second judgement: changing only the values would leave `filterSectionRecurrence` reading `Repeats`.
