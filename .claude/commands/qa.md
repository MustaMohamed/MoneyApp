---
description: Assemble and run the Device QA gate checklist for the current change
---

Load the `device-qa` skill and prepare the Device QA gate:

1. Determine the change scope (current branch diff vs `main`, or the feature named in $ARGUMENTS).
2. Assemble the checklist: the always-run checks plus every area matrix the change touches.
3. Present it as a numbered walk-through for me to run on a real device — I am the only one who can walk this gate.
4. Wait for my per-item results, then record them to `docs/superpowers/qa/YYYY-MM-DD-{feature}.md` using the skill's template and state the verdict: pass, or fail with the items that route back to execution.

$ARGUMENTS
