---
name: prep
description: "Use when a ticket at Ready For Development needs its implementation plan before code: '/prep <n>', 'prep MA-013', 'prep N'. Also '/prep N --replan' to plan a Planned ticket again and '/prep N --amend' when the plan turned out wrong about the code. Creates the ticket branch, has a cold planner write .work/MA-XXX/plan.md, has a fresh reviewer check it, commits it on the branch and moves the ticket to Planned. Not for defining scope (boundaries), cutting tasks (tickets) or delivering (ship)."
argument-hint: "<issue number> [--replan | --amend]"
---

# Prep

The first half of delivery. Takes one leaf task from Ready For Development to Planned: the ticket branch exists on GitHub, linked to the issue, and carries one commit, the reviewed plan at `.work/MA-XXX/plan.md`. `/ship` starts from that commit. The user has two stops here, both exceptional: a gap the ticket cannot answer or a seam to trim at, or a review finding the planner disputes. An unattended run, as [question-record.md](../issue-review/references/question-record.md) defines it, never waits on the user at either: it parks the gap or the disputed finding as a question record, sends the ticket to Blocked and ends. Ready For Development is one-way: no step here moves the ticket back to Todo or Defined. The `unslop` skill binds the plan and every return.

## Preconditions

`bash scripts/board.sh get <n>` prints Ready For Development and `gh api repos/MustaMohamed/MoneyApp/issues/<n>/sub_issues --jq length` prints 0. An issue with children is a parent cut by `/tickets`; it closes through them and is never planned: say so, name the children, and stop. Planned: print the branch and the plan URL and stop, unless `--replan` (plan again from scratch). `--amend` (fix a plan that is wrong about the code) is accepted at Planned, In Progress, In Review and Awaiting Human, which is how `/ship` calls it, and writes no board Status. Anything else: say what you found and stop.

The issue body is in the ticket standard: header line `Part of · Depends on · Verify · Flags`, then Task Definition, Goal, Acceptance, Rules, Copy, Screen checks, Decisions, Links, Out of scope, Context. A body reviewed before Copy, Screen checks and Decisions joined the standard lacks those three, and `/prep` plans it all the same. A body without the others never reached Ready For Development through `/issue-review`; say so and stop.

## Roles

- **Conductor, this session:** reads the issue, owns the branch and the worktree, dispatches, commits, pushes, writes the board. Never writes a line of the plan.
- **Planner, a fresh subagent:** writes the plan file and nothing else. Gets the issue body and paths, never this conversation.
- **Reviewer, a fresh subagent per round:** reads, returns a verdict, edits nothing.
- Subagents never run `gh`, never commit, never push.

## Steps

1. **Read the ticket.** `gh issue view <n> --json title,body,url`. The MA id and the slug come from the title, `MA-013 — Account type tile fill` → `MA-013`, `account-type-tile-fill`: lowercase, every run of non-alphanumerics to one `-`, at most five words. Read the header line: Verify and Flags shape the plan (step 3); Depends on is closed and Reviewed carries a date, or the board would not say Ready For Development.

2. **Branch and worktree.** A linked branch may already exist, `gh issue develop --list <n>`; reuse it. Otherwise create it on GitHub, linked to the issue:

   ```bash
   gh issue develop <n> --name feat/MA-XXX-<slug> --base main
   git -C /Users/musta/Code/projects/practice/MoneyApp fetch origin
   git -C /Users/musta/Code/projects/practice/MoneyApp worktree add .claude/worktrees/MA-XXX feat/MA-XXX-<slug>
   cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX
   test -L node_modules && rm -f node_modules                                # a symlink into the primary is never kept
   cmp -s package-lock.json ../../../package-lock.json \
     && { test -d node_modules || cp -c -R ../../../node_modules node_modules; } \
     || npm ci
   ```

   The planner needs LSP, and LSP needs a real `node_modules`: the APFS clone is ~10 s when the lockfile matches the primary checkout, `npm ci` otherwise. A symlink would do for the planner but breaks `/ship`'s builds later, and this worktree is the one `/ship` reuses. If the worktree already exists, reuse it; never re-run the create.

   Then run the Entry check of [queue § Lease](../queue/SKILL.md) and write the lease, `skill=prep` and `worktree=` this worktree. Called from `/ship`, `--amend` included, the lease is `/ship`'s: no check, `skill=ship`, and it stays at the exit. Last, before the planner's dispatch, EnterWorktree into the worktree as [ship § Worktrees](../ship/SKILL.md) states.

