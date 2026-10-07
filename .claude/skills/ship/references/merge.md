# Phase 5, Merge (the human gate, then the post-merge list)

**Goal:** the human merges with the whole picture in one screen; the conductor leaves no residue.

## Remove the plan from the branch

After the last re-check, before the summary. The plan never reaches main; the PR's head ref keeps its commit reachable, so the pointer on the issue still resolves.

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX
git ls-files --error-unmatch .work/MA-XXX/plan.md >/dev/null 2>&1 \
  && git rm -r -q .work/MA-XXX && git commit -m "plan(MA-XXX): remove the plan before merge" && git push \
  && git show --stat HEAD           # one file, one deletion; paste it into the summary. Already removed (a second visit here): skip
```

A fix loop after this point (a change the user asks for, § A change after the summary) dispatches with `~/.ship/MoneyApp/MA-XXX/plan.md`, which is the same content.

## Present for merge

The run ends in this order:

1. CI, re-read now: `gh pr checks <pr-url>`. Red below the cap of [SKILL.md](../SKILL.md) → Fix loop routes back through phase 3, and nothing below runs. At the cap, the red check is an item 1 finding and the steps below run.
2. `bash scripts/board.sh status <n> "Awaiting Human"`.
3. The merge summary below, written to `~/.ship/MoneyApp/queue/ship-<n>-summary.md` by every run, typed or unattended.
4. The PR body completed: `pr.md` keeps its three lines from phase 2 and gains the summary file's content from its item 1 on, the PR URL line left out; then `gh pr edit <pr-url> --body-file ~/.ship/MoneyApp/MA-XXX/pr.md`. The body is the PR's own record, read after `state.md` is gone; the summary file stays, the queue's measure reads it.
5. Item 7's screenshots, sent with `SendUserFile`.
6. An unattended run removes its lease, [queue § Lease](../../queue/SKILL.md), and writes its log line, [queue column.md](../../queue/references/column.md) § Log.
7. The summary as the run's last message.

Nothing is posted on the issue or the PR beyond the body edit of step 4. No run merges, approves a review or turns on auto-merge.

The summary is headed by the PR URL, then ten items in this order, each written `none` when empty except item 10, whose heading and table header row are always written. Every item reads a file, so a session that did not run the battery can write it.

1. Findings `not fixed` at the cap of [SKILL.md](../SKILL.md) → Fix loop, each with its `path:line`.
2. Decisions that reached "smallest change": the `state.md` → `## Decisions` lines whose who reads `conductor, smallest change`, each with its cost if wrong.
3. The header Flags, verbatim, and the `REBUILD` line from `state.md` → Log.
4. CI as step 1 read it: green, or a non-green check explained. The commits after the last re-check, the plan removal with its `--stat` and anything else, named; never present an unreviewed head as reviewed. Each lens whose `state.md` line reads `LSP: not used`.
5. What was built, one line per Acceptance line.
6. Every other decision, under the heading `## Decisions the ticket or plan did not state`: a table with the columns Decision, Who, Cost if wrong, copy decisions first. It reads the `state.md` → `## Decisions` lines item 2 does not hold, and this run's `## Adjudications` lines that items 2 and 9 do not already hold, less those settled by `ticket text`.
7. One screenshot per `Screen checks` row of `issue.md` on a body that has the section, else per screen the plan's Screens section lists, from `findings/render/`; then each state `state.md` → Log records as not probed.
8. Tickets opened, by number.
9. `rejected` findings, each with what settled it, per [SKILL.md](../SKILL.md) → Rulings: the ticket line quoted, the frame file, the convention's `path:line` or the smallest change's `## Decisions` line.
10. Questions that should have been asked earlier, under the heading `## Questions that should have been asked earlier`: a table with the columns Record, Check, one row per `## Parked` line of `state.md` whose `miss:` is not `none`. Record is the line's record URL, Check is its miss. With no such line the heading and the header row are written alone, never `none`.

Then wait, with a watch on the merge so the word "merged" is never needed. **The human merges, never the conductor.** A change asked after the summary: § A change after the summary.

```bash
# Bash tool, run_in_background: true. Paste the asks function of queue column.md § Changes asked at Awaiting Human first, in this call. The touch keeps the lease live.
until gh pr view <pr-url> --json state --jq .state | grep -qE 'MERGED|CLOSED' || [ "$(asks)" -gt 0 ]; do touch ~/.ship/MoneyApp/queue/leases/<n>; sleep 60; done; gh pr view <pr-url> --json state,mergedAt
```

