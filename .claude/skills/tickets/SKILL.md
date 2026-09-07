---
name: tickets
description: "Use when a locked epic, a task marked for its own breakdown, or a leaf that turned out bigger than one PR must be cut into tasks: '/tickets <parent>', 'break down epic N', 'create the tasks for N', 'split N further', or '/tickets N --rewrite' to bring existing children into the ticket standard. Phase 3 of the define workflow: propose the split, draft standard bodies, create as sub-issues, then hand to issue-review. Not for brainstorming scope (boundaries) or reviewing the result (issue-review)."
argument-hint: "<parent issue number> [--rewrite]"
---

# Tickets

Phase 3 of the define workflow. Cuts a parent, an epic at Defined, a task at Todo, or a leaf at Defined or Ready For Development, into tasks in the ticket standard, as sub-issues on the parent's milestone. Two stops for the user: the split choice and the creation. Writes nothing to disk. The `unslop` skill binds every body.

## Preconditions

`bash scripts/board.sh get <n>` says one of:

- Defined, body starting with `Scope locked`, no sub-issues yet: an epic.
- Todo: a task created for its own breakdown. A task at Todo meant to stay one leaf goes to `/boundaries` instead.
- Defined or Ready For Development, body in the ticket standard, no sub-issues: a leaf that turned out bigger than one PR, cut further here as it is, with no reset to Todo.

Sub-issues: `gh api repos/MustaMohamed/MoneyApp/issues/<n>/sub_issues --jq length`. Children already exist: `--rewrite` here or `/issue-review <n>`, never a second cut. Planned or later: a branch exists and the ticket is in delivery; say so and stop. Anything else: say what you found and stop. `--rewrite` needs existing children: `gh api repos/MustaMohamed/MoneyApp/issues/<n>/sub_issues --jq '.[].number'`.

## Steps

1. **Read the parent and map the code.** `gh issue view <n>`; the milestone's other open tickets, `gh issue list --milestone "<m>" --state open`; one read-only scout (`subagent_type: Explore`) maps the modules the parent's Building list, or a task's Task Definition and Acceptance, touches, so cuts follow real seams.
2. **Stop 1, the split.** For each cut in [references/splitting.md](references/splitting.md) that fits, one candidate table: task titles, edges, how many run in parallel, longest chain, and any task proposed for its own later breakdown. Recommended option first with the reason. A cut that does not fit gets one line saying why. Ask exactly: **"Which split?"** and wait.
3. **Draft the bodies** for the chosen cut per [references/ticket-body.md](references/ticket-body.md), one per task. Rules are copied from the parent in plain words so every ticket stands alone. Out of scope names the owning task for each exclusion. Context: what the step-1 scout found for this task, or `none`. Header line: `Part of #<n>`; real depends-on only; `Verify emulator` when the task changes what a screen shows or what the app writes; Flags from the header table; `Reviewed none`, always, since only `/issue-review` writes a date there. Titles `MA-nnn — <title>`, numbered from `bash scripts/board.sh next-ma` upward in order. Splitting a leaf: the children's Acceptance lines together cover every line of the parent's, each of the parent's Depends on lands on the child that needs it, and the parent body stays as written; its Acceptance now reads as the union.
4. **Stop 2, the gate.** Show the ordered table (ID, title, depends-on, and which are to be broken down later), then every body. Ask exactly: **"Create these N tickets?"** (`--rewrite`: **"Update these N tickets?"**). Anything but yes: revise and ask again. A rejected list costs nothing on GitHub.
5. **Create**, per ticket, in order:

   ```bash
   gh issue create --title "MA-nnn — <title>" --label "module:<x>" --milestone "<m>" --body "$BODY"   # prints the URL; the number is its last segment
   bash scripts/board.sh link <parent> <child>
   bash scripts/board.sh status <child> Defined        # created for its own breakdown: Todo
   ```

   `--rewrite`: `gh issue edit <child> --body "$BODY"` keeps number, title and an existing Context, writes the header with `Reviewed none`, and touches only a child at Todo, Defined or Ready For Development; a rewritten child at Ready For Development goes back, `bash scripts/board.sh status <child> Defined`, since its review no longer stands. A child past that is in delivery, listed as skipped, and left alone.

   Once, after the last ticket: `gh issue comment <parent> --body "Cut: <delivery | module | incremental, or the mix named>"`, so `/issue-review` can check the set against it. The parent stays at Defined, or returns there when it was a leaf at Ready For Development, `bash scripts/board.sh status <parent> Defined`, with `Reviewed none` on its header; a parent is never promoted and closes through its children. No child is promoted here: Ready For Development is `/issue-review`'s to give.
6. **Reply** with the numbers created, each with its status, and `Next: /issue-review <parent>`, the step that makes them pullable.

## Ordering

Per [references/splitting.md](references/splitting.md) § Order. The board's row order within a column is the priority; nothing else records it.
