---
name: prep
description: "Use when a ticket at Ready For Development needs its implementation plan before code: '/prep <n>', 'prep MA-013', 'prep N'. Also '/prep N --replan' to plan a Planned ticket again and '/prep N --amend' when the plan turned out wrong about the code. Creates the ticket branch, has a cold planner write .work/MA-XXX/plan.md, has a probe render its marked screen states on the emulator, has a fresh reviewer check it, commits it on the branch and moves the ticket to Planned. Not for defining scope (boundaries), cutting tasks (tickets) or delivering (ship)."
argument-hint: "<issue number> [--replan | --amend]"
---

# Prep

The first half of delivery. Takes one leaf task from Ready For Development to Planned: the ticket branch exists on GitHub, linked to the issue, and carries one commit, the reviewed plan at `.work/MA-XXX/plan.md`. `/ship` starts from that commit. The user has two stops here, both exceptional: a gap the ticket cannot answer, a choice among two or more seams included, or a review finding the planner disputes. A plan over the gate with one seam is trimmed there with no stop. An unattended run, as [question-record.md](../issue-review/references/question-record.md) defines it, never waits on the user at either: it parks the gap or the disputed finding as a question record, sends the ticket to Blocked and ends. Ready For Development is one-way: no step here moves the ticket back to Todo or Defined. The `unslop` skill binds the plan and every return.

## Preconditions

`bash scripts/board.sh get <n>` prints Ready For Development and `gh api repos/MustaMohamed/MoneyApp/issues/<n>/sub_issues --jq length` prints 0. An issue with children is a parent cut by `/tickets`; it closes through them and is never planned: say so, name the children, and stop. Planned: print the branch and the plan URL and stop, unless `--replan` (plan again from scratch). `--amend` (fix a plan that is wrong about the code) is accepted at Planned, In Progress, In Review and Awaiting Human, which is how `/ship` calls it, and writes no board Status. Anything else: say what you found and stop.

The issue body is in the ticket standard: header line `Part of · Depends on · Verify · Flags`, then Task Definition, Goal, Acceptance, Rules, Copy, Screen checks, Decisions, Links, Out of scope, Context. A body reviewed before Copy, Screen checks and Decisions joined the standard lacks those three, and `/prep` plans it all the same. A body without the others never reached Ready For Development through `/issue-review`; say so and stop.

## Roles

- **Conductor, this session:** reads the issue, owns the branch and the worktree, dispatches, commits, pushes, writes the board. Never writes a line of the plan.
- **Planner, a fresh subagent:** writes the plan file and nothing else. Gets the issue body and paths, never this conversation.
- **Probe, a fresh subagent per dispatch:** renders the marked screen states in its own worktree on the emulator and returns what it saw. Writes nothing outside that worktree and its shots path.
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

   Then run the Entry check of [queue § Lease](../queue/SKILL.md) and write the lease, `skill=prep` and `worktree=` this worktree. Called from `/ship`, which calls it with `--amend` only, the lease is `/ship`'s: no check, `skill=ship`, and it stays at the exit. Last, before the planner's dispatch, EnterWorktree into the worktree as [ship § Worktrees](../ship/SKILL.md) states.

3. **Dispatch the planner**, `subagent_type: general-purpose`, one message: [references/planner-charter.md](references/planner-charter.md) verbatim; the issue body verbatim, under a heading `## Ticket #<n>`; the parent body verbatim, `gh issue view <p> --json body --jq .body` for the `Part of` number, under `## Parent #<p>`; absolute paths to the worktree, `CLAUDE.md` in it, the canvas folder `~/.ship/MoneyApp/canvas/`, and the output file `<worktree>/.work/MA-XXX/plan.md` (create `.work/MA-XXX/`); the `.claude/rules/` files: `review.md` always, the others by the paths in Context, or by the modules Task Definition names when Context is `none`. `--amend`: also the current plan path and the discrepancy text verbatim, with the objective "amend the plan where the code contradicts it; leave every other step as it is". `--replan`: the old plan is deleted first.

