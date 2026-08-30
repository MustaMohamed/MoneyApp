---
description: Assemble and run the Device QA gate checklist for the current change
---

Load the `device-qa` skill and prepare the Device QA gate:

1. Determine the change scope (the task named in $ARGUMENTS, or the current branch diff vs `main`).
2. Assemble the checklist: the always-run checks plus every area matrix the change touches.
3. Present it as a numbered walk-through for me to run on a real device — I am the only one who can walk this gate.
4. Wait for my per-item results, then record them under `## Device QA` **in the PR description**, using the skill's template, and state the verdict: pass, or fail with the items that route back through the review battery's fix loop (ship phase 8). Mirror them into the ticket's `task.md` (`~/.ship/MoneyApp/<ticket>/task.md`) if one is open, but the PR is the durable copy — ship's phase 10 deletes the artifact directory right after the merge.

Check the PR branch out in this repo first — **never QA from the worktree.** Its symlinked `node_modules` breaks device builds; expo-router resolves zero routes.

$ARGUMENTS
