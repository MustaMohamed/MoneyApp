# Feature map

One file per screen the user can reach. Each file is the scripted way to reach the screen, the list of states it can be in, how to force each state, and what proves it rendered. The files are the reference for every render pass and render lens: a walk is written by copying recipes from here, not by exploring the app.

## Why it exists

On the accounts redesign (#378) the render lens ran a median 99 messages per ticket, most of them discovery, and both nets still missed geometry drift on three merged tickets. The canvas drew one account type per frame, so the credit-card variant of a screen was found missing on three tickets in a row. A state list per screen, written once, closes both: the lens runs a recipe, and a state nobody listed is visible as a gap before code.

## The rule

- **A state not in the file is a state the design did not draw.** Before shooting it, add it here with its frame or `no frame` and the ticket that introduces it.
- **Prep names files and states, never prose.** The plan's Screens section is `features/<screen>.md`: the state names. The reviewer refuses a state the file does not carry.
- **Implementer and lens run the same recipe.** The render pass proves the states the plan names; the lens re-runs the same recipes on the pushed SHA and judges the shots against the frame. Neither invents scenarios.
- **Proof is `mqa ui` or `mqa db` first, a shot only for what is visual.** `grep -c` over `mqa ui` answers "did this text render"; a screenshot answers proportion and placement.
- **Density is 2.625, not 3.** Geometry comes from `ui.xml` bounds divided by 2.625, never from PNG pixels.
- **A padded pill has no node of its own.** React Native flattens a `View` with no touch handler or accessibility role, so a badge's container never reaches `ui.xml` — only its label `TextView` does. Measure the label's line box and add the container's padding (`py-0.5` is 2 dp each side), or measure the clickable ancestor when there is one (MA-086).

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
| [budget.md](budget.md) | `/budget`, and its copy sheet | not redesigned |
| [spending_plan_detail.md](spending_plan_detail.md) | `/budget/plans/[id]` | not redesigned |

## Maintenance

A merged ticket that adds a state, an action or a route edits its file in the same PR. The `maintain-verification-skill` pass (pstack) is the periodic check: one source reader per file, one live pass, one PR of corrections. Run it at each epic close.

## Seeding and forcing states

The recipes reference three mechanisms from the `emulator-verify` skill and its memory:

- **Deep link**: `adb shell am start -a android.intent.action.VIEW -d "moneyapp://accounts"` opens any expo-router route while the dev client runs. The only way into `/accounts` at zero active accounts.
- **Seed push**: build a seed on the host with `better-sqlite3` (`PRAGMA journal_mode=DELETE`), `am force-stop`, remove `-wal` and `-shm`, `base64` the file through `run-as`. `mqa db` reads a pulled copy and never writes the device.
- **Source force**: a state no data can produce (`loadError` on the list) is one line in the screen's own resolver, reverted with `git status` clean before and after.
