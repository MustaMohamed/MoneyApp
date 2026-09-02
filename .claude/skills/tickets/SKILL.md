---
name: tickets
description: "Use when a locked epic or an L task must be cut into tasks: '/tickets <parent>', 'break down epic N', 'create the tasks for N', or '/tickets N --rewrite' to bring existing children into the ticket standard. Phase 3 of the define workflow: propose the split, draft standard bodies, reviewer audit, create as sub-issues. Not for brainstorming scope (boundaries)."
argument-hint: "<parent issue number> [--rewrite]"
---

# Tickets

Phase 3 of the define workflow ([spec](../../../docs/superpowers/specs/2026-09-02-define-workflow-design.md)). Cuts a parent, an epic at Defined or an L task at Todo, into tasks in the ticket standard, as sub-issues on the parent's milestone. Two stops for the user: the split choice and the creation. Writes nothing to disk. The `unslop` skill binds every body.

## Preconditions

`bash scripts/board.sh get <n>` says Defined and the body starts with `Scope locked`, or the parent is a task whose header line says `Size L`. Anything else: say what you found and stop. `--rewrite` needs existing children: `gh api repos/MustaMohamed/MoneyApp/issues/<n>/sub_issues --jq '.[].number'`.

## Steps

1. **Read the parent and map the code.** `gh issue view <n>`; the milestone's other open tickets, `gh issue list --milestone "<m>" --state open`; one read-only scout (`subagent_type: Explore`) maps the modules the parent's Building list, or an L task's Task Definition, touches, so cuts follow real seams.
2. **Stop 1, the split.** For each cut in [references/splitting.md](references/splitting.md) that fits, one candidate table: task titles, sizes, edges, how many run in parallel, longest chain. Recommended option first with the reason. A cut that does not fit gets one line saying why. Ask exactly: **"Which split?"** and wait.
3. **Draft the bodies** for the chosen cut per [references/ticket-body.md](references/ticket-body.md), one per task. Rules are copied from the parent in plain words so every ticket stands alone. Out of scope names the owning task for each exclusion. Header line: `Part of #<n>`; real depends-on only; `Verify emulator` when the task changes what a screen shows or what the app writes; Flags from the header table; Size per splitting.md. Titles `MA-nnn — <title>`, numbered from `bash scripts/board.sh next-ma` upward in order.
4. **Reviewer audit.** Dispatch one fresh subagent (`subagent_type: general-purpose`) with [references/reviewer-charter.md](references/reviewer-charter.md) verbatim, the parent body, the drafts, the scout's code map and the chosen cut. Apply its deltas. A delta you disagree with goes to the user at stop 2, never dropped silently.
5. **Stop 2, the gate.** Show the ordered table (ID, title, size, depends-on), then every body. Ask exactly: **"Create these N tickets?"** (`--rewrite`: **"Update these N tickets?"**). Anything but yes: revise and ask again. A rejected list costs nothing on GitHub.
6. **Create**, per ticket, in order:

   ```bash
   gh issue create --title "MA-nnn — <title>" --label "module:<x>" --milestone "<m>" --body "$BODY"   # prints the URL; the number is its last segment
   bash scripts/board.sh link <parent> <child>
   bash scripts/board.sh status <child> Defined        # Size L: Todo
   ```

   Then promote: every new leaf with no open depends-on gets `bash scripts/board.sh status <child> "Ready For Development"`. Finally `bash scripts/board.sh status <parent> "Ready For Development"`.

   `--rewrite`: `gh issue edit <child> --body "$BODY"` keeps number and title; then the same status writes.
7. **Reply** with the numbers created, each with size and status, and which are pullable now.

## Ordering

Per [references/splitting.md](references/splitting.md) § Order. The board's row order within a column is the priority; nothing else records it.
