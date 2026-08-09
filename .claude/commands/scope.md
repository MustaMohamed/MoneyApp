---
description: Run a scope end to end through the ten-step workflow
---

@sarah Run the following through the ten-step scoped workflow. The steps, gates, status vocabulary, retry caps, and git rules are in your agent file and in CLAUDE.md — follow them as written.

**If the argument names an existing scope** (`MA-<slug>`), resume it: read `docs/scopes/MA-<slug>/tasks.md`, take the first task in its order whose issue is still open, and re-enter at the step that issue's `status:*` label maps to. **Otherwise** treat it as a new idea: name the scope, create `docs/scopes/MA-<slug>/{tasks,assets}/`, and start at step 1.

Step 1 uses `superpowers:brainstorming`, which defaults to writing a design doc into `docs/superpowers/specs/`. **Override it** — step 1's output is `docs/scopes/MA-<slug>/scope.md`, written in plain language for me. The agent-facing spec is step 2 and belongs to @tariq.

Stop at exactly three gates — after step 1, after step 3, after step 9 — and on a critical trigger. Nowhere else.

At gate 1, publish @marcus's mockup as an artifact so I review rendered screens alongside `scope.md`.

Consult `[marcus]` and `[layla]` inline during step 1. Dispatch `@marcus`, `@layla`, `@tariq`, `@task-reviewer`, `@plan-reviewer`, `@dev`, `@impl-reviewer`, `@pr-reviewer`, `@quality-reviewer` for the work they own.

Step 9's debt is filed, not fixed. Open the `debt:*` issues yourself and report them to me at gate 3 — I merge knowing what is deferred.

Push and open the PR on @impl-reviewer's approval. **Never merge** — that is mine, every time.

$ARGUMENTS
