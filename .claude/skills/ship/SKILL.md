---
name: ship
description: "Use when the user invokes /ship with an issue number or an MA id to take a Planned ticket to Awaiting Human with a merge summary, or asks to resume a ticket that has ~/.ship/MoneyApp/MA-XXX/state.md. The second half of delivery, after /prep: implement, review battery, triage and fix, re-check, merge summary. '/ship' with no number pulls nothing. Not for planning (prep) or defining (boundaries, tickets)."
argument-hint: "<issue number> | MA-XXX"
---

# Ship

Delivery of one leaf task from Planned to Awaiting Human with a merge summary, on the branch `/prep` created, through five phases. The main session is the conductor. Implementation, every review lens and every re-check run in fresh subagents that get file paths, never this conversation. The human has one gate, the merge. The conductor decides everything else and asks nothing.

## Entry

`/ship <n>` (an MA id resolves through `gh issue list --search "MA-XXX" --state all --json number,title --jq '.[] | select(.title | startswith("MA-XXX ")) | .number'`; the search alone returns every issue that mentions the id). The reverse, `gh issue view <n> --json title --jq .title`, gives MA-XXX, which names the artifact directory, the branch and the worktree below.

**Lease check.** The Entry check of [queue § Lease](../queue/SKILL.md) runs on `<n>` as soon as it is known. When it passes, write the lease at once, before step 1 resumes or step 2 acts: `skill=ship`, `worktree=` the implementation worktree when it exists, else the primary checkout, keeping `task=` when the lease is the run's own.

1. **Resume** when `~/.ship/MoneyApp/MA-XXX/state.md` exists. First `bash scripts/board.sh questions <n>`: while it prints a record, the run stops there, dispatches nothing, parks nothing and replies `Next: /queue asks`. With none open and the ticket back from Blocked, write `issue.md` again from the issue, as Setup does, before the next dispatch. Then read `state.md`, announce phase, branch, PR and any open loop, load that phase's file, continue. Never redo a completed phase.
2. Otherwise `bash scripts/board.sh get <n>`:
   - **Planned** → phase 1.
   - **Ready For Development** with no sub-issues → the ticket has no plan: reply `Next: /prep <n>` and run nothing.
   - **In Progress / In Review / Awaiting Human** with no `state.md` → another machine or session owns it; report the branch (`gh issue develop --list <n>`) and the PR (`gh pr list --head <branch> --state all`) and stop.
   - **Ready For Development** with sub-issues → a parent, its column mirrors its children; name the children at Ready For Development and stop, nothing is pulled from a parent.
   - Anything else → say what you found and stop.
3. `/ship` with no number pulls nothing and says so.

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

