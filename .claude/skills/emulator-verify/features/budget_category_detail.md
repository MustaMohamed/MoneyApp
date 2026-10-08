# Budget category detail

Route `/budget/[id]`, pushed from a category row on the `Budget` tab. Screen `src/modules/budget/screens/budget/category_detail/index.tsx`. Not redesigned; drawn as it is today. This file carries only the state MA-130 needs; add the rest when a ticket reaches them.

## Reach it

- User path: the `Budget` tab, the `Categories` lens, then a category's budget row (`budget.md` § Outbound).
- Script: `$MQA open /budget/<category id>`, the id from `$MQA db "select category_id from budgets limit 1"`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| load error retry, large font | no frame, MA-130 | the force of `budget.md`'s `add button clearance, load error`, then the category's route; the `Font scale` force (README) at 1.0 and 2.0 | `Could not load your budget.` shows as plain text with `Try again` below it, no testID; the `Button proof` (README) on `Try again` (`sm`); one crop at 2.0 |
| skeleton, large font | no frame, MA-160 | the hung `load` of `budget.md`'s `skeleton, large font`, then the category's route, with a temporary `onLayout` on the title bar, the amount bar, the rail, one tile and the chart shape in `category_detail_skeleton.tsx` that logs `e.nativeEvent.layout.height`, read with `mqa logs --info` and reverted with `git status` clean; then, the force reverted, the loaded screen: on the MA-160 seed (`budget.md` § Gotchas) the category with budgets in three months, so the tiles, the chart and the ledger draw; on an empty database with onboarding complete a category no budget names, which draws the header alone; the `Font scale` force (README) at 1.0 and 2.0 | at 2.0 the title bar and the amount bar read twice their 1.0 heights ± 1 dp, 36 and 56; the rail, the tile and the chart shape read their 1.0 heights ± 1, 8, 64 and 64; a shot per scale, and the 1.0 shot matches `main`; on the loaded screen at 2.0 no text is cut at the top or bottom and no text box from `mqa bounds` crosses another node's box |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | the `Budget` tab | the tab you came from |

## Gotchas

- The load error here is not `LoadErrorAlert`: it is a text line and a shared `sm` button, so it carries no `budget-load-error` testID; select it by `label="Try again"`.
