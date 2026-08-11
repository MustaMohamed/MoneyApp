# Phase 9 — Delta re-check (subagent: fresh re-checker, delta-scoped, effort `medium`)

**Goal:** verify the fixes landed and broke nothing nearby — without re-reading the whole diff at full depth. Round 1 already reviewed the full diff; the re-check earns its keep on the delta.

## Conductor: setup

1. Re-point this battery's review worktree (`MA-XXX-review`, or `MA-XXX-c<N>-review` for a chunk) to the pushed fix head: `git checkout --detach <new-sha>` — never re-create it.
2. Dispatch **one fresh subagent** with the charter below + the review worktree path + the fix commit range (`<pre-fix-sha>..<head>`) + the path to this cycle's `findings/p8-cycle-<n>.md` **and the `## Adjudications` section verbatim** — re-checks are the one review dispatch that gets the ledger (it stops re-litigating what the human already ruled).
3. Deep mode: if the fixes changed logic (not just cleanups), additionally re-invoke the built-in `code-review` at `medium` on the PR; its findings enter the next triage.

## Charter (paste into the re-checker prompt)

You are verifying fixes against the findings that demanded them, from a read-only review worktree. Effort discipline: this is a delta re-check, not a fresh review — the full diff already survived a battery.

1. For each finding in the findings file: is it actually fixed at this head? Confirm the fix **discriminates** — for a test-backed fix, would the new/changed test fail if the fix were reverted? (Reason it through or trace it; do not run anything.) A fix that satisfies the finding's letter but not its failure scenario is not fixed.
2. **Blast radius:** for each fix commit, LSP find-references on the symbols it changed — did the fix break a caller the diff doesn't show, invalidate an assumption a neighboring test encodes, or make an existing test vacuous (asserting on a path the fix short-circuits)?
3. Consult the attached adjudications: anything the human already ruled is settled — do not re-open it; cite the ledger if you notice it again.
4. New findings are allowed but must meet the same evidence rule (`path:line`, quoted code, severity matched to consequence) and must relate to the delta or its blast radius — this is not a second full pass.

Return: per-finding verdict (`fixed` | `not-fixed` + evidence), any new delta findings, one sentence on the riskiest blast-radius path you traced.

## Exit

All fixed, no new findings → phase 10. `not-fixed` or new findings → back to P8 triage (cap: 2 P8↔P9 cycles total; on cap, pause and present to the human — and if any commit lands after the final re-check, P10 must say so explicitly). A re-checker killed by a transient API error is re-run; it does not consume a cycle. Record per-finding verdicts and cycle count in `state.md`.
