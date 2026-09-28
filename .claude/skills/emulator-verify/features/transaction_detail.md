# Transaction detail

Route `/transactions/detail/[id]`, and its `/stacked` twin when reached from a stacked screen. Screen `src/modules/transactions/screens/transactions/detail/index.tsx`, hero `detail/components/detail_hero.tsx` over the shared `src/components/ui/type_badge.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: a transaction row on the `Transactions` tab (`transactions.md` § Outbound).
- Script: `$MQA tap '<transaction title>'` on the list.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| type badge, md | no frame, MA-087 | open the commitment-owned transaction from `transactions.md` § States (`type badge, sm`) | the hero badge label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11))` = 15 ± 1, so the badge is 25 (15 + `py-1` + the 1 dp `border` pair); one shot of the hero |
| hero pill, category tone | no frame, MA-103 | the MA-103 seed (`categories.md` § Seeding and forcing states): open the Housing expense | one shot of the hero pill: the glyph and the `Housing` label in `#5C7FC4` on the pill, readable on the hero gradient |
| saved toast after edit, tabs copy | A15, MA-106 | `mqa open /transactions/detail/<id>` on a seeded expense, `$MQA tap 'Edit transaction'`, `$MQA wait 'label="Save changes"'`, `$MQA tap 'label="Save changes"'` | `mqa wait 'Transaction saved.'`; `label="Add"` reads `no match`; the toast label reads 75.8 lower than over the FAB (y 599.6 against 523.8 on `Pixel_2_API_34`, the FAB's 59.05 plus `Spacing.md`), so the toast's bottom sits where the FAB's bottom sits over the tabs (639.2 from the shot against 639.65), `safeAreaBottom + Size.tabBarHeight + Spacing.md`; that line is 26.7 above the tab bar's drawn top hairline (665.9), the same gap the FAB keeps; one shot |
| saved toast after edit, stacked twin | A15, MA-106 | the same on `mqa open /stacked/transactions/detail/<id>` | `mqa wait 'Transaction saved.'`; `~Transactions` reads `no match`, no tab bar; the toast label at y 663.6, its bottom 28.5 above the screen's bottom edge, above the gesture handle; one shot |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | `/transactions` | n/a |
| edit | the transaction form; after `Save changes`, the toast `Transaction saved.` over this detail (`saved toast after edit, *`) | this detail |
| view commitment | `/stacked/commitments/[id]`, above the tabs (MA-072) | this detail |

## Gotchas

- `TypeBadge` is shared with the transaction row, which renders it at `sm`. The two sizes are measured once each, `sm` on `transactions.md` and `md` here; a divergence is a caller override.
- The badge wrapper carries `accessibilityRole="text"`, so it reaches the accessibility tree: read the label `TextView` for the line box and the wrapper for the padded height.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
