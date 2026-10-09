---
name: queue
description: "Use when parked questions wait on the user, or a board column should be worked without typing each ticket: '/queue asks', 'answer the parked questions', 'what is waiting on me', '/queue Planned', '/queue Defined 2', 'ship the planned tickets', 'review everything at Defined', or a board row whose command is /queue asks. Not for one typed ticket (issue-review, prep, ship) or for reading the board (board)."
argument-hint: "asks | Defined [n] | \"Ready For Development\" [n] | Planned [n]"
---

# Queue

An unattended run parks each question it cannot answer as a question record, [question-record.md](../issue-review/references/question-record.md), and ends. `asks` puts those records to the user, from a session that never saw the run. A column argument starts the runs: one app task per ticket, several at once, each under a lease, each logged. The `unslop` skill binds every message.

## Subcommands

- `asks`: every open record on the board, one per message, by [references/asks.md](references/asks.md).
- `Defined [n]`, `Ready For Development [n]`, `Planned [n]`: `/issue-review`, `/prep` or `/ship` on the top eligible tickets of that column, by [references/column.md](references/column.md). `Defined` also starts `/issue-review <parent>` on a parent `/tickets` has just cut, column.md § One pass step 2, so the queue marks the parent before any child. `Planned` also resumes a ticket at In Progress or In Review that has a `state.md` on this machine, no lease and no open question record, and one at Awaiting Human whose PR has a change the user asked for after its merge summary. `n` caps the starts of one pass. Each run is its task's own session, on the app's default model for a new session; the queue takes no model.

Any other argument: print this list and stop.

## Lease

`~/.ship/MoneyApp/queue/leases/<issue number>`, two or three lines:

```text
skill=<issue-review|prep|ship>
worktree=<absolute path>
task=<task id>
```

**Owner.** `/queue` writes the lease at each start, before `run_scheduled_task`: `skill=` the run's skill, `worktree=` the primary checkout, `task=` the task id. The started skill rewrites it with its own `worktree=` and keeps `task=`. A queued `/issue-review` on a parent writes each child's lease itself, with the same `task=` line, so every lease of the run is its own. A typed `/issue-review`, `/prep` or `/ship` writes no `task=` line. A lease whose `task=` equals the task id the run's prompt names is that run's own. `board_next.mjs` reads `task=` for one thing, counting a run once in `cap`.

**Entry check**, run by `/ship` Entry, `/prep` step 2 and `/issue-review` step 1, for every issue the skill would lease, before it writes:

- no lease, or a lease this run owns: go on;
- any other held lease: stop, naming its skill, its last write and `rm ~/.ship/MoneyApp/queue/leases/<n>` for a user who knows that run is gone;
- a stale lease: the same stop, reported as stale.

**Touch.** The file's mtime is its last write. The holder touches it at every dispatch and every `state.md` write. A review of a parent touches every lease it holds, the parent's and each child's.

**Release.** The holder removes it at every exit: its reply, a stop, a trim, a parked record. An unattended `/ship` removes it at Awaiting Human and ends. A typed `/ship` keeps it through the merge watch, which touches it each minute, and removes it after the post-merge list.

**Stale** is a lease whose worktree is gone, or with no write for 2 hours. `board_next.mjs` lists it as `drift` with its `rm` command; on a parent the command also names each child's stale lease of the same skill, so one command clears a review that died. The queue reports it and never removes it, and no run takes it.

## Rules

- A question is never decided for the user. The recommendation goes first; the user chooses or defers.
- Ready For Development stays one-way: only a ticket at Blocked returns there.
- A parent is never pulled: no `/prep` or `/ship` run starts on one. The one start on a parent is `/issue-review <parent>` from `/queue Defined`, which marks it before its children; no child is started while its parent reads `Reviewed none`.
- The merge is the user's. No run merges, approves the gate or turns on auto-merge.
- No shell script or CLI runner starts a run; only the tools in [column.md](references/column.md) § Start do.
- The queue answers no question. A run that meets one parks it and ends; the queue goes on with the other tickets.
