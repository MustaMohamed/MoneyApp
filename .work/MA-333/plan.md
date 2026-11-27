# MA-333 — Category detail: Unassigned spending row
base: 750473a87f46912a40d21086f6d180349e961c62 · verify: emulator · flags: money path, user copy · expected diff: ~148 lines

## Steps
### 1. The Budgets card view model carries the Unassigned spending row
- File: `src/modules/budget/screens/budget/category_detail/category_detail.helpers.ts` (`CategoryBudgetsCardVM` `:192`, `buildCategoryBudgetsCard` `:210`); `src/constants/strings.ts` (beside `budgetCategoryDetailNoBudgets` `:499`)
- Change: add exported `interface CategoryUnassignedRowVM`, every field required and never `null`: `name: string` (`Strings.budgetCategoriesUnassignedSpending`), `caption: string` (`Strings.budgetCategoriesUnassignedExplanation`), `glyphName: RowGlyph['glyphName']` (`resolveCategoryGlyph(category).glyphName`, the category's own glyph, frame B1's `.id-tile.hollow`), `glyphColor: string` (`AcctTokens.graphite.soft`, `#7E8996`, B1's `.id-tile.hollow` colour; `RowGlyph` from `transaction_row.helpers.ts:202`, `AcctTokens` from `theme_tokens.ts:47`), `amountLabel: string` (`formatAmount(rows[0].unassignedSpend)`), `amountCode: string` (`CURRENCY_CONFIG[Currency.EGP].code`), `amountWord: string` (`Strings.budgetPlansSpentStatus`, `strings.ts:768`), `amountWordColor: string` (`Colors.dark.text2`, B1's `.am .c` is `--content-secondary`), `accessibilityLabel: string` (`Strings.budgetCategoryDetailUnassignedA11y(amountLabel)`). `CategoryBudgetsCardVM` gains a required key `unassigned: CategoryUnassignedRowVM | undefined`, set only when `rows[0]` exists and `rows[0].unassignedSpend > 0`, the tab's own condition (`components/category_budget_row.tsx:119`); with no budget in the month `rows[0]` is absent (`budget.helpers.ts:165-168`) and it is `undefined`. `count` stays `ringRows.length`. Strings gains `budgetCategoryDetailUnassignedA11y: (amount: string) => string`, one required argument, returning `Unassigned spending, <amount> spent, not linked to a named budget` (ticket § Copy).
- Test: `first` · `__tests__/screens/budget/category_detail.helpers.test.ts`, `describe('buildCategoryBudgetsCard')`: (a) `Clothes` 2,000 and `Home` 1,000 linked 900 and 150, category spend 1,150: `unassigned.amountLabel` is `formatAmount(100)`, `amountWord` is `Strings.budgetPlansSpentStatus`, `name` and `caption` are the two `budgetCategoriesUnassigned*` keys, `accessibilityLabel` is `Strings.budgetCategoryDetailUnassignedA11y(formatAmount(100))`, `count` is 2; (b) the same figures through `buildCategoryBudgetRows(...).rows[0].unassignedSpend` print the same `amountLabel` (the tab's figure); (c) all spending linked: `unassigned` is `undefined`; (d) a float tie, spend `0.1 + 0.2` against 0.3 linked: `undefined` (`snapToZero`); (e) the existing `it.each` (`:442`): its `budgets only in another month` row builds the 2026-04 budget with `spendByMonth: { 'cat-1': { '2026-04': 900, [MONTH]: 400 } }`, so the built month holds spending, and asserts `unassigned` is `undefined` and `emptyLine` set; the income category row stays as it is and asserts `unassigned` is `undefined`; (f) `glyphName` is `resolveCategoryGlyph(category).glyphName` and `contrastRatio(glyphColor, CoreTokens.surface) >= NON_TEXT_MIN_CONTRAST_RATIO` (`account_palette.ts:62-65`). No assertion compares a `Strings` value with a literal of its text.

### 2. The ADR records the row's figure
- File: `docs/adr/2026-11-25-category-detail-budget-rows.md`
- Change: append `## 4. The unassigned row`: the amount is `CategoryBudgetRowVM.unassignedSpend` from `buildCategoryBudgetRows`, the figure the tab prints, so the two match by construction; it shows when that figure is above 0, as the tab's row does, and with no budget in the month there is none; it prints through `formatAmount` at EGP's 0 dp and adds no rounding point; it adds nothing to the header count; the glyph is graphite soft, about 4.3:1 on the card's surface. Add the unassigned row to the `Applies to` line.
- Test: `none` · a doc; step 1's cases assert each line.

### 3. The ring-row file draws the Unassigned spending row from the shared row body
- File: `src/modules/budget/screens/budget/category_detail/components/category_budget_ring_row.tsx`
- Change: lift the row's outer `View` (accessible, `accessibilityRole="text"`, label, `Spacing.sm` gap, `Size.budgetDetailRowMinHeight`, `px-4 py-2.5`) into a file-local shell both rows use, and export `CategoryUnassignedRow({ row }: { row: CategoryUnassignedRowVM })`: in the ring's place a hollow circle `Size.budgetDetailRing` square, full radius, `Size.hairline` border in `row.glyphColor`, transparent fill, holding `MaterialCommunityIcons` `row.glyphName` at `Size.rowGlyph` (`theme.ts:279`, the 14 dp category glyph `commitment_row.tsx:137` reuses) in `row.glyphColor`; then `BudgetLimitRowBody` with `name`, `caption`, `amountLabel`, `amountCode`, `amountWord`, `amountWordColor`, no `tag`, `amountMinWidth={Size.budgetDetailAmountColumn}`. `CategoryBudgetRingRow`'s output is unchanged.
- Test: `none` · no render suite covers this file and `.claude/rules/tests.md` forbids a new `.tsx` suite; the emulator states `budgets card, B1` and `readable text, large font` cover it.

### 4. The Budgets card draws the row last, under the budget rows
- File: `src/modules/budget/screens/budget/category_detail/components/category_budgets_card.tsx`
- Change: in the rows branch, after the mapped ring rows, when `card.unassigned` is set, a `View` with `border-separator border-t` holding `<CategoryUnassignedRow row={card.unassigned} />`. The empty-line branch is unchanged; `unassigned` is `undefined` there by step 1. The `SectionHeader` keeps `count={card.count}`.
- Test: `none` · as step 3; emulator states `budgets card, B1`, `no unassigned spending` and `budgets card, no budget this month`.

### 5. The skeleton draws the Budgets section under the chart
- File: `src/modules/budget/screens/budget/category_detail/components/category_detail_skeleton.tsx`
- Change: after the chart's `ListCard`, inside the same `Spacing.md` column, frame S05's section: a header bar, `ScaledBar` `lineHeightFor(Type.caption)` with the `SECTION_HEADER_MARGIN_TOP` / `SECTION_HEADER_MARGIN_BOTTOM` wrapper the chart's header bar uses, then a `ListCard` with the loaded card's corner and top margin (`Radius.detailCard`, and `DETAIL_ROWS_CARD_MARGIN_TOP` imported from `src/components/ui/detail_rows_card.geometry.ts`, as `detail_rows_card.tsx:7` does) holding three rows, a `border-separator border-t` on the second and third. Each row: `testID="budget-category-detail-skeleton-budget-row"`, `flexDirection: 'row'`, centred, `gap: Spacing.sm`, `minHeight: Size.budgetDetailRowMinHeight`, `px-4 py-2.5`; a `SkeletonGroup.Item` circle `Size.budgetDetailRing` square, `rounded-full`, unscaled; a `flex: 1` text column of two `ScaledBar`s, `lineHeightFor(Type.bodyStrong)` and `lineHeightFor(Type.micro)`, the loaded row body's two lines, as the hero bars take the loaded line heights; a right column, end-aligned, of two `ScaledBar`s at the same two heights. Widths from S05's `.sk` spans: 120, 90, 64 and 34 px.
- Test: `first` · `__tests__/screens/budget/fifty_thirty_twenty_ledger.test.tsx`, the existing case `grows each category detail text bar with the font scale, in render order` (`:370-396`, extended under the Render-suite policy in `.claude/rules/tests.md`): after `Size.budgetMonthlyBarMaxHeight` the `toEqual` list appends `bar(lineHeightFor(Type.caption))` for the section header, then for each of the three rows, in render order, `Size.budgetDetailRing` (unscaled), `bar(lineHeightFor(Type.bodyStrong))`, `bar(lineHeightFor(Type.micro))`, `bar(lineHeightFor(Type.bodyStrong))`, `bar(lineHeightFor(Type.micro))`; the same case asserts every `budget-category-detail-skeleton-budget-row` (three) has style `minHeight: Size.budgetDetailRowMinHeight`. Emulator state `skeleton, large font` measures it on the device.

### 6. The emulator feature file carries the row's states
- File: `.claude/skills/emulator-verify/features/budget_category_detail.md`
- Change: `budgets card, B1`: the proof's `no Unassigned spending row` becomes a last row under `Home`: a hollow circle and the `cat_car` glyph in graphite soft, `Unassigned spending`, `Not linked to a named budget`, `100` `EGP` `spent`, a separator above it, the glyph and its circle in graphite soft at 3:1 or more on the card fill, the pill still `2`. Append `no unassigned spending`, frame S07 `MixS07DetailOver` (its card draws no unassigned row), force the MA-328 seed and `mqa open '/budget/cat_charity?month=2026-09'`, `mqa scroll down`, font scale 1.0; proof: the hero's spent figure equals the row's `5,200` (no unlinked spending), `Charity` the card's last row, `label="~Unassigned spending"` reads `no match`. `budgets card, no budget this month`: the force gains an unlinked 2026-11 expense of 850 in `cat_shopping` on a host copy of the MA-328 seed when the hero caption reads `0 spent`, and the proof gains the hero's `850 spent`. `readable text, large font`: the Budgets card clause at `/budget/cat_car` adds the Unassigned spending row, its text whole or ending in a whole `…` and `100` whole at 2.0. `skeleton, large font`: `its rows under the chart are not drawn (MA-293)` becomes S05's section: a header bar, then a card of three rows, each row's `onLayout` height at least `Size.budgetDetailRowMinHeight` − 1 at both scales, each circle `Size.budgetDetailRing` ± 1 at both scales, the text bars taller at 2.0 than at 1.0; the temporary `onLayout` covers a row and its circle.
- Test: `none` · a doc.

## Screens
- `emulator-verify/features/budget_category_detail.md` · `budgets card, B1` · risk: a new component, a clipped or rounded container; step 6 rewrites its proof
- `emulator-verify/features/budget_category_detail.md` · `no unassigned spending` · new, S07; step 6 adds it
- `emulator-verify/features/budget_category_detail.md` · `budgets card, no budget this month` · none; step 6 adds the spending force
- `emulator-verify/features/budget_category_detail.md` · `readable text, large font` · risk: a new component, a font scale above 1.0, a clipped or rounded container; step 6 adds the row
- `emulator-verify/features/budget_category_detail.md` · `skeleton, large font` · risk: a new component, a font scale above 1.0, a clipped or rounded container; step 6 adds the section

## Decision record
- `docs/adr/2026-11-25-category-detail-budget-rows.md`: the unassigned row prints the tab's `unassignedSpend` through `formatAmount`, shows above 0, and adds no rounding point; step 2 appends it as §4 to the existing record.

## Non-goals
- Add budget in the card header, the row not swiping, a removed budget's spending moving into the row (MA-294).
- The tab's `components/unassigned_spending_row.tsx` and its layout (MA-299).
- Any change to `buildCategoryBudgetRows`, the hook, or `index.tsx`.
- A count, chevron or tap on the Unassigned spending row.
- Skeleton rows that follow the loaded row count; S05 draws three.

## Untested inputs
- The row's layout and its 3:1 glyph on the device: steps 3 and 4, emulator only.
- The hook handing `unassigned` through to the screen: step 1's builder is called unchanged at `category_detail.hook.ts:142`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: `npm run ci:local`.

## Risks
- `budget_category_detail.md · no unassigned spending`: the MA-328 seed may hold unlinked 2026-09 spending in `cat_charity`; the hero's spent figure proves it, and `cat_health` is the fallback route.
- `budget_category_detail.md · budgets card, no budget this month`: the MA-328 seed may hold no 2026-11 spending in `cat_shopping`, so the force must add it or the Acceptance edge goes unproved.
- `budget_category_detail.md · readable text, large font`: `BudgetLimitRowBody` stacks at 2.0; the caption `Not linked to a named budget` is longer than any budget caption and may take two lines.
- The canvas folder holds no `rulings.md`, locally or in the artifact, so no `undrawn` line was applied; S05 and S07 were read from the artifact at version `1795721038-14be`.
- `MaterialCommunityIcons` is imported directly in the ring-row file, as `unassigned_spending_row.tsx` does; a lint rule against direct icon imports in module components would move it.
- `REBUILD: package.json, package-lock.json`
- `not probed: budget_category_detail.md · no unassigned spending`
- `not probed: budget_category_detail.md · budgets card, no budget this month`

## Self-assessment
Step 5 is the one I am least sure about: S05 draws bars thinner than the loaded text lines (13 and 10 px) and the plan takes the loaded line heights instead, the convention the hero skeleton follows, so that each skeleton row reaches the loaded row's minimum height at every font scale; a render lens reading S05 literally may call the bars too thick, and the card's corner and margin must match `DetailRowsCard` without its `mx-4`, which the skeleton's padded column already supplies.
