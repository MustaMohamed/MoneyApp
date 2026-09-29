---
name: queue
description: "Use when parked questions wait on the user, or a board column should be worked without typing each ticket: '/queue asks', 'answer the parked questions', 'what is waiting on me', '/queue Planned', '/queue Defined 2', 'ship the planned tickets', 'review everything at Defined', or a board row whose command is /queue asks. asks lists every open question record, asks one per message with its visual, writes each answer into its ticket, and moves the ticket when its last record is answered. A column starts one app task per eligible ticket running /issue-review, /prep or /ship, holds what it cannot start, and logs each run. Not for one typed ticket (issue-review, prep, ship) or for reading the board (board)."
argument-hint: "asks | Defined [n] | \"Ready For Development\" [n] | Planned [n]"
---

# Queue

An unattended `/issue-review` or `/prep` run parks each question it cannot answer as a question record, [question-record.md](../issue-review/references/question-record.md), and ends. `asks` is where the user answers them, from a session that never saw the run. A column argument starts those runs: one app task per ticket, several at once, each under a lease, each logged. The queue runs no skill itself and answers no question. The `unslop` skill binds every message.

## Subcommands

- `asks`: every open record on the board, one per message, by [references/asks.md](references/asks.md).
- `Defined [n]`: `/issue-review` on the top eligible tickets at Defined.
- `Ready For Development [n]`: `/prep` on the top eligible tickets at Ready For Development.
- `Planned [n]`: `/ship` on the top eligible tickets at Planned, and on a ticket at In Progress or In Review that `/ship` can resume on this machine: a `state.md`, no lease, no open question record.

`n` caps the starts of one pass. Any other argument: print this list and stop.

## One pass

1. § Merged since the last run.
2. Read the board, fresh:
   ```bash
   node scripts/board_next.mjs --format json </dev/null
   ```
   The candidates are the actions whose `queue` equals the column, in the script's order. The script sets `queue` only on an open leaf whose command a session runs, with every Depends on closed, no open question record and no lease.
3. For each candidate in order, read § Holds. A held candidate is skipped and the next is tried. Otherwise § Start it. Stop at `n` starts.
4. Reply: one line per candidate, `#<n> MA-XXX · started <task id>`, or `held, <hold>`; then every action whose `lease` is `stale`, with its action text; while the floor or the ceiling reads `unmeasured`, the two readings taken at each start. Last line `Next: /queue <column>` while a candidate is held, else `Next: nothing to start in <column>`.

## Holds

Read before each start. Each hold counts the live leases and the `flight` bucket together with the tickets started earlier in this pass: a start adds one to its skill's count, adds its `paths` to the overlap set, and takes one `free` row when its `verify` is true.

| Hold | Read | Holds the start when |
|---|---|---|
| Cap | actions with `lease: 'held'`, counted by `leaseSkill` | 3 `ship` leases are held, or 5 `prep` and `issue-review` leases together |
| Overlap | the candidate's `paths` against the `paths` of every action in the `flight` bucket or with `lease: 'held'` | a path is in both |
| Emulator slot | `bash .claude/skills/emulator-verify/mqa.sh claims` | `verify` is true and no row reads `free` |
| GraphQL budget | the `x-ratelimit-remaining` header of `gh api -i graphql -f query='{viewer{login}}'` | it is below the floor |
| Host load | the first figure of `sysctl -n vm.loadavg`, the 1-minute load | it is above the ceiling |
| Measures | § After 10 queued tickets | the candidate is a `ship` start and a measure holds |

Floor: unmeasured, written here on the first queue run. Ceiling: unmeasured, written here on the first queue run. Until then no run starts at a 1-minute load above 60. While either reads `unmeasured`, a pass prints both readings at each start, in its reply and in the log line's note, and the figures reach this file through a `docs/<slug>` branch and its PR. The queue commits nothing.

## Start

One app task per ticket, task id `review-<n>`, `prep-<n>` or `ship-<n>`. `mcp__scheduled-tasks__create_scheduled_task` with that id, no schedule and the prompt below, then `mcp__scheduled-tasks__run_scheduled_task`. An id that already exists is reused with `run_scheduled_task` alone, never deleted or re-created. A refusal because a run is in progress is a hold.

The prompt, filled in, nothing else:

