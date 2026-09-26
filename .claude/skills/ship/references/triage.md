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
   - `note` on this PR's own diff → the fix list. An accepted trade-off only where the fix would break a ticket Rule or another ticket's reviewed scope, written into the PR body's Trade-offs section now with the Rule or ticket it would break.
   - **Beyond this ticket** (the fix is another ticket's Acceptance, a new Acceptance line, or a ruling that adds scope): recount per `.claude/skills/tickets/references/splitting.md` § Size gate, the plan's `expected diff` plus the addition's own estimate, and its files and steps. Within the gate → the fix list, through `prep --amend` when the plan must change, and a folded ticket's `Closes #N` joins the PR body. Over it → a deferral below, whoever asked for it in this PR (hard rule 10).
   - **The ticket is wrong** (an Acceptance line cannot hold, a Rule contradicts the code): `bash scripts/board.sh status <n> "Awaiting Human"`, present the line and the choice. The ruling becomes a body edit by the conductor (`gh issue edit`, header and title kept) and, when the plan must change, `prep --amend`; the amended implementation re-enters a full phase 2 with a fresh cycle count.
   - **Deferral, the family check first.** A deferred finding is an instance of a class: the same defect on another screen, module, slot, primitive or string. Before creating anything, look for the class on the milestone: `gh issue list --milestone "<m>" --state all --search "<two or three words that name the defect>"`, the merged siblings' Out of scope lines, and the audit backlog (`docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md`) for the item the lens cited. Then: an open ticket for the class exists → add this site to its Acceptance with `gh issue edit`, no new ticket. An open ticket for another *instance* exists → re-scope that ticket to the class: its Goal names the defect, its Acceptance lists every site from one `git grep`, its Context cites every instance found so far. Nothing exists → the new ticket is the class ticket, sites from the grep, never one site. On the accounts redesign one untrimmed name check became twelve tickets and one unkeyed store slot six, each ticket's Out of scope the next ticket's Goal, at a 55M pipeline floor each. An instance ticket never names a sibling instance of its own class in Out of scope; that site is an Acceptance line. No class ticket and the fix under ~100 lines: an open ticket that changes the same screen takes it per `splitting.md` § Floor, when its `Size:` recount stays within the gate; edit its Acceptance and `Size:` line instead of creating one.
   - **Deferral** → a standard ticket, not a note, created the way `/tickets` creates one: title `MA-nnn — <title>` from `bash scripts/board.sh next-ma`; body per the ticket standard with header `Part of #<parent> · Depends on MA-XXX (#<n>) · Verify <emulator|none> · Flags <...> · Reviewed none` and Context pointing at this PR and the `path:line`; `gh issue create --title "MA-nnn — <title>" --label "module:<x>" --milestone "<m>" --body "$BODY"`; `bash scripts/board.sh link <parent> <new>`; `bash scripts/board.sh status <new> Defined`; `/issue-review <new>` is what makes it pullable, name it in the reply. Record the number. "Deferred" without a number is not a disposition.
   - **Dispute** (implementer against a lens, or you against a surviving finding) → both sides to the human now, `board.sh status <n> "Awaiting Human"`; the ruling goes into Adjudications.
7. **Write `findings/cycle-<n>.md`:** each finding with `path:line`, quoted code, severity and the required outcome. This file is what the fixer receives and what the re-check verifies against.
8. **Fix dispatch:** the implementer, as a phase 1 re-entry with the file appended verbatim. One dispatch per cycle; parallel fixers only when findings are provably file-disjoint.
9. **Push the fix commits** from the worktree and re-point the review worktree. A fix that exists only locally is invisible to the PR and dies with teardown.

Back from Awaiting Human with a ruling: `bash scripts/board.sh status <n> "In Review"` and continue.

## Charter: finding verifier (deep mode; paste)

You are adversarially verifying review findings against the code, from a read-only review worktree: no edits, no git state changes. For each finding, try to refute it: read `path:line` and its callers and callees with LSP, and check whether the claimed failure can occur. Verdict per finding: `confirmed` (it holds; say why the refutation failed), `partial` (holds narrower than claimed; state exactly what survives), `refuted` (cannot occur; `path:line` evidence). Judge only the findings given; add none. Return the verdict table, nothing more.

## Exit

Fixes pushed → phase 4. Nothing to fix → `P4: vacuous` in `state.md`, then phase 5 with the triage table. Record outcomes as counts: fixed / ledger / FP / refuted / trade-off / deferred (number) / amended.
