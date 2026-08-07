# Scope folder templates

Every scope lives in `docs/scopes/MA-<slug>/`. Four files, four different readers.

```
docs/scopes/MA-budget-v2/
  scope.md      step 1 — for the user. Locked at gate 1, never edited after.
  spec.md       step 2 — for agents. Exhaustive and dry.
  tasks.md      the ordered index. Links each task's issue; carries no status.
  tasks/
    MA-042.md   one per task, grown through steps 2, 4, 5, 7, 8, 9.
  assets/       mockup.html, screenshots, reference material.
```

## Identifiers

| Kind | Format | Example |
|---|---|---|
| Scope | `MA-<slug>` | `MA-budget-v2` |
| Milestone | `MA-<slug>-M<n>` | `MA-budget-v2-M2` |
| Task | `MA-<nnn>` | `MA-042` |

Task numbers are **globally sequential across `docs/scopes/**`** — the next one is the highest that exists plus one, not a number nested under the scope. The ID has to survive being a branch name, a commit subject, and a PR title.

Milestones are optional: use them only when a scope exceeds roughly eight tasks or spans more than one area of the app.

---

## `scope.md`

For the user, and the only document written for them. Plain language, bullets, no schema and no file paths. Locked at gate 1; corrections found later go in `spec.md`, not here.

```markdown
# MA-budget-v2 — Budget v2

## What this is
Two or three sentences. The problem, in the user's terms.

## Why now
What is wrong or missing today.

## What we're building
- Bullet per capability, in plain language.

## What we're not building
- Bullet per exclusion. This section prevents more rework than the one above.

## Open questions
Anything the user still has to decide.
```

## `spec.md`

For agents. Assembled by @tariq from the locked `scope.md`, embedding @marcus's and @layla's sections. Reference real paths and symbols instead of paraphrasing them.

```markdown
# MA-budget-v2 — Specification

[Mockup](assets/mockup.html)

## Summary
## Product & UX          — @marcus
## Financial Logic       — @layla
## Architecture          — @tariq
   data model and migrations · state ownership · folder layout · key APIs · risks
## Open questions
```

## `tasks.md`

The index. Rewritten by @task-reviewer at step 3. **It carries no status**, so after step 3 it only changes when a branch or PR link appears — a status transition never touches it.

```markdown
# MA-budget-v2 — Tasks

## M1 — Foundation
| ID | Title | Issue | Branch | PR |
|---|---|---|---|---|
| MA-042 | Spending plan header | #187 | — | #201 |
| MA-043 | Category rollup query | #188 | feat/MA-043-category-rollup | — |
```

**Status lives on the issue**, as exactly one `status:*` label: `status:todo` · `status:planning` · `status:ready` · `status:implementing` · `status:in-review` · `status:awaiting-human` · `status:blocked`. There is no `status:done` — **`done` is the issue being closed**, done by the merge itself through `Closes #N` in the PR body, so it cannot drift from reality even if the session dies.

@sarah opens one issue per task at step 3, right after the list is ordered and before gate 2, so the user sees the board at the same moment they see the task list.

### What the issue holds, and what it must not

The issue carries **the task definition and its status. Nothing else.** Summary, the metadata table (scope, milestone, verify, requires, branch, PR), a link to the task file, and the `status:*` label.

**The plan, the three review verdicts, and every implementation note stay in `tasks/MA-nnn.md` on the task branch.** They are not copied to the issue, not summarised there, and not linked round-trip. Two reasons, and both bite immediately if ignored:

- They are **reviewed with the code they describe.** A plan in an issue is a plan nobody diffs; a plan in the task file arrives in the same PR as the implementation it justifies, which is the only place a reviewer can check one against the other.
- The task file is **versioned with the branch.** A verdict written at step 5 against the code as it stood then stays pinned to that commit. An issue comment floats free of the tree and silently starts describing code that has since changed.

The rule of thumb: if it would ever need to be read *as of a particular commit*, it belongs in the task file. If it answers "where is this task now", it belongs on the issue.

## `tasks/MA-nnn.md`

Written at step 2, appended to at steps 4, 5, 7, 8, and 9. One file carries the entire life of a task.

```markdown
---
id: MA-042
scope: MA-budget-v2
milestone: M2
issue: 187                # status of record — the issue's status:* label
verify: emulator          # emulator | none
branch:
pr:
---

# MA-042 — Spending plan header

## Summary
One or two sentences.

## Details
What the task must achieve, in behavioural terms. **No technical decisions** —
no hook names, store fields, column types, or file paths. Those are step 4's,
and naming them here turns planning into transcription.

## Plan                    (step 4, edited at step 5)
## Plan review             (step 5)
## Emulator verification   (steps 6 and 7, when verify: emulator)
## Implementation review   (step 7)
## PR review               (step 8)
## Device QA               (step 9)
## Outcome                 (step 9)
```

`verify:` decides whether the emulator runs at all. **`emulator`** for anything that changes
what a screen shows or what the app writes to the database — @dev watches it run before
committing, @impl-reviewer drives it independently at step 7 and that run is the one that
counts. **`none`** where a unit test would already catch the failure. It costs a real
`npm install` and a Gradle build in the worktree, so the flag is a real call, not a formality.

**Neither run discharges gate 3.** The emulator is a second net under the same defects; your
device QA checklist is unchanged, on real hardware, and typography, shadows, gesture feel and
performance are still only visible there.

**The three review sections accumulate rounds; they are never overwritten.**

```markdown
## Implementation review

### Round 1 — changes requested
...

### Round 2 — approved
...
```

That is how the three-round cap survives an interrupted session: @sarah counts the entries on disk rather than trusting a number held in context, and a task that is looping is precisely the one whose session gets killed.

---

## Task granularity

The test is not size. **A task is cut correctly when merging it alone leaves `main` working.**

- **Split** across more than one `src/modules/` boundary, or when a screen would reference a store field, migration, or repository method that does not exist yet.
- **Merge** two tasks always reviewed together, sharing a migration, or where one exists only to make the other compile.
- **Never subdivide to make a diff look small** — that trades one review gate for three.
- **Past twelve tasks, split the scope**, not the list. Twelve tasks is twelve device-QA-and-merge sittings of the user's time.

Single digits is the expected shape.
