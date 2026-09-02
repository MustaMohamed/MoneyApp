# Size and splitting

## Size

| Size | Means | Example |
|---|---|---|
| S | one screen state, one rule, one fix | MA-013, the card background |
| M | one screen with its data and tests, or one data layer | MA-015, the list screen |
| L | too big for one PR; a parent. Sits at Todo, is never pulled, re-enters `/tickets` as its own parent | |

## Three cuts, no preference order

`/tickets` proposes every cut that fits, recommendation first, and the user chooses.

| Cut | A task is | Fits when | Edges |
|---|---|---|---|
| delivery | a standalone part a user can use the day it merges | anything that stands alone | none; parallel |
| module | all of the parent's work inside one module, usable within that module | the parent spans modules and the contract between them is in Rules | none across modules once the contract is written |
| incremental | one step on top of the previous task's result | the work cannot be made independent | a chain, one depends-on per link, sequential |

## Limits on every cut

- One outcome per task. Two outcomes are two tasks.
- Leaves are S or M. An L is cut again with the same three rules, later, as its own parent.
- A chain's first link stands alone. A chain whose first link nobody can use is a layer cut and the reviewer rejects it.
- Preludes are the one allowed non-user-visible task: a migration or data layer a later task needs, isolated because it carries sign-off or data-loss risk. A prelude names the task that consumes it. MA-020 is one.

## Order

Dependencies first, then screens in navigation order, then interactions on those screens, destructive flows last. S tasks with no dependencies go first so the milestone shows progress on day one. Depends-on names real dependencies only; two tasks with no edge may run in parallel, so a lazy edge costs wall-clock.

Cross-epic: two tasks in different epics of one milestone that touch the same module get an edge or a merge.

## Recursion

The rules are the same at every level; only the parent changes. `/tickets <L task>` cuts that task into sub-issues with the next MA numbers, at Defined, and moves the L task to Ready For Development. A parent closes when its last child closes.

## The nine tickets on #378, as a worked check

MA-013 delivery. MA-014 prelude (design). MA-015 delivery. MA-016 and MA-017 incremental on 015. MA-018 delivery. MA-019 incremental on 018. MA-020 prelude. MA-021 incremental on 017 and 020. All three cuts in use; MA-013, MA-015, MA-018 and MA-020 can run in parallel.
