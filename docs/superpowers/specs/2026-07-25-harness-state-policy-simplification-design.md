# Harness State Policy Simplification Design

- **Date:** 2026-07-25
- **Scope:** Review correction for Harness Phase 1 and its stacked Phase 2 branch
- **Decision:** User approved removal of Preact Signals-specific live harness policy, subagent guidance, skills, validation, fixtures, and tests

## Summary

MoneyApp uses Zustand v5. Preact Signals and its Babel transform are not
application dependencies, and the project does not use them in runtime source.
Harness Phase 1 correctly removed stale instructions that told agents to
migrate Zustand state to Preact Signals, but it replaced those stale
instructions with a specialized permanent anti-Signals policy and
natural-language classifier.

That specialized machinery gives a retired library too much prominence and
maintenance cost. The harness will instead express the current supported state
architecture positively: Zustand v5 is required, and introducing any new
dependency or replacing an established stack choice requires the existing
approved-plan and critical-trigger workflow.

## Goals

1. Remove Preact Signals-specific wording from live MoneyApp root policy,
   custom subagents, inline expert-panel skills, and their canonical sources.
2. Remove the `STACK-NO-SIGNALS` semantic rule, specialized natural-language
   classifier, repository-fact check, fixtures, and tests.
3. Preserve `STACK-ZUSTAND` as the executable state-management invariant.
4. Preserve deterministic generation and parity across the sixteen registered
   Codex and Claude targets.
5. Apply the same correction to the stacked Phase 2 branch without weakening
   its durable workflow implementation.

## Non-Goals

- Do not add, remove, or upgrade application dependencies.
- Do not remove the unrelated transitive `human-signals` package from the
  lockfile; it handles operating-system process signals and is not a state
  library.
- Do not rewrite historical specs, plans, reviews, or audit evidence that
  describe the stale guidance and the reason Phase 1 originally addressed it.
- Do not weaken the generic critical trigger for new dependencies or changes
  outside the established stack.
- Do not change application, Expo, native, database, or user-facing behavior.
- Do not push, merge, retarget PRs, delete branches, or clean worktrees.

## Canonical Live-Surface Changes

The following canonical sources will stop mentioning Preact Signals:

- `harness/policy/architecture.md`
- `harness/personas/dev.md`
- `harness/personas/tariq.md`

`npm run harness:generate` will propagate those removals to:

- `AGENTS.md`
- `CLAUDE.md`
- `.codex/agents/dev.toml`
- `.codex/agents/tariq.toml`
- `.claude/agents/dev.md`
- `.claude/agents/tariq.md`
- `.agents/skills/moneyapp-expert-panel/SKILL.md`
- `.claude/skills/moneyapp-expert-panel/SKILL.md`

The generated policy continues to name Zustand v5 and continues to treat a new
dependency or an established-stack change as a critical trigger. It will not
name a retired alternative library.

## Validation Simplification

Remove `STACK-NO-SIGNALS` from `harness/rules/semantics.json` and from the
required semantic rule registry. Remove the code that tries to interpret
positive and negative natural-language references to Signals.

Remove repository-fact checks that scan dependency files, Babel configuration,
source imports, and live guidance for Preact Signals. Keep the positive Zustand
check, which already requires agreement among `package.json`,
`package-lock.json`, and application source imports.

Remove Signals-specific invalid fixtures and unit tests. Existing generic
generation-parity tests remain the protection against hand-edited generated
subagent or skill files. Existing semantic and repository-fact tests continue
to protect the supported stack, authority, path, persona, UI, and verification
contracts.

## Stacked Branch Handling

Phase 1 receives the canonical correction first. Phase 2 contains Phase 1 plus
the durable workflow system, so it must receive the equivalent correction
before PR #171 can remain a valid successor.

Phase 2 has already reached `integration_ready`. Before changing delivery-bound
files, its immutable ledger must record `work.reopened` with the user's review
correction as the basis. After the correction, Phase 2 must establish a fresh
implementation-ready cycle, review receipt, and verification receipt before it
can return to `integration_ready`.

No history is rewritten. The failed and passed Phase 2 verification receipts
remain immutable historical evidence.

## Verification

Phase 1:

1. Focused harness semantic, repository-fact, persona, root-adapter, generation,
   and integration tests pass.
2. `npm run harness:test` passes.
3. `npm run harness:check` reports all registered targets valid.
4. A live-surface scan finds no Preact Signals package or migration guidance in
   canonical or generated MoneyApp policy, subagent, skill, or command files.
5. `npm run verify:pr` passes.

Phase 2:

1. The focused and complete harness tests pass after the equivalent correction.
2. The durable initiative ledger validates and returns to
   `integration_ready` through a fresh cycle.
3. `npm run verify:pr` passes.

## Acceptance Criteria

1. No live canonical or generated MoneyApp policy, custom subagent, inline
   expert-panel skill, or workflow command mentions Preact Signals,
   `@preact/signals-react`, its transform, or a Signals migration.
2. No semantic or repository-fact implementation has Signals-specific
   behavior.
3. No active harness fixture or test exists solely to classify or reject
   Signals language or dependencies.
4. Zustand v5 remains required and evidence-backed.
5. Historical documents remain intact.
6. Both stacked branches are clean and verified locally, with no push or merge
   performed.