Setup also reads the issue's comments, `gh issue view <n> --json comments --jq '.comments[].body'`. Each that starts `Trimmed at /prep, one seam:` becomes a `state.md` → `## Decisions` line, `<date> <the seam and the remainder's number> · /prep, one seam · <cost if wrong>`, which item 6 of the merge summary prints.

**Lease and working folder**, before any dispatch. Rewrite the lease's `worktree=` to the implementation worktree, per [queue § Lease](../queue/SKILL.md), then EnterWorktree into the implementation worktree as § Worktrees states. A resume has its lease from the Lease check above. On every return from Awaiting Human to In Review, write the lease whole before the next dispatch: `skill=ship`, `worktree=` the implementation worktree, and `task=` kept when the lease is the run's own, absent otherwise ([references/merge.md](references/merge.md) → A change after the summary).

The plan is `.work/MA-XXX/plan.md` at the branch's first commit, copied to `plan.md` for dispatches; it never reaches main (phase 5 removes it). The header line of `issue.md` drives three things: `Verify emulator` turns on the render pass (phase 1) and the render lens (phase 2); the Flags decide deep mode (below); Depends on is closed or the ticket would not be Planned.

## Phases

Load `references/<phase>.md` on entering a phase. The file is the method; this table is the map.

| # | Phase | Actor | Board | Exit |
|---|---|---|---|---|
| 1 | Implement | test writer for `first` cases (60 tool calls), composed implementer (120), test writer for `after` cases (60), in sequence | In Progress at dispatch | red tests committed, then green: parity chain, render pass when `Verify emulator`, committed, not pushed |
| 2 | Battery | conductor pushes and opens the PR; lenses in parallel | In Review | every lens report in |
| 3 | Triage and fix | conductor; verifier in deep mode; implementer fixes | In Review, or Blocked on a park | consolidated fixes pushed |
| 4 | Re-check | one fresh re-checker per pushed fix | | all fixed, no new findings; cap 4 cycles with phase 3 |
| 5 | Merge summary | conductor removes the plan file and writes the summary; the human merges | Awaiting Human; In Review on a change the user asks for, below the cap of § Fix loop | summary sent; a typed run then watches the merge and cleans |

A phase with nothing to do is recorded as vacuous (`P4: vacuous, no fixes`), never skipped silently. There is no fast lane and no mode: one ticket, one branch, one PR.

## Artifacts

`~/.ship/MoneyApp/MA-XXX/`, outside every repo and worktree, deleted after the merge ([references/merge.md](references/merge.md) → After the merge). The merge summary is `~/.ship/MoneyApp/queue/ship-<n>-summary.md`, beside the run log, and stays:

```
issue.md                 # the ticket body at entry; every dispatch gets this path
plan.md                  # the plan as committed on the branch; every dispatch gets this path
pr.md                    # the PR body, written at phase 2, completed at phase 5
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
review_level: low | medium | high
pr: <url or ->
implementer: <agent id of the phase 1 implementer, for fix cycles 1 and 2>
cycle: <0-4>

## Log
- <date> P1: dispatched · <sha>, chain green, render pass 3 screens
- <date> P2: pushed <sha>, PR <url> · correctness 0 / quality 2 / render 1 / code-review 3 (medium), CI green
- <date> P3 c1: findings written · fix dispatched · fix pushed <sha>

## Decisions
<!-- one line when the decision is made; phase 5 reads every line -->
- <date> <decision> · <who> · <cost if wrong>

## Parked
- <date> <record URL> · <case 1, 2 or 3 of § Parking> · miss: <check id or /prep step, or none>

## Adjudications
<!-- read by phase 3 triage and phase 4 re-checks, never by a first-pass lens -->
- FP class: built-in code-review may diff against a stale local main; verify "unrelated file" findings against origin/main...HEAD before triage.
- <label> → <ruling> (<date>), settled by <ticket text | frame | shipped convention | smallest change>, <why in one line>
```

Log entries are facts: SHAs, verdicts, counts, decisions, eight lines at most each, one per sub-step inside a phase (written, dispatched, committed, pushed), so a resume knows where the crash fell. The file stays under 15 KB.

**Resume inside a phase:** unpushed commits in the worktree → push and re-point the review worktree, then continue from the Log's last line; uncommitted edits → the discard in `references/implement.md` → Re-entry, then re-dispatch the last dispatch.

## Hard rules

1. **Subagents never touch the issue or the PR, never push, never merge.** Only the conductor runs `gh`, `git push` and the built-in `code-review`; merges are the human's.
2. **Reviewers never write code.** Findings route to the implementer, who fixes and commits. If fixing seems faster than re-dispatching, that is the moment this rule exists for.
3. **Lenses read only, in the review worktree, entered as § Worktrees states.** The one exception is the render lens, which runs the app from the implementation worktree because a symlinked `node_modules` resolves zero routes; it edits nothing there. The implementation worktree otherwise belongs to the implementer alone.
4. **The run asks the user nothing.** The conductor rules every dispute per § Rulings and parks what it cannot rule per § Parking. The merge is the user's, and no run answers it.
5. **One branch, one PR, targeting main, opened with `Closes #<n>`.** Never stacked.
6. **Workflow artifacts never reach main.** The plan rides the branch for review and leaves it before the merge; the one workflow output that merges is a decision record under `docs/adr/`, through a plan step.
7. **The conductor never edits code**, including one-character fixes. The conductor's only commits are the rebase, the push of what the implementer committed, and the plan removal at phase 5.
8. **Adjudicated findings stay adjudicated.** Triage closes a re-found item by citing the ledger; only new evidence reopens it. A fresh reviewer's confidence is not evidence.
9. **Dispatch first, journal second.** Never leave an agent slot idle while writing `state.md` or PR text.
10. **The size gate holds through delivery.** Scope added after the plan, by a ruling, a folded ticket or a note that is another ticket's Acceptance, is recounted with the plan's figure per `.claude/skills/tickets/references/splitting.md` § Size gate. Over ~400 planned lines or 8 steps, the addition is its own ticket and never this PR, whoever asks.

