# Budget category detail

Route `/budget/[id]`, pushed from a category row on the `Budget` tab. Not redesigned; drawn as it is today. This file carries only the state MA-130 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Budget` tab, the `Categories` lens, then a category's budget row (`budget.md` § Outbound).
- Script: `$MQA open /budget/<category id>`, the id from `$MQA db "select category_id from budgets limit 1"`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| load error retry, large font | no frame, MA-130 | the force of `budget.md`'s `add button clearance, load error`, then the category's route; the `Font scale` force (README) at 1.0 and 2.0 | `Could not load your budget.` shows as plain text with `Try again` below it, no testID; the `Button proof` (README) on `Try again` (`sm`); one crop at 2.0 |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | the `Budget` tab | the tab you came from |

## Gotchas

- The load error here is not `LoadErrorAlert`: it is a text line and a shared `sm` button, so it carries no `budget-load-error` testID; select it by `label="Try again"`.
