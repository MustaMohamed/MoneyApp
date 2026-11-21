# MA-288 — Suggested amounts: helper and chips under the amount hero
base: f6c0e0a8180b8b3f963caf7c5e8bfbc5859adc20 · verify: emulator · flags: money path · expected diff: ~210 lines

## Steps
### 1. A pure helper gives a category's two suggested amounts for a budget month
- File: `src/modules/budget/screens/budget/suggested_amounts.helpers.ts` (new); `scripts/validate-money-rounding.js` (`PERMITTED.toCents`, :29)
- Change: `export interface SuggestedAmounts { spentLastMonth: number | undefined; threeMonthAverage: number | undefined }`, both required keys, `undefined` meaning no suggestion, never `null`. `export function resolveSuggestedAmounts(budgetMonth: string, categorySpendByMonth: Readonly<Record<string, number>> | undefined): SuggestedAmounts`, arguments in that order: `budgetMonth` is `YYYY-MM`, required; `categorySpendByMonth` is `useBudgetStore.spendByMonth[categoryId]` (`budget.store.ts:31`), already EGP and clamped at 0 (`budget_stats.ts:15,27`), `undefined` when the category has no spend in the window. The three months come from `previousYearMonth` (`budget.helpers.ts:349`) applied once, twice and three times; an absent month reads 0. Each month goes to integer cents through `toCents` (`src/utils/money.ts:38`), then half up to whole units in integer arithmetic: last month `Math.floor((cents + 50) / 100)`, the mean `Math.floor((sumCents + 150) / 300)`. A result of 0 returns `undefined`. No `Date`, no database read. Add the new path under `toCents` in `PERMITTED`, in ASCII order, in the same commit, or `npm run lint` fails on the `toCents` mention.
- Test: `first` · `__tests__/screens/budget/suggested_amounts.helpers.test.ts`: January `2027-01` reads `2026-12` for last month and `2026-10..2026-12` for the mean; 600, absent, 900 gives 500; 640.50 gives 641; 810.63, 606.80, 201.07 gives 540; 2130.99 total over three (mean 710.33) gives 710; all absent and `undefined` input give both `undefined`; 0.40 last month gives `undefined`; a month after the budget month or the budget month itself is ignored. Plus one case in `__tests__/budget_stats.query.test.ts`: a USD-account expense with `amount` 50 and `egp_amount` 2500 in October, `getCategorySpendByMonth` fed into `resolveSuggestedAmounts('2026-11', …)` reads `spentLastMonth` 2500.

### 2. The rounding of a suggested amount has its decision record
- File: `docs/adr/2026-11-21-suggested-amounts-half-up.md` (new)
- Change: records that a suggested amount is a preview, not a stored value: integer cents through `toCents`, half up to a whole unit, 0 is no suggestion; it does not use `roundMoney` (half-even, 2 dp); a tapped suggestion is rounded again only at `setBudget`'s first statement (`docs/adr/2026-08-22-money-rounding-layer.md` §3, row 4; `budget.repository.ts:324`); the helper is listed under `toCents` in `scripts/validate-money-rounding.js`. Same header shape as the 2026-08-22 record.
- Test: `none` · a doc.

### 3. A suggestion list resolves to chip view models: label, field text, selected
- File: `src/constants/strings.ts` (beside the `budget*` keys, :475); `src/components/ui/amount_suggestions.helpers.ts` (new)
- Change: Strings gains `amountSuggestionSpentLastMonth: (amount: string) => \`${amount} · spent last month\`` and `amountSuggestionThreeMonthAverage: (amount: string) => \`${amount} · 3-month average\`` (ticket § Copy). The helper exports `type AmountSuggestionKind = 'spentLastMonth' | 'threeMonthAverage'`; `interface AmountSuggestion { kind: AmountSuggestionKind; amount: number | undefined }`, both required; `interface AmountSuggestionChip { kind: AmountSuggestionKind; label: string; text: string; selected: boolean }`, all required, none `null`; `resolveAmountSuggestionChips(suggestions: readonly AmountSuggestion[] | undefined, value: string, currency: Currency): AmountSuggestionChip[]`, arguments in that order. It drops a suggestion whose `amount` is `undefined` or not above 0, keeps input order, sets `label` from the kind's Strings function over `formatCurrencyParts(amount, currency).value` (`src/utils/format_amount.ts`, decimals from `CURRENCY_CONFIG`), `text` from `formatStoredMoneyText(amount)` (`src/utils/money_text.ts:24`, plain digits), and `selected` as `value !== '' && Number(value) === amount`, since `maskMoneyFieldText` (`src/utils/money_text.ts:39`) admits a decimal point and decimals (ticket Decisions 2026-11-21, "lit while the field equals the chip's amount"). `undefined` or `[]` returns `[]`.
- Test: `first` · `__tests__/components/ui/amount_suggestions.helpers.test.ts`: 41200 on EGP gives `text` `'41200'` and a label equal to `Strings.amountSuggestionThreeMonthAverage('41,200')`, a call against a call, no literal of the copy (`.claude/rules/tests.md`, No copy mirrors); `selected` true for value `'41200'`, `'41200.00'` and `'41200.'`, false for `'41201'` and `''`; an `undefined` amount and a 0 amount give no chip; `undefined` and `[]` give `[]`; order kept.

