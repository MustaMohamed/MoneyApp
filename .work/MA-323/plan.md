# MA-323 — Category detail: future and no-budget month bars, completed-month figures
base: 9f2758f24381f3883617f878b4b40b000ea00b6f · verify: emulator · flags: money path, user copy · expected diff: ~230 lines

## Steps
### 1. The history keeps every bar of the six-bar window and counts its figures over completed months only
- File: `src/modules/budget/screens/budget/budget.helpers.ts` (`MonthResultVM` `:24`, `CategoryHistoryVM` `:34`, `computeCategoryHistory` `:412-436`); `src/modules/budget/screens/budget/category_detail/index.tsx` (`:53`)
- Change: Add `UnbudgetedMonthResultVM { yearMonth: string; spent: number; isProvisional: boolean; lifecycle: MonthResultVM['lifecycle']; limit: undefined; delta: undefined; status: undefined }` (every key required, none `null`) and `export type CategoryMonthVM = MonthResultVM | UnbudgetedMonthResultVM`; `MonthResultVM` stays as is. Move `MONTHLY_RESULT_BAR_COUNT = 6` here from `monthly_result_chart.helpers.ts:10` (step 2 deletes that file's declaration with its one reader, the slice at `:44`; until then both declare it). `CategoryHistoryVM` becomes `{ results: MonthResultVM[]; avgPerMonth: number; monthsUnder: number; monthsTotal: number; monthsCompleted: number; netBanked: number }`, no field optional or `null`. `computeCategoryHistory(results: readonly MonthResultVM[]): CategoryHistoryVM`, input oldest first ending at the selected month: `results` is the last `MONTHLY_RESULT_BAR_COUNT` rows with `spent` and `delta` snapped, `planned` rows kept; `monthsCompleted` counts `completed` rows among them and `avgPerMonth` is their mean `spent` (0 when none); `monthsTotal`, `monthsUnder` (`!exceedsToCent`) and `netBanked` (snapped sum of `delta`, 0 when none) read `completed` rows only. The window moves here per `docs/adr/2026-11-23-category-monthly-result-bars.md` §4. In `index.tsx` the card's gate reads `state.history.results.length > 0` in place of `monthsTotal > 0`, so S24 keeps its card once the in-progress month stops counting.
- Test: `first` · `__tests__/budget.helpers.test.ts`: rewrite `:369-376` so the five rows return all five bars, `monthsTotal` 3, `monthsCompleted` 3, `monthsUnder` 2, `netBanked` 650, `avgPerMonth` (2400 + 3200 + 2750) / 3; rewrite `:377-386` for the added `monthsCompleted: 0`; add eight completed rows returning the last six with figures over those six only; add a provisional row alone (S24) returning one bar, `monthsTotal` 0 and `monthsCompleted` 0; add a planned row alone returning its bar. The float-tie cases `:698-727` stay as they are.

### 2. A selected month with no budget draws its spending in a neutral fill with no limit line and no limit in the legend
- File: `src/modules/budget/screens/budget/budget.helpers.ts`; `src/modules/budget/screens/budget/category_detail/components/monthly_result_chart.helpers.ts` (`buildMonthlyResult` `:39-80`); `src/constants/theme.ts` (`Colors` `:7-51`)
- Change: `CategoryHistoryVM.results` and the `computeCategoryHistory` argument widen to `CategoryMonthVM`; an `UnbudgetedMonthResultVM` row snaps `spent` only, counts in `monthsCompleted` and `avgPerMonth` when `completed`, and never in `monthsTotal`, `monthsUnder` or `netBanked` (Decision 2026-11-24). `buildMonthlyResult(results: readonly CategoryMonthVM[], selectedMonth: string)` keeps its return type and draws every row it gets, no slice; delete its `MONTHLY_RESULT_BAR_COUNT` declaration `:10` with the slice `:44`, its one reader, rather than import it; a row with `limit === undefined` takes `Colors.dark.budgetNoLimit` and `isOver: false`; the scale, `limitOffsetDp` (`undefined`) and the legend's limit part read the selected row's limit only when it is defined; the legend is `* in progress` alone when a row is provisional, else `undefined`. Add `budgetNoLimit` to `Colors.dark` as `#4A5568` and to `Colors.light` as `#C4BDB7`, frame B1's `--muted` and the light `text3`, outside the band colours (Rules).
- Test: `first` · `__tests__/screens/budget/monthly_result_chart.helpers.test.ts`: import `MONTHLY_RESULT_BAR_COUNT` from `budget.helpers`; the `history` helper `:34` returns `CategoryMonthVM[]`, and a builder beside `row` `:17` makes `UnbudgetedMonthResultVM` rows; replace the five-bar no-selected-row case `:124-145` with five budgeted rows plus a no-budget selected row: six bars, the last selected in `Colors.dark.budgetNoLimit` with `formatAmount(spent)`, `limitOffsetDp` `undefined`; a no-budget selected row alone draws one bar (Acceptance 8); the legend cases `:166-174` take a no-budget selected row in place of an absent one. `__tests__/budget.helpers.test.ts`: a completed no-budget selected row after two completed budgeted rows gives `monthsCompleted` 3 with its spend in `avgPerMonth`, `monthsTotal` 2.

### 3. The hook adds the selected month's bar when it has no budget and keeps the live card off it
- File: `src/modules/budget/screens/budget/category_detail/category_detail.hook.ts` (`results` `:71-97`, `liveMonth` `:100`)
- Change: `results` becomes `CategoryMonthVM[]`; a month with no limit is still skipped unless it is `month`, which pushes an `UnbudgetedMonthResultVM` with its spend and lifecycle. `liveMonth: MonthResultVM | undefined` finds the selected row only when its `limit` is defined (a type guard), so `LiveMonthCard` keeps its `MonthResultVM` prop and draws nothing on a no-budget month.
- Test: `first` · `__tests__/screens/budget/budget_month_rollover.hook.test.ts`, in `useCategoryDetail — month rollover`: at `2026-05-15`, route month `2026-05`, budgets effective `2026-03` and `2026-04`, spend 250 in `2026-05`: `liveMonth` is `undefined` and `history.results` reads `2026-03`, `2026-04`, `2026-05`, the last with `limit` `undefined` and `spent` 250; route month `2026-07` with budgets in `2026-04` to `2026-07`: four bars, `2026-06` and `2026-07` `planned`, `monthsTotal` 1.

### 4. The figures read Avg / mo, Under limit and Net, or "–" with nothing to count
- File: `src/modules/budget/screens/budget/category_detail/components/monthly_result_chart.helpers.ts`; `src/constants/strings.ts` (`:591-601`)
- Change: Add `buildMonthFigures(history: CategoryHistoryVM): { avgLabel: string; underLabel: string; netLabel: string; netColor: string }`, nothing optional or `null`. `avgLabel` is `Strings.budgetDetailNoFigure` when `monthsCompleted` is 0, else `formatAmount(Math.round(avgPerMonth))` (`stat_tiles.tsx:35`); `underLabel` is the dash when `monthsTotal` is 0, else `budgetDetailPartOf(monthsUnder, monthsTotal)`; with `monthsTotal` 0 `netLabel` is the dash in `Colors.dark.text1`, else `netBanked < 0` gives `budgetDetailNetOver(formatAmount(Math.abs(netBanked)))` in `Colors.dark.negative` and anything else `budgetDetailNetUnder(formatAmount(netBanked))` in `Colors.dark.positive`. `formatAmount` prints the EGP whole unit as the bar amounts do (ADR `2026-11-23-category-monthly-result-bars.md` §2), so -0.3 reads `0 over` (Acceptance 11). Strings: `budgetDetailUnder` becomes `Under limit`; add `budgetDetailNoFigure: '–'` (U+2013), `budgetDetailNetUnder(amount: string)` → `<amount> under`, `budgetDetailNetOver(amount: string)` → `<amount> over`.
- Test: `first` · `__tests__/screens/budget/monthly_result_chart.helpers.test.ts`: B1's rows give `2,570`, `budgetDetailPartOf(4, 5)` and `budgetDetailNetUnder(formatAmount(2150))` in positive (B1's six bars: 2,100, 3,400, 1,800, 2,950, 2,600 completed at 3,000, 1,150 in progress); no completed bar gives the dash three times in `text1`; a completed net of -0.3 gives `budgetDetailNetOver(formatAmount(0))` in negative; a net that snaps to 0 gives `budgetDetailNetUnder(formatAmount(0))` in positive; a completed no-budget bar alone gives an average and the dash for Under limit and Net.

