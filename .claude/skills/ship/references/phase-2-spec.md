# Phase 2 — Spec (conductor)

**Goal:** two synced artifacts — a deep agent-facing spec and a human-readable task definition — plus a delivery-mode recommendation. Ends at a human gate on `task.md` + mode.

**Inputs:** phase-1 output in `state.md`.

## spec.md — required sections

Written for agents that will never see this conversation. Every section present; "N/A — <why>" is acceptable, silence is not.

1. **Goal** — one paragraph, testable.
2. **Scope boundaries** — in-scope / out-of-scope, verbatim from the approved gate.
3. **Behavior per scenario** — every row of the phase-1 scenario inventory appears here with its decided behavior. No orphan scenarios: if it was in the inventory, it has a behavior; if a new one emerges while writing, go back and decide it.
4. **Data model deltas** — types/fields/tables added or changed, with the owning file.
5. **Contracts** — API endpoints, function signatures, events; generated-contract implications.
6. **Error paths** — what fails, what the user sees, what gets logged.
7. **Non-goals** — what a reasonable implementer might build but must not.
8. **Test surface** — what gets automated tests per the repo's conventions, what is manual. **Full cycles are integration tests, never emulator walks:** any end-to-end behavior (store → repository → SQLite) is proven in Jest against a real database per the `moneyapp-testing` skill. The emulator's only job is the UI — declare here whether the ticket has UI surface and **which screens**; that list is what P6's UI render pass walks. No UI-component render tests (repo policy): design conformance is checked on the emulator, logic in Jest.

## task.md — the human checklist

Same section headings as `spec.md`, each compressed to **checklist bullets a human verifies in two minutes** — plain language, no file paths, no code, each bullet naming the spec section it stands for (`covers §3 rows 1–8`). It is a checklist referencing the spec, **not a prose mirror** — duplicated prose drifts and doubles the review surface. If a spec section can't be expressed as plain-language checklist bullets, the spec section is confused — fix it.

In **chunk mode** (from P3 onward), `task.md` also carries the **chunk ledger**: one row per chunk — slug, boundary (which spec sections/scenarios it owns), interface it exposes, and status. `task.md` may evolve during later phases (it is workflow state, not the GitHub issue). The issue body is never edited to mirror it.

## ADR triggers

Route the decision through an ADR (a committed decision record, unlike these artifacts — this project has no adr skill, so draft it directly at `docs/adr/<yyyy-mm-dd>-<slug>.md`) when the ticket:
- changes a contract other consumers depend on,
- introduces or replaces a dependency, store, or queue,
- changes auth, secure-store, or money-handling behavior,
- reverses a previously recorded decision.

Cite the ADR from `spec.md` and record its path under `state.md` → `## Decisions`. ADRs are committed artifacts (unlike everything else this workflow writes): the phase-4 plan must include a step adding the ADR file to the ticket branch — that is its only route into the PR; nothing else commits it.

## Self-review (before the gate)

Re-read both files fresh:
- **Placeholders:** no TBD/TODO/vague requirement survives.
- **Contradictions:** sections agree with each other and with the approved scope.
- **Two-way reads:** any requirement interpretable two ways gets rewritten to one.
- **Checklist check:** every spec section has its bullets; every bullet points at a real section.

Fix inline; no re-review cycle.

## Gate (task definition + delivery mode, one gate)

Estimate the expected diff in LOC — added + changed, **excluding comments, docs, and generated files** — from the spec's data-model and contract sections. Then send the human `task.md` (render it — they read it, not the spec) together with the mode recommendation:

- ≤ ~200 LOC → *"Recommended: direct."*
- > ~200 LOC → *"Estimated ~N LOC — recommended: chunk mode (~K chunks, K ≥ 2 — a would-be single chunk runs direct). Chunk it?"*
- multi-feature → *"Recommended: split into K sub-tickets: <one line each>."*

Ask directly: **"Approve this task definition and delivery mode?"** One gate covers both. Record outcome, chosen mode, **and `est_loc: ~N` in the `state.md` header** — the P5 panel decision keys off it and it must survive a resume. Changes requested → revise both files (they move together), re-gate.

**While the gate is open, pre-stage the plan charter** (dispatch-ready planner prompt) as a file under `prestage/`, logged with one `state.md` line.
