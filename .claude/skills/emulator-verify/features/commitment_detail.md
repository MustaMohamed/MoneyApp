# Commitment detail

Route `/stacked/commitments/[id]` from the list, `/commitments/[id]` on the tab stack. Screen `src/modules/commitments/screens/commitments/detail/index.tsx`, current-cycle card `detail/components/current_cycle_card.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: a commitment row on the `Commitments` tab (`commitments.md` § Outbound).
- Script: `$MQA tap '<commitment name>'` on the list; the row pushes the `/stacked` twin, so the detail sits above the tabs.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| current-cycle status pill | no frame, MA-087 | open a commitment whose current payment is in each of `Overdue`, `Due`, `Upcoming`, then `Paid` after `Mark as paid` | the status label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11))` = 15 ± 1, so the pill is 15 + 4 (`py-0.5`) = 19 at every status; one shot per status of the current-cycle card |
| hero amount, neutral | no frame, MA-103 | the upgrade seed: open `Walk Rent` | `mqa read` carries the amount `TextView`; one shot of the hero: the amount in the foreground colour, not the category tone, and the glyph still in `#5C7FC4` |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | `/commitments` | n/a |
| edit | `/stacked/commitments/[id]/edit` | this detail |
| `Mark as paid` / `Skip` | this detail, the cycle card restated | n/a |

## Gotchas

- The pill is a `View` with no touch handler, so it is flattened out of the accessibility tree: read the label `TextView` and add `py-0.5` (2 dp each side), or measure the painted pill on the shot (`README.md` § The rule).
- `Mark as paid` is the only way to `Paid` without a seed push, and it does not come back — use one commitment per status, or re-push the seed.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
