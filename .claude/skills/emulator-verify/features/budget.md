# Budget

Route `/budget`, a tab. Screen `src/modules/budget/screens/budget/index.tsx`, copy sheet `components/budget_copy_sheet.tsx`; both render `src/components/ui/month_filter.tsx` directly, the screen with its step buttons and the sheet with `showStepButtons={false}`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Budget` tab.
- Script: `$MQA tap 'Budget'` on the tab bar, or `adb shell am start -a android.intent.action.VIEW -d "moneyapp://budget"`.
- The copy sheet opens from the `Copy` tool on the screen: `$MQA tap` by its accessibility label `Copy budget`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| month filter pill | no frame, MA-086 | the screen as it mounts | the pill is the clickable `<label>, open month picker` node: its bounds ÷ 2.625 read 32 high (`h-8`), and the label `TextView` inside sits centred within ± 1 (8.4 above, 8.4 below, at `lineHeightFor(msFont(11))` = 15); one shot of the pill row |
| copy sheet month filter | no frame, MA-086 | open the copy sheet | the source pill reads 32 high with its label `TextView` centred within ± 1, the same read as above; one shot of the `Copy from` row |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `Copy` | the copy sheet over this screen | this screen |
| the month pill | the month picker sheet | this screen |
| category row tap | `/budget/[id]` | this screen |
| Back | the previous tab | n/a |

## Gotchas

- The copy sheet's pill hides its step buttons, so it is wider than the screen's at the same height; measure the pill, not the row.
- `month_filter.tsx` is shared with the commitments and transactions rails; a height read here holds there, and a divergence is a caller override.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
