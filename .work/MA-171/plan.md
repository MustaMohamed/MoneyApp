# MA-171 — Words and status lines on the two budget detail screens and a tagged label on the credit card form stay readable at a 2.0 font scale
base: 4d282648da0253f966bd7c74af424a7407b9e2e1 · verify: emulator · flags: none · expected diff: ~360 lines

## Steps
### 1. A line cap that keeps a word whole, as a pure function and a hook
- File: `src/components/ui/text_scale.geometry.ts` (`resolveLoneWordLines`, `:70`)
- Change: `resolveLoneWordLines(text: string, lines: number | undefined, fontScale: number): number | undefined` takes `lines` as `undefined` for no cap and returns `1` for a lone word above font scale 1, else `lines`; its four callers pass a number and compile as they are. New `resolveWordSafeLines(laidOutLines: readonly string[], lines: number | undefined): number | undefined`, both arguments required, neither `null`: it reads the breaks between consecutive entries up to the cap, all of them when `lines` is `undefined`, and returns the 1-based index of the first line that ends in a letter or digit while the next starts with one, else `lines`. A line that ends in a space or a hyphen is a break between words.
- File: `src/components/ui/word_safe_lines.hook.ts` (new)
- Change: `useWordSafeLines(text: string, lines: number | undefined, fontScale: number): { numberOfLines: number | undefined; onTextLayout: ((event: TextLayoutEvent) => void) | undefined }`, three required arguments, none `null`. At or below font scale 1 it returns `lines` and no handler. Above it `numberOfLines` starts at `resolveLoneWordLines(text, lines, fontScale)`, the handler lowers it to `resolveWordSafeLines` of `event.nativeEvent.lines[i].text` and never raises it while the three arguments hold, and a change to any of them starts again. The cap lives in state keyed by the three arguments, as `src/components/ui/tabs.hook.ts:43` holds its width.
- Test: `first` · `__tests__/components/ui/text_scale.geometry.test.ts`: `resolveLoneWordLines` with `lines` `undefined` gives `1` for `Housing` at 2 and `undefined` for `Health & Fitness`; `resolveWordSafeLines` gives 1 for `['Entertainm', 'ent subscri']` at cap 2, 2 for `['Food & ', 'Dining']`, 2 for `['Food & ', 'Entertainm', 'ent']` at cap 3 and at cap 2, 2 for `['Self-', 'care budget']`, 2 for `[]`, 1 for `['Entertainme', 'nt subscript', 'ions']` at `undefined`, `undefined` for `['Food & ', 'Dining']` at `undefined`, the two events the probe read on Fabric. `__tests__/components/ui/word_safe_lines.hook.test.ts` (new, `renderHook` as in `__tests__/components/ui/search_filter_row.hook.test.ts`): at scale 1 the cap and no handler; at 2 a lone word starts at 1; at 2 an event whose lines split a word lowers the cap to that line, a later event of the one line `Entertain…` followed by U+FEFF padding, which is how Android reports the capped line, leaves it, and a new `text` starts again from `lines`.

### 2. One title-and-chip block on the two Budget rows, with a name that splits no word
- File: `src/modules/budget/screens/budget/components/title_with_chip.tsx` (new)
- Change: `TitleWithChip` takes `name: string`, `titleFontSize: number` (a `Type` token) and the chip as `children: React.ReactElement`, all required. It holds what `category_budget_row.tsx:60-98` and `named_budget_row.tsx:60-92` both declare: the row at or below font scale 1, the chip under the title above it (`resolveRowStacking`), the title app-scaled by `scaledTextStyle(titleFontSize, fontScale)` with `allowFontScaling={false}`, and the chip's position in each layout. The title's `numberOfLines` and `onTextLayout` come from `useWordSafeLines(name, 2, fontScale)`.
- File: `src/modules/budget/screens/budget/components/category_budget_row.tsx` (`:60-98`)
- Change: mounts `TitleWithChip` with `row.name`, `Type.body` and its status chip. The chip keeps its `color`, `accessibilityRole`, `accessibilityLabel` and label style; its stacking style and the row's `resolveRowStacking` and `resolveLoneWordLines` calls leave the file.
- File: `src/modules/budget/screens/budget/components/named_budget_row.tsx` (`:60-92`)
- Change: the same with `budget.name`, `Type.caption` and its share chip.
- Test: `none` · no suite renders either row (`__tests__/screens/budget/budget_screen.test.tsx:198` mocks `CategoryBudgetRow`) and `.claude/rules/tests.md:17-19` forbids a new `.tsx` suite. The Screens rows on `budget.md` prove it.