```text
Run the <issue-review|prep|ship> skill on issue #<n>: `/<issue-review|prep|ship> <n>`. Work on this ticket only.
Run: unattended. In flight at start: <f>.
Project skills this run may use: issue-review, prep, ship, unslop, emulator-verify, moneyapp-testing, heroui-native, money-rules, and code-review where the ship skill prescribes it. No superpowers:* or anthropic-skills:* skill.
Write the lease ~/.ship/MoneyApp/queue/leases/<n> before the first dispatch, in the shape of .claude/skills/queue/SKILL.md § Lease. Touch it at every dispatch and every state.md write. Remove it when the run ends, for any reason.
/prep and /ship: call EnterWorktree with path set to the ticket worktree before the first dispatch. A refusal because it already is the working folder is a pass.
/issue-review: work in the primary checkout and write nothing to it.
A question you cannot answer is parked as a record per .claude/skills/issue-review/references/question-record.md, and the run ends.
Never merge, approve the gate or turn on auto-merge.
/ship: end at Awaiting Human and run no post-merge step. Write the merge summary to ~/.ship/MoneyApp/queue/ship-<n>-summary.md. It holds the heading `## Decisions the ticket or plan did not state` over a table with the columns Decision, Who, Cost if wrong: one row per decision, the header row alone when there is none.
Last, add your line to ~/.ship/MoneyApp/queue/<yyyy-mm-dd>.md in the shape of .claude/skills/queue/SKILL.md § Log.
```

`<f>` is the number of held leases at the start, this start excluded.

## Lease

`~/.ship/MoneyApp/queue/leases/<issue number>`, two lines:

```text
skill=<issue-review|prep|ship>
worktree=<absolute path>
```

The file's mtime is its last write. The holder writes it before its first dispatch, touches it at every dispatch and every `state.md` write, and removes it when it ends. A queued run and a typed `/issue-review`, `/prep` or `/ship` write the same lease; `/issue-review` names the primary checkout as its worktree.

A lease is stale when its worktree is gone or it has had no write for 2 hours. `board_next.mjs` lists it as `drift` with its `rm` command. The queue lists it in the reply, never removes it, and never starts a run on its ticket.

## Merged since the last run

First in every pass. For each `~/.ship/MoneyApp/MA-XXX/state.md` whose `pr:` URL reads `MERGED` from `gh pr view <url> --json state --jq .state`, and whose ticket holds no live lease, run [merge.md](../ship/references/merge.md) § After the merge, steps 1 to 7. Step 7 deletes that folder, so a ticket is cleaned up once. This is a standing request in `CLAUDE.md` § When to stop.

## Log

`~/.ship/MoneyApp/queue/<yyyy-mm-dd>.md`, one line per run, written by the run:

```text
<skill> <n> · <outcome> · <start> to <end> · <k> dispatches · <c> fix cycles · <q> questions parked · <f> in flight at start · <note>
```

The outcome is the ticket's column at the end, or `parked` with the record count. The note holds what the run met outside its skill: a refused call, a build, the two readings while the floor and the ceiling are unmeasured.

## Permission rule

The user adds this to `permissions.allow` in `settings.local.json`, in `.claude/`, which git ignores. It covers starting a run and the emulator build. The skill never edits a settings file, and no run asks the user to change a permission.

```json
[
  "mcp__scheduled-tasks__create_scheduled_task",
  "mcp__scheduled-tasks__run_scheduled_task",
  "Bash(npx expo prebuild *)",
  "Bash(bash .claude/skills/emulator-verify/mqa.sh *)"
]
```

## After 10 queued tickets

Once the log holds 10 distinct tickets, each pass reads two measures before a `ship` start.

1. Questions asked during `/ship`: the sum of `questions parked` on the `ship` lines of the log.
2. Questions that should have been asked earlier: per ticket, the rows of the table under `## Decisions the ticket or plan did not state` in `~/.ship/MoneyApp/queue/ship-<n>-summary.md`. A summary file without that heading holds every `ship` start, and the reply names it.

Above 0 for the first, or 1 or more for the second, no `ship` run starts until the children of MA-149 are merged. `issue-review` and `prep` starts go on.

## Rules

- A question is never decided for the user. The recommendation goes first; the user chooses or defers.
- Ready For Development stays one-way: only a ticket at Blocked returns there.
- A parent is never pulled. The queue starts leaves only, and `queue` is null on a parent.
- The merge is the user's. No run merges, approves the gate or turns on auto-merge.
- No shell script or CLI runner starts a run. A run starts only through the two tools in § Start.
- The queue answers no question. A run that meets one parks it and ends; the queue goes on with the other tickets.
