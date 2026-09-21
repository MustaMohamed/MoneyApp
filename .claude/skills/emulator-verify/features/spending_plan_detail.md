# Spending plan detail

Route `/budget/plans/[id]`. Screen `src/modules/budget/screens/budget/spending_plan_detail/index.tsx`, summary card `spending_plan_detail/components/spending_plan_detail_summary.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Budget` tab, the `Plans` lens (`Strings.budgetPlansTab`), then a plan card.
- Script: `id=$($MQA db "select id from spending_plans where name='<n>'" | tail -1)` then `adb shell am start -a android.intent.action.VIEW -d "moneyapp://budget/plans/$id"`. Use it for every plan after the first: the list route reaches only the cards on screen (§ Gotchas).

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
- Back restores the `Plans` list to its previous scroll offset, so a scroll-and-find loop re-reads the cards it already visited and never brings the off-screen ones up; walking all four statuses costs a deep link per plan, not a second visit to the list (MA-087 render lens reached 2 of 4 this way).

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
