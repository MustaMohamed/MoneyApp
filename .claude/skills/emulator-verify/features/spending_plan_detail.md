# Spending plan detail

Route `/budget/plans/[id]`. Screen `src/modules/budget/screens/budget/spending_plan_detail/index.tsx`, summary card `spending_plan_detail/components/spending_plan_detail_summary.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Budget` tab, the `Plans` lens (`Strings.budgetPlansTab`), then a plan card.
- Script: `id=$($MQA db "select id from spending_plans where name='<n>'" | sed -n 's/.*"id": "\(.*\)".*/\1/p')` then `mqa open /budget/plans/$id`. Use it for every plan after the first: the list route reaches only the cards on screen (§ Gotchas).

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| detail status chip | no frame, MA-087 | open each of the four plans seeded for `budget.md` § States (`plan card status chip`): `Upcoming`, `On track`, `Watch`, `Over` | the chip label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11.5))` = 16 ± 1, and the chip's `min-h-6` (24) holds it, so the chip reads 24 at every status; one shot per status of the summary card |
| not found and load error, large font | no frame, MA-130 | not found: `mqa open /budget/plans/<an id no plan has>`; load error: `throw new Error('forced')` as the first line of `loadPlan`'s `try` (`src/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook.ts`), reverted after; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on each state's button; one crop per state at 2.0 |
| header title, large font | no frame, MA-159 | a seeded plan with a name long enough to truncate at 2.0, `mqa open /budget/plans/<id>`; on the empty database an id no plan has, titled `Plan details`; the `Font scale` force (README) at 1.0 and 2.0 | the `Header proof` (README) on the plan's name, the edit pencil (`label="Edit plan <name>"`) as the right action on the seeded pass |
| skeleton, large font | no frame, MA-160 | source force `await new Promise<never>(() => undefined);` as the first line of `loadPlan`'s `try` (`src/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook.ts`), then the plan's route, with a temporary `onLayout` on the title bar, the status pill, one metric bar, a row's second line, the rail and a row icon in `spending_plan_detail_skeleton.tsx` that logs `e.nativeEvent.layout.height`, read with `mqa logs --info` and reverted with `git status` clean; then, the force reverted, the loaded screen: on the MA-160 seed (`budget.md` § Gotchas) the plan with allocated categories; on an empty database with onboarding complete an id no plan has, the not-found state; the `Font scale` force (README) at 1.0 and 2.0 | at 2.0 the title bar, the pill, the metric bar and the row line read twice their 1.0 heights ± 1 dp, 62, 48, 64 and 23; the rail and the icon read their 1.0 heights ± 1, 4 and 28; a shot per scale, and the 1.0 shot matches `main`; on the loaded screen at 2.0 no text is cut at the top or bottom and no text box crosses another node's box |
| plan at a float tie | no frame, MA-158 | the float-tie seed (`dashboard.md` § States); `mqa open /budget/plans/ma158-plan` | `mqa read` and one shot, the reading before MA-158 in brackets, where each `left` read `over` and each `Watch` read `Over`: the summary reads `0 EGP left` in green (red), `Watch` and `100% used`; the category row's label reads `Groceries, 0 of 0, 100% used, 0 left, Watch`, its ring and its `100% used · watch` line in `Colors.dark.budgetNear` and its `0 left` in `Colors.dark.text2` |
| readable text, large font | no frame, MA-171 | the MA-171 seed (`budget.md` § Gotchas), `mqa open /budget/plans/ma171-plan`; on an empty database with onboarding complete an id no plan has, the not-found state; the `Font scale` force (README) at 1.0 and 2.0 | at 2.0 from `mqa bounds`: the `% used` box ends at or left of the rail's right edge, each metric of `budget-summary-metrics` is on its own row, a category row's status box is taller than one line inside a row taller than at 1.0, and the heading total ends at or left of the row's right edge; crops at 2.0: no word split, a row's name whole or ending in a whole `…`, each insight on its own row, and each metric value, the heading total and each row amount whole on one line; the 1.0 shot matches `main` |
| header edit tap band | no frame, MA-194 | a seeded plan, `mqa open /budget/plans/<id>`, at font scale 1.0; `mqa bounds` on the pencil (`label="Edit plan <name>"`), bounds in px as dp × 2.625 rounded; `tapxy` at the centre of its top, bottom and right edges 1 dp inside `HEADER_ACTION_HIT_SLOP.trailing` (5 dp on `Pixel_2_API_34`, so 11 px outside the box), then one `tapxy` 1 dp past its top edge (16 px) and one 3 px left of its left edge, toward the title, with a cold launch and the deep link before each tap | the pencil reads 36 by 36 ± 1 dp; each of the three 11 px taps opens the plan sheet; the 16 px tap and the left tap open nothing, since the side toward the title takes no slop (MA-236); one shot per tap. The closed sheet's nodes stay in `mqa bounds`, `label="Save plan"` among them, so the shot decides, not a read. On `main` the 19 px taps open nothing |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | `/budget`, the `Plans` lens | n/a |
| edit | the plan sheet over this screen | this detail |
| category row tap | that category's transactions | this detail |

## Gotchas

- The summary's status chip is byte-identical to the card's on `budget.md`; one read holds on both, and a divergence is a caller override.
- The chip carries `accessibilityRole="text"`, so it reaches the accessibility tree and the 24 is read from the chip node rather than composed from the label.
- Back restores the `Plans` list to its previous scroll offset, so a scroll-and-find loop re-reads the cards it already visited and never brings the off-screen ones up; walking all four statuses costs a deep link per plan, not a second visit to the list (MA-087 render lens reached 2 of 4 this way).

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
