# Phase 5, Merge (the human gate, then the post-merge list)

**Goal:** the human merges with the whole picture in one screen; the conductor leaves no residue.

## Remove the plan from the branch

After the last re-check, before the summary. The plan never reaches main; the PR's head ref keeps its commit reachable, so the pointer on the issue still resolves.

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX
git ls-files --error-unmatch docs/plans/MA-XXX.md >/dev/null 2>&1 \
  && git rm -q docs/plans/MA-XXX.md && git commit -m "plan(MA-XXX): remove the plan before merge" && git push \
  && git show --stat HEAD           # one file, one deletion; paste it into the summary. Already removed (a second visit here): skip
```

A fix loop after this point (a PR comment from the human) dispatches with `~/.ship/MoneyApp/MA-XXX/plan.md`, which is the same content.

## Present for merge

`bash scripts/board.sh status <n> "Awaiting Human"`, then one compact summary here, not a comment on the issue or the PR:

- PR URL and the ticket's Goal in one line.
- **The header Flags, verbatim**, first. They are CLAUDE.md's critical triggers written on the ticket for this moment. Then the danger surfaces the quality lens flagged.
- Battery line: per-lens verdicts and counts, triage outcome as counts (fixed / ledger / FP / refuted / trade-off / deferred with numbers / amended), re-check verdict, cycles used.
- **CI, re-read now:** `gh pr checks <pr-url>`. Fix commits landed since triage read it; this is the last read and it must be green or explained. Red routes back through phase 3 before presenting.
- **Commits after the last re-check:** the plan removal, with its `--stat`, and anything else, named explicitly. Never present an unreviewed head as reviewed.
- `Verify emulator` tickets: the render pass and render lens evidence paths, and the standing caveat that fonts, shadows, gesture feel and performance are visible only on real hardware. Device QA on real hardware is the human's, critical trigger 8, before any merge of a UI change.
- Accepted trade-offs and every adjudication that shaped this PR, already in the PR body's Trade-offs section.
- Open disputes: none, or the both-sides summary awaiting the ruling.

Then wait. **The human merges, never the conductor.** A PR comment from the human routes through phase 3 (fix, re-check, back here).

## After the merge

Run CLAUDE.md's post-merge list, "After I merge a PR", and one more step at the end. In order:

1. Confirm: `gh pr view <pr-url> --json state,mergedAt`, always with the URL. Then `git -C /Users/musta/Code/projects/practice/MoneyApp checkout main && git pull --ff-only origin main`.
2. `gh issue view <n> --json state` reads closed (`Closes #<n>` did it; close explicitly only if the keyword was missing). `bash scripts/board.sh status <n> Done`, then `bash scripts/board.sh promote <parent>`: it moves the siblings the close unblocked to Ready For Development and closes the parent when its last child closed.
3. Final `state.md` line, `P5: merged <sha>, cleaned`, written before any deletion.
4. Teardown: review worktree, implementation worktree, local branch, `git worktree prune`, `git remote prune origin` (SKILL.md → Worktrees; the squash commit shares no history with the branch, so `-D` is expected).
5. `npm ci` in the primary checkout if the merge moved `package-lock.json`.
6. Artifacts last: delete `~/.ship/MoneyApp/MA-XXX/`. Nothing writes after this. The durable record is the PR, whose commits include the plan, the issue, and any decision record.

## Checklist

- [ ] Flags listed verbatim in the summary; CI read after the last push; post-re-check commits disclosed or none
- [ ] Trade-offs and adjudications in the PR body
- [ ] Plan removed from the branch before the summary, `git ls-tree origin/main docs/plans/` stays empty after the merge
- [ ] Merge verified by URL; issue closed; Done and `promote` run
- [ ] `state.md` final line before teardown; worktrees, branch, prune; `npm ci` if the lockfile moved
- [ ] Artifacts deleted last