### 3. The lines left on the Budget tab show whole or end in a whole `…`
- File: `src/modules/budget/screens/budget/components/fifty_thirty_twenty/rule_bucket_row.tsx` (`:92-98`)
- Change: the details line keeps `numberOfLines={1}` at or below font scale 1 and takes no cap above it, the rule `fifty_thirty_twenty/not_grouped_row.tsx:12-13` applies to its amounts.
- File: `src/modules/budget/screens/budget/components/budget_summary_parts.tsx` (`BudgetSummaryHeader` `:69-79` and `:166-173`, `BudgetSummarySpentRow` `:180-213`)
- Change: the eyebrow and the trailing label take `allowFontScaling={false}`, `scaledTextStyle(Type.meta, fontScale)` beside the eyebrow's `letterSpacing`, and `numberOfLines={resolveLoneWordLines(label, labelLines, fontScale)}`, so a lone `Complete` keeps one line. The spent line's first text keeps `numberOfLines={2}` at or below font scale 1 and takes no cap above it. No prop of the three exported components changes.
- Test: `after` · a case in `__tests__/screens/budget/fifty_thirty_twenty_ledger.test.tsx` beside `:259-281`: at the suite's font scale, above 1, the node of `bucket.presentation.detailsLabel` carries no `numberOfLines`. A case in `__tests__/screens/budget/fifty_thirty_twenty_summary.test.tsx` beside `:79-102`: the eyebrow node carries `allowFontScaling` false and `toHaveStyle(scaledTextStyle(Type.meta, fontScale))`, and the spent line's outer node (`budget_summary_parts.tsx:193-197`), matched by the whole line `<spent> <connector> <planned>`, carries no `numberOfLines`. The nested amount nodes at `:198` and `:201` carry none at base, so a read of `contextSpentLabel` alone proves nothing.

### 4. The spending plan detail reads in whole words inside its card
- File: `src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_summary.tsx` (`:59-64`, `:95-109`, `:111-133`)
- Change: in the spent row the spent text shrinks and wraps and the `% used` text does not shrink, so it ends at the rail's right edge. Above font scale 1 the metric strip is `BudgetSummaryMetricsRow` (`budget_summary_parts.tsx:215-235`) fed `detail.metrics` as `{ key: label, label, value }`, one metric per row with its value fitted, as the Budget tab's summary stacks (`budget.md:45`); at or below 1 the strip stays as written. Above 1 the insight chips stand one per row at the card's content width, and each label keeps its two lines with `allowFontScaling` off and `scaledTextStyleAboveOne(Type.meta, fontScale)`.
- File: `src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_category_row.tsx` (`:49-58`)
- Change: the name takes `resolveOneLineTextProps(scaledTextStyleAboveOne(Type.bodyStrong, fontScale))`. The status line keeps `numberOfLines={1}` at or below font scale 1 and takes no cap above it, so the row grows under its `min-h-[52px]`.
- File: `src/modules/budget/screens/budget/spending_plan_detail/index.tsx` (`:88-95`)
- Change: the heading shrinks and wraps between its words and the total does not shrink.
- Test: `none` · no suite renders the three files, a new `.tsx` suite is forbidden, and the step adds no function. `spending_plan_detail.md · readable text, large font` proves it.