4. **Gap list, the one stop.** A planner that returns gaps instead of a plan is a successful dispatch. Before anything is shown, read each gap against the sources the planner charter's Gaps bullet lists, the parent body, the canvas frame, the repo docs and the code; a gap one of them answers is not asked: re-dispatch the planner once with the answer and its source cited, and the reply names the gap and the source under the ticket. Show the gaps that remain as one list, each with the planner's question and your recommended answer first, with their visual per [question-visuals.md](../issue-review/references/question-visuals.md), one file for the list. Ask exactly: **"Answer these?"** An answer becomes a body delta in Acceptance or Rules, written per [ticket-body.md § Writing an answer](../tickets/references/ticket-body.md#writing-an-answer) with the step `/prep`. One `gh issue edit <n> --body "$BODY"` writes it and keeps the title and every header field but Verify; then re-dispatch the planner once. A gap the user leaves open, or gaps again after the re-dispatch: `bash scripts/board.sh status <n> Blocked`, `gh issue comment <n> --body "Blocked on a ruling: <the gap in one line>"`, remove the worktree (`git worktree remove`) and the lease, keep the branch, and reply with the gap; the ticket returns to Ready For Development by hand once the ruling is in its body. `--amend`: gaps return to `/ship`, which parks them, and are never shown to the user; no board write, and the branch and worktree are never removed; they carry the implementer's commits. Nothing else is asked; the planner's self-assessment is reported, not gated.

   **Unattended**, no "Answer these?": each gap becomes a record per [question-record.md](../issue-review/references/question-record.md) on `<n>`, the planner's pick as option A and `Left: Ready For Development`, posted with `gh issue comment <n> --body "$RECORD"` once its restatement check is done. Then `bash scripts/board.sh status <n> Blocked`, remove the worktree and the lease and keep the branch as above, with no `Blocked on a ruling:` comment, and reply. A size gap outside `--amend` follows the paragraph below. `--amend` gaps return to `/ship` as above.

   **The gap "sized past one PR" is a trim, never a return.** Under `--amend` it takes step 7's amendment refusal instead, never a trim: the added scope becomes its own ticket, from `/ship` a triage deferral. Otherwise a trim keeps the ticket at Ready For Development. Read each seam the planner names: the first part, its Acceptance lines, files and ~lines, then the remainder the same way, then every open ticket whose Depends on names `#<n>`, `gh issue list --milestone "<m>" --state open --search "in:body #<n>"`, each with whether it needs the first part, the remainder or both. One seam is trimmed at with no ask, typed or unattended. With two or more, a typed run shows each seam as a column with its visual per [question-visuals.md](../issue-review/references/question-visuals.md), the two parts and their dependents as boxes, asks exactly **"Which seam?"**, and trims at the answer. An unattended run parks one record as above, its options the seams, recommended first, each with `writes: Seam: <the first part's Acceptance lines in one line>` and `into: #<n> Rules`, and the ticket goes to Blocked. To trim, in order:

   ```bash
   gh issue create --title "MA-nnn — <remainder title>" --label "module:<x>" --milestone "<m>" --body "$REST"   # MA-nnn from bash scripts/board.sh next-ma
   bash scripts/board.sh link <parent> <new>                # skipped when <n> has no parent
   bash scripts/board.sh status <new> Defined
   gh issue edit <n> --body "$BODY"
   gh issue edit <dependent> --body "$DEP"                  # per ticket whose Depends on names #<n> and needs the remainder
   gh issue comment <n> --body "<lead> <the seam in one line>; the rest is #<new>. The Size: line missed <files>"
   ```

   `$REST` is a body in the ticket standard ([ticket-body.md](../tickets/references/ticket-body.md)) with every section, filled or `none`: the Acceptance lines the first part does not cover, moved unchanged, each with the `Screen checks` and `Copy` rows that serve it; Rules, less a line that starts `Seam:`, and Decisions copied; header `Part of #<parent> · Depends on MA-XXX (#<n>) · Verify and Flags true to its own files · Reviewed none`; Context ending with the planner's `Size:` line for the remainder. `$BODY` is this ticket's body with those Acceptance lines and their `Screen checks` and `Copy` rows removed, an Out of scope line naming `MA-nnn (#<new>)` for each, and the `Size:` line rewritten from the planner's count. `$BODY` gains no section it lacked. Its header, title and `Reviewed` date stay, except that on a body with `Screen checks` its Verify follows the rows that remain. `$DEP` is a dependent's body with `MA-nnn (#<new>)` added to its header's Depends on and nothing else changed; a dependent is at Defined while `#<n>` is open, so no Ready ticket is edited, and one whose need cannot be read from its body gets the edge. `<lead>` is `Trimmed at /prep, seam chosen <yyyy-mm-dd>:` for a seam answered in the session, dated today, and for a trim at a Rules `Seam:` line the planner's gap carried, dated as that line. Every other trim's `<lead>` is `Trimmed at /prep, one seam:`. Then re-dispatch the planner once on the trimmed body. A remainder over the gate is created all the same; `/issue-review <new>` sends it to `/tickets`. A trimmed body that comes back over the gate again goes to Blocked as an open gap does, with the comment `Blocked on a ruling: no seam fits the gate`.

5. **Probe.** On a first run and on `--replan`, never on `--amend`, and only when the body has `## Screen checks` and the state list is not empty. The list is the rows whose risk is not `none`, in table order, then the plan's Risks lines written `<features file> · <state>: …` that are not already in it; the first 3 are probed and the rest are `not probed`. Wait for a free slot, then create the probe worktree, detached at the ticket branch head, with a clone of the ticket worktree's `node_modules`:

   ```bash
   # The wait is its own Bash call, run_in_background: true. It exits once `mqa claims` prints a free row; the touch keeps the lease live.
   until bash .claude/skills/emulator-verify/mqa.sh claims | grep -qw free; do touch ~/.ship/MoneyApp/queue/leases/<n>; sleep 60; done
   git -C /Users/musta/Code/projects/practice/MoneyApp worktree add --detach .claude/worktrees/MA-XXX-probe feat/MA-XXX-<slug>
   cp -c -R <worktree>/node_modules /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX-probe/node_modules
   ```

   Dispatch the probe, `subagent_type: general-purpose`: [references/probe-charter.md](references/probe-charter.md) verbatim, the issue body verbatim under `## Ticket #<n>`, the plan path, the probe worktree path, the state list and the shots path `~/.ship/MoneyApp/MA-XXX/probe/`. A `no slot` return is waited out on the loop above, a `build held` return on the load loop of [implement.md § Re-entry](../ship/references/implement.md), and the probe is dispatched again with the worktree kept. After the last return, when `mqa claims` still names the probe worktree, EnterWorktree into it and run `bash .claude/skills/emulator-verify/mqa.sh release`. Then EnterWorktree back into the ticket worktree, run `git worktree remove --force` on the probe worktree, and `git worktree prune`. When the probe returned any one-fix fact, `not probed` state or `REBUILD` verdict, they go to one planner dispatch with the objective "revise the plan for exactly these probe results". A `choice` is a gap of step 4: asked in a typed run with the shots in its visual, parked in an unattended one with `Asked by: prep, probe, <date>`.

   Probe cost: unmeasured. The figure is written here from the `Plan:` comments of the first three UI tickets that ran a probe. `<t>` in a `Plan:` comment is the sum of the run's probe dispatches as the Agent tool reports them. A run that probed and ends with no plan commit, a park or a Blocked exit, posts `gh issue comment <n> --body "Plan: parked · probe <t> tokens, <s> of <m> states"` before it ends.

6. **Review.** Dispatch one fresh reviewer, `subagent_type: general-purpose`: [references/reviewer-charter.md](references/reviewer-charter.md) verbatim, the issue body verbatim, the parent body under `## Parent #<p>`, the plan path, the worktree path, the canvas folder path. The reviewer's `questions` are gaps of step 4, asked in a typed run and parked in an unattended one, before the findings re-dispatch. Each answered question joins the findings of that re-dispatch, with the answered body, so a plan with questions and no findings is re-dispatched too. `findings` → re-dispatch the planner with the findings verbatim and the objective "revise the plan for exactly these findings", then a fresh reviewer. Cap two rounds. Under `--amend`, a finding the planner disputes returns to `/ship` as a gap does and is never shown to the user. Otherwise a finding the planner disputes goes to the user with both sides and its visual per [question-visuals.md](../issue-review/references/question-visuals.md); one more planner dispatch applies the ruling. Unattended, a disputed finding is parked as a gap is in step 4, the reviewer's side and the planner's side as options A and B, the side you recommend as A; the ticket goes to Blocked and the run ends. Round count and verdicts go into the reply, not into the plan.

7. **Size gate, then commit, push, board.** Conductor only. Before the commit, two counts over the plan file; either one over its line trims the ticket exactly as the planner's size gap does (step 4), whatever the reviewer or a ruling said; the planner is re-dispatched for the seam. The gate is hard ([splitting.md § Size gate](../tickets/references/splitting.md)); there is no override to ask for:

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
   gh issue comment <n> --body "Plan: <blob URL of the file at the pushed commit> · <k> steps · reviewed in <r> round(s) · probe <t> tokens, <s> of <m> states"   # or "· no probe"
   bash scripts/board.sh status <n> Planned                                 # --amend at In Progress: no board write
   ```

   The plan commit is the branch's first commit, so every review reads the plan beside the code it produced. It never reaches main: `/ship` removes the file in its last commit before the merge, and the PR's head ref keeps the plan commit reachable. When `/ship` has to rebase the branch it re-comments the new blob URL.

8. **Reply.** Branch, plan URL, step count, expected diff size from the plan's Verification section, the planner's self-assessment paragraph verbatim, the probe's verdict per state and any refusal it quoted, or `no probe`, review rounds, and `Next: /ship <n>`. A ticket parked at step 4, 5 or 6 replies with its record URLs and `Next: /queue asks`. Called from `/ship`: no reply; ship continues.

## Rules

- The plan is a file on the branch, nowhere else: not in an issue comment beyond the one-line pointer, not in this conversation, not on main.
- A plan that names more than 8 steps, more than ~400 changed lines outside tests and generated files, or serves more than one product outcome outside a § Floor bundle, is a gap ("sized past one PR"), not a plan, and no ruling makes it one; the definition is `.claude/skills/tickets/references/splitting.md` § Size gate, counted at `/tickets` and `/issue-review` before any ticket reaches here. `/tickets` is the only skill that cuts a ticket into children; a plan over the gate here is trimmed at its one seam, or at the seam the user chose among two or more, and the remainder is a sibling at Defined (step 4). The conductor checks the first two mechanically before the commit; the reviewer is not the last line. A trim names, in the comment, the files the ticket's `Size:` line missed, and each one is a miss at `/issue-review`.
- The planner names files and symbols it opened; a guessed path is a finding at review and a defect at delivery.
- One planner, one reviewer per round. No panel; the ticket standard already bounds the size a panel was for.
