# Budget

Route `/budget`, a tab. Screen `src/modules/budget/screens/budget/index.tsx`, copy sheet `components/budget_copy_sheet.tsx`; both render `src/components/ui/month_filter.tsx` directly, the screen with its step buttons and the sheet with `showStepButtons={false}`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Budget` tab.
- Script: `mqa open /budget`, or the tab bar's exact content-desc from `mqa ui`; the bare `$MQA tap 'Budget'` is refused under the uiautomator engine.
- The copy sheet opens from the `Copy` tool on the screen: `$MQA tap` by its accessibility label `Copy budget`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| copy sheet month filter | no frame, MA-086 | open the copy sheet | the source pill is the clickable `<label>, open month picker` node: its bounds ÷ 2.625 read 32 high (`h-8`) with the label `TextView` centred within ± 1, the same read `transactions.md` makes on the rail; one shot of the `Copy from` row |
| plan card status chip | no frame, MA-087 | the `Plans` lens (`Strings.budgetPlansTab`) with plans seeded in the four statuses (`Upcoming`, `On track`, `Watch`, `Over`, `spending_plans.helpers.ts:71-74`) | each status label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11.5))` = 16 ± 1, the chip's `min-h-6` (24) holds it so the chip reads 24, and the title row is unchanged from base; one shot |
| plan card 'more' chip | no frame, MA-087 | a plan with four or more categories (`spending_plans.helpers.ts:459-483`: three chips show, the rest fold) | the `+N` label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(14))` = 19 ± 1, the chip's `min-h-7.5 min-w-7.5` (30) holds it so the chip reads 30 and stays round; same shot |
| plan card allocation chip | no frame, MA-087 | a plan with an allocated category | the amount `TextView` reads `lineHeightFor(msFont(13))` = 18 ± 1 and the percentage `lineHeightFor(msFont(11))` = 15 ± 1; the stacked boxes are 33, above the chip's `min-h-8` (32) floor, so the chip reads 33; same shot |
| category chip glyph, recoloured | no frame, MA-103 | the MA-103 seed (`categories.md` § Seeding and forcing states): a budget on Housing for the current month | one shot of the Housing budget row: the glyph in `#5C7FC4` on its tint box |

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

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
