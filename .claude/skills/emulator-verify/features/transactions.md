# Transactions

Route `/transactions`, a tab. Screen `src/modules/transactions/screens/transactions/index.tsx`, month pill from `src/components/ui/filter_rail.tsx`, filter sheet `filter/index.tsx` over the shared `src/components/ui/filter_accordion.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Transactions` tab, or `See all` in an account detail's activity card.
- Script: `$MQA tap 'Transactions'` on the tab bar, or `adb shell am start -a android.intent.action.VIEW -d "moneyapp://transactions"`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| month filter pill | no frame, MA-086 | the rail as it mounts | the pill is the clickable `<label>, open month picker` node: its bounds ÷ 2.625 read 32 high (`h-8`), and the label `TextView` inside sits centred within ± 1 (8.4 above, 8.4 below, at `lineHeightFor(msFont(11))` = 15); one shot of the rail |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| transaction row tap | `/transactions/detail/[id]`, or the `/stacked` twin when reached from a stacked screen | this list |
| the month pill | the month picker sheet | this list |
| Back | the previous tab | n/a |

## Gotchas

- `month_filter.tsx` is shared with commitments and budget; a height read here holds there, and a divergence is a caller override.
- The pill's `h-8` is a fixed track: its height does not move with the label, so the pill state is about the label sitting centred in the track, not about the track growing.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
