---
name: board
description: "Use when the user wants to see where the board stands and what to run next: '/board', 'what needs an action', 'what should I run on N', 'show me the dependency graph', 'which tickets are blocked and on what', or before picking the next ticket when several run in parallel. Read-only: it names the skill or command per ticket and runs none of them. Not for moving a ticket (board.sh), defining one (boundaries, tickets), or delivering one (prep, ship)."
argument-hint: "[<issue number>] [graph | text]"
---

# Board

One read of Project #2, one action per open ticket, the dependency graph when the shape needs it. `scripts/board_next.mjs` fetches the board and decides; this skill shows the result and stops. The rules are the CLAUDE.md transition table, encoded in `decide()` in the script and pinned by `__tests__/scripts/board_next.test.ts`. The skill writes nothing: no board.sh, no issue edits, no dispatch. Every command in the report is the user's to run, or to hand to the skill it names.

## Steps

1. Arguments: an issue number scopes the report to that issue and its sub-issues, all levels down; `graph` or `text` forces the medium. Neither is required.

2. Fetch once per invocation, render from the snapshot. `<scope>` is the issue number or `all`.
   ```bash
   S=<scratchpad>/board.<scope>.json
   node scripts/board_next.mjs --save "$S" --format json [--scope <n>] </dev/null > "$S.report.json"
   jq .graph "$S.report.json"
   ```
   `true` means graph, `false` means text: past 8 open leaves or a dependency chain two deep it is true. The user's word overrides it.

3. Text: the reply is the report verbatim in one fenced block, then the `Next:` line of step 5.
   ```bash
   node scripts/board_next.mjs --snapshot "$S" --format text [--scope <n>] </dev/null
   ```

4. Graph: the reply is the board drawn as a tree, an inline widget, then the `yours` and `drift` lines from the text report, then the `Next:` line of step 5.
   ```bash
   node scripts/board_next.mjs --snapshot "$S" --format html [--scope <n>] </dev/null
   ```
   The HTML is complete: a `<style>` block on host variables, one `.tg` block holding two views and a toggle, and the script that wires them. Hierarchy first: epic, split tasks and tickets left to right joined by solid elbows, closed children folded into one "N done" card, every open dependency a dashed arrow in its own lane on the right ending on the ticket that waits. Dependency first: tickets nothing blocks at the left, whatever waits on them to the right, a parent that something waits on drawn as "MA-nnn closes" after its open children, other blockers as dashed arrows from the right. A card carries id, status, title, why, and its command as a pill that sends itself as the next prompt; a merge is a link to the PR. Hovering a card traces its arrows. Pass it to `show_widget` unchanged, title `moneyapp_board`.

5. The last line of the reply is `Next: <the first action line of the report>`, the line after the first bucket heading; never the `Board …` header. Nothing after it.

## Reading the report

Six buckets, in this order, board row order inside each: `yours` (a merge or a dispute), `drift` (the board disagrees with GitHub, the command corrects it), `in flight` (`/ship` or `/prep` running or resumable), `pullable` (`/prep` or `/ship` on a ticket that is ready), `define` (`/issue-review`, `/boundaries` or `/tickets`, a missed `promote`), `waiting` (nothing to do until the named issue closes). A Todo ticket with every dependency closed sorts before one whose dependencies are open.

A Todo leaf names both `/boundaries` and `/tickets`: the user picks per ticket. A parent with `Reviewed none` gets `/issue-review` once a child is at Defined; while every child is at Todo the children lead. An issue with no `MA-` title and no `Part of` header is outside the ticket standard and skips the header checks.

## Snapshot shape

`--save` writes what was fetched; `--snapshot` reads it back, so a report can be re-rendered or a rule debugged without another fetch. The fixture at `__tests__/scripts/fixtures/board_next.snapshot.json` has one item per rule and is the reference for the shape. A new rule is a fixture item and a test row first, then the `decide()` branch.

## Red flags

- Running a command from the report because it looked safe. The report is the answer; the user runs or delegates.
- Re-fetching for the second format. One `--save`, two `--snapshot` renders.
- Editing the HTML before `show_widget`. The script owns the layout; a layout defect is a script fix with a test, checked in a browser preview before it ships.
