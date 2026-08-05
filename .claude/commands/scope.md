---
description: Run a scope end to end through the nine-step workflow
---

@sarah Run the following through the nine-step scoped workflow. The steps, gates, status vocabulary, retry caps, and git rules are in your agent file and in CLAUDE.md — follow them as written.

**If the argument names an existing scope** (`MA-<slug>`), resume it: read `docs/scopes/MA-<slug>/tasks.md`, take the first task that is not `done`, and re-enter at the step its status maps to. **Otherwise** treat it as a new idea and start at step 1.

Stop at exactly three gates — after step 1, after step 3, after step 8 — and on a critical trigger. Nowhere else.

At gate 1, publish @marcus's mockup as an artifact so I review rendered screens alongside `scope.md`.

Consult `[marcus]` and `[layla]` inline during step 1. Dispatch `@marcus`, `@layla`, `@tariq`, `@task-reviewer`, `@plan-reviewer`, `@dev`, `@impl-reviewer`, `@pr-reviewer` for the work they own.

Push and open the PR on @impl-reviewer's approval. **Never merge** — that is mine, every time.

$ARGUMENTS