`MERGED` starts the post-merge list. `CLOSED` without `mergedAt` is a closed PR, not a merge: stop and report. `OPEN` means `asks` printed above 0: § A change after the summary.

An unattended run ends at step 7 with no watch. `/queue` runs § After the merge on its next pass.

## A change after the summary

A message in the task after the summary, or a PR comment, review or review comment created after the summary file's last write, is a finding of a new triage. [queue column.md](../../queue/references/column.md) § Changes asked at Awaiting Human has the read. A resume at phase 5 runs that read first. Before phase 5 writes the summary file again, it reads for anything newer than the previous file's last write, and a change not yet triaged goes through this section first. Each PR comment, review or review comment triaged, at the cap too, is a `state.md` Log line ending in its URL, `- <date> change triaged: <url>`, and the read skips a URL `state.md` holds.

Below the cap of [SKILL.md](../SKILL.md) → Fix loop, the return, in this order: `bash scripts/board.sh status <n> "In Review"`; the lease written whole before the next dispatch, [SKILL.md](../SKILL.md) → Lease and working folder; then phase 3. At the cap nothing is dispatched: the change is `not fixed`, or a ticket by a deferral of [triage.md](triage.md) item 6, and phase 5 writes the summary again.

## After the merge

Two callers run this list: the `/ship` session whose watch fired, and `/queue` on its next pass ([queue column.md](../../queue/references/column.md) § Merged since the last run). Every step reads before it writes, so a second caller finds each step done and moves on.

Run CLAUDE.md's post-merge list, "After I merge a PR", and one more step at the end. In order:

1. Confirm: `gh pr view <pr-url> --json state,mergedAt`, always with the URL. Then `git -C /Users/musta/Code/projects/practice/MoneyApp checkout main && git pull --ff-only origin main`.
2. Size write-back, one line on the ticket, so the next planner sees the calibration. Skip it when `gh issue view <issue> --json comments --jq '[.comments[].body | select(startswith("Delivered: "))] | length'` prints more than 0; `Delivered: ` is the prefix `pr_size.mjs` prints. `pr_size.mjs` prints the delivered half, counted as `.claude/skills/tickets/references/splitting.md` § Size gate counts it. `<planned>` is the figure from the plan header:

   ```bash
   gh issue comment <issue> --body "$(node /Users/musta/Code/projects/practice/MoneyApp/.claude/skills/ship/scripts/pr_size.mjs <pr>) · planned ~<planned> lines"
   ```

3. `gh issue view <n> --json state` reads closed (`Closes #<n>` did it; close explicitly only if the keyword was missing). The `Board on merge` Action (`.github/workflows/board-on-merge.yml`) runs `board.sh status <n> Done` and `promote <parent>` on the server within a minute or two; `bash scripts/board.sh get <n>` reads Done when it has. If it has not (`gh run list --workflow board-on-merge.yml --limit 1` shows a failure), run the two commands here; both are idempotent.
4. Final `state.md` line, `P5: merged <sha>, cleaned`, written before any deletion.
5. Teardown: review worktree, implementation worktree, local branch, `git worktree prune`, `git remote prune origin` (SKILL.md → Worktrees; the squash commit shares no history with the branch, so `-D` is expected). Skipped while another run holds a live lease on the ticket, [queue § Lease](../../queue/SKILL.md).
6. `npm ci` in the primary checkout if the merge moved `package-lock.json`.
7. Artifacts last: delete `~/.ship/MoneyApp/MA-XXX/`. Nothing writes after this. The durable record is the PR, whose commits include the plan, the issue, and any decision record.

## Checklist

- [ ] Ten items in order, `none` where empty, item 10's heading and table header row written; CI read after the last push
- [ ] Summary in `~/.ship/MoneyApp/queue/ship-<n>-summary.md`, PR body completed with the summary, screenshots sent, summary the last message; nothing else posted on the issue or the PR
- [ ] Plan removed from the branch before the summary; `git ls-tree origin/main .work` prints nothing after the merge
- [ ] Merge verified by URL; issue closed; Done and `promote` run
- [ ] `state.md` final line before teardown; worktrees, branch, prune; `npm ci` if the lockfile moved
- [ ] Artifacts deleted last
