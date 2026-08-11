# Phase 1 — Brainstorm (conductor + human, parallel scouts)

**Goal:** aligned scope boundaries and goal, all scenarios and edge cases surfaced, approach chosen with trade-offs visible. Ends at a human gate.

**Inputs:** the ticket's GitHub issue (via `gh issue view`), the codebase, live app evidence when relevant.

## Method

1. **Evidence before questions — fan the evidence out.** Dispatch up to four read-only scouts *in one message* and merge their reports into the evidence base: (a) codebase map — the files, symbols, and call sites the ticket touches (LSP-first); (b) prior art — related PRs, uncommitted work, sibling features; (c) history — how this area evolved, past reverts, existing audits of the module (`docs/superpowers/reviews/`); (d) danger surfaces — SQLite migrations, secure-store/auth surfaces, onboarding resume state, route registration under `src/app/`, native config (`app.json` plugins, prebuild surface), money paths. Use the `emulator-verify` skill when live app behavior matters. Questions must come from what the evidence actually shows, not from templates.
2. **One question at a time.** Multiple-choice preferred, with your recommendation first and marked. Never bundle questions. Stop asking when answers stop changing the design.
3. **Scenario inventory (mandatory output).** Build a table: scenario → expected behavior → in/out of scope. Include the edges: empty inputs, boundary values, concurrent edits, failure paths, permission boundaries. An edge case with no decided behavior is an open question — ask it.
4. **Spike protocol.** If a feasibility question can only be answered by code: create a scratch worktree, spike it, record findings in `state.md`, then **delete the worktree**. Spike code is never promoted, never referenced by the plan, never "adapted". Findings survive; code does not.
5. **Approaches.** Present 2–3 with trade-offs, recommendation first. YAGNI ruthlessly.
6. **Devil's-advocate pass.** Before the gate, present: the strongest objections to your recommendation, the alternatives you rejected and why, and what would make you wrong. The human approves with trade-offs visible, not just the pitch.

## Gate

Present for approval, compactly: goal (one sentence), in-scope / out-of-scope lists, the scenario inventory, chosen approach + rejected alternatives. Ask the gate question directly: **"Approve this scope and goal?"**

**While the gate is open, pre-stage the spec skeleton** (section headings + what each will say) as a file under `prestage/`, logged with one `state.md` line — the human's answer releases spec writing, it doesn't start the drafting. An overruled proposal's file is deleted, not argued for.

Record the outcome verbatim in `state.md` (`P1 gate: approved — <scope summary>` or the requested changes). Do not proceed on ambiguity — a comment that isn't approval is a revision request.

## Output

- `state.md` updated: scope boundaries, scenario inventory, approach, rejected alternatives, spike findings, gate outcome.
- Nothing else exists yet — no spec, no plan, no code.
