# Budget

Route `/budget`, a tab. Screen `src/modules/budget/screens/budget/index.tsx`, copy sheet `components/budget_copy_sheet.tsx`; both render `src/components/ui/month_filter.tsx` directly, the screen with its step buttons and the sheet with `showStepButtons={false}`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Budget` tab.
- Script: `mqa open /budget`, or the tab bar's exact content-desc from `mqa ui`; the bare `$MQA tap 'Budget'` is refused under the uiautomator engine.
- The copy sheet opens from the `Copy` tool on the screen: `$MQA tap` by its accessibility label `Copy budget`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| copy sheet month filter | no frame, MA-086 | open the copy sheet | the source pill is the clickable `<label>, open month picker` node: its bounds ÷ 2.625 read 32 high (`resolveMonthPillGeometry(1).height`) with the label `TextView` centred within ± 1, the same read `transactions.md` makes on the rail; one shot of the `Copy from` row |
| plan card status chip | no frame, MA-087 | the `Plans` lens (`Strings.budgetPlansTab`) with plans seeded in the four statuses (`Upcoming`, `On track`, `Watch`, `Over`, `spending_plans.helpers.ts:67-70`) | each status label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11.5))` = 16 ± 1, the chip's `min-h-6` (24) holds it so the chip reads 24, and the title row is unchanged from base; one shot |
| plan card 'more' chip | no frame, MA-087 | a plan with four or more categories (`spending_plans.helpers.ts:455-479`: three chips show, the rest fold) | the `+N` label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(14))` = 19 ± 1, the chip's `min-h-7.5 min-w-7.5` (30) holds it so the chip reads 30 and stays round; same shot |
| plan card allocation chip | no frame, MA-087 | a plan with an allocated category | the amount `TextView` reads `lineHeightFor(msFont(13))` = 18 ± 1 and the percentage `lineHeightFor(msFont(11))` = 15 ± 1; the stacked boxes are 33, above the chip's `min-h-8` (32) floor, so the chip reads 33; same shot |
| category chip glyph, recoloured | no frame, MA-103 | the MA-103 seed (`categories.md` § Seeding and forcing states): a budget on Housing for the current month | one shot of the Housing budget row: the glyph in `#5C7FC4` on its tint box |
| add button clearance, populated | no frame, MA-125 | a seed with enough budgets this month that the `Budgets` lens scrolls; the `Font scale` force (README) at 1.0 and 2.0 | scrolled to its end (`mqa scroll down --until` its last row), at both scales, the last text node's bottom from `mqa bounds` is at or above the top of `fab-button`; one shot at 2.0 |
| add button clearance, empty | no frame, MA-125 | an empty database: the budget empty state; the `Font scale` force (README) at 1.0 and 2.0 | at both scales, scrolled to its end, no text node's box intersects `fab-button`'s; one shot at 2.0 |
| add button clearance, load error | no frame, MA-125 | source force: `throw new Error('forced')` as the first line of the `try` in `load` (`budget.store.ts`, the loader `budget.hook.ts` calls), reverted after; the `Font scale` force (README) at 1.0 and 2.0 | `budget-load-error` shows; at both scales no text node's box from `mqa bounds` intersects `fab-button`'s; one shot at 2.0 |
| lens tabs, large font | no frame, MA-126 | a seeded database; the `Font scale` force (README) at 1.0 and 2.0 | each of the three lens labels' `TextView` box lies inside its trigger's clickable node at both scales, and at 1.0 the triggers read the height they read at base; a crop of the lens tabs at 2.0: each label whole or ending in a whole `…` inside its tab, no glyph cut at the top or bottom |
| month pill, large font | no frame, MA-126 | a seeded database, the rail as it mounts; the `Font scale` force (README) at 1.0 and 2.0 | the clickable `<label>, open month picker` node reads 32 ± 1 dp high at 1.0 and `resolveMonthPillGeometry(2).height` ± 1 at 2.0, its label `TextView` box inside it; a crop of the pill at 2.0: the month label cut at neither the top nor the bottom |
| copy sheet month pill, large font | no frame, MA-126 | a seeded database, the copy sheet open (`Copy`), its source pill; the `Font scale` force (README) at 2.0 | the clickable `<label>, open month picker` node reads `resolveMonthPillGeometry(2).height` ± 1 dp high at 2.0, its label `TextView` box inside it; a crop of the pill at 2.0: the month label cut at neither the top nor the bottom |
| empty-state button, large font | no frame, MA-126 | an empty database with onboarding complete: the budget empty state; the `Font scale` force (README) at 1.0 and 2.0 | `mqa bounds 'label="Set up your budget"'` reads 48 ± 1 dp high at 1.0 and at 2.0 (HeroUI `md`, fixed), its label `TextView` box inside it; a crop of the button at 2.0: the label whole or ending in a whole `…` inside the button, no glyph cut at the top or bottom |
| lens walk, large font | no frame, MA-127 | the `Font scale` force (README) at 2.0, once on an empty database and once on a seed that draws all three lenses: a category budget holding a named budget, an income for the `50/30/20` buckets, and the spending plans of the `plan card status chip`, `plan card 'more' chip` and `plan card allocation chip` rows, the `Upcoming` plan starting later in the walked month, since `Plans` lists only the plans that overlap it; no category given a 50/30/20 group for the month, so `Not grouped` draws (with an income set, an ungrouped category lands there, `budget_buckets.helpers.ts:174-183`); at 2.0 the category rows sit below the summary card, so wait on `label="Categories"` and `mqa scroll down --until` the row; tap a lens with `mqa tapxy` at the centre `mqa bounds 'label="50/30/20"'` reads, since `mqa tap '~50/30/20'` presses the lens body | crops of the summary card, each category row with its chip, an expanded category's named-budget row, each `50/30/20` bucket row, and on `Plans` each plan card with its status, 'more' and allocation chips, each chip label inside its chip: no text cut at the top or bottom, and no text box from `mqa bounds` crossing another node's box; four more crops at 2.0 on the same seed: on `50/30/20`, the `Not grouped` amounts inside their row and clear of the left column, each line whole or ending in a whole `…`, the breakdown title and subtitle clear of each other and of the screen's right edge, and each bucket name whole beside its rule label; on `Categories`, an expanded named-budget ring with its label on one line inside the stroke |
| skeleton, large font | no frame, MA-127 | source force `await new Promise<never>(() => undefined);` as the first line of the `try` in `load` (`budget.store.ts`), reverted after; the `Font scale` force (README) at 1.0 and 2.0, on each of the three lenses (the lens tabs stay live); a temporary `onLayout` on the categories summary's title bar, a tool shape and a `ColdContentSkeleton` ring in `budget_screen_skeleton.tsx` that logs `e.nativeEvent.layout.height`, read with `mqa logs --info` at each scale and reverted with `git status` clean after | the title bar and the tool shape at 2.0 read twice their 1.0 height ± 1 dp, the ring its 1.0 height ± 1; a shot per lens per scale; the 1.0 shots match `main` |
| copy sheet footer, large font | no frame, MA-130 | the copy sheet (`Copy budget`); the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the footer buttons; one crop of the footer at 2.0 |
| copy sheet preview error, large font | no frame, MA-130 | source force: `throw new Error('forced')` as the first line of `loadCopyPreview`'s `try` (`src/modules/budget/store/budget.store.ts`), then the copy sheet; reverted after; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the retry button, the error text beside it inside the row; one crop at 2.0 |
| income sheet, large font | no frame, MA-130 | the income sheet; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the sheet's buttons; one crop at 2.0 |
| set-budget sheet, large font | no frame, MA-130 | the set-budget sheet from a category row; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the sheet's buttons; one crop at 2.0 |
| spending plan sheet, large font | no frame, MA-130 | the create-plan sheet from the `Plans` lens; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the sheet's buttons; one crop at 2.0 |
| plans empty create, large font | no frame, MA-130 | the `Plans` lens with no spending plan; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the create button, inside the screen width; one crop at 2.0 |
| rule manage button, large font | no frame, MA-130 | the 50/30/20 lens with one bucket expanded; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the manage button (`sm`, `resolveSmallButtonHeight`), its label ending before the arrow glyph, which stays inside the row; one crop at 2.0 |
| load error retry, large font | no frame, MA-130 | the force of `add button clearance, load error`; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on `Try again` in `budget-load-error`; one crop at 2.0 |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `Copy` | the copy sheet over this screen | this screen |
| the month pill | the month picker sheet | this screen |
| category row tap | `/budget/[id]` | this screen |
| Back | the previous tab | n/a |