### 5. The budget category detail reads in whole words, months on one line
- File: `src/constants/theme.ts` (`Size`, beside `budgetRuleValueColumn` `:191`)
- Change: `Size.budgetLedgerMonthColumn: ms(54)`, the width `month_ledger.tsx:68` holds inline.
- File: `src/modules/budget/screens/budget/budget_text.geometry.ts`
- Change: `resolveLedgerMonthColumnWidth(fontScale: number): number`, `scaledFontSize(Size.budgetLedgerMonthColumn, fontScale)`, the shape of `resolveRuleValueColumnWidth` at `:5-7`. New `BUDGET_CHART_LABEL_MAX_FONT_SCALE`, `DISPLAY_HEADLINE_MAX_FONT_SCALE` under its own name, as `CURRENCY_TABS_MAX_FONT_SCALE` is at `src/modules/accounts/components/account_form/account_form.geometry.ts:80-81`.
- File: `src/modules/budget/screens/budget/category_detail/components/month_ledger.tsx` (`:28-31`, `:67-80`)
- Change: the month takes its column width from `resolveLedgerMonthColumnWidth(fontScale)`, one line, `allowFontScaling={false}` and `scaledTextStyle(Type.body, fontScale)`. The description takes a right margin of `Spacing.xs` plus one device pixel, `StyleSheet.hairlineWidth` as the row's border at `:64` uses it, and its text starts where it does at 1.0. `Spacing.xs` alone read 20 px, 7.6 dp, between the two boxes at 2.0 on the probe, one device pixel under the 8 dp Acceptance asks for; the extra pixel is the slack `FITTED_LINE_SLACK` gives a text box for the same rounding (`src/components/ui/text_scale.geometry.ts:59-60`).
- File: `src/modules/budget/screens/budget/category_detail/components/category_detail_title.tsx` (new)
- Change: `CategoryDetailTitle` takes `name: string`, required, never `null`. It draws the header's title as `index.tsx:69` and `styles.title` at `:121-127` draw it today, with `allowFontScaling={false}`, `scaledTextStyle(Type.title, fontScale)` and the `numberOfLines` and `onTextLayout` of `useWordSafeLines(name, undefined, fontScale)`. The cap's state sits in a component, the shape step 2 gives the Budget rows, and stays out of the screen template (`CLAUDE.md` § module screen anatomy; guard T2, `scripts/validate-structural-guards.js:298-302`).
- File: `src/modules/budget/screens/budget/category_detail/index.tsx` (`:69`, `:121-127`)
- Change: mounts `CategoryDetailTitle` with `state.name` in the title's place, and `styles.title` leaves the file.
- File: `src/modules/budget/screens/budget/category_detail/components/monthly_result_chart.tsx` (`:41-46`, `:73-80`)
- Change: above font scale 1 each month label is one line with `allowFontScaling` off and `scaledTextStyleAboveOne(Type.chip, fontScale, BUDGET_CHART_LABEL_MAX_FONT_SCALE)`, so the labels of a row draw at one size and stop growing at 1.3. `adjustsFontSizeToFit` with no `minimumFontScale` stays for a label still wider than its column. The fit alone drew `Jul` about 1.5 times `May` and `Oct*` in twelve 26.3 dp columns on the probe. A shared stop with the fit behind it is how the currency codes hold their segments (`account_form.geometry.ts:80-81`, `src/components/ui/tabs.tsx:156-157`), the precedent the Decision of 2026-10-10 on these labels cites, and the tab bar's labels stop at the same scale (#602 Rules). At or below 1 the label keeps `styles.label`, whose `ms(9)` is not `Type.chip`.
- File: `src/modules/budget/screens/budget/category_detail/components/stat_tiles.tsx` (`Tile`, `:43-50`)
- Change: each tile's value takes `resolveFitAmountTextProps(Type.subhead, fontScale)` and its colour, and `styles.tile` takes `paddingHorizontal: Spacing.xxs`, the inset the Budget tab's metric cells keep (`budget_summary_parts.tsx:240`, `rule_bucket_row.tsx:137`), so the fit stops short of the border. Bounded by the bare tile, `+129,600` and `12 of 12` ran border to border on the probe, 119.6 dp in a 120.6 dp tile.
- Test: `first` · `__tests__/screens/budget/budget_text.geometry.test.ts`: `resolveLedgerMonthColumnWidth(1)` is `Size.budgetLedgerMonthColumn` and at 2 twice it; `BUDGET_CHART_LABEL_MAX_FONT_SCALE` is 1.3, as `__tests__/screens/transactions/transactions_text.geometry.test.ts:59` reads its stop. The five component files have no suite; `budget_category_detail.md · readable text, large font` proves them.

