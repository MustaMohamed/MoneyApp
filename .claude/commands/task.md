---
description: Run one task through steps 4-8 and stop at its PR
---

@sarah Run **one task** through steps 4–8 of the nine-step workflow. The steps, gates, status vocabulary, retry caps, and git rules are in your agent file and in CLAUDE.md — follow them as written. This is `/scope` narrowed to a single task: same reviewers, same three review gates, same critical triggers, same status rules — and status is the `status:*` label on the task's GitHub issue, never a field in the repo.

The argument names a task (`MA-nnn`), optionally with its scope (`MA-<slug> MA-nnn`). Find it in `docs/scopes/*/tasks/`. If the ID is ambiguous or missing, say so and stop — do not guess which task I meant.

**Check dependencies before anything else.** `tasks.md` § *Dependencies* lists what this task requires. Every one must be `done` — **read that from its issue being closed**, not from the task file, which no longer claims a status. If one is open, **stop and tell me which** — the order encodes real dependencies and building on a half-built base is how a task gets planned against something that does not exist yet. If a dependency is merged but `main` has moved since, rebase first.

**Re-enter at the step the task's issue label maps to**, so an interrupted task resumes instead of restarting: `status:todo`/`status:planning` → step 4 · `status:ready` → step 6 · `status:implementing` → finish step 6 · `status:in-review` → step 7 or 8, whichever has no verdict yet · `status:awaiting-human` → it is already at its PR, tell me · *issue closed* → it is done, say so and stop · `status:blocked` → report the blocker, do not work around it.

**Stop at the PR.** Push and open it on @impl-reviewer's approval, run step 8, then stop. **Do not roll on to the next task** — that is what `/scope` is for. **Never merge**; that is mine, every time.

The task branch carries its own task file, so the plan, all three review verdicts and the code land as one PR. Cut it from current `main`, named `feat/MA-nnn-slug`.

**The PR body must contain `Closes #N`**, N being the task's issue. That is what marks the task `done` — the merge closes the issue itself, so no session has to be alive at merge time for the status to be right.

Post each review verdict to the PR as well as the task file. A verdict that exists only on disk is not visible where the work is reviewed.

Wake me only on a critical trigger, or if a review gate hits its fourth round and the task blocks. Otherwise run it through.

$ARGUMENTS
