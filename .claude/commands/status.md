---
description: Sarah reports current state of in-flight scopes
---

@sarah Read every `docs/scopes/*/tasks.md`, the task files for anything not `done`, plus the current `git status`, open PRs, and recent commits. Report:

- **Active scope(s)** — scope ID, and how many tasks are `done` of the total
- **Current task** — ID, title, status, the step that maps to, who owns it
- **Artifacts on disk** with paths
- **Blockers** — anything `blocked`, and which gate is holding (1, 2, or 3)
- **Next recommended action**

Flag any scope whose `tasks.md` disagrees with its task files' frontmatter. Frontmatter wins, and a disagreement means a status write was interrupted mid-transition.

Keep it concise — bullet list, not prose.