| Rationalization | Reality |
|---|---|
| "The reviewer can just commit the trivial fix" | Then nobody independent re-checks it. Route to the implementer. |
| "I'll update state.md at the end" | A crash loses the session; `state.md` is the only resume point. |
| "This reviewer re-found the ruled finding and sounds certain" | Rule 8. Cite the ledger, move on. Three reviewers re-finding a ruled finding is sensitivity working, not a new defect. |
| "The plan is wrong here, the implementer can improvise" | A discrepancy STOP is the prep skill's `--amend` path. Improvisation is where phase-2 findings come from. |
| "CI is green, I can merge" | The human merges. Always. |
| "The user ruled it in, so it rides this PR" | Rule 10. A ruling adds scope to the work, not room to the gate. #580 folded two tickets into a ~265-line plan and shipped 866 lines, 18 fix commits and 5 follow-up tickets. |

## Deep mode

Decided once, at phase 2 entry, on the PR diff and the ticket header, recorded in `state.md`. Any one trigger suffices:

- the header Flags name `money path`, `data-loss migration`, `native change` or `secure store`;
- the diff passes ~400 lines excluding tests, lockfiles and generated files;
- conductor judgment: a novel pattern or a wide blast radius.

Consequences: built-in `code-review` at the review level below, the conformance lens joins the battery, and triage adversarially verifies findings before the fix dispatch.

**Review level**, decided with deep mode and written to `state.md` as `review_level:`. It is `low` when every path on the `Size:` line of `issue.md` ends in `.md` or `.sh`. In deep mode it stays `low` while the Flags read `none`, and is `high` with any Flag. Otherwise it is `high` in deep mode and `medium` out of it.

## Fix loop

Phase 2 findings pool into one triage (phase 3): CI and Non-goals read first, de-duplicate, close ledger matches, verify known FP classes, verifier in deep mode, then one consolidated `findings/cycle-<n>.md` and one fix dispatch. The conductor pushes the fix commits; the re-check (phase 4) reads the delta against the findings file. Cap: four phase 3 ↔ 4 cycles, counted on `state.md` → `cycle:`. Cycles 1 and 2 continue the phase 1 implementer; cycles 3 and 4 dispatch a fresh one on the findings still open ([references/implement.md](references/implement.md) → Re-entry). After cycle 4's re-check nothing is dispatched: every open finding is `not fixed`, and phase 5 runs. With `cycle:` at 4, a red CI read at phase 5 or a change asked after the summary dispatches nothing either: it is `not fixed` or a ticket ([references/merge.md](references/merge.md), [references/triage.md](references/triage.md) item 8). `prep --amend` does not reset the count. A lens or re-checker killed by a transient API error is re-run and does not count as a cycle. A dispute is ruled per § Rulings and stays in the loop.

## Rulings

The conductor settles a dispute, and an ambiguous verification, by the first of these that answers it:

1. The ticket text.
2. The frame in `~/.ship/MoneyApp/canvas/`, for layout, geometry and colour.
3. The shipped convention, for glyphs, icons and number formats.
4. The smallest change.

Each ruling is an `## Adjudications` line in `state.md` that names which of the four settled it. A ruling against a finding makes it `rejected`: the ticket line quoted when the ticket text settled it, else the frame file, the convention's `path:line` or the smallest change's `## Decisions` line. A ruling that reached the smallest change is also a `## Decisions` line, `<date> <decision> · conductor, smallest change · <cost if wrong>`.

