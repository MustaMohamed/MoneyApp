# Scoped Task Workflow Design

**Date:** 2026-08-06
**Status:** Approved direction; implementation specification for the workflow build
**Replaces:** the seven-phase team flow in CLAUDE.md (`Workflow` and `Team` sections) and `/feature`

## Goal

Replace the current feature flow with a nine-step workflow in which every scope of work is decomposed into individually addressable tasks, each task is planned, reviewed, implemented, reviewed again, and shipped as its own pull request, and every artifact a reviewer produces is written by an agent that did not author the thing it is reviewing.

The current flow has three weaknesses this design removes. Work is tracked at feature granularity, so a large feature is one long-running branch with no addressable units. The plan author and the plan reviewer are the same agent (`@tariq`), so plan review is self-review. And process state lives in the conversation rather than on disk, so an interrupted feature cannot be resumed by a later session.

## Scope

This design specifies:

1. The identifier scheme for scopes, milestones, and tasks.
2. The on-disk layout and the contract of each file the workflow reads or writes.
3. The agent roster, including four new reviewer agents.
4. The granularity contract that decides where one task ends and the next begins.
5. The nine steps, with owner, inputs, outputs, and exit criteria for each.
6. The division of labour between the two code reviews, and the condition under which the second one is deleted.
7. The orchestrator: its state machine, resume behaviour, stop points, and retry caps.
8. Branch, commit, pull-request, device-QA, and cleanup mechanics.

It does not change any application code, the path-scoped rules in `.claude/rules/`, the project skills, or the pre-push CI parity chain.

## Selected approach

A file-backed state machine driven by a single orchestrator command. Task status lives in `docs/scopes/<scope>/tasks.md` and in each task file, so any session can read the tree and know exactly where the work stopped. The orchestrator dispatches specialists per step; it produces no artifacts itself.

Two alternatives were rejected:

- **One slash command per step.** More resumable and more visible, but it puts the user in the loop nine times per task, which is the opposite of how this project has been run. Resumability is recovered instead by making status durable on disk.
- **Harness-native task tracking (`TaskCreate`/`TaskList`).** Free state management, but the state dies with the session and is invisible to `git`. Task records need to outlive the session and be reviewable in a PR.

## Identifiers

| Kind | Format | Example |
|---|---|---|
| Scope | `MA-<scope-slug>` | `MA-budget-v2` |
| Milestone | `MA-<scope-slug>-M<n>` | `MA-budget-v2-M2` |
| Task | `MA-<nnn>` | `MA-042` |

Task numbers are **globally sequential across the whole project**, not nested under scope or milestone. The next number is the highest found under `docs/scopes/**` plus one. A task ID appears in a branch name, a commit subject, a PR title, and the tasks index; a nested identifier is unusable in the first three. Each task file records which scope and milestone owns it, and the scope's `tasks.md` is the authoritative map.

Milestones are **optional**. A scope uses them only when it exceeds roughly eight tasks or spans more than one area of the app. Smaller scopes list tasks directly with an empty milestone column.

## Folder layout

```
docs/scopes/MA-budget-v2/
  scope.md            step 1 — the human document
  spec.md             step 2 — the agent-facing specification
  tasks.md            the ordered index and status table
  tasks/
    MA-042.md         one file per task, grown through the flow
  assets/             mockups, screenshots, reference material
```

`docs/superpowers/{specs,plans,reviews,qa,brainstorms}/` freezes as history. No file moves. The audit-ID cross-references in CLAUDE.md, `.claude/rules/`, and the agent files keep resolving. This design document is itself written to the legacy location, as the last artifact produced by the flow it replaces.

## File contracts

### `scope.md` — step 1, for humans

Plain language. What the user wants and why, the problem it solves, what is explicitly out of scope, and a bullet summary. No schema, no API names, no file paths, no acceptance criteria written as assertions. Its job is to be the thing the user reads once and confirms as accurate before any machinery runs. It is locked at gate 1 and is not edited afterwards; corrections discovered later are recorded in `spec.md`.

For a scope with UI, `@marcus` produces an HTML mockup into `assets/` during step 1, and it is published as an artifact at the lock gate so the user reviews rendered screens rather than paragraphs about screens.

### `spec.md` — step 2, for agents

Exhaustive and dry. Data model and migrations, state ownership per `.claude/rules/state.md`, module and folder layout, key APIs referenced by real path and symbol, financial rules from `[layla]`, UX behaviour and states from `[marcus]`, error and empty handling, and the test surface. It references real artifacts rather than paraphrasing them. It is the document agents read; it is not written to be pleasant.

### `tasks.md` — the index

