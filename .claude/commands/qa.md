---
description: Assemble and run the Device QA checklist for a closed epic or module
---

Load the `device-qa` skill and prepare the Device QA pass for an epic or module that closed:

1. Determine the scope: the epic or module named in $ARGUMENTS, and the screens its merged PRs changed.
2. Assemble the checklist: the always-run checks plus every area matrix those screens touch.
3. Present it as a numbered walk-through for me to run on a real device. I am the only one who can walk it.
4. Wait for my per-item results, then record them as a `## Device QA` comment on the epic's issue, using the skill's template: pass, or fail with the failed items listed. Nothing routes back to an implementer, and no merge waits on this pass.

Build from `main` in this repo, **never from a worktree.** Its symlinked `node_modules` breaks device builds; expo-router resolves zero routes.

$ARGUMENTS
