# Phase 5 — Plan review (subagent: single reviewer, or 3-lens panel)

**Goal:** the plan is judged against the spec — not against itself. Ends in approval or the fix loop back to the planner.

**Shape:** when `est_loc` (recorded at the P2 gate in `state.md`) exceeds ~400, run a **panel**: three fresh subagents dispatched in one message, same charter, each with one assigned lens — **spec fidelity** (checks 1–3 primary), **testability** (check 4 primary), **conventions & ordering** (checks 5–6 primary). All three run every check; the lens is emphasis and depth, not exclusivity — three angles catch what one anchored reading misses. The conductor consolidates and de-duplicates their findings into one list, the planner revises **once**, one panelist re-checks. Below the threshold: a single reviewer, standard fix loop.

**Conductor dispatch:** fresh general subagent(s); prompt = charter below (+ the assigned lens) + absolute paths to `spec.md`, `task.md`, the plan, and the repo. Never the planner's context. Never the adjudication ledger — first-pass reviewers stay blind.

## Charter (paste into the reviewer prompt)

You are reviewing an implementation plan you did not write, for a ticket you will not implement.

**Order is mandatory:** read `spec.md` and `task.md` FIRST. Before opening the plan, write down (for yourself) what the plan must contain: which files you expect it to touch, which scenarios need steps, which tests must exist. Only then open the plan and diff your expectation against it. You are not critiquing prose — you are checking a plan against a contract you internalized first.

Check, in order:

1. **Coverage** — every spec requirement and every scenario-inventory row lands in some step or test. Name any that don't. **Sub-tickets:** coverage means the sub-ticket's slice brief (in `state.md` under `## Sub-tickets`), not the whole parent spec. **Chunk mode:** additionally check the chunk grouping — every step in exactly one chunk, every chunk's interface named, dark-merging code explicitly marked.
2. **No extra work** — steps that serve nothing in the spec are findings (scope creep is a defect here, not a bonus).
3. **Reality** — spot-check the named files/symbols with LSP. A plan step naming a file that doesn't exist, or missing a call site that LSP finds, is a finding.
4. **Tests** — each behavioral step has its proving test, placed where the repo's conventions allow tests; test-first ordering where applicable. Would each test fail if the behavior regressed?
5. **Order** — the branch would compile and stay green after each step; no step depends on a later one; cross-step hazards (declaration order, import cycles, registration order) checked deliberately.
6. **Conventions** — steps comply with the repo's `CLAUDE.md` and the `.claude/rules/` files matching the touched paths (`ui.md`, `state.md`, `database.md`, `money.md`, `tests.md` — state management, layering, naming). Cite the rule-file line when flagging.

**Evidence rule:** every finding cites the plan step and the spec section or `path:line` it conflicts with, with severity matched to consequence. No finding without evidence.

Do not rewrite the plan. Do not edit any file. Return: verdict (`approve` | `findings`), the findings list, and the expectation-vs-plan gaps that turned out to be your error (say so — it calibrates the loop).

## Exit

Approve → phase 6. Findings → fix loop: **single:** standard loop, cap 2 cycles. **Panel:** conductor consolidates and de-duplicates (a merge job, not a review) → planner revises once → **one fresh panelist re-dispatch** re-checks, with the consolidated findings appended verbatim — that is the panel's whole loop; unresolved after it goes to the human. Disputes to the human either way. Record verdict, shape (single/panel), and cycles in `state.md`.
