# Transaction detail

Route `/transactions/detail/[id]`, and its `/stacked` twin when reached from a stacked screen. Screen `src/modules/transactions/screens/transactions/detail/index.tsx`, hero `detail/components/detail_hero.tsx` over the shared `src/components/ui/type_badge.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: a transaction row on the `Transactions` tab (`transactions.md` § Outbound).
- Script: `$MQA tap '<transaction title>'` on the list.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| type badge, md | no frame, MA-087 | open the commitment-owned transaction from `transactions.md` § States (`type badge, sm`) | the hero badge label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11))` = 15 ± 1, so the badge is 25 (15 + `py-1` + the 1 dp `border` pair); one shot of the hero |
| hero pill, category tone | no frame, MA-103 | the upgrade seed: open the Housing expense | one shot of the hero pill: the glyph and the `Housing` label in `#5C7FC4` on the pill, readable on the hero gradient |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | `/transactions` | n/a |
| edit | the transaction form | this detail |
| view commitment | `/stacked/commitments/[id]`, above the tabs (MA-072) | this detail |

## Gotchas

- `TypeBadge` is shared with the transaction row, which renders it at `sm`. The two sizes are measured once each, `sm` on `transactions.md` and `md` here; a divergence is a caller override.
- The badge wrapper carries `accessibilityRole="text"`, so it reaches the accessibility tree: read the label `TextView` for the line box and the wrapper for the padded height.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
