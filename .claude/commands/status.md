---
description: Sarah reports current state of in-flight scopes
---

@sarah Read every `docs/scopes/*/tasks.md`, the task issues on GitHub, the task files for anything still open, plus the current `git status`, open PRs, and recent commits. Report:

- **Active scope(s)** — scope ID, and how many task issues are closed of the total
- **Current task** — ID, title, its `status:*` label, the step that maps to, who owns it
- **Artifacts on disk** with paths
- **Blockers** — anything `status:blocked`, and which gate is holding (1, 2, or 3)
- **Next recommended action**

Status comes from the issues, not the repo — `list_issues(labels: ["scope:MA-<slug>"])` in one call, rather than opening twelve task files.

Flag these three, each of which means something is actually wrong rather than merely stale:

- A task file whose `issue:` frontmatter points at an issue that does not exist, or at one belonging to a different task.
- An issue with **no** `status:*` label, or more than one — the label is meant to be replaced, not added to, and two labels means a transition half-applied.
- An issue **closed while its PR is unmerged**, or open while its PR is merged. `Closes #N` in the PR body is what keeps those in step; a mismatch means either the line was missing or someone closed the issue by hand.

Keep it concise — bullet list, not prose.
