---
name: queue
description: "Use when the user wants the board worked through without naming tickets: '/queue', '/queue <epic>', 'work the board', 'start the next tickets'. Reads board.sh next --json and starts one local task session per ticket to prep or ship, up to three in flight; each ticket runs in its own sidebar session where the user answers its gates. Starts nothing for define work. Not for one ticket (prep, ship), for reading the board (board), or for defining work (boundaries, tickets, issue-review)."
argument-hint: "[<issue number>] [<in flight, default 3>]"
---

# Queue

Every ticket in its own session. The queue reads the board, and for each `/prep` or `/ship` row at the top of the ranking it creates a local scheduled task holding that one command and runs it: a fresh session appears under **Scheduled** in the sidebar, in the primary repo, with the ticket's skill as its whole prompt. The skill's stops are plain questions at the end of a turn and the user answers them in that session; the queue's own context holds only the board read and the session ids. Ranking is `scripts/board_next.mjs`, tested rule by rule; the queue adds no judgment and never runs a skill itself.

Measured 2026-09-18: a task-run session takes a typed answer; two runs execute at once (probes A and B, 04:18:54 and 04:18:57, both 90 s); a run's model defaults to `claude-opus-5[1m]`; `set_session_effort` on a run from another session is accepted, from its next turn. No cap on local task count or runs is documented ([desktop-scheduled-tasks](https://code.claude.com/docs/en/desktop-scheduled-tasks.md)); a run is one turn until its first stop.

## Entry

`/queue [<n>] [<k>]`. An issue number scopes the read to that issue and its sub-issues; `k` caps the tickets in flight, default 3, one per emulator slot. To run the queue on a schedule, create a local task whose prompt is `/queue` (hourly, or "every 15 minutes" through Claude); each run is one pass.

## One pass

1. **Read**, fresh, never the page's cache:
   ```bash
   node scripts/board_next.mjs --format json [--scope <n>] </dev/null > "$S"     # S=<scratchpad>/queue.json
   jq -c '[.actions[] | select(.state == "open" and (.command // "" | test("^/(prep|ship) "))) | {n: .number, ma, command, status, actor, rank, verify}] | sort_by(.rank)' "$S"
   jq -r '[.actions[] | select(.status == "In Progress" or .status == "In Review" or .status == "Awaiting Human")] | length' "$S"
   ```
   The first line is the candidate list; the second is what is in flight, whoever started it.

2. **Existing tasks.** `list_scheduled_tasks`; the queue's tasks are `ship-<n>` and `prep-<n>`. Per candidate:
   - a task whose last run is `running`: the ticket is being worked; count it, start nothing.
   - a task whose last run ended and the ticket is still at In Progress or In Review with `actor` not `session`: the session stopped at a gate or crashed; report `MA-XXX #n: its session is waiting, open it`, start nothing.
   - a task whose ticket is Done, or gone from the board: `delete_scheduled_task` (the run's sessions are archived) and `rm -rf ~/.claude/scheduled-tasks/<task>`.

3. **Start**, in rank order, while in flight is below `k`:
   - `actor` must be `session`. A `/ship` row on a ticket whose ship state lives on another machine is `nobody` and is never started.
   - `verify` true while `bash .claude/skills/emulator-verify/mqa.sh claims` shows no `free` slot: skipped for this pass, the next candidate is tried.
   - `create_scheduled_task` with `taskId` `ship-<n>` or `prep-<n>`, no schedule, `notifyOnCompletion` true, the title `MA-XXX #<n> <title>`, and this prompt, filled in, nothing else:
     ```
     Run the <prep|ship> skill on issue #<n>: `<the row's command verbatim>`. This session was started by the queue for MA-XXX #<n> (<title>); work on this ticket only. Every stop the skill has (a gap, a dispute, a cycle cap, the merge gate) is a plain question at the end of your turn; the user answers it in this session. After the merge, run the skill's post-merge list, then stop.
     ```
   - `run_scheduled_task`; the result names the session. Then `set_session_effort` on it: `xhigh` for a ship, `high` for a prep; it applies from the session's next turn, so the first turn runs at the app's default.
   - Start at most `k` minus in-flight per pass; count each start.

4. **Reply.** One row per candidate: id, command, and what happened (started as `[title](#<sessionId>)`, running, waiting on you, skipped for a slot, held under the cap). Then `next.you` from the read: the merges at Awaiting Human with their PRs, the `/boundaries`, `/tickets` and `/issue-review` rows, which are the define session's and never the queue's. Last line `Next: /queue` while a candidate is held or running, else `Next: <next.you's command>`, else `Next: nothing on the board`.

A completion notification for a task started in this session is the signal for the next pass: read again, from step 1. Run as a scheduled task, the queue has no notifications and the next pass is the next scheduled run.

## Hard rules

1. **Rank is the script's.** No reordering; step 3's slot skip is the one exception and it is mechanical.
2. **One task per ticket, one run per task.** `Run now` on a task with a run in progress is refused by the app; the queue never tries.
3. **Gates are answered in the ticket's session.** The queue never answers one, never messages a run (the app refuses it), never re-runs a ticket whose session is waiting.
4. **Define work is never started.** `/boundaries`, `/tickets` and `/issue-review` are one conversation with the user in one session; the queue lists them.
5. **Merges are the user's.** Awaiting Human counts toward `k` and is never a command.

| Rationalization | Reality |
|---|---|
| "The slot is free now, start a fourth" | Every open PR pays a rebase for each merge before it (MA-025, two in an evening). `k` is the cap. |
| "Its session ended, run the task again" | Ended at a gate: the answer is the user's, in that session. Rule 3. |
| "`/ship 129` is on the board, start it" | Its actor is `nobody`: the ship state is on another machine. |
| "`/issue-review 378` is a session row, start it" | Rule 4: the review's asks belong in the define session with the user. |
