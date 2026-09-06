# Phase 3, Triage and fix (conductor triages, implementer fixes)

**Goal:** every battery finding gets exactly one adjudication and at most one fix dispatch. The ledger stops re-litigation; the consolidated file stops fixer ping-pong.

## Triage, in this order

1. **CI first:** `gh pr checks <pr-url>`. A red check is a finding of this triage, pooled with the lenses. Still running: note it and re-read before the fix dispatch. A known-flaky failure is derived once per SHA and cited after that.
2. **De-duplicate** across lenses: the same defect found twice is one finding with two citations.
3. **Close ledger matches** (`state.md` → Adjudications) with the citation. Independently re-finding a ruled trade-off is sensitivity working; note it, move on.
4. **Verify known FP classes** before dismissing; dismissal needs recorded evidence, never disbelief. Built-in `code-review` findings on "unrelated" files: check `git diff --name-only origin/main...HEAD` before calling them a stale-base artifact. Ambiguous verification is a dispute, not an FP. A new FP class goes into the ledger.
5. **Deep mode: verify before fixing.** Dispatch a fresh verifier with the charter below, the review worktree path and the surviving findings, never the ledger. `refuted` findings are dropped and recorded; `partial` ones are re-scoped to what survived.
6. **Sort what remains:**
   - `blocking` → the fix list.
   - `note` → the fix list when cheap and in a file already being fixed; otherwise an accepted trade-off, written into the PR body's Trade-offs section now.
   - **The ticket is wrong** (an Acceptance line cannot hold, a Rule contradicts the code): `bash scripts/board.sh status <n> "Awaiting Human"`, present the line and the choice. The ruling becomes a body edit by the conductor (`gh issue edit`, header and title kept) and, when the plan must change, `plan --amend`; the amended implementation re-enters a full phase 2 with a fresh cycle count.
   - **Deferral** → a standard ticket, not a note, created the way `/tickets` creates one: title `MA-nnn — <title>` from `bash scripts/board.sh next-ma`; body per the ticket standard with header `Part of #<parent> · Depends on MA-XXX (#<n>) · Verify <emulator|none> · Flags <...>` and Context pointing at this PR and the `path:line`; `gh issue create --title "MA-nnn — <title>" --label "module:<x>" --milestone "<m>" --body "$BODY"`; `bash scripts/board.sh link <parent> <new>`; `bash scripts/board.sh status <new> Defined`, so `promote <parent>` after this merge makes it pullable. Record the number. "Deferred" without a number is not a disposition.
   - **Dispute** (implementer against a lens, or you against a surviving finding) → both sides to the human now, `board.sh status <n> "Awaiting Human"`; the ruling goes into Adjudications.
7. **Write `findings/cycle-<n>.md`:** each finding with `path:line`, quoted code, severity and the required outcome. This file is what the fixer receives and what the re-check verifies against.
8. **Fix dispatch:** the implementer, as a phase 1 re-entry with the file appended verbatim. One dispatch per cycle; parallel fixers only when findings are provably file-disjoint.
9. **Push the fix commits** from the worktree and re-point the review worktree. A fix that exists only locally is invisible to the PR and dies with teardown.

Back from Awaiting Human with a ruling: `bash scripts/board.sh status <n> "In Review"` and continue.

## Charter: finding verifier (deep mode; paste)

You are adversarially verifying review findings against the code, from a read-only review worktree: no edits, no git state changes. For each finding, try to refute it: read `path:line` and its callers and callees with LSP, and check whether the claimed failure can occur. Verdict per finding: `confirmed` (it holds; say why the refutation failed), `partial` (holds narrower than claimed; state exactly what survives), `refuted` (cannot occur; `path:line` evidence). Judge only the findings given; add none. Return the verdict table, nothing more.

## Exit

Fixes pushed → phase 4. Nothing to fix → `P4: vacuous` in `state.md`, then phase 5 with the triage table. Record outcomes as counts: fixed / ledger / FP / refuted / trade-off / deferred (number) / amended.