3. **Dispatch the planner**, `subagent_type: general-purpose`, one message: [references/planner-charter.md](references/planner-charter.md) verbatim; the issue body verbatim, under a heading `## Ticket #<n>`; absolute paths to the worktree, `CLAUDE.md` in it, and the output file `<worktree>/.work/MA-XXX/plan.md` (create `.work/MA-XXX/`); the `.claude/rules/` files: `review.md` always, the others by the paths in Context, or by the modules Task Definition names when Context is `none`. `--amend`: also the current plan path and the discrepancy text verbatim, with the objective "amend the plan where the code contradicts it; leave every other step as it is". `--replan`: the old plan is deleted first.

4. **Gap list, the one stop.** A planner that returns gaps instead of a plan is a successful dispatch. Show the gaps as one list, each with the planner's question and your recommended answer first, with their visual per [question-visuals.md](../issue-review/references/question-visuals.md), one file for the list. Ask exactly: **"Answer these?"** An answer becomes a body delta in Acceptance or Rules, written per [ticket-body.md § Writing an answer](../tickets/references/ticket-body.md#writing-an-answer) with the step `/prep`. One `gh issue edit <n> --body "$BODY"` writes it and keeps the title and every header field but Verify; then re-dispatch the planner once. A gap the user leaves open, or gaps again after the re-dispatch: `bash scripts/board.sh status <n> Blocked`, `gh issue comment <n> --body "Blocked on a ruling: <the gap in one line>"`, remove the worktree (`git worktree remove`) and the lease, keep the branch, and reply with the gap; the ticket returns to Ready For Development by hand once the ruling is in its body. `--amend`: gaps go to the user the same way, no board write, and the branch and worktree are never removed; they carry the implementer's commits. Nothing else is asked; the planner's self-assessment is reported, not gated.

   **Unattended**, no "Answer these?": each gap becomes a record per [question-record.md](../issue-review/references/question-record.md) on `<n>`, the planner's pick as option A and `Left: Ready For Development`, posted with `gh issue comment <n> --body "$RECORD"` once its restatement check is done. Then `bash scripts/board.sh status <n> Blocked`, remove the worktree and the lease and keep the branch as above, with no `Blocked on a ruling:` comment, and reply. Two cases are never parked. An unattended size gap, the one below, stops the run with no board write and no trim, and the reply carries the planner's seam and `unattended trim: MA-149`. `--amend` gaps take the typed path above; unattended `/ship` is MA-148.

   **The gap "sized past one PR" is a trim, never a return.** The ticket stays at Ready For Development. Show the planner's seam: the first part, its Acceptance lines, files and ~lines, then the remainder the same way, then every open ticket whose Depends on names `#<n>`, `gh issue list --milestone "<m>" --state open --search "in:body #<n>"`, each with whether it needs the first part, the remainder or both. The seam goes out with its visual per [question-visuals.md](../issue-review/references/question-visuals.md), the whole ticket today against the two parts and their dependents, as boxes. Ask exactly: **"Trim at this seam?"** Anything but yes: revise the seam and ask again. On yes, in order:

   ```bash
   gh issue create --title "MA-nnn — <remainder title>" --label "module:<x>" --milestone "<m>" --body "$REST"   # MA-nnn from bash scripts/board.sh next-ma
   bash scripts/board.sh link <parent> <new>                # skipped when <n> has no parent
   bash scripts/board.sh status <new> Defined
   gh issue edit <n> --body "$BODY"
   gh issue edit <dependent> --body "$DEP"                  # per ticket whose Depends on names #<n> and needs the remainder
   gh issue comment <n> --body "Trimmed at /prep: <the seam in one line>; the rest is #<new>. The Size: line missed <files>"
   ```

   `$REST` is a body in the ticket standard ([ticket-body.md](../tickets/references/ticket-body.md)) with every section, filled or `none`: the Acceptance lines the first part does not cover, moved unchanged, each with the `Screen checks` and `Copy` rows that serve it; Rules and Decisions copied; header `Part of #<parent> · Depends on MA-XXX (#<n>) · Verify and Flags true to its own files · Reviewed none`; Context ending with the planner's `Size:` line for the remainder. `$BODY` is this ticket's body with those Acceptance lines and their `Screen checks` and `Copy` rows removed, an Out of scope line naming `MA-nnn (#<new>)` for each, and the `Size:` line rewritten from the planner's count. `$BODY` gains no section it lacked. Its header, title and `Reviewed` date stay, except that on a body with `Screen checks` its Verify follows the rows that remain. `$DEP` is a dependent's body with `MA-nnn (#<new>)` added to its header's Depends on and nothing else changed; a dependent is at Defined while `#<n>` is open, so no Ready ticket is edited, and one whose need cannot be read from its body gets the edge. Then re-dispatch the planner once on the trimmed body. A remainder over the gate is created all the same; `/issue-review <new>` sends it to `/tickets`. A trimmed body that comes back over the gate again goes to Blocked as an open gap does, with the comment `Blocked on a ruling: no seam fits the gate`.