### 6. A tagged label on the credit card form shows whole, and both fields of its row start at one height
- File: `src/components/ui/form_label_text.geometry.ts`
- Change: `resolveFormLabelReserve(reserveLines: 1 | 2 | undefined, fontScale: number, tagLine?: boolean)` keeps its return type and adds one `text.lineHeight` to `minHeight` when `tagLine` is `true` and the font scale is above 1; `tagLine` is optional and defaults to `false`. New `resolveTaggedRowLabelLines(fontScale: number): 2 | undefined`, `undefined` at or below 1 and `2` above, after `resolveBalanceRowLabelLines` (`src/modules/accounts/components/account_form/account_form.geometry.ts:93-95`).
- File: `src/components/ui/form_label_text.tsx` (`FormLabelTextProps`, `:8-14`)
- Change: new optional prop `reserveTagLine?: boolean`, for a label whose row neighbour carries a tag. Above font scale 1 a label with a `tag` lays the tag under the label with no gap, left-aligned, and both sit at the bottom of the reserved height; the tag takes the reserve's text pair and `allowFontScaling` off when lines are reserved. `resolveFormLabelReserve` receives `tagLine` as `tag !== undefined || reserveTagLine === true`. At or below 1, and for every caller that passes neither `tag` nor `reserveTagLine`, the output is as today.
- File: `src/modules/accounts/components/account_form/credit_card_fields.tsx` (`:61`, `:93`)
- Change: `Credit limit` passes `reserveLines={resolveTaggedRowLabelLines(fontScale)}` and `reserveTagLine`; `Minimum payment` passes the same `reserveLines` beside its `tag`. `Due day` at `:129` is unchanged here, since its tag moves under it from `tag` alone and its row has no second field.
- Test: `first` · `__tests__/components/ui/form_label_text.geometry.test.ts`: with `tagLine` true, `minHeight` is `(lines + 1) × text.lineHeight` at scale 2 and `lines × text.lineHeight` at scale 1; with it omitted the existing cases hold; `resolveFormLabelReserve(undefined, 2, true)` is `undefined`, the call `Due day` makes with a `tag` and no `reserveLines` (`credit_card_fields.tsx:129`); `resolveTaggedRowLabelLines` is `undefined` at 1 and `2` at 1.3 and 2.

### 7. A wide day net shrinks on its line and the header keeps its height
- File: `src/modules/transactions/screens/transactions/components/transactions_text.geometry.ts` (after `resolveDayHeaderGeometry`, `:78-83`)
- Change: `resolveDayHeaderNetMaxWidth(fontScale: number, headerWidth: number): number | undefined`, both required: `undefined` at or below font scale 1, and above it half of `headerWidth - 2 × Spacing.md`, the share the row's value track takes (`transaction_row.helpers.ts:54`, `:62-68`). `resolveDayHeaderGeometry` and its three callers are unchanged.
- File: `src/modules/transactions/screens/transactions/components/day_header.tsx` (`:71-78`)
- Change: the net takes `maxWidth` from `resolveDayHeaderNetMaxWidth(fontScale, width)` with `width` from `useWindowDimensions()`, the header's width on this list, and `adjustsFontSizeToFit` when that is a number, the pairing `named_budget_row.tsx:44-50` uses. The label, the pill, `FIGURES_STYLE` and the root's accessibility label are unchanged.
- File: `docs/adr/2026-09-28-transactions-day-cards.md` (§7, `:36`, and the `Ticket` line)
- Change: `the net and the pill never shrink` becomes the pill never shrinks, and above font scale 1 the net's box stops at half the header's inner width and a wider net shrinks to fit on its line.
- Test: `first` · `__tests__/screens/transactions/transactions_text.geometry.test.ts`: `resolveDayHeaderNetMaxWidth(1, 411)` is `undefined`, and at 1.3 and 2 it is `(411 - 2 × Spacing.md) / 2`.

