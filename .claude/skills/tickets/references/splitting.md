# Splitting

## Three cuts, no preference order

`/tickets` proposes every cut that fits, recommendation first, and the user chooses.

| Cut | A task is | Fits when | Edges |
|---|---|---|---|
| delivery | a standalone part a user can use the day it merges | anything that stands alone | none; parallel |
| module | all of the parent's work inside one module, usable within that module | the parent spans modules and the contract between them is in Rules | none across modules once the contract is written |
| incremental | one step on top of the previous task's result | the work cannot be made independent | a chain, one depends-on per link, sequential |

## Limits on every cut

- One outcome per task. Two outcomes are two tasks.
- A task is one PR, per § Size gate below. A bigger one is cut again here, or, the user's choice at stop 1, created at Todo for its own `/tickets` run later.
- A chain's first link stands alone. A chain whose first link nobody can use is a layer cut and `/issue-review` rejects it.
- Preludes are the one allowed non-user-visible task: a migration or data layer a later task needs, isolated because it carries sign-off or data-loss risk. A prelude names the task that consumes it. MA-020 is one.

## Size gate

One PR is a counted thing, and every step counts it the same way: `/tickets` on each candidate task before the split is shown, `/issue-review` on each body, `/prep`'s planner and reviewer on the plan. A task fits when both hold:

- at most 12 files outside `__tests__/` and generated code
- at most ~400 changed lines outside tests; the implementer writes about 2.5 times that once tests are in (MA-039: 558 lines outside tests, 936 in tests)

`/prep` adds a third, at most 8 plan steps.

The file list is built from the body, never taken from it. Every file Context names as changing, plus every file a Rule or an Acceptance line implies, each named by path:

- a shared constant is its file under `src/constants` and every consumer that reads it
- a new component is its file and every file that mounts it
- a new or changed string is `src/constants/strings.ts`
- a lock, a resolver or a formatter is the helpers file that holds it
- a hook, state or session file changed by one line counts as a file
- `Verify emulator` is `.claude/skills/emulator-verify/features/<screen>.md` and, when that file is new, the README index row

Lines are estimated per file from what it looks like today, then summed. A count at the cap is over it: ten files and ~400 lines leave no room for what the planner finds with LSP, and MA-104 (#566) went from 10 to 14 files that way after passing review. The list is written into the task's Context as its last bullet:

```
- Size: <k> files outside tests, ~<n> lines, at <sha>: <the paths, comma separated>
```

The next step disputes the list, not the number. Over the gate: `/tickets` cuts again before the split is shown, or the user creates the task at Todo for its own run; `/issue-review` returns an `ask` proposing the seam; `/prep` returns the ticket. A gate reached at `/prep` is a miss at the two steps before it.

## Order

Dependencies first, then screens in navigation order, then interactions on those screens, destructive flows last. Tasks with no dependencies go first so the milestone shows progress on day one. Depends-on names real dependencies only; two tasks with no edge may run in parallel, so a lazy edge costs wall-clock.

Cross-epic: two tasks in different epics of one milestone that touch the same module get an edge or a merge.

## Recursion

The rules are the same at every level; only the parent changes. `/tickets <task>` cuts a task into sub-issues with the next MA numbers, at Defined, and leaves that task at Defined as a parent. The task is either one created at Todo for its own breakdown or a leaf at Defined or Ready For Development that turned out bigger than one PR; the leaf keeps its body and its children's Acceptance covers it line by line. A parent stays at Defined, is never planned, and closes when its last child closes.

## The nine tickets on #378, as a worked check

MA-013 delivery. MA-014 prelude (design). MA-015 delivery. MA-016 and MA-017 incremental on 015. MA-018 delivery. MA-019 incremental on 018. MA-020 prelude. MA-021 incremental on 017 and 020. All three cuts in use; MA-013, MA-015, MA-018 and MA-020 can run in parallel.