### 4. The chip row's geometry meets the touch floor and stacks without overlap at font scale 2.0
- File: `src/components/ui/form_sheet.geometry.ts` (beside the `AMOUNT_*` constants, :82-92)
- Change: constants from frame C1's `.sugg` and `.spill` (`gap:6px`, `padding:10px 0 2px`, `min-height:28px`), unscaled CSS px as `filter_accordion.geometry.ts:18` writes them: `AMOUNT_SUGGESTION_GAP`, `AMOUNT_SUGGESTION_ROW_PADDING_TOP`, `AMOUNT_SUGGESTION_ROW_PADDING_BOTTOM`, `AMOUNT_SUGGESTION_CHIP_MIN_HEIGHT`. `resolveAmountSuggestionChipGeometry(fontScale: number): { height: number; label: ScaledTextStyle; hitSlop: TouchFloorHitSlop }`, all required: `label` is `scaledTextStyle(SELECTABLE_PILL_LABEL_FONT_SIZE, fontScale)`, `height` is the larger of `AMOUNT_SUGGESTION_CHIP_MIN_HEIGHT` and `label.lineHeight + 2 * SELECTABLE_PILL_PADDING_BLOCK + 2 * PILL_BORDER_WIDTH` (`chip.geometry.ts:11,14`), `hitSlop` is `touchFloorHitSlop(height)` (`theme.ts:319`).
- Test: `first` · `__tests__/components/ui/form_sheet.geometry.test.ts`: at 1.0 and 2.0, `height + hitSlop.top + hitSlop.bottom >= TouchSize.min`. The wrap and label-fit claims are asserted on the mounted row in step 5.

### 5. A sheet mounts the chip row under its caption; tapping a chip fills the field
- File: `src/components/ui/amount_hero_suggestions.tsx` (new); `src/components/ui/amount_hero.tsx` restored to `origin/main` (`f6c0e0a8`) byte for byte, no diff (ticket Rules, Decisions 2026-11-22)
- Change: `export function AmountHeroSuggestions({ suggestions, value, currency, onSelect }: { suggestions?: readonly AmountSuggestion[]; value: string; currency: Currency; onSelect: (text: string) => void }): React.ReactElement | null`. `suggestions` optional, may be `undefined`; `value` is the field text the sheet's store holds, required; `onSelect` receives the chip's `text`, which the sheet writes to its field as its own `onChange` does. Imports, none from `amount_hero.tsx`, which exports nothing the row reads: `AmountSuggestion` and `resolveAmountSuggestionChips` from `@/components/ui/amount_suggestions.helpers` (step 3); `SelectablePill` from `@/components/ui/chip` (`chip.tsx:64`); `WRAPPING_PILL_STYLE` and `WRAPPING_PILL_LABEL_STYLE` from `@/components/ui/chip.geometry`; `AMOUNT_SUGGESTION_GAP`, `AMOUNT_SUGGESTION_ROW_PADDING_TOP`, `AMOUNT_SUGGESTION_ROW_PADDING_BOTTOM` and `resolveAmountSuggestionChipGeometry` from `@/components/ui/form_sheet.geometry` (step 4, `form_sheet.geometry.ts:101-107`); `type Currency` from `@/constants/enums`; `View` and `useWindowDimensions` from `react-native`. Returns `null` when `resolveAmountSuggestionChips` returns `[]`. Otherwise a `View` row, `testID` `amount-suggestions`, `flexDirection: 'row'`, `flexWrap: 'wrap'`, `justifyContent: 'center'`, gap and padding from step 4, holding one `SelectablePill` per chip: `testID` `amount-suggestion-<kind>`, `label`, `selected`, `onPress={() => onSelect(chip.text)}`, `hitSlop` and `style={[WRAPPING_PILL_STYLE, { minHeight: height }]}`, `labelStyle={[WRAPPING_PILL_LABEL_STYLE, label]}`, `labelAllowFontScaling={false}` from `resolveAmountSuggestionChipGeometry(fontScale)` with `useWindowDimensions().fontScale`. No `useState`. The three mounts (`transaction_amount_hero.tsx:26`, `commitment_amount_hero.tsx:19`, `pay_sheet.tsx:144`) are not edited and render no row. The sheet draws its caption between `<AmountHero>` and `<AmountHeroSuggestions>`, so the caption stays in each sheet file as MA-295, MA-309 and MA-314 plan it.
- Test: `after` · the case stays in `__tests__/screens/transactions/transaction_form/amount_hero.test.tsx` (existing `.tsx` suite; `.claude/rules/tests.md` Render-suite policy forbids a new `.tsx` file, and the Acceptance line on tapping names render wiring), importing `AmountHeroSuggestions` from `@/components/ui/amount_hero_suggestions`; its `heroui-native` mock keeps `Chip` and `Chip.Label`: `AmountHeroSuggestions` with a 41200 three-month average and an `undefined` last month draws one chip, `amount-suggestion-spentLastMonth` absent; pressing `amount-suggestion-threeMonthAverage` calls `onSelect('41200')`; rerendered with value `'41200'` its `accessibilityState.selected` is true, with `'4120'` false; `suggestions` `undefined` renders nothing. At the suite's `Dimensions.get('window').fontScale`, 2 in the jest preset (`@react-native/jest-preset/jest/mocks/NativeModules.js`), read as the MA-163 case reads it: `amount-suggestions` has `flexWrap: 'wrap'` and `gap: AMOUNT_SUGGESTION_GAP`; each pill has `minHeight: resolveAmountSuggestionChipGeometry(fontScale).height` and that geometry's `hitSlop`; each label has the geometry's `label` style. The suite's existing `TransactionAmountHero` cases pass unchanged.

