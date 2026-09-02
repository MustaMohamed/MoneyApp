---
description: Assemble and run the Device QA gate checklist for the current change
---

Load the `device-qa` skill and prepare the Device QA gate:

1. Determine the change scope (the task named in $ARGUMENTS, or the current branch diff vs `main`).
2. Assemble the checklist: the always-run checks plus every area matrix the change touches.
3. Present it as a numbered walk-through for me to run on a real device — I am the only one who can walk this gate.
4. Wait for my per-item results, then record them as a `## Device QA` comment on the ticket's issue, using the skill's template, and state the verdict: pass, or fail with the items that route back to the implementer.

Check the PR branch out in this repo first — **never QA from the worktree.** Its symlinked `node_modules` breaks device builds; expo-router resolves zero routes.

$ARGUMENTS
