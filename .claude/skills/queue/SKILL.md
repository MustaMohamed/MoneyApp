---
name: queue
description: "Use when the user wants the board worked through without naming tickets: '/queue', '/queue <epic>', 'work the board', 'keep going', 'what is next, run it'. Reads board.sh next --json, runs the top session command (/prep, /ship, /issue-review) in this session, re-reads, repeats, and stops on anything that needs the user. Not for one ticket (prep, ship), for reading the board (board), or for defining work (boundaries, tickets)."
argument-hint: "[<issue number>] [<tickets per run, default 3>]"
---

# Queue

The loop the user typed by hand on the accounts redesign: read the board, take the top row, run its skill, read again. The ranking is `scripts/board_next.mjs`, tested rule by rule; this skill runs what it names and adds no judgment of its own. Each skill it runs keeps every stop it has: a review ask, a plan gap, a dispute, a cycle cap, the merge. The queue ends at the first of them and says which ticket waits on what, so the user's answer lands in the session that asked.

## Entry

`/queue [<n>] [<k>]`. An issue number scopes the read to that issue and its sub-issues; `k` caps the tickets one run starts, default 3. Neither is required.

## One pass

1. **Read.** Fresh every pass, never from the page's cache:
   ```bash
   node scripts/board_next.mjs --format json [--scope <n>] </dev/null > "$S"     # S=<scratchpad>/queue.json
   jq -r '.next.session' "$S"
   jq -r '[.actions[] | select(.status == "Awaiting Human" and .actor == "you")] | length' "$S"
   ```
   `next.session` is the first ranked row whose actor is a session: `/ship` on a ticket this machine holds ship state for, `/prep`, `/prep --replan`, or `/issue-review`. A ticket in delivery without `~/.ship/MoneyApp/MA-XXX/` on this machine is `nobody`, another session owns it, and the queue never touches it.

2. **Stop before starting when the user is the bottleneck.** Three or more tickets at Awaiting Human: the queue ends, lists them with their PRs, and starts nothing; a fourth open PR is a rebase on every one of them (same-screen siblings cost MA-025 two rebases in an evening). `next.session` null: the queue ends with `next.you`.

3. **Skip what cannot run here.** A `/ship` or `/prep` row whose ticket header says `Verify emulator` while `bash .claude/skills/emulator-verify/mqa.sh claims` shows no `free` slot is skipped for this pass; the queue takes the next session row from `.actions` in rank order. Nothing else is skipped.

4. **Run the command's skill in this session**, exactly as the row names it: `/ship <n>`, `/prep <n>`, `/prep <n> --replan`, or `/issue-review <n> --apply`. `--apply` is the one flag the queue adds: a review with no `ask` applies its mechanical deltas without the "Apply these deltas?" stop; a review with an `ask` stops as it always does, and the queue ends there. Nothing else gets a flag, and no skill is run on a ticket the row did not name.

5. **The skill ends.** On its `Next:` line, or on `/ship` presenting for the merge with its watch running in the background: count the ticket, go to step 1. On a stop, a question to the user, a gap list, a dispute, a cap, a closed PR, a refused `mqa claim`: the queue ends with that stop quoted verbatim.

6. **After `k` tickets**, or when step 2 or 5 ends the run: the reply.

A merge notification that arrives while a later ticket runs is handled when it arrives: the `/ship` post-merge list for that ticket (`ship/references/merge.md` → After the merge), then back to the running skill. Nothing is deferred to the end of the run.

## Reply

One row per ticket the run touched: id, the command run, where it ended (PR and column, or the stop). Then what waits on the user, from the last read: the merges at Awaiting Human with their PRs, and the stop that ended the run if one did. Last line `Next: /queue` when a session row remains, else `Next: <next.you's command>`, else `Next: nothing on the board`. To keep reading until the board empties, run it under the loop: `/loop /queue`; an empty pass then schedules the next read in 20 minutes instead of ending.

## Hard rules

1. **Rank is the script's.** The queue never reorders, never picks a row below the top for a reason the board does not carry; step 3 is the one skip and it is mechanical.
2. **Stops are the skills'.** The queue answers no gate, defers no ask, and never rewrites a question so it can proceed. An answer comes from the user in this session.
3. **Merges are the user's.** Awaiting Human is a wait, never a command.
4. **One skill at a time.** `/ship`'s own subagents run in parallel; two skills never do. The next ticket starts when the previous one reached its merge watch or its `Next:` line.
5. **`--apply` is the queue's flag.** `/issue-review` run by hand keeps its stop.

| Rationalization | Reality |
|---|---|
| "The ask is obvious, answer it and continue" | Rule 2. The user's answer goes on the issue body; a guessed one goes into code. |
| "Three PRs wait, one more will not hurt" | Every open PR pays a rebase for every merge before it. Step 2. |
| "`/ship 129` is on the board, run it" | Its actor is `nobody`: the ship state is on another machine. Running it opens a second session on one branch. |
| "Skip the Todo ticket at rank 1 and take the pullable one" | Rank 1 is `you` (`/boundaries`), not a session row; `next.session` already skipped it. Step 3 is the only skip. |
