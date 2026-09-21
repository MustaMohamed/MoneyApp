# Spending plan detail

Route `/budget/plans/[id]`. Screen `src/modules/budget/screens/budget/spending_plan_detail/index.tsx`, summary card `spending_plan_detail/components/spending_plan_detail_summary.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Budget` tab, the `Plans` lens (`Strings.budgetPlansTab`), then a plan card.
- Script: `$MQA tap 'Budget'`, `$MQA tap 'Plans'`, then `$MQA tap '<plan name>'`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| detail status chip | no frame, MA-087 | open each of the four plans seeded for `budget.md` § States (`plan card status chip`): `Upcoming`, `On track`, `Watch`, `Over` | the chip label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11.5))` = 16 ± 1, and the chip's `min-h-6` (24) holds it, so the chip reads 24 at every status; one shot per status of the summary card |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | `/budget`, the `Plans` lens | n/a |
| edit | the plan sheet over this screen | this detail |
| category row tap | that category's transactions | this detail |

## Gotchas

- The summary's status chip is byte-identical to the card's on `budget.md`; one read holds on both, and a divergence is a caller override.
- The chip carries `accessibilityRole="text"`, so it reaches `ui.xml` and the 24 is read from the chip node rather than composed from the label.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
