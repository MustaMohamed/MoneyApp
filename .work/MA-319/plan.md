# MA-319 — Budget sheet suggestion chips and footer status line
base: 75792befec51cafbf4b06dcd6b1b46d3b9552d1b · verify: emulator · flags: money path · expected diff: ~142 lines

## Steps
### 1. The footer status line and the sheet's suggestion list resolve as pure functions
- File: `src/constants/strings.ts` (beside `budgetNameTaken`, `:568`), `src/modules/budget/screens/budget/components/set_budget_sheet.helpers.ts`
- Change: Strings adds four keys from the ticket's Copy: `budgetStatusNoBudget(category: string, month: string)` → `<category> has no budget in <month> yet.`; `budgetStatusBudgetCount(category: string, count: number, month: string)` → `1 budget` at count 1, `<n> budgets` otherwise (the `fixFieldsMarkedAbove` pattern, `strings.ts:547`); `budgetStatusSpentSoFar(spent: string, limit: string, month: string)` → `<spent> of <limit> spent so far in <month>.`; `budgetStatusSpent(spent: string, limit: string, month: string)` → `<spent> of <limit> spent in <month>.`. Helpers export `type SetBudgetStatusSubject = { kind: 'add'; categoryName: string; budgetCount: number } | { kind: 'edit'; spent: number; limit: number }` (no field optional or null) and `resolveSetBudgetStatusLine(subject: SetBudgetStatusSubject | undefined, month: string /* YYYY-MM */, today: string /* YYYY-MM-DD */): string | undefined`: `undefined` subject returns `undefined`; add returns the no-budget line at count 0, else the count line; edit formats `spent` and `limit` with `formatAmount` (EGP decimals from `CURRENCY_CONFIG`, the same formatter `budget.helpers.ts` uses for the row's `spentLabel`/`plannedLabel`) and picks so-far when `today.slice(0, 7) === month`, else the past form; the month text is `fullMonthName(month)` (`src/utils/year_month.ts:57`). Helpers also export `resolveSetBudgetSuggestions(month: string, categorySpendByMonth: Readonly<Record<string, number>> | undefined): AmountSuggestion[]` returning `[{ kind: 'spentLastMonth', amount }, { kind: 'threeMonthAverage', amount }]` from `resolveSuggestedAmounts` (`suggested_amounts.helpers.ts:14`), amounts `number | undefined` and never null; zero stays `undefined`, which `resolveAmountSuggestionChips` already hides (`amount_suggestions.helpers.ts:32`).
- Test: `first` · `__tests__/screens/budget/set_budget_sheet.helpers.test.ts`: `undefined` subject → `undefined`; add count 0 equals `Strings.budgetStatusNoBudget('Health', 'November')`; count 1 differs from count 2 for the same category and month (not a mirror per `.claude/rules/tests.md`); edit 900 / 2000 with month `2026-11` and today `2026-11-30` reads the so-far form and contains `2,000`; today `2026-12-01` the past form; month `2026-12`, today `2026-11-30` the past form; leap case month `2028-02`, today `2028-02-29` so-far, `2028-03-01` past. Suggestions: spend `{ '2026-10': 640, '2026-09': 900, '2026-08': 590 }` for month `2026-11` gives 640 and 710; an empty map gives two `undefined` amounts; month `2026-01` reaches back across the year (`2025-12`, `2025-11`, `2025-10`).