## Screens
- `transaction_form.md` · amount, centred number · none
- `transaction_form.md` · validation, amount focused · none
- `transaction_form.md` · strip and amount, large font · a font scale above 1.0
- `add_commitment.md` · amount, centred hero · none
- `add_commitment.md` · tabs, strip and amount, large font · a font scale above 1.0
- `commitment_detail.md` · pay sheet, fixed EGP · none
- `commitment_detail.md` · pay sheet, large font · a font scale above 1.0
- On each: the state reads as its row reads it at base, and `mqa read` finds no `amount-suggestion-` node. All seven states exist in the files at base; no step edits a features file.

## Decision record
- `docs/adr/2026-11-21-suggested-amounts-half-up.md`: a suggested amount rounds half up from integer cents to a whole unit as a preview, and the budget save rounds the tapped value once more through `roundMoney`; step 2 adds the file.

## Non-goals
- Mounting the chips on the add budget sheet, hiding them on edit, and the day-change recompute (Invariant 11): MA-295.
- The income sheet's 3-month average chip and its source `getTrailingIncomeSuggestion` (`budget_stats.ts:58`), which stays as it is: MA-314.
- The caption line ("Monthly limit · November 2026", "Planning income · November 2026"): each sheet file draws it.
- The hero without its bottom border and with `padding-bottom:4px`, as C1 and E2 draw it: a prop on `AmountHero` that MA-295 or MA-314 adds.
- Any line of `src/components/ui/amount_hero.tsx`, including an import or re-export of the chip row; any change to the three mounts; any new `.tsx` test file; any database read or store field.

## Untested inputs
- A budget month other than the loaded month, whose prior months fall outside `spendByMonth`'s 12-month window, reads absent months as 0: step 1.
- The chip row's wrap and hit slop on a device at font scale 2.0: MA-295 and MA-314 prove them (ticket Rules, Invariants 3 to 5); step 5.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`, `npm run ci:local`.

## Risks
- Critical trigger 2 is answered by Decisions 2026-11-22: `git diff f6c0e0a8 -- src/components/ui/amount_hero.tsx` empty is the check, and any line there reopens it.
- MA-309 (#963) merging before this ships puts a fourth `AmountHero` mount on the plan sheet, and the emulator walk adds that sheet.
- `formatStoredMoneyText` returns `''` for an untypeable value; a whole-unit amount from step 1 is always typeable, so a chip with empty `text` signals a caller passing a non-finite amount.
- `transaction_form.md` · strip and amount, large font: the `heroui-native` mock change in `amount_hero.test.tsx` touches no runtime code, so a device difference here points at an `AmountHero` edit step 5 forbids.
- REBUILD: package-lock.json, package.json

## Amendments
- 2026-11-22 · step 5 · the chip row moves from a new export in `amount_hero.tsx` to the new file `amount_hero_suggestions.tsx` and `amount_hero.tsx` returns to its `origin/main` text, per the ticket's Rules and Decisions 2026-11-22; the test case stays in its suite with the import path changed; `expected diff` recounted at ~210, the new file ~64 lines and `amount_hero.tsx` 0

## Self-assessment
Step 4 is the least certain: the geometry test proves the 44 dp floor and step 5 binds the row's wrap and the pill's height and label style to it, but whether `SelectablePill`'s HeroUI `Chip` honours `minHeight` and draws its label at exactly `scaledTextStyle(Type.micro, 2)` with `labelAllowFontScaling={false}` is a device fact, and the account strip needed an explicit floor for the same reason (`form_sheet.geometry.ts:112-119`). If the chip draws taller than computed, the touch floor still holds, but the no-overlap arithmetic would understate the second row's offset until MA-295 measures it.
