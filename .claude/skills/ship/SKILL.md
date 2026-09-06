---
name: ship
description: "Use when the user invokes /ship with an issue number or an MA id to deliver a planned ticket to a merged PR, '/ship' alone to pull the next ticket off the board, or asks to resume a ticket that has ~/.ship/MoneyApp/MA-XXX/state.md. The second half of delivery, after /prep: implement, review battery, triage and fix, re-check, merge. Not for planning (prep) or defining (boundaries, tickets)."
argument-hint: "[<issue number> | MA-XXX]"
---

# Ship

Delivery of one leaf task from Planned to Done, on the branch `/prep` created, through five phases. The main session is the conductor. Implementation, every review lens and every re-check run in fresh subagents that get file paths, never this conversation. The human has one gate, the merge; everything else the conductor decides, and disputes and caps go to the human as they arise.

## Entry

`/ship <n>` (an MA id resolves through `gh issue list --search "MA-XXX" --state all --json number,title --jq '.[] | select(.title | startswith("MA-XXX ")) | .number'`; the search alone returns every issue that mentions the id). The reverse, `gh issue view <n> --json title --jq .title`, gives MA-XXX, which names the artifact directory, the branch and the worktree below.

1. **Resume** when `~/.ship/MoneyApp/MA-XXX/state.md` exists: read it, announce phase, branch, PR and any open loop, load that phase's file, continue. Never redo a completed phase.
2. Otherwise `bash scripts/board.sh get <n>`:
   - **Planned** → phase 1.
   - **Ready For Development** → run the `prep` skill on `<n>` first, in this session, then phase 1 without stopping. Prep's two stops survive (a gap, a disputed finding); a ticket plan returns to Todo ends the run with plan's `Next:` line. The board is the composition switch.
   - **In Progress / In Review / Awaiting Human** with no `state.md` → another machine or session owns it; report the branch (`gh issue develop --list <n>`) and the PR (`gh pr list --head <branch> --state all`) and stop.
   - Anything else → say what you found and stop.
3. `/ship` alone: the top Planned row, else the top Ready For Development row. `gh project item-list` returns items in the board's position order, which is the row order within a column (checked 2026-09-06: #382 listed before #381, which was created first), so the first match is the top row. Name it in the reply.
   ```bash
   gh project item-list 2 --owner MustaMohamed --limit 500 --format json --jq '[.items[] | select(.status == "Planned") | .content.number] | first'
   ```

**Setup** (conductor, once, then `state.md`):

```bash
mkdir -p ~/.ship/MoneyApp/MA-XXX/findings/render
BR=$(gh issue develop --list <n> | awk -F'\t' '{print $1}' | grep "^feat/MA-XXX-" | head -1)   # prints name<TAB>url per linked branch; empty → stop, the ticket was not planned
git -C /Users/musta/Code/projects/practice/MoneyApp fetch origin
# Reuse the worktree /prep left; create it only when this machine has none:
test -d /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX \
  || git -C /Users/musta/Code/projects/practice/MoneyApp worktree add .claude/worktrees/MA-XXX "$BR"
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX
# Main moved since /prep: rebase, force-push, and re-comment the plan's blob URL at the new SHA
git merge-base --is-ancestor origin/main HEAD \
  || { git rebase origin/main && git push --force-with-lease && gh issue comment <n> --body "Plan: <new blob URL>, rebased onto main"; }
test -L node_modules && rm -f node_modules                                  # a symlink into the primary is never kept
cmp -s package-lock.json ../../../package-lock.json \
  && { test -d node_modules || cp -c -R ../../../node_modules node_modules; } \
  || npm ci
gh issue view <n> --json body --jq .body > ~/.ship/MoneyApp/MA-XXX/issue.md
cp .work/MA-XXX/plan.md ~/.ship/MoneyApp/MA-XXX/plan.md                     # dispatches read this copy; the branch copy leaves before the merge
```

The plan is `.work/MA-XXX/plan.md` at the branch's first commit, copied to `plan.md` for dispatches; it never reaches main (phase 5 removes it). The header line of `issue.md` drives three things: `Verify emulator` turns on the render pass (phase 1) and the render lens (phase 2); the Flags decide deep mode (below); Depends on is closed or the ticket would not be Planned.

