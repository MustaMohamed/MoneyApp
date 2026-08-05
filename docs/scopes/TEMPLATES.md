# Scope folder templates

Every scope lives in `docs/scopes/MA-<slug>/`. Four files, four different readers.

```
docs/scopes/MA-budget-v2/
  scope.md      step 1 — for the user. Locked at gate 1, never edited after.
  spec.md       step 2 — for agents. Exhaustive and dry.
  tasks.md      the ordered index and status table.
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

The index. Rewritten by @task-reviewer at step 3 and refreshed by @sarah at every status transition.

```markdown
# MA-budget-v2 — Tasks

## M1 — Foundation
| ID | Title | Status | Branch | PR |
|---|---|---|---|---|
| MA-042 | Spending plan header | done | — | #201 |
| MA-043 | Category rollup query | implementing | feat/MA-043-category-rollup | — |
```

Statuses: `todo` · `planning` · `ready` · `implementing` · `in-review` · `awaiting-human` · `done` · `blocked`.

## `tasks/MA-nnn.md`

Written at step 2, appended to at steps 4, 5, 7, 8, and 9. One file carries the entire life of a task.

```markdown
---
id: MA-042
scope: MA-budget-v2
milestone: M2
status: todo
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
## Implementation review   (step 7)
## PR review               (step 8)
## Device QA               (step 9)
## Outcome                 (step 9)
```

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