### 8. The feature files carry the states this ticket adds
- File: `.claude/skills/emulator-verify/features/budget.md`, `spending_plan_detail.md`, `budget_category_detail.md`, `add_account.md`, `onboarding.md`, `edit_account.md`, `transactions.md` in the same folder
- Change: `budget.md` § Gotchas gains the MA-171 seed, the one #700 Rules names, built against the device date with its six-figure budgets and income in effect from September. Seven rows are added, each `no frame, MA-171`, each under the `Font scale` force at 1.0 and 2.0 on that seed and on an empty database where the screen has one, one row is extended, and one is rewritten if its read changes:
  - `spending_plan_detail.md` · `readable text, large font`: the seed's plan; empty, an id no plan has. Proof from `mqa bounds`: the `% used` box ends at or left of the rail's right edge, each metric is on its own row, a category row's status box is taller than one line inside a row taller than at 1.0, and the heading total ends at or left of the row's right edge. Crops: no word split, the name whole or ending in a whole `…`, each insight on its own row, and each metric value, the heading total and each row amount whole on one line.
  - `budget_category_detail.md` · `readable text, large font`: the seed's twelve-month category, then its category with a long word in its name for the title; empty, a category no budget names. Proof: each ledger month one line high in a column `resolveLedgerMonthColumnWidth(2)` ± 1 dp wide, each description box ending at least 8 dp left of its chip's, each ledger chip amount whole, the title in whole words, the long-word name one line high ending in a whole `…`, each ledger description wrapped between words, twelve chart labels each on one line inside its column and at one size in the crop, each tile value on one line and clear of the tile's border in the crop.
  - `add_account.md` · `credit card form, label beside its tag, large font`: the reach of `credit card form, balance label, large font` (`:27`). Proof: a crop with `Minimum payment` and `Due day` in whole words, no `…`, and `optional` whole under each; from `mqa bounds` the `Credit limit` and `Minimum payment` fields' tops equal ± 1 dp, and no label box crosses its tag's or its field's.
  - `onboarding.md` · `N2 credit card form, label beside its tag, large font`: the reach of the N2 row at `:21`, the same proofs.
  - `edit_account.md` · `credit card, label beside its tag, large font`: a seeded card's edit route, the same proofs; no empty pass, as at `:26`.
  - `budget.md` · `summary and bucket lines, large font`: the three lenses, on the device's month and with September selected. Proof: the Acceptance lines of that group read from crops.
  - `budget.md` · `long word in a name, large font`: the seed's category and named budget. Proof: each title one line high from `mqa bounds`, ending in a whole `…`.
  - `budget.md` · `readable text, large font` (`:45`), rewritten only if its read changes: where the eyebrow or the `<n> days left` label ends in a whole `…` at 2.0 on that row's seed once step 3 app-scales them, the clause `in whole words on at most two lines` becomes the read.
  - `transactions.md` · `day headers, large font` (`:63`), extended: on the seed's seven-figure day the net is one line, at most `resolveDayHeaderNetMaxWidth(2, <window width>)` ± 1 dp wide with no `…`, the pill whole, the header `resolveDayHeaderGeometry(2).height` ± 1.
  Every row's 1.0 shot matches `main`. A repo path a row cites has to exist (`scripts/validate-agent-assets.js:125-130`), which is why this step is last.
- Test: `none` · documentation; `npm run lint` checks its path references.

## Screens
- `emulator-verify/features/spending_plan_detail.md`: `readable text, large font`, new, added by step 8
- `emulator-verify/features/budget_category_detail.md`: `readable text, large font`, new, added by step 8
- `emulator-verify/features/add_account.md`: `credit card form, label beside its tag, large font`, new, added by step 8
- `emulator-verify/features/onboarding.md`: `N2 credit card form, label beside its tag, large font`, new, added by step 8
- `emulator-verify/features/edit_account.md`: `credit card, label beside its tag, large font`, new, added by step 8
- `emulator-verify/features/budget.md`: `summary and bucket lines, large font`, new, added by step 8
- `emulator-verify/features/budget.md`: `long word in a name, large font`, new, added by step 8
- `emulator-verify/features/budget.md`: `readable text, large font`, in the file at `:45`, re-read at 1.0 and 2.0 after steps 2 and 3
- `emulator-verify/features/transactions.md`: `day headers, large font`, in the file at `:63`, its proof extended by step 8

## Non-goals
- The skeletons: `spending_plan_detail_skeleton.tsx`, `category_detail_skeleton.tsx` and `budget_screen_skeleton.tsx` keep their shapes and row counts.
- `src/constants/strings.ts`: no string changes.
- `live_month_card.tsx`, the plan summary's balance, date line and status chip, the flexible row, and the Budget tab summary's balance and metrics.
- `rule_bucket_row.tsx:116` and `src/modules/dashboard/screens/dashboard/components/budget_card.tsx:213` keep `resolveLoneWordLines` alone; they pass app copy.
- A cut after a whole word. The hook lowers a line cap; Android's own cut stays inside the word.
- The balance row's labels (`account_form.tsx:74`, `:97`) and every other `FormLabelText` caller.
- The day header's label, pill, skeleton bar and `resolveDayHeaderGeometry`.
- A guard row in `scripts/validate-structural-guards.js` for the shared block.
- Everything #700 Out of scope names: the stack header title, the not-found and load-error buttons, Home and Commitments, the three other detail screens, MA-141's typeface cut, MA-142's skeleton heights.