## Phases

Load `references/<phase>.md` on entering a phase. The file is the method; this table is the map.

| # | Phase | Actor | Board | Exit |
|---|---|---|---|---|
| 1 | Implement | composed implementer, one subagent | In Progress at dispatch | parity chain green, render pass when `Verify emulator`, committed, not pushed |
| 2 | Battery | conductor pushes and opens the PR; lenses in parallel | In Review | every lens report in |
| 3 | Triage and fix | conductor; verifier in deep mode; implementer fixes | Awaiting Human on a dispute or a cap | consolidated fixes pushed |
| 4 | Re-check | one fresh re-checker per pushed fix | | all fixed, no new findings; cap 2 cycles with phase 3 |
| 5 | Merge | conductor removes the plan file, human merges, conductor cleans | Awaiting Human, then Done | merged, post-merge list done, artifacts deleted |

A phase with nothing to do is recorded as vacuous (`P4: vacuous, no fixes`), never skipped silently. There is no fast lane and no mode: one ticket, one branch, one PR.

## Artifacts

`~/.ship/MoneyApp/MA-XXX/`, outside every repo and worktree, deleted at the end of phase 5:

```
issue.md                 # the ticket body at entry; every dispatch gets this path
plan.md                  # the plan as committed on the branch; every dispatch gets this path
pr.md                    # the PR body, written at phase 2, Trade-offs appended by triage
state.md                 # phase state, written after every transition and gate outcome; the only resume point
findings/cycle-<n>.md    # each triage's consolidated list, what the re-check verifies against
findings/<lens>.md       # a lens report that outgrew a screen
findings/render/         # render pass and render lens screenshots
```

Anything a later phase consumes lives in a file, not in conductor context.

### state.md

```markdown
# MA-XXX — <title>
issue: #<n>
branch: feat/MA-XXX-<slug>
worktree: /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX
plan: .work/MA-XXX/plan.md @ <sha>
verify: emulator | none · flags: <as on the ticket>
phase: <1-5>
deep_mode: no | yes (<trigger>)
pr: <url or ->

## Log
- <date> P1: dispatched · <sha>, chain green, render pass 3 screens
- <date> P2: pushed <sha>, PR <url> · correctness 0 / quality 2 / render 1 / code-review 3 (medium), CI green
- <date> P3 c1: findings written · fix dispatched · fix pushed <sha>

## Decisions
- <date> <decision and why>

## Adjudications
<!-- read by phase 3 triage and phase 4 re-checks, never by a first-pass lens -->
- FP class: built-in code-review may diff against a stale local main; verify "unrelated file" findings against origin/main...HEAD before triage.
- <label> → <human ruling> (<date>), <why in one line>
```

Log entries are facts: SHAs, verdicts, counts, decisions, eight lines at most each, one per sub-step inside a phase (written, dispatched, committed, pushed), so a resume knows where the crash fell. The file stays under 15 KB.

**Resume inside a phase:** unpushed commits in the worktree → push and re-point the review worktree, then continue from the Log's last line; uncommitted edits → the discard in `references/implement.md` → Re-entry, then re-dispatch the last dispatch.

## Hard rules

1. **Subagents never touch the issue or the PR, never push, never merge.** Only the conductor runs `gh`, `git push` and the built-in `code-review`; merges are the human's.
2. **Reviewers never write code.** Findings route to the implementer, who fixes and commits. If fixing seems faster than re-dispatching, that is the moment this rule exists for.
3. **Lenses read only, in the review worktree.** The one exception is the render lens, which runs the app from the implementation worktree because a symlinked `node_modules` resolves zero routes; it edits nothing there. The implementation worktree otherwise belongs to the implementer alone.
4. **Human gates are explicit.** Approval is a direct answer to the gate question in this session. Urgency is priority, not approval.
5. **One branch, one PR, targeting main, opened with `Closes #<n>`.** Never stacked.
6. **Workflow artifacts never reach main.** The plan rides the branch for review and leaves it before the merge; the one workflow output that merges is a decision record under `docs/adr/`, through a plan step.
7. **The conductor never edits code**, including one-character fixes. The conductor's only commits are the rebase, the push of what the implementer committed, and the plan removal at phase 5.
8. **Adjudicated findings stay adjudicated.** Triage closes a re-found item by citing the ledger; only new evidence reopens it. A fresh reviewer's confidence is not evidence.
9. **Dispatch first, journal second.** Never leave an agent slot idle while writing `state.md` or PR text.