## Gotchas

- The copy sheet's pill hides its step buttons, so it is wider than the screen's at the same height; measure the pill, not the row.
- The screen's own month pill is the shared `month_filter.tsx`, measured once as `month filter pill` in `transactions.md` § States; that read holds here, so only the copy sheet's caller (`showStepButtons={false}`) is measured on this screen.
- The three plan-card states need seeded spending plans; a device with none shows the lens's empty state and no card to measure. Build the seed before the walk (`README.md` § Seeding and forcing states).
- The `Plans` lens is a segment on this screen, not a route; the three plan-card states are all on one shot of a seeded card.
- The allocation chip reads 33 at 411 dp, one above its `min-h-8` floor, because its two stacked line boxes are 18 + 15. That is the state's proof, not a defect (MA-087).
- A plan seed that produces all four statuses needs dates on both sides of today; time is not an input on the emulator, so build the seed against the device date.
- The plan card's status chip is byte-identical to the detail summary's on `spending_plan_detail.md`; one read holds on both.
- A deep link does not dismiss an open bottom sheet: the copy sheet stays mounted over the next screen and its nodes answer the reads. `am force-stop` before the next state.
- The tab bar's clickable node carries the icon glyph before the label (`B, Budget`), so `$MQA tap 'Budget'` matches only the non-clickable text and is refused; tap the exact content-desc from `mqa ui`, or use the deep link.
- After `adb shell am force-stop`, `mqa open` alone lands on the dev-client launcher; cold-launch with `mqa seed` before the deep link.
- At `font_scale` 2.0 the FAB can cover a row's centre, so a tap by label hits the FAB; tap by coordinates from `mqa bounds`.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