An ordered table, one row per task, in execution order:

| ID | Title | Milestone | Status | Branch | PR |
|---|---|---|---|---|---|
| MA-042 | Spending plan header | M2 | done | — | #201 |

Status is one of:

| Status | Meaning | Orchestrator re-enters at |
|---|---|---|
| `todo` | defined and ordered, nothing started | step 4 |
| `planning` | plan being written or reviewed | step 4 |
| `ready` | plan approved, awaiting implementation | step 6 |
| `implementing` | code being written or locally reviewed | step 6 |
| `in-review` | PR open, `@pr-reviewer` working | step 8 |
| `awaiting-human` | PR approved, needs device QA and merge | step 9 |
| `done` | merged, branch and worktree removed | — |
| `blocked` | retry cap hit or a critical trigger fired | reports, does not proceed |

Re-entry is deliberately conservative: `planning` restarts step 4 rather than guessing how far into step 5 it got, and `implementing` restarts step 6 with `@dev` instructed to inspect the existing branch and worktree before writing anything.

### `tasks/MA-042.md` — one task

Written once in step 2 and appended to thereafter, so the whole life of the task is one file:

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
What the task must achieve, in behavioural terms. No technical decisions —
those belong to the plan. Written so a planner can research from it.

## Plan            (appended step 4, revised step 5)
## Plan review     (appended step 5)
## Implementation review  (appended step 7)
## PR review       (appended step 8)
## Outcome         (appended step 9)
```

The "no technical decisions in `Details`" rule is load-bearing: it is what keeps step 4 a real research step rather than a transcription of choices already made. `@task-reviewer` enforces it.

## Agents

Personas keep their domains. The four reviewers are named by role rather than given personas, because they own no domain and `@plan-reviewer` states its job where a first name does not.

| Step | Owner | Status |
|---|---|---|
| 1 Brainstorm | main thread, `[marcus]` and `[layla]` inline, `@marcus` for the mockup | existing |
| 2 Spec and task breakdown | `@tariq`, embedding `@marcus` and `@layla` sections | existing |
| 3 Task review and ordering | `@task-reviewer` | **new** |
| 4 Plan | `@tariq` | existing |
| 5 Plan review | `@plan-reviewer` | **new** |
| 6 Implement, self-review, commit | `@dev` | existing |
| 7 Local review before push | `@impl-reviewer` | **new** |
| 8 PR review | `@pr-reviewer` | **new** |
| — Orchestration | `@sarah` | rewritten |

Step 1 runs in the main thread because a dispatched subagent cannot ask the user questions.

New agent tool grants:

- `@task-reviewer` — `Read, Write, Edit, Glob, Grep, Bash, Skill`. Edits task files and `tasks.md` directly; never touches `src/`.
- `@plan-reviewer` — `Read, Write, Edit, Glob, Grep, Bash, WebSearch, Skill`. Must verify plan claims against the codebase, and edits the plan in place.
- `@impl-reviewer` — `Read, Write, Edit, Glob, Grep, Bash, Skill`. Runs tests and the CI parity chain; writes only under `docs/scopes/`, never fixes code itself.
- `@pr-reviewer` — `Read, Write, Edit, Glob, Grep, Bash, Skill`. Uses `gh` for PR and CI state; writes only under `docs/scopes/`.

`@tariq` gains `WebFetch` — step 4 requires web research and he currently has `WebSearch` only.

## Task granularity

One task is one pull request. The test is not size, it is independence: **a task is correctly cut when merging it alone leaves `main` working.** A small task that leaves `main` broken is mis-cut; a larger one that ships a coherent behaviour is not.

Three rules follow from that, binding on `@tariq` at step 2 and enforced by `@task-reviewer` at step 3:

- **Split** a task whose plan would cross more than one module boundary under `src/modules/`, or whose implementation would leave a screen referencing a store field, migration, or repository method that does not exist yet.
- **Merge** two tasks that would always be reviewed together, that share a migration, or where one exists only to make the other compile.
- **Split the scope, not the task list,** when a scope exceeds roughly twelve tasks. Twelve tasks is twelve device-QA-and-merge sittings; past that the scope is too large to be one scope, and the answer is two scopes shipped in sequence rather than a longer queue.

A scope landing in single digits is the expected shape. Tasks are never subdivided to make diffs look small — that trades one review gate for three and breaks the independence rule.

## The nine steps

**1 — Brainstorm.** Main thread, `superpowers:brainstorming`, `[marcus]` and `[layla]` consulted inline. Output `scope.md`, plus an HTML mockup in `assets/` when the scope has UI. Exit: the user locks it. 🛑 **Gate 1.**

**2 — Spec and tasks.** `@tariq` writes `spec.md` from the locked scope, embedding `@marcus`'s UX section and `@layla`'s financial-logic section, then decomposes it into milestones and tasks per **Task granularity** above and writes `tasks.md` and one file per task. Task details stay behavioural. Exit: every task has title, summary, and details, `tasks.md` lists them all, and each one would leave `main` working if merged alone.

**3 — Task review.** `@task-reviewer` reads `spec.md` and every task file and checks five things: full coverage of the spec with no gap and no task outside it, granularity against the three rules above, no technical decisions leaking into `Details`, no hidden dependency between tasks that the order violates, and a correct execution order. It **edits** rather than reports — splitting, merging, rewriting, and reordering as needed — then writes the final order into `tasks.md`. If applying the rules leaves more than twelve tasks, it says so and recommends the scope split rather than ordering a queue it believes is too long. Exit: a reviewed, ordered list. 🛑 **Gate 2.**

**4 — Plan.** `@tariq` takes the first `todo` task, researches the codebase and the web, and appends a plan to the task file with `superpowers:writing-plans`. Two parts: a high-level bullet summary of what will be implemented, then the executable detail — ordered steps, files touched, tests that prove it, verification command, explicit non-goals.

**5 — Plan review.** `@plan-reviewer` checks the plan against the task and the spec: does it achieve the task, is every claim about the codebase true, are the tests sufficient, does it follow `.claude/rules/`, does it overreach the task. It **edits the plan** to fix what it finds and appends its verdict. Exit: approved.

**6 — Implementation.** `@dev` implements in an isolated worktree, strictly to the plan. On completion it self-reviews the diff against the plan and the task, fixes what it finds including error paths and edge cases, and commits.

**7 — Local review.** `@impl-reviewer` reviews the diff against the plan and the task before anything is pushed, applying the `superpowers:requesting-code-review` rubric plus the five-class MoneyApp defect checklist from `@tariq`'s file — silent async failure, focus-reload churn, money display drift, index-defeating SQL, derived state stored as durable state. It runs the CI parity chain. Findings go back to `@dev`, who fixes and returns. On approval the branch is pushed and a PR is opened. Exit: PR open, CI running.

**8 — PR review.** `@pr-reviewer` reviews the pull request against its exclusive domain below, and **only** that domain. Findings return to `@dev` and the task re-enters step 6. On approval the user is notified with a short summary — what was done, in bullets, no diff walkthrough. 🛑 **Gate 3.**

**9 — Human approval.** The user walks device QA and merges, or asks for the merge. The orchestrator then deletes the worktree and the local branch, appends the outcome to the task file, sets status `done`, and moves to the next task.

## What step 8 sees that step 7 cannot

Two code reviews on one change is only worth the gate if the second one is looking somewhere the first structurally could not. `@pr-reviewer`'s rubric is therefore restricted to five things that do not exist yet when `@impl-reviewer` runs:

1. **Real-runner CI.** Step 7 ran the parity chain locally against an existing install. CI runs on a clean checkout with a fresh resolve and the `prebuild-check` job. This repository has a history of failures that appear only there — nested `node_modules` defeating jest's `transformIgnorePatterns`, a config plugin that kills `expo prebuild`, `expo-doctor` validating against Expo's live requirement table.
2. **Merge-base drift.** Step 7 reviewed the diff against the commit the worktree forked from. By step 8 `main` has moved, including tasks from this same scope. `@pr-reviewer` reviews against current `main` and hunts the semantic conflict that `git` merges cleanly — a renamed store field, a changed repository signature, a migration number now taken.
3. **The commit that will actually land.** Squash subject, body, and task ID; PR title and description against the task's `Details`.
4. **Diff membership.** Files that should not be in the PR at all: generated output, `ios/`, `android/`, `.env`, stray patches, debug logging, a snapshot updated instead of fixed.
5. **Step 7 escapes.** If a five-class defect-checklist violation reaches step 8, it is recorded in the task file as an escape as well as fixed. Repeated escapes mean `@impl-reviewer`'s rubric needs tightening, and that signal is only visible from here.

It does not re-run the defect checklist, re-derive whether the diff matches the plan, or re-litigate approach. Those are step 7's, and duplicating them is the failure mode this section exists to prevent.

**Tripwire.** If across one complete scope `@pr-reviewer` raises nothing outside these five, it is a ceremonial gate. Collapse it into step 7 and delete the agent rather than keeping a review that only costs time.

## Orchestrator

One command. `/scope <idea>` starts a new scope at step 1. `/scope MA-budget-v2` resumes, deciding where from by what exists on disk: no scope folder means step 1, a locked `scope.md` with no `spec.md` means step 2, a `spec.md` whose tasks have not been reviewed means step 3, and otherwise it takes the first task in `tasks.md` that is not `done` and re-enters at the step that task's status maps to.

A `blocked` task halts the scope. The orchestrator reports it rather than skipping to the next task, because the order established in step 3 encodes dependencies and running past a blockage builds on something known to be wrong.

Where the two status records disagree, the task file's frontmatter wins — it is written first and it is the record the reviewers touch. `tasks.md` is the index, refreshed from the task files at every transition.

It stops in exactly four places: after step 1, after step 3, after step 8, and on a critical trigger. The critical-trigger list in CLAUDE.md carries over unchanged and remains the whole list.

Between gate 2 and gate 3 it runs steps 4 through 8 per task without check-ins, including the reviewer rejection loops. Each of the three review gates — plan, local, PR — allows **at most three rounds**. On the fourth, the task goes `blocked`, the orchestrator stops, and it reports what the reviewer keeps rejecting and what `@dev` keeps producing. A silent loop is worse than a stop.

Status is written to the task file's frontmatter and then to `tasks.md` at every transition, before the next step is dispatched. That write is what makes a killed session resumable.

## Branch, commit, PR

Branch `feat/MA-042-spending-plan-header`, keeping the existing type prefixes (`feat`, `refactor`, `fix`, `perf`) and adding the ID. Commit subjects carry the ID: `feat(budget): add spending plan header (MA-042)`. PR title `MA-042 — Spending plan header`, body linking the task file. One task, one branch, one PR, always cut from current `main`.

## Device QA and cleanup

Implementation runs in an isolated worktree. **Device QA does not run there.** A worktree's symlinked `node_modules` passes `tsc`, `jest`, and lint but breaks device builds — expo-router resolves zero routes. Step 9 therefore checks the PR branch out in the primary repository, which has a real install, and QA happens there. The `device-qa` skill supplies the checklist.

After merge the orchestrator removes the worktree and deletes the local branch. Everything under `docs/scopes/` is kept, including plans and review notes: the plan is the record of why the code looks the way it does, and it is cheap text.

## What changes in the repo

- **New:** `.claude/agents/{task-reviewer,plan-reviewer,impl-reviewer,pr-reviewer}.md`
- **New:** `.claude/commands/scope.md`
- **New:** `docs/scopes/` with a `TEMPLATES.md` holding the four file contracts
- **Rewritten:** `.claude/agents/sarah.md` — phase flow becomes the nine steps and the state machine
- **Rewritten:** CLAUDE.md `Workflow` and `Team` sections; `Project Structure` gains `docs/scopes/`
- **Amended:** `.claude/agents/tariq.md` — task breakdown added, `WebFetch` granted, plan target moves into the task file
- **Amended:** `.claude/agents/dev.md` — reads its plan from the task file; handles resuming a partially implemented branch
- **Amended:** `.claude/commands/status.md` — reads `tasks.md`
- **Deleted:** `.claude/commands/feature.md`
- **Unchanged:** `.claude/rules/`, all project skills, `/ci`, `/qa`, the CI parity chain

## Risks

**Agent definitions snapshot at session start.** The four new reviewers and the rewritten `sarah` cannot be exercised in the session that creates them. The first real run must happen in a fresh session, and that is also the only way to test a correction to any of them.

**Four reviewer files drift toward each other.** Handled structurally rather than by intent: `@pr-reviewer`'s rubric is a closed list of five things that do not exist at step 7, and it is instructed not to re-run step 7's checks. The tripwire in that section is the exit condition — one full scope producing nothing outside the five means the agent gets deleted, not defended.

**Global task numbering collides across concurrent scopes.** Two scopes planned in parallel can both claim `MA-043`. `@task-reviewer` re-scans and renumbers at step 3, which is before any branch or PR carries the number.

**Per-task PRs multiply merges.** Twelve tasks is twelve device-QA-and-merge sittings, and the queue is the user's time, not the agents'. The granularity contract caps it: merge-if-always-reviewed-together at step 2, enforcement at step 3, and a hard recommendation to split the scope past twelve. The remaining exposure is a scope whose tasks are genuinely independent and genuinely numerous — a migration sweep, say — where the honest answer is that it is two scopes.

## Non-goals

Migrating the 60-plus existing documents under `docs/superpowers/`. Changing the CI workflow or the parity chain. Changing `.claude/rules/` or any skill. Automating the merge — merging, pushing, and destructive repository operations continue to require an explicit user request.
