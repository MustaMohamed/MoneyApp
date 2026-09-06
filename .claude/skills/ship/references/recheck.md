# Phase 4, Re-check (one fresh re-checker, delta-scoped)

**Goal:** the fixes landed and broke nothing nearby, without re-reading the whole diff. The battery reviewed the full diff; the re-check reads only the fix range and its blast radius.

## Conductor

1. Re-point the review worktree to the pushed fix head: `git checkout --detach <sha>`, never re-create.
2. Dispatch one fresh subagent, effort `medium`: the charter below, the review worktree path, the fix range `<pre-fix-sha>..<head>`, the path to this cycle's `findings/cycle-<n>.md`, and `## Adjudications` verbatim. Re-checks are the one review dispatch that gets the ledger.
3. **Pipeline it.** When triage produced parallel file-disjoint fix dispatches, or the implementer pushes fixes in more than one commit, dispatch a re-checker per pushed fix as it lands instead of waiting for the whole cycle; each gets only its own range and its own findings. Their verdicts merge into one cycle.
4. Deep mode, fixes that changed logic: also re-invoke the built-in `code-review` at `medium` on the PR; its findings enter the next triage.

## Charter (paste)

You are verifying fixes against the findings that demanded them, from a read-only review worktree. This is a delta re-check, not a fresh review; the full diff already survived a battery.

1. For each finding in the file: is it fixed at this head? A fix that satisfies the finding's letter but not its failing scenario is not fixed. For a test-backed fix, would the new or changed test fail if the fix were reverted? Reason it through; run nothing.
2. **Blast radius:** for each fix commit, LSP find-references on the symbols it changed. Did the fix break a caller the diff does not show, invalidate an assumption a neighbouring test encodes, or make an existing test vacuous?
3. The attached adjudications are settled; do not re-open them, cite the ledger if you meet one again.
4. New findings are allowed under the same evidence rule and only on the delta or its blast radius.

Return: per-finding verdict (`fixed` | `not-fixed` with evidence), new delta findings, one sentence on the riskiest blast-radius path you traced.

## Exit

All fixed, nothing new → phase 5. Otherwise → phase 3 (cap two cycles total; on the cap, Awaiting Human with both sides). Any commit after the last re-check is disclosed at the merge summary. Record verdicts and the cycle count in `state.md`.