## Untested inputs
- `onTextLayout` on a device, which Jest never fires: step 1, read on `budget.md · long word in a name, large font`.
- The two rows after the move, at 1.0 and 2.0: step 2, `budget.md · readable text, large font`.
- That neither row declares its own block: step 2, read from the diff.
- The plan detail's and the category detail's rendered props: steps 4 and 5.
- `FormLabelText`'s stacked layout, the two `credit_card_fields.tsx` call sites at `:61` and `:93`, and `Due day` at `:129`, drawn with its tag under it and no reserve: step 6; the geometry is tested.
- The day header's rendered net: step 7; the cap is tested.
- A name that breaks after a character that is neither a space nor a hyphen, such as `/`: step 1 reads it as a break between words.
- A name in a script other than Latin, where every fixture is Latin: step 1. A script that writes no space between words reads every wrap as a break inside a word.
- The trailing label's scaled style and lone-word cap (`budget_summary_parts.tsx:166-173`): step 3. Only `summary_card.tsx:35` passes `trailingLabel`, and the planned case renders `MonthlyRuleSummary`, which passes none (`monthly_rule_summary.tsx:30-41`); `budget.md · summary and bucket lines, large font` reads it.
- Font scales between 1.0 and 2.0, and windows other than 411 dp wide, on a device: every step.
- iOS: every step.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `budget.md · long word in a name, large font`: the first layout draws the name at the caller's cap and the handler lowers it on a second pass, 116 ms later on the probe's category detail title, so the split word and its extra line show for that long.
- `resolveWordSafeLines` reads a break between words from the space at a line's end (`node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/views/text/FontMetricsUtil.kt:67`), which the probe read on Android. A platform that trims it turns every wrapped name into one line.
- `budget_category_detail.md · readable text, large font`: the chart labels' stop at 1.3 rests on the probe's "about 1.5 times". A label that needs less than `Type.chip` × 1.3 to fit its column, a starred `May*` among twelve, shrinks alone under the fit, and a chart of three months, whose labels fit at twice their size on `main`, also stops at 1.3.
- `budget_category_detail.md · readable text, large font`: a text moved to app scaling draws larger at 2.0 than the OS-scaled text #700 Context measured, so the month, the title and the plan row's name are wider than its figures.
- `spending_plan_detail.md · readable text, large font`: the balance beside the status chip is unchanged and has no fit; a six-figure total is outside the seed.
- `budget.md · summary and bucket lines, large font`: in a live September the 50/30/20 eyebrow shares its row with `<n> days left`, which an October device cannot draw.
- `budget.md · readable text, large font`: the app-scaled eyebrow or trailing label may end in `…` where `:45` reads it whole.
- `add_account.md · credit card form, label beside its tag, large font`: two reserved lines hold `Minimum payment` only while each word fits the cell.
- `transactions.md · day headers, large font`: the cap takes the window's width as the header's; a list inset from the window would cap the net too wide.
- Line numbers are at `4d282648`. #700 cites `06c78c30`, and `budget_card.tsx` moved since (its caller is `:213`, not `:200`).
- The probe's three rows were read on a seeded database alone, with no six-figure budget or income, and no 1.0 shot was compared with `main`.
- not probed: `onboarding.md` · `N2 credit card form, label beside its tag, large font`
- not probed: `edit_account.md` · `credit card, label beside its tag, large font`
- not probed: `budget.md` · `summary and bucket lines, large font`
- not probed: `budget.md` · `long word in a name, large font`
- not probed: `budget.md` · `readable text, large font`
- not probed: `transactions.md` · `day headers, large font`

## Self-assessment
Step 7 is the one I am least sure of. No probe drew it, and it rests on `adjustsFontSizeToFit` honouring a `maxWidth` in dp inside the header's fixed height, with the window's width standing for the header's. If the fit ignores the bound the net keeps today's overflow. Step 5's chart labels are second: the stop at 1.3 is sized from one shot's "about 1.5 times", so the widest label of a twelve-month row may still shrink alone, by a few percent where it was half. Step 1's two unknowns are closed by the probe on Android; what remains there is the 116 ms between the split name and its one line.
