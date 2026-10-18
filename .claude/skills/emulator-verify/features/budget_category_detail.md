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
| readable text, large font | no frame, MA-171, MA-179, MA-194 | the MA-179 seed (`budget.md` § Gotchas), which holds the MA-171 seed: `mqa open /budget/ma171-cat-long`, the name with a long word, for the title, before any scroll, since a category opened after a scrolled one keeps that scroll offset and draws with its live card scrolled off; then `mqa open /budget/ma179-cat-word`, a name of one word wider than the title line at 1.0; then `mqa open /budget/cat_transport`, the category with twelve months; on an empty database with onboarding complete a category no budget names, which draws the header alone; the `Font scale` force (README) at 1.0 and 2.0 | at 2.0 from `mqa bounds`: each ledger month one line high in a column `resolveLedgerMonthColumnWidth(2)` ± 1 dp wide, and each description box ending at least 8 dp left of its chip's, the chip's left edge read from the shot's pixels since the chip has no node, 21 px on the 2.625 emulator; crops at 2.0: each ledger chip amount whole, the title in whole words, the long-word name one line high ending in a whole `…`, each ledger description wrapped between words, twelve chart labels each on one line inside its column and at one size, each tile value on one line and clear of the tile's border; `ma179-cat-word`'s title one line high ending in a whole `…` at 1.0 and at 2.0; the 1.0 shots of `ma171-cat-long` and `cat_transport` match `main` but for the pencil in the 36 box and the title line beside it, 7 dp narrower |
| month figures at a float tie | no frame, MA-158 | the float-tie seed (`dashboard.md` § States); `mqa open /budget/cat_groceries` | `mqa read` and one shot, the reading before MA-158 in brackets: the live card reads `0 left` in green (red) over a bar in `SemanticTokens.warning` (red); the net tile reads `0` in green with no sign (red); the third tile reads `2 of 2` over `under limit` (`1 of 2`); both ledger chips read `0` in green (this month's red); both chart bars are green at the minimum height (this month's red) |
| header back and edit tap band | no frame, MA-194 | a category whose budget covers the device's month, so the pencil draws: `mqa open /budget`, then `mqa open /budget/<category id>`, so the `Budget` tab sits under the detail; font scale 1.0; `mqa bounds` on `label="Go back"` and on `label="Edit budget"`, bounds in px as dp × 2.625 rounded; `tapxy` at the centre of each edge 19 px (7.2 dp) outside each box, with a cold launch and both links before each tap | each box reads 36 by 36 ± 1 dp; each of the four taps round the pencil lands on the `Budget` tab with the set-budget sheet open, since the pencil goes back and opens the sheet there; each of the four round the back box leaves the detail for the screen under it; one shot per tap. On `main` the back box takes no tap outside it |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | the `Budget` tab | the tab you came from |

## Gotchas

- The load error here is not `LoadErrorAlert`: it is a text line and a shared `sm` button, so it carries no `budget-load-error` testID; select it by `label="Try again"`.