### 5. The figures row sits inside the Monthly result card and the stat tiles go
- File: `src/modules/budget/screens/budget/category_detail/components/monthly_result_chart.tsx`; `src/modules/budget/screens/budget/category_detail/index.tsx` (`:19`, `:55`); `src/modules/budget/screens/budget/category_detail/components/stat_tiles.tsx` (deleted); `src/constants/strings.ts` (`budgetDetailMonthsShort` `:601`, removed: its one reader goes)
- Change: Under the month row, inside `ListCard`, a three-column row from `buildMonthFigures(history)` per frame B1 `.mline.top`: top border `Colors.dark.border`, padding `Spacing.sm` top and bottom and `Spacing.md` sides, gap `Spacing.xs`, columns left, centre and right aligned; label Inter regular `Type.micro` in `text2`; value Sora bold `Type.bodyStrong`, `Spacing.xxxs` under its label, through `resolveFitAmountTextProps(Type.bodyStrong, fontScale)` as `stat_tiles.tsx:46` did, Net in `netColor`, the other two in `text1`. Labels `budgetDetailAvg`, `budgetDetailUnder`, `budgetDetailNet`; Net carries no ` · <n> mo`.
- Test: `none` · render-only layout; no `.tsx` suite covers this screen and `.claude/rules/tests.md` forbids a new one; Screens below cover it.

