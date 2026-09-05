---
name: tickets
description: "Use when a locked epic or a task marked for its own breakdown must be cut into tasks: '/tickets <parent>', 'break down epic N', 'create the tasks for N', or '/tickets N --rewrite' to bring existing children into the ticket standard. Phase 3 of the define workflow: propose the split, draft standard bodies, create as sub-issues, then hand to issue-review. Not for brainstorming scope (boundaries) or reviewing the result (issue-review)."
argument-hint: "<parent issue number> [--rewrite]"
---

# Tickets

Phase 3 of the define workflow. Cuts a parent, an epic at Defined or a task at Todo, into tasks in the ticket standard, as sub-issues on the parent's milestone. Two stops for the user: the split choice and the creation. Writes nothing to disk. The `unslop` skill binds every body.

## Preconditions

`bash scripts/board.sh get <n>` says Defined and the body starts with `Scope locked`, or the parent is a task at Todo, one created for its own breakdown (a task at Todo meant to stay one leaf goes to `/boundaries` instead). Anything else: say what you found and stop. `--rewrite` needs existing children: `gh api repos/MustaMohamed/MoneyApp/issues/<n>/sub_issues --jq '.[].number'`.

## Steps

1. **Read the parent and map the code.** `gh issue view <n>`; the milestone's other open tickets, `gh issue list --milestone "<m>" --state open`; one read-only scout (`subagent_type: Explore`) maps the modules the parent's Building list, or a task's Task Definition, touches, so cuts follow real seams.
2. **Stop 1, the split.** For each cut in [references/splitting.md](references/splitting.md) that fits, one candidate table: task titles, edges, how many run in parallel, longest chain, and any task proposed for its own later breakdown. Recommended option first with the reason. A cut that does not fit gets one line saying why. Ask exactly: **"Which split?"** and wait.
3. **Draft the bodies** for the chosen cut per [references/ticket-body.md](references/ticket-body.md), one per task. Rules are copied from the parent in plain words so every ticket stands alone. Out of scope names the owning task for each exclusion. Context: what the step-1 scout found for this task, or `none`. Header line: `Part of #<n>`; real depends-on only; `Verify emulator` when the task changes what a screen shows or what the app writes; Flags from the header table. Titles `MA-nnn — <title>`, numbered from `bash scripts/board.sh next-ma` upward in order.
4. **Stop 2, the gate.** Show the ordered table (ID, title, depends-on, and which are to be broken down later), then every body. Ask exactly: **"Create these N tickets?"** (`--rewrite`: **"Update these N tickets?"**). Anything but yes: revise and ask again. A rejected list costs nothing on GitHub.
5. **Create**, per ticket, in order:

   ```bash
   gh issue create --title "MA-nnn — <title>" --label "module:<x>" --milestone "<m>" --body "$BODY"   # prints the URL; the number is its last segment
   bash scripts/board.sh link <parent> <child>
   bash scripts/board.sh status <child> Defined        # created for its own breakdown: Todo
   ```

   `--rewrite`: `gh issue edit <child> --body "$BODY"` keeps number, title, board Status and an existing Context, and touches only a child at Todo, Defined or Ready For Development; a child past that is in delivery, listed as skipped, and left alone.

   Once, after the last ticket: `gh issue comment <parent> --body "Cut: <delivery | module | incremental, or the mix named>"`, so `/issue-review` can check the set against it; then `bash scripts/board.sh promote <parent>`, which moves every leaf whose Depends on are all closed to Ready For Development; then `bash scripts/board.sh status <parent> "Ready For Development"`.
6. **Reply** with the numbers created, each with its status, which are pullable now, and `Next: /issue-review <parent>`.

## Ordering

Per [references/splitting.md](references/splitting.md) § Order. The board's row order within a column is the priority; nothing else records it.