| Rationalization | Reality |
|---|---|
| "The reviewer can just commit the trivial fix" | Then nobody independent re-checks it. Route to the implementer. |
| "I'll update state.md at the end" | A crash loses the session; `state.md` is the only resume point. |
| "This reviewer re-found the ruled finding and sounds certain" | Rule 8. Cite the ledger, move on. Three reviewers re-finding a ruled trade-off is sensitivity working, not a new defect. |
| "The plan is wrong here, the implementer can improvise" | A discrepancy STOP is the prep skill's `--amend` path. Improvisation is where phase-2 findings come from. |
| "CI is green, I can merge" | The human merges. Always. |

## Deep mode

Decided once, at phase 2 entry, on the PR diff and the ticket header, recorded in `state.md`. Any one trigger suffices:

- the header Flags name `money path`, `data-loss migration`, `native change` or `secure store`;
- the diff passes ~400 lines excluding tests, lockfiles and generated files;
- conductor judgment: a novel pattern or a wide blast radius.

Consequences: built-in `code-review` at `high` instead of `medium`, the conformance lens joins the battery, and triage adversarially verifies findings before the fix dispatch.

## Fix loop

Phase 2 findings pool into one triage (phase 3): CI read first, de-duplicate, close ledger matches, verify known FP classes, verifier in deep mode, then one consolidated `findings/cycle-<n>.md` and one fix dispatch. The conductor pushes the fix commits; the re-check (phase 4) reads the delta against the findings file. Cap: two phase 3 ↔ 4 cycles. On the cap, `board.sh status <n> "Awaiting Human"` and present the unresolved findings with the implementer's counter-arguments. An amendment (the plan was wrong, `plan --amend`) restarts the count; it is new design and new code. A lens or re-checker killed by a transient API error is re-run and does not count as a cycle. A dispute skips the loop: both sides to the human at once, the ruling into `## Adjudications`.

## Worktrees

Implementation worktree: `.claude/worktrees/MA-XXX`, created by `/prep`, reused here. Review worktree: `.claude/worktrees/MA-XXX-review`, detached at the pushed SHA, one per battery, re-pointed for re-checks:

```bash
git -C /Users/musta/Code/projects/practice/MoneyApp worktree add --detach .claude/worktrees/MA-XXX-review <sha>
# exists already (resume, re-check): re-point, never re-create
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX-review checkout --detach <new-sha>
# LSP needs deps; lenses never build or run, so a symlink from the implementation worktree serves (-sfn: idempotent)
ln -sfn /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX/node_modules /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX-review/node_modules
```

Teardown after the merge, in this order: review worktree (`--force`), implementation worktree, local branch, `git worktree prune`. Subagents never create or remove worktrees.

## Dispatch recipe

A subagent prompt is, in order: the charter from the phase file verbatim; absolute paths (`issue.md`, `plan.md`, the worktree, the diff range or PR URL); the repo required reading (`CLAUDE.md` at the worktree root and the `.claude/rules/` files matching the touched paths); the return shape. The `unslop` skill binds every return; say so. Never paste conversation history, never summarize the ticket or the plan: pass the paths. Re-check dispatches also get `findings/cycle-<n>.md` and `## Adjudications` verbatim; first-pass lenses never get the ledger.

## Red flags, stop and re-read the hard rules

- About to run `git push`, `gh`, or a merge inside a subagent prompt
- About to let a reviewer "quickly fix" anything, or to edit a file yourself
- About to start phase 1 with the board not at Planned
- About to answer the merge gate because the human is away
- About to hand `## Adjudications` to a first-pass lens
- About to keep a findings list only in conductor context
- `state.md` does not match what you are doing
