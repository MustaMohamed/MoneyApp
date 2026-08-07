---
description: Run a scope end to end through the nine-step workflow
---

@sarah Run the following through the nine-step scoped workflow. The steps, gates, status vocabulary, retry caps, and git rules are in your agent file and in CLAUDE.md — follow them as written.

**If the argument names an existing scope** (`MA-<slug>`), resume it: read `docs/scopes/MA-<slug>/tasks.md`, take the first task in its order whose issue is still open, and re-enter at the step that issue's `status:*` label maps to. **Otherwise** treat it as a new idea: name the scope, create `docs/scopes/MA-<slug>/{tasks,assets}/`, and start at step 1.

Step 1 uses `superpowers:brainstorming`, which defaults to writing a design doc into `docs/superpowers/specs/`. **Override it** — step 1's output is `docs/scopes/MA-<slug>/scope.md`, written in plain language for me. The agent-facing spec is step 2 and belongs to @tariq.

Stop at exactly three gates — after step 1, after step 3, after step 8 — and on a critical trigger. Nowhere else.

At gate 1, publish @marcus's mockup as an artifact so I review rendered screens alongside `scope.md`.

Consult `[marcus]` and `[layla]` inline during step 1. Dispatch `@marcus`, `@layla`, `@tariq`, `@task-reviewer`, `@plan-reviewer`, `@dev`, `@impl-reviewer`, `@pr-reviewer` for the work they own.

Push and open the PR on @impl-reviewer's approval. **Never merge** — that is mine, every time.

$ARGUMENTS