### 6. Decision record for the completed-month figures
- File: `docs/adr/2026-11-24-category-history-completed-months.md` (new); `docs/adr/2026-11-23-category-monthly-result-bars.md` (§4, and §1 for the neutral fill)
- Change: The new record states the six-bar window in `computeCategoryHistory`, figures over `completed` bars only, a completed no-budget month in Avg / mo only, the dash with nothing to count, and Net's word and colour from the snapped net printed by `formatAmount`; it writes nothing. The bars record's §4 says the window moved to `computeCategoryHistory` here, and §1 adds that a month with no limit takes `budgetNoLimit`.
- Test: `none` · documentation.

### 7. The features file carries the new states and the figures row
- File: `.claude/skills/emulator-verify/features/budget_category_detail.md`
- Change: `monthly result, B1` proves the figures row inside the card under the month row (Avg / mo `4,200`, Under limit `5 of 5`, Net the five completed months' limit less spent, `under` in `Colors.dark.positive`) and no stat tiles; `month figures at a float tie` reads the figures row with completed months only; `readable text, large font` swaps the tile clause for each figure value whole on one line inside its column; add `monthly result, future month`, `first budgeted month, S24`, `monthly result, no budget this month` and `monthly result, no budget in any month` with the forces and proofs in Screens. Budget rows are exact-month (`getBudgetsForCategoryMonth` matches `effective_from === yearMonth`, `budget.helpers.ts:74`), so each force inserts one `budgets` row per budgeted month.
- Test: `none` · documentation.

## Screens
- `budget_category_detail.md` · `monthly result, B1`: the figures row inside the card, Avg / mo, Under limit `5 of 5` and Net in positive; no stat tiles above the card; step 7 edits the row
- `budget_category_detail.md` · `month figures at a float tie`: figures counted over the seed's completed months only, Net `0 under` in positive; step 7 edits the row
- `budget_category_detail.md` · `monthly result, future month` (new, step 7): a category with one `budgets` row per month, `effective_from` each month from three before the device's month to two after it, six rows (`$MQA db` inserts), opened with `?month=` two months ahead; six bars, the device month's alone carrying `*`, the two future bars plain; figures over the three completed months; no frame, B1's card
- `budget_category_detail.md` · `first budgeted month, S24` (new, step 7): a category whose one `budgets` row has `effective_from` the device's month; one bar `<Mon>*`, the limit line, legend `limit <n> · * in progress`, all three figures `–` in `text1`; frame S24 `MixS24DetailFirstMonth`
- `budget_category_detail.md` · `monthly result, no budget this month` (new, step 7): a category with one `budgets` row per earlier month and none for the device's month; no live card; six bars, the last in `Colors.dark.budgetNoLimit` with its spend, no limit line, legend `* in progress`; no frame
- `budget_category_detail.md` · `monthly result, no budget in any month` (new, step 7): a category with no `budgets` rows, spending in the device's month, opened on that month; one bar in `Colors.dark.budgetNoLimit` with its spend, no `monthly-result-limit-line`, legend `* in progress`, Avg / mo, Under limit and Net each `–` in `text1`, no live card; no frame
- `budget_category_detail.md` · `readable text, large font`: at 2.0 each figure label and value whole, values on one line in their columns, no text box crossing another by more than 1 dp; step 7 edits the row

## Decision record
- `docs/adr/2026-11-24-category-history-completed-months.md`: Avg / mo, Under limit and Net count the completed months among the six bars, a completed month with no budget in Avg / mo only; step 6 adds the file.

## Non-goals
- The hero, its labels, state tag, used bar and caption, and the day-change recompute of the in-progress month (MA-322); `LiveMonthCard` and `live_month_card.tsx` stay unchanged.
- The skeleton, not found, load errors and the header (MA-321).
- Restyling the bars, the limit line, the month row or the legend beyond the no-limit case (MA-320).
- The Budgets card, the spending list and swipe actions (MA-293, MA-294).

## Untested inputs
- A no-budget selected month with nothing spent: its bar at the minimum height, step 2.
- Font scale 2.0 in the figures row, step 5; emulator only.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: `npm run ci:local`.

## Risks
- The neutral fill takes frame B1's `--muted` hex; no frame draws a no-limit bar.
- `computeCategoryHistory` assumes its last row is the selected month; `category_detail.hook.ts` is its only caller.
- Net prints through `formatAmount`, not the tiles' `formatDisplayMagnitude`, so a net between half a cent and half a pound reads `0 over` or `0 under`, never `0.30`.
- The ticket's `Size:` line counts `live_month_card.tsx`; the plan leaves it unchanged and narrows `liveMonth` in the hook instead.
- `budget_category_detail.md` · `readable text, large font`: `Under limit` at 2.0 in a third of the card may wrap to two lines.
- `budget_category_detail.md` · `monthly result, future month`: the forces insert budget rows by SQL; the `budgets` columns come from `budget.entity.ts`.
- not probed: `budget_category_detail.md` · `first budgeted month, S24`
- not probed: `budget_category_detail.md` · `monthly result, no budget this month`
- not probed: `budget_category_detail.md` · `readable text, large font`

## Self-assessment
Step 2 is the one I am least sure of: it widens a type that two source files and the chart helpers' test read in the same commit, so a reader the typecheck has not yet named would break that commit.