### 2. The sheet hook derives chips and the status line from the guarded month snapshot and the local day
- File: `src/modules/budget/screens/budget/components/set_budget_sheet.hook.ts` (`useSetBudgetSheet`, `:64`)
- Change: Subscribe to `useBudgetStore` with `useShallow` for `loaded`, `loadedMonth`, `rows`, `spendByMonth` (fields at `src/modules/budget/store/budget.store.ts:30-36`); `monthLoaded = loaded && loadedMonth === selectedMonth` (the `budget.hook.ts:177` guard, Invariant 9). `today = useLocalToday(toLocalDateString(new Date()), open)` (`src/utils/use_local_today.hook.ts:7`, the `commitment_form_body.hook.ts:151` shape; Invariant 11). Subject: `undefined` unless `monthLoaded`; edit with `editingRow` → `{ kind: 'edit', spent: editingRow.spent, limit: editingRow.limit }` (saved limit, so typing leaves the line unchanged); add with `selectedCategory` → `{ kind: 'add', categoryName: selectedCategory.name, budgetCount: getBudgetsForCategoryMonth(rows, selectedCategory.id, selectedMonth).length }` (`budget.helpers.ts:69`). `state` gains `footerStatus: string | undefined` = `resolveSetBudgetStatusLine(subject, selectedMonth, today)` and `suggestions: AmountSuggestion[] | undefined` = `undefined` when `isEdit`, `!monthLoaded` or no `selectedCategoryId`, else `resolveSetBudgetSuggestions(selectedMonth, spendByMonth[selectedCategoryId])`. The return gains `selectSuggestion: (text: string) => void`, which is `setLimitText` (`:272`), so a chip writes the hero as typing does and revalidates after a submit. `footerMessage` stays as is.
- Test: `first` · `__tests__/screens/budget/set_budget_sheet.hook.test.ts` (real store via `useBudgetStore.setState`, month pinned as at `:92`): add with a category and a matching snapshot returns both suggestions and the no-budget line; a snapshot with one then two budgets on the category returns the count line; `selectCategory` to another category changes both; no category → both `undefined`; `loadedMonth` another month → both `undefined`; edit → `suggestions` `undefined` and the edit line, unchanged after `setLimitText('2500')`; after `submit()` on an empty limit, `selectSuggestion('640')` clears `faults.limit`; across local midnight with fake timers (the `__tests__/screens/commitments_pay_sheet.hook.test.ts:2022` pattern, `jest.setSystemTime` at 23:59 of the month's last day) the edit line moves from so-far to past, and on a sheet open for the next month from past to so-far. Same step, so the suite stays green at this commit: `__tests__/screens/budget/set_budget_sheet.test.tsx`'s `useBudgetStore` mock (`:75-82`) becomes a callable that applies the selector to a fixture holding `loaded`, `loadedMonth: '2026-01'`, `rows`, `spendByMonth`, keeping `getState`; its existing cases pass unchanged.

### 3. The sheet mounts the chips under the month line and feeds the status line to the footer
- File: `src/modules/budget/screens/budget/components/set_budget_sheet.tsx` (`FormSheetFooter`, `:66-74`; hero `Controller`, `:82-95`)
- Change: `FormSheetFooter` takes `footnote={state.footerStatus}`; its `message` already wins over the footnote and the footnote returns when the message clears (`resolveStatusTrack`, `src/components/ui/status_track.geometry.ts:27`). Between the month line `Text` (`:96-103`) and the limit `ValidationSlot` (`:104`), a second `Controller` on `limitText` renders `AmountHeroSuggestions` (`src/components/ui/amount_hero_suggestions.tsx:26`) with `suggestions={state.suggestions}`, `value`, `currency={Currency.EGP}`, `onSelect={selectSuggestion}`; frame C1 orders `.conv` then `.sugg` then the fact card, and the row renders nothing when `suggestions` is `undefined`.
- Test: `after` · `__tests__/screens/budget/set_budget_sheet.test.tsx` (Render-suite policy: the chip press → hero write and the message ↔ status swap are render-only wiring, no style assertion); the message-over-footnote priority itself is proved by the existing `'idle footnote, no message'` and `'error message replaces the footnote'` cases at `__tests__/components/ui/status_track.geometry.test.ts:24-49`, so no case is added there. Its `heroui-native` mock gains `Chip` with `Label` (as `__tests__/screens/transactions/transaction_form/amount_hero.test.tsx` mocks it); one case, with `selectedMonth` at the fixture's `loadedMonth` and a category chosen and a name typed, presses `Strings.budgetSaveCta` on an empty limit and reads `Strings.fixFieldsMarkedAbove(1)` in `set-budget-status`, then presses `amount-suggestion-spentLastMonth` and reads its amount in the limit input, `accessibilityState.selected` true on that chip (`SelectablePill`, `src/components/ui/chip.tsx:93`), and the no-budget line back in `set-budget-status`.

### 4. The amount hero's field draws no box on any mount
- File: `src/components/ui/amount_hero.tsx` (`Input`, `:75`)
- Change: pass `variant="secondary"`, which carries no `android:[elevation:1]` (heroui-native 1.0.11 `input.styles.ts`, `primary` variant), as `note_fact_row.tsx:68` does; `className` keeps `bg-transparent` over the variant's fill and the `INPUT_NO_FOCUS_BORDER_COLOR` style stays. No prop is added and the five mounts are unchanged.
- Test: `none` · the elevation is a build-time Uniwind class Jest cannot observe, and a `variant` prop assertion reads source; the six amount-hero rows under Screens prove it.

### 5. The budget features file carries the new sheet states and the edited proofs
- File: `.claude/skills/emulator-verify/features/budget.md` (States table, `:13`)
- Change: append `set-budget sheet, add with suggestions` (`MixC1AddBudget`, `MixS26AddChipOn`, MA-319; Health with spending in the three months before the device's month; proof: the two chips under `Monthly limit · <month> <year>` with C1's labels, a tap lights the chip and fills `amount-hero-value`, a zero month's chip absent, footer `Health has no budget in <month> yet.`, then picking another category changes both) and `set-budget sheet, add on a category with budgets` (no frame, MA-319; one then two Shopping budgets; footer `Shopping has 1 budget in <month>.` then `2 budgets`). Extend `set-budget sheet, edit` (`:72`) with no chips and footer `<spent> of <limit> spent so far in <month>.` unchanged after typing a limit; extend `set-budget sheet, large font` (`:32`) with the chips wrapping whole and the status line whole inside `sheet-footer` at 2.0; extend `set-budget sheet, field focused` (`:44`) and `spending plan sheet, add plan at rest` (`:34`) with the hero field drawing no fill, border or shadow.
- Test: `none` · a features file, read by the render lens.

### 6. The other amount-hero screens' proofs read the field with no box
- File: `.claude/skills/emulator-verify/features/transaction_form.md` (`amount, centred number`, `:57`; `validation, amount focused`, `:59`), `.claude/skills/emulator-verify/features/add_commitment.md` (`amount, centred hero`, `:37`), `.claude/skills/emulator-verify/features/commitment_detail.md` (`pay sheet, fixed EGP`, `:28`)
- Change: each row's proof adds that a crop of `amount-hero-value` shows no fill, border or elevation shadow at rest, focused, filled and empty; `validation, amount focused` keeps the red line under the number and nothing else around the field.
- Test: `none` · features files.

### 7. The status line's money figures are recorded
- File: `docs/adr/2026-11-23-budget-sheet-status-line-figures.md` (new, the shape of `docs/adr/2026-11-21-suggested-amounts-half-up.md`)
- Change: records that the edit line shows the budget's own spending (`spendByBudgetId`, through `editingRow.spent`) against its saved `limit_amount`, formatted with `formatAmount` at `CURRENCY_CONFIG` EGP decimals as the budget row shows them, and never the typed limit; that chip and line figures show only while the store's `loadedMonth` is the sheet's month; that a chip writes text which the limit's existing single `roundMoney` at the write rounds, adding no rounding point; and that a transaction in another currency counts at its `egp_amount` (`budget_stats.ts:15`).
- Test: `none` · a decision record.

## Screens
- `.claude/skills/emulator-verify/features/budget.md` · set-budget sheet, add with suggestions · new, step 5 · risk: a new component, a clipped or rounded container
- `.claude/skills/emulator-verify/features/budget.md` · set-budget sheet, add on a category with budgets · new, step 5 · risk: none
- `.claude/skills/emulator-verify/features/budget.md` · set-budget sheet, edit · risk: a clipped or rounded container
- `.claude/skills/emulator-verify/features/budget.md` · set-budget sheet, large font · risk: a new component, a font scale above 1.0
- `.claude/skills/emulator-verify/features/budget.md` · set-budget sheet, field focused · risk: none
- `.claude/skills/emulator-verify/features/budget.md` · spending plan sheet, add plan at rest · risk: none
- `.claude/skills/emulator-verify/features/transaction_form.md` · amount, centred number · risk: none
- `.claude/skills/emulator-verify/features/transaction_form.md` · validation, amount focused · risk: none
- `.claude/skills/emulator-verify/features/add_commitment.md` · amount, centred hero · risk: none
- `.claude/skills/emulator-verify/features/commitment_detail.md` · pay sheet, fixed EGP · risk: none

## Decision record
- `docs/adr/2026-11-23-budget-sheet-status-line-figures.md`: the edit status line reads the budget's own spending against its saved limit through `formatAmount`, only from the sheet month's snapshot, and the chips add no rounding point; step 7 adds the file.

## Non-goals
- No new read, query or store field: `spendByMonth` and `rows` already carry the figures.
- No change to `AmountHeroSuggestions`, `resolveAmountSuggestionChips`, `resolveSuggestedAmounts` or `resolveStatusTrack`.
- No prop on `AmountHero`, and no edit in any of its five mounts.
- No chips on the edit sheet, though S11 draws them.
- No mount of the sheet on category detail (MA-293, MA-294), and no income-sheet chip (the 50/30/20 ticket).
- No change to the title, Category, Name or Group rows, validation, duplicate name, save failed or toasts (MA-295, MA-296).

## Untested inputs
- Font scale 2.0 on the chip row and the status line: step 3, proved by `set-budget sheet, large font`.
- A USD transaction in a chip: covered by MA-288's case in `__tests__/budget_stats.query.test.ts`; step 2 passes `spendByMonth` through unchanged.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md` (`npm run ci:local`).

## Risks
- No frame draws chips beside a limit fault; with the chips above the `ValidationSlot`, the fault text sits under the chips, not under the month line as S08 draws it without chips.
- `editingRow` comes from the guarded ledger in `budget.hook.ts`, so an edit sheet whose month has not loaded has no status line; if a later mount (category detail) passes an unguarded `editingRow`, the step 2 guard still holds.
- `variant="secondary"` relies on `bg-transparent` overriding `input__input--variant-secondary`'s `--color-default` fill; if the class order loses, a fill shows on all five mounts.
- `.claude/skills/emulator-verify/features/budget.md` · set-budget sheet, add with suggestions: the chip row clipped by the sheet's rounded scroll container.
- `.claude/skills/emulator-verify/features/budget.md` · set-budget sheet, edit: the status line clipped in the footer's rounded container.
- `.claude/skills/emulator-verify/features/budget.md` · set-budget sheet, large font: the wrapped chips or a two-line status line overlapping the fact card or `Save`.

## Self-assessment
Step 2's midnight case is the one I am least sure of: `useLocalToday` is seeded from `new Date()` on every render and only advances through the shared ticker, so the test has to drive fake timers across the month boundary with the sheet open and the snapshot's `loadedMonth` held. The pay-sheet suite does this, but this hook also holds an RHF form and two zustand stores, and a rerender order that reads a stale `today` would pass at 1.0 and fail only at the flip.
