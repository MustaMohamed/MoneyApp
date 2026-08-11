# Phase 4 — Plan (subagent: cold planner)

**Goal:** a **skeleton plan** a cold implementer can execute without asking anything: steps, interfaces, invariants, ordering, tests — the whole-ticket properties. Line-level detail is deliberately thin; it rots the moment real code exists, and (in chunk mode) each chunk elaborates its own detail at chunk start. The planner gets **no conversation history** — if a competent plan can't be written from the spec alone, the spec is incomplete, and that must surface here, not at phase 6.

**Conductor dispatch:** fresh general subagent; prompt = charter below + absolute paths to `spec.md`, `task.md`, the target repo, and the plan output path (`~/.ship/MoneyApp/MA-XXX/plans/MA-XXX.md` — for sub-tickets, the parent's dir; for a P8 amendment, `plans/MA-XXX-amendment-<n>.md`). **Sub-tickets:** also pass the `state.md` path and name the sub-ticket being planned — its slice brief under `## Sub-tickets` bounds the plan. **Chunk mode:** pass the proposed chunk ledger from `task.md`; the plan must confirm or amend the chunk boundaries.

## Charter (paste into the planner prompt)

You are writing the implementation plan for a ticket you will not implement. Your only inputs are the spec, the task definition, and the repository. You have no access to the discussions behind them — by design.

1. Read `spec.md` and `task.md` fully. Then explore the code with LSP: find the real files, symbols, and call sites the change touches. **Every path and symbol you name must be verified against the repo — no guessed paths.** If the repo contradicts the spec, or the spec is silent on something you need, STOP and return the gaps as questions instead of a plan. A gap list is a successful phase-4 output; a plan built on guesses is not.
2. Write the plan for a cold reader, as numbered steps. Each step names:
   - the file(s) and symbol(s) it touches (verified, `path:line` where useful),
   - the change in one or two sentences — **interfaces and invariants precisely; edit-level detail sparingly** (the implementer elaborates at execution time; prescribe exact code only where exactly one sequence is safe),
   - the test that proves it — written first where the repo's conventions test that layer (check `.claude/rules/tests.md` and `CLAUDE.md` for what gets tested — logic-only `.ts` tests in `__tests__/`; do not plan tests the repo forbids).
3. Order steps so the branch compiles and tests green after every step. Look ahead across steps for ordering hazards (declaration order, import cycles, seed/registration order) — these are whole-plan properties only you can catch.
4. **Chunk mode:** group the steps into the chunks from the ledger (amend boundaries if the code says otherwise, with reasons). Per chunk state: owned spec sections, the interface it exposes, whether it is disjoint or dependent (and on what), and what merges *dark* (inert until a later chunk wires it). Prefer disjoint boundaries: justify every dependent edge — a chunk left dependent when a seam (or a dark-until-wired merge) could make it disjoint costs one human-merge wait on the critical path.
5. If the spec cites a newly-written ADR (check `state.md`'s decisions), include a plan step that adds the ADR file to the ticket branch — it is a committed artifact and this is its only route into the PR.
6. End with: **Non-goals** (from the spec, plus anything adjacent you're explicitly not doing), **Verification** (the repo's full battery — the CI parity chain in `CLAUDE.md` → `## Commands`), and **Risks** (what could invalidate this plan).
7. Do not implement anything. Do not edit any file except the plan.

Return: the plan file path, plus a one-paragraph self-assessment — what part of the plan you are least sure about.

## Exit

Plan file exists and the self-assessment is recorded in `state.md`. Gap-list outcome → conductor fixes `spec.md` (re-gate `task.md` with the human only if scope changed), then re-dispatches. Chunk-boundary amendments → conductor updates the `task.md` ledger. Otherwise → phase 5.