5. **Review.** Dispatch one fresh reviewer, `subagent_type: general-purpose`: [references/reviewer-charter.md](references/reviewer-charter.md) verbatim, the issue body verbatim, the plan path, the worktree path. `findings` → re-dispatch the planner with the findings verbatim and the objective "revise the plan for exactly these findings", then a fresh reviewer. Cap two rounds; a finding the planner disputes goes to the user with both sides and its visual per [question-visuals.md](../issue-review/references/question-visuals.md); one more planner dispatch applies the ruling. Unattended, a disputed finding is parked as a gap is in step 4, the reviewer's side and the planner's side as options A and B, the side you recommend as A; the ticket goes to Blocked and the run ends. Round count and verdicts go into the reply, not into the plan.

6. **Size gate, then commit, push, board.** Conductor only. Before the commit, two counts over the plan file; either one over its line trims the ticket exactly as the planner's size gap does (step 4), whatever the reviewer or a ruling said; the planner is re-dispatched for the seam. The gate is hard ([splitting.md § Size gate](../tickets/references/splitting.md)); there is no override to ask for:

   ```bash
   P=<worktree>/.work/MA-XXX/plan.md
   grep -cE '^### [0-9]+\.' "$P"                                                         # steps, over 8 trims
   grep -oE 'expected diff: ~?[0-9]+' "$P" | head -1 | grep -oE '[0-9]+'                    # over 400 trims; no figure trims too
   ```

   `--amend` runs the same counts on the amended plan. Over any line, the amendment is refused: the planner is re-dispatched to amend without the added scope, and that scope becomes its own ticket, through `/tickets` or, from `/ship`, a triage deferral. The branch and its commits stay.


   ```bash
   git -C <worktree> add .work/MA-XXX/plan.md
   git -C <worktree> commit -m "plan(MA-XXX): implementation plan"        # --amend: "plan(MA-XXX): amend, <why in five words>"; --replan: "plan(MA-XXX): replan"
   git -C <worktree> push -u origin feat/MA-XXX-<slug>
   gh issue comment <n> --body "Plan: <blob URL of the file at the pushed commit> · <k> steps · reviewed in <r> round(s)"
   bash scripts/board.sh status <n> Planned                                 # --amend at In Progress: no board write
   ```

   The plan commit is the branch's first commit, so every review reads the plan beside the code it produced. It never reaches main: `/ship` removes the file in its last commit before the merge, and the PR's head ref keeps the plan commit reachable. When `/ship` has to rebase the branch it re-comments the new blob URL.

7. **Reply.** Branch, plan URL, step count, expected diff size from the plan's Verification section, the planner's self-assessment paragraph verbatim, review rounds, and `Next: /ship <n>`. A ticket parked at step 4 or 5 replies with its record URLs and `Next: /queue asks`. Called from `/ship`: no reply; ship continues.

## Rules

- The plan is a file on the branch, nowhere else: not in an issue comment beyond the one-line pointer, not in this conversation, not on main.
- A plan that names more than 8 steps, more than ~400 changed lines outside tests and generated files, or serves more than one product outcome outside a § Floor bundle, is a gap ("sized past one PR"), not a plan, and no ruling makes it one; the definition is `.claude/skills/tickets/references/splitting.md` § Size gate, counted at `/tickets` and `/issue-review` before any ticket reaches here. `/tickets` is the only skill that cuts a ticket into children; a plan over the gate here is trimmed at one seam and the remainder is a sibling at Defined (step 4). The conductor checks the first two mechanically before the commit; the reviewer is not the last line. A trim names, in the comment, the files the ticket's `Size:` line missed, and each one is a miss at `/issue-review`.
- The planner names files and symbols it opened; a guessed path is a finding at review and a defect at delivery.
- One planner, one reviewer per round. No panel; the ticket standard already bounds the size a panel was for.
