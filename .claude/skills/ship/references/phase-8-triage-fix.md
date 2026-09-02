# Phase 8 — Triage + fix (conductor triage, implementer fixes)

**Goal:** every battery finding gets exactly one adjudication and at most one fix dispatch. The ledger prevents re-litigating; the consolidated list prevents fixer ping-pong.

## Conductor: triage (in this order)

1. **Read CI first** — `gh pr checks <pr-url-from-state.md>`. By triage time the push-triggered run has usually finished; a red check is a finding for *this* triage, pooled with the lens findings, not a P10 surprise. Checks still running: note it, and re-read before the fix dispatch.
2. **De-duplicate** across lenses — same defect found twice is one finding with two citations.
3. **Close ledger matches** (`state.md → ## Adjudications`): a re-found item the human already ruled on is closed with the citation — a fresh reviewer's confidence is not new evidence (Hard rule 10). Independently re-finding a ruled trade-off is review sensitivity working; note it, move on.
4. **Verify known-FP classes** before dismissing — dismissal requires recorded evidence, never disbelief: e.g. built-in `code-review` findings on "unrelated" files — check `git diff --name-only origin/main...HEAD` before calling it a stale-base artifact. **If the verification is ambiguous, the finding is a dispute for the human, not an FP.** Record any *new* FP class in the ledger.
5. **Deep mode: adversarially verify before fixing.** When this battery ran with `deep_mode: yes`, dispatch a fresh **finding verifier** — charter below, plus the review worktree path and the surviving findings list (never the ledger; verification must be independent of prior rulings). Drop `refuted` findings (recording them in the triage table); `partial` findings are re-scoped to what was confirmed. This is the finder→verifier guard: plausible-but-wrong findings must not reach the fix dispatch.
6. **Sort what remains by severity:**
   - **`blocking` findings** → always enter the consolidated fix list.
   - **`note` findings** → enter the fix list when cheap and touching files already being fixed; otherwise record as **accepted trade-offs** — they surface at P10 and in the PR description, not silently.
   - **Spec-level defects** (the spec itself is wrong; the fix needs new surfaces or a data-shape change) → these are design, not fixes. Present to the human, then route through **P4/P5 as an amendment** — delta plan at `plans/MA-XXX-amendment-<n>.md`, reviewed per P5, implemented per P6, and the result re-enters a **full P7 battery** (phase 6's exit). The amendment's battery starts a fresh P8↔P9 cycle count — it is new design and new code, not a fix iteration. The ticket's issue stays at In Review on the board throughout; no status churn.
   - **Deferrals** → conductor files the follow-up issue via `gh issue create` (PM-style body) and records its number in the triage table. "Deferred" without an issue number is not a disposition.
   - **Disputes** (a lens and the implementer disagree, or you believe a surviving finding is wrong) → both sides to the human immediately. Record every ruling in `## Adjudications`.
7. **Write the consolidated list to `findings/p8-cycle-<n>.md`** — each finding with `path:line`, quoted code, severity, and required outcome. This file is what the fixer receives and what P9 verifies against; a list that lives only in conductor context dies with the session.
8. **Human gate (only when needed):** spec-level defects, scope expansions, and disputes go to the human as one compact list — finding, consequence, recommendation. **While this gate is open, pre-stage the amendment** (spec delta + plan-charter draft) under `prestage/`; the answer releases execution.

## Charter — finding verifier (deep mode only; paste)

You are adversarially verifying review findings against the code, from a read-only review worktree — no edits, no git state changes. For each finding in the list: try to **refute** it. Read the cited code at `path:line` and its callers/callees with LSP; check whether the claimed failure scenario can actually occur. Verdict per finding: `confirmed` (it holds — say why the refutation failed), `partial` (holds narrower than claimed — state exactly what part survives), or `refuted` (cannot occur — with `path:line` evidence for the refutation). Judge only the findings given; do not review anything else, do not add findings. Return the verdict table, nothing more.

## Fix dispatch

Route `findings/p8-cycle-<n>.md` to the implementer as a phase-6 re-entry ("address exactly the findings in the file below — nothing else"). One dispatch per cycle — not one per finding; findings in one file usually collide, and parallel fixers are justified only when the findings are provably file-disjoint.

**Conductor pushes the fix commits before anything re-checks.** A fix that exists only locally is invisible to the PR the human merges — and teardown would destroy it.

## Exit

Fixes pushed → phase 9 (delta re-check). Nothing to fix (all findings closed/traded-off/disputed-and-ruled) → record `P9: vacuous — no fixes to re-check` and go to phase 10 with the triage table. Cap: **2 P8↔P9 cycles**, then pause and present unresolved findings with the producer's counter-arguments. Record triage outcomes — fixed / closed-by-ledger / FP-verified / refuted-by-verifier / trade-off / deferred (issue number) / amended — in `state.md` (counts, not essays).
