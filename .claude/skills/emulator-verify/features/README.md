# Feature map

One file per screen the user can reach. Each file is the scripted way to reach the screen, the list of states it can be in, how to force each state, and what proves it rendered. The files are the reference for every render pass and render lens: a walk is written by copying recipes from here, not by exploring the app.

## Why it exists

On the accounts redesign (#378) the render lens ran a median 99 messages per ticket, most of them discovery, and both nets still missed geometry drift on three merged tickets. The canvas drew one account type per frame, so the credit-card variant of a screen was found missing on three tickets in a row. A state list per screen, written once, closes both: the lens runs a recipe, and a state nobody listed is visible as a gap before code.

## The rule

- **A state not in the file is a state the design did not draw.** Before shooting it, add it here with its frame or `no frame` and the ticket that introduces it. The `/prep` probe of a `Screen checks` row marked `new` is the exception: it shoots the state before the plan's step adds it here.
- **Prep names files and states, never prose.** The plan's Screens section is `features/<screen>.md`: the state names. The reviewer refuses a state the file does not carry unless a plan step adds it.
- **Implementer and lens run the same recipe.** The render pass proves the states the plan names; the lens re-runs the same recipes on the pushed SHA and judges the shots against the frame. Neither invents scenarios.
- **Proof is `mqa bounds`, `mqa read` or `mqa db` first, a shot only for what is visual.** `grep -c` over `mqa read` answers "did this text render"; a cropped shot answers proportion and placement. Grep a label's own text (`grep -c '"Reorder '`): it matches both the agent-device output and the uiautomator dump.
- **Density is 2.625, not 3.** Geometry comes from `mqa bounds`, which prints dp: "bounds ÷ 2.625" in these files is the division it already did. Never measure PNG pixels.
- **A padded pill has no node of its own.** React Native flattens a `View` with no touch handler or accessibility role, so a badge's container never reaches the accessibility tree and `mqa bounds` finds no node for it; only its label `TextView` does. Measure the label's line box and add the container's padding (`py-0.5` is 2 dp each side), or measure the clickable ancestor when there is one (MA-086).

## File shape

Four sections, in this order: `Reach it` (route, user path, deep link), `States` (table: state, frame, force, proof), `Outbound` (every action that leaves the screen and where Back lands), `Gotchas`. Frames are the canvas ids from `~/.ship/MoneyApp/canvas/README.md`, except in a feature file whose header names another canvas, which takes its frame ids from that canvas; the artboard source is the measurement, the PNG is the look.

## Files

| File | Route | Frames |
|---|---|---|
| [accounts_list.md](accounts_list.md) | `/accounts` | A1, B1 to B7, F1, G3 |
| [account_detail.md](account_detail.md) | `/accounts/[id]`, active | C1, C2, C2b, C3, F2, G1, G2 |
| [archived_account.md](archived_account.md) | `/accounts/[id]`, archived, and the delete flow | C4, E1 to E4, F4, F5 |
| [edit_account.md](edit_account.md) | `/accounts/[id]/edit` | D1 to D3, F3 |
| [add_account.md](add_account.md) | `/accounts/add_account` | not redesigned |
| [dashboard.md](dashboard.md) | `/dashboard` | not redesigned |
| [commitments.md](commitments.md) | `/commitments`, and its filter sheet | not redesigned |
| [add_commitment.md](add_commitment.md) | `/commitments/add` | not redesigned |
| [commitment_detail.md](commitment_detail.md) | `/stacked/commitments/[id]` | not redesigned |
| [transactions.md](transactions.md) | `/transactions`, and its filter sheet | B1, B2 (transactions canvas) |
| [transaction_detail.md](transaction_detail.md) | `/transactions/detail/[id]` | not redesigned |
| [transaction_form.md](transaction_form.md) | the add and edit sheet, over any tab | D1 to D8, D13 to D15, A15 (transactions canvas) |
| [categories.md](categories.md) | `/settings/categories`, and its add and edit sheet | not redesigned |
| [budget.md](budget.md) | `/budget`, and its copy sheet | not redesigned |
| [goals.md](goals.md) | `/goals` | not redesigned |
| [spending_plan_detail.md](spending_plan_detail.md) | `/budget/plans/[id]` | not redesigned |
| [budget_category_detail.md](budget_category_detail.md) | `/budget/[id]` | not redesigned |
| [currency.md](currency.md) | `/settings/currency` | not redesigned |
| [onboarding.md](onboarding.md) | `/welcome`, `/add_account`, `/more_accounts`, `/ready` | not redesigned |

## Maintenance

A merged ticket that adds a state, an action or a route edits its file in the same PR. The `maintain-verification-skill` pass (pstack) is the periodic check: one source reader per file, one live pass, one PR of corrections. Run it at each epic close.

## Seeding and forcing states

The recipes reference four mechanisms from the `emulator-verify` skill and its memory:

- **Deep link**: `mqa open /accounts` opens any expo-router route while the dev client runs. The only way into `/accounts` at zero active accounts.
- **Seed push**: `mqa up --seed <file.db>` before a run, or `mqa seed <file.db>` mid-run (stops the app, drops the WAL pair, streams the file through `run-as`, checks the size, relaunches). `mqa seed --save <file.db>` keeps a device state you built. A seed built on the host with `better-sqlite3` uses `PRAGMA journal_mode=DELETE`. `mqa db` reads a pulled copy and never writes the device.
- **Source force**: a state no data can produce (`loadError` on the list) is one line in the screen's own resolver, reverted with `git status` clean before and after.
- **Font scale**: `adb -s <serial> shell settings put system font_scale <scale>` at each scale the row names, a cold launch after each, and `font_scale` back to 1.0 after the last.

**Button proof** (MA-130), a proof template the state rows cite: `mqa bounds` on each button reads the height its resolver gives at that scale: `md` 48 at both; `sm` and the 50/30/20 manage button `resolveSmallButtonHeight(scale)`, 40 at both on the 411 dp emulator; the compact accent arm `resolveCompactCtaHeight(size, scale)`, 36 at 1.0. Its label `TextView` box sits inside it. A crop at 2.0: each label whole or ending in a whole `…` inside its button or row, no glyph cut at the top or bottom; beside other content, every neighbour's box stays inside the row and is not overlapped.

**Clearance proof** (MA-144), a proof template the state rows cite: at 1.0 and at 2.0, `mqa scroll down --until` a node that is not there takes the list or the screen to its end, since with nothing to stop on it swipes until two swipes in a row move nothing; at the end, no text node's box from `mqa bounds`, nor a button's or a link's, intersects `fab-button`'s; one shot at 2.0 at the end. A row names the strings that show and the control it reads, and records what it reads before the scroll, where the + button can lie over a block that is taller than the room under its header.

**Header proof** (MA-159), a proof template the state rows cite: `mqa bounds` on the title and on `label="Go back"`. The title's `TextView` box reads `resolveStackHeaderGeometry(scale).title.lineHeight` ± 1 dp high, 25 at 1.0 and 50 at 2.0 on the 411 dp emulator, centred ± 1 dp on the back button's centre. The header has no node of its own, a `View` with no touch handler or role (§ The rule), and it centres the back button, so the title is inside the header when its top and its bottom are each within half of `resolveStackHeaderGeometry(scale).height`, 59 at both, of that centre. Its box overlaps neither the back button's nor the right action's by more than 1 dp: the title is `flex-1` between the two, so their edges abut and pixel snapping sets the shared edge. A crop of the header at 2.0: the title whole or ending in a whole `…`, no glyph cut at the top or bottom. The 1.0 crop matches `main`. A row names the title and the right action.