## Parking

Three cases stop a run, typed or unattended alike. The conductor parks each and never decides it.

1. **A Flag the diff needs that the header lacks**, from the Flags row of [ticket-body.md § Header line](../tickets/references/ticket-body.md#header-line), checked at phase 2 entry on `git diff --name-only origin/main...HEAD` ([references/battery.md](references/battery.md) item 2) and at triage on the Flags the quality lens names for its danger surfaces. The record gets a `Miss:` line naming the `/issue-review` check id or the `/prep` step that should have asked.
2. **A ticket line that cannot hold, or that the code contradicts** ([references/triage.md](references/triage.md) item 6). `Miss:` as in case 1.
3. **Gaps `prep --amend` returns** ([references/implement.md](references/implement.md) → Re-entry), one record per gap and no `Miss:` line.

A park runs in this order:

1. `bash scripts/board.sh get <n>` gives the column the record's `Left:` names.
2. One record per question per [question-record.md](../issue-review/references/question-record.md), `Asked by:` naming `ship` and the phase, posted with `gh issue comment <n> --body "$RECORD"` after its restatement check.
3. `bash scripts/board.sh status <n> Blocked`.
4. One line per record under `state.md` → `## Parked`: the record URL, the case, and the miss or `none`.
5. Release the lease, [queue § Lease](../queue/SKILL.md).
6. Reply with the record URLs and `Next: /queue asks`, and end the run.

The worktree, the branch and `state.md` stay. The parked question is not decided, and the run does not wait on it. A miss is repeated in the merge summary's last item after the run resumes.

## Worktrees

Implementation worktree: `.claude/worktrees/MA-XXX`, created by `/prep`, reused here. Review worktree: `.claude/worktrees/MA-XXX-review`, detached at the pushed SHA, one per battery, re-pointed for re-checks:

```bash
git -C /Users/musta/Code/projects/practice/MoneyApp worktree add --detach .claude/worktrees/MA-XXX-review <sha>
# exists already (resume, re-check): re-point, never re-create
git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX-review checkout --detach <new-sha>
# LSP needs deps; lenses never build or run, so a symlink from the implementation worktree serves (-sfn: idempotent)
ln -sfn /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX/node_modules /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX-review/node_modules
```

The review worktree sits under `.claude/worktrees/` of this repository, so a subagent can enter it. Every dispatch that names it carries this line: call EnterWorktree with `path` set to the review worktree as your first action. If Bash is then refused there, EnterWorktree back to the implementation worktree, which is at the same head during a battery or a re-check, run git there with the SHA named in each command, and keep Read, Grep and LSP on the review worktree's paths. Your return names the worktree Bash ran in and carries `LSP: used | not used, <why>`. Wherever these skills call EnterWorktree, a refusal because it already is the working folder is a pass.

Teardown after the merge, in this order: review worktree (`--force`), implementation worktree, local branch, `git worktree prune`. Subagents never create or remove worktrees.

## Dispatch recipe

A subagent prompt is, in order: the charter from the phase file verbatim; absolute paths (`issue.md`, `plan.md`, the worktree, the diff range or PR URL); the repo required reading (`CLAUDE.md` at the worktree root and the `.claude/rules/` files matching the touched paths); the return shape. The `unslop` skill binds every return; say so. Never paste conversation history, never summarize the ticket or the plan: pass the paths. Re-check dispatches also get `findings/cycle-<n>.md` and `## Adjudications` verbatim; first-pass lenses never get the ledger.

## Red flags, stop and re-read the hard rules

- About to run `git push`, `gh`, or a merge inside a subagent prompt
- About to let a reviewer "quickly fix" anything, or to edit a file yourself
- About to start phase 1 with the board not at Planned
- About to answer the merge gate because the human is away
- About to ask the user anything
- About to hand `## Adjudications` to a first-pass lens
- About to keep a findings list only in conductor context
- `state.md` does not match what you are doing
