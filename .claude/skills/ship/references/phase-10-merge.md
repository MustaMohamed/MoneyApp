# Phase 10 — Merge + cleanup (human gate, then conductor)

**Goal:** the human merges with full context; the conductor leaves no residue. **Chunk mode:** non-final chunks run the compact per-chunk version below; the full version runs at the final chunk.

## Present for merge

Give the human a compact readiness summary — not a recap comment posted to the issue or the PR:

- PR link + one-line outcome (from `task.md`'s goal; chunk mode: the chunk's ledger row).
- Battery verdict line: per-lens verdicts + finding counts, triage outcome (fixed / closed-by-ledger / FP-verified / refuted-by-verifier / trade-off / deferred with issue number / amended), re-check verdict, cycles used.
- **If any commit landed after the last re-check, say so here explicitly** — never present an unreviewed head as reviewed; the human can demand another re-check before merging.
- **CI status — re-read it now**: `gh pr checks <pr-url-from-state.md>`. P8 triage read it at triage entry, but fix commits have landed since — this is the final read before the human merges, and it must be green or explained. Red checks route through P8 triage before presenting.
- Any danger-surface flags from the quality lens (SQLite migrations, secure-store/auth surfaces, route files under `src/app/`, native config, money paths) so the human merges with eyes open.
- **UI tickets:** the P6 render-pass evidence (screenshots per screen state) — plus the standing caveat that fonts, shadows, gesture feel, and performance are visible only on real hardware; the emulator pass is design-conformance evidence, not device QA.
- Accepted trade-offs: unfixed `note`s and every ledger adjudication that shaped this PR — written into the PR description too, so the next reviewer stops rediscovering them.
- Open disputes: none, or the both-sides summary awaiting their call.

Then wait. **The human merges — never the conductor**, regardless of how green everything is. PR comments from the human route back through P8 triage (implementer fixes, delta re-check, return here). **While waiting, pre-stage what the next step needs** (next chunk's dispatch, next sub-ticket's plan charter) under `prestage/` — the merge releases execution.

**`chunk-single`, non-final chunk:** there is no PR and no merge — the chunk ends when its micro battery is green and triage is clean (P9 as needed); loop directly to the next chunk at P6. `gh pr create`, the full battery, and this phase run once, at the final chunk.

**Chunk mode, non-final chunk:** present the compact form (PR link, micro-battery verdicts, CI, dark-until-wired symbols this chunk adds) — and **batch the visit**: every other chunk PR that is also merge-ready goes in the same summary, one compact block each, so one human visit merges several chunks instead of one wait per chunk. After the human merges: verify the merge (step 1 below), update the chunk ledger row + `state.md`, tear down **this chunk's** implementation + review worktrees and branch, then start the next **dependent** chunk whose prerequisites are now all merged at P6 — disjoint chunks never waited for this merge and may already be running (Hard rule 9). Artifacts and the issue's status label are untouched until the final chunk.

## After the merge (verify, then clean — artifacts deleted LAST, nothing written after)

1. Confirm the PR is merged: `gh pr view <pr-url-from-state.md> --json state,mergedAt`. **Always pass the URL** — with no argument, `gh` resolves from the cwd's repo and current branch, which from the primary checkout is a different branch's PR (or none at all).
2. GitHub: confirm the merge closed the issue — the PR's `Closes #N` does it, and closed **is** the done signal (`gh issue view <N> --json state`; close explicitly only if the closing keyword was missing). Then `bash scripts/board.sh status <N> Done`, in case the project's close automation is off. Sub-ticket → its sub-issue; last sub-ticket, final chunk, or direct → the ticket's issue, and the parent issue if applicable.
3. Final `state.md` entry (`P10: merged <sha>, cleaned`) — written now, **before** any deletion.
4. Teardown, in order (commands in SKILL.md → Worktrees): review worktree, implementation worktree(s), local branch(es), `git worktree prune`.
5. Artifacts, the terminal step: direct, final chunk, or parent-closing → delete `~/.ship/MoneyApp/MA-XXX/`; mid-split sub-ticket → keep the parent dir. Nothing writes to the directory after this; the durable record is the PR(s), the issue, and any committed ADRs.
6. Next sub-ticket, if any: set its sub-issue to In Progress with `bash scripts/board.sh status <n> "In Progress"` and enter phase 4 (its slice brief, its plan file, its branch, its worktrees).

## Checklist

- [ ] PR merged — verified against the `state.md` URL, not assumed
- [ ] CI was read (`gh pr checks <url>`) before the merge summary
- [ ] Post-re-check commits disclosed (or none existed)
- [ ] Accepted trade-offs + adjudications written into the PR description
- [ ] Issue closed (sub/parent/final chunk as applicable) — verified, not assumed
- [ ] Final `state.md` entry written before teardown
- [ ] Review + implementation worktrees removed, `worktree prune` run
- [ ] Local branch(es) deleted
- [ ] Artifacts deleted last (or parent-deferred / mid-chunk-deferred) — no writes after
- [ ] Next sub-ticket set to In Progress on the board and started at P4 / next chunk started at P6, if any
