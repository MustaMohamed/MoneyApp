# Budget

Route `/budget`, a tab. Screen `src/modules/budget/screens/budget/index.tsx`, copy sheet `components/budget_copy_sheet.tsx`; both render `src/components/ui/month_filter.tsx` directly, the screen with its step buttons and the sheet with `showStepButtons={false}`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Budget` tab.
- Script: `$MQA tap 'Budget'` on the tab bar, or `adb shell am start -a android.intent.action.VIEW -d "moneyapp://budget"`.
- The copy sheet opens from the `Copy` tool on the screen: `$MQA tap` by its accessibility label `Copy budget`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| copy sheet month filter | no frame, MA-086 | open the copy sheet | the source pill is the clickable `<label>, open month picker` node: its bounds ÷ 2.625 read 32 high (`h-8`) with the label `TextView` centred within ± 1, the same read `transactions.md` makes on the rail; one shot of the `Copy from` row |

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
- A deep link does not dismiss an open bottom sheet: the copy sheet stays mounted over the next screen and its nodes answer the reads. `am force-stop` before the next state.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
