# Queue, a column

`/queue <column> [n]`, from [SKILL.md](../SKILL.md) § Subcommands. The lease and its entry check are SKILL.md § Lease.

## One pass

1. § Merged since the last run.
2. Read the board, fresh:
   ```bash
   node scripts/board_next.mjs --format json </dev/null
   ```
   The candidates are the actions whose `queue` equals the column, in the script's order. The script sets `queue` only on an open leaf whose command a session runs, with every Depends on closed, no open question record, no lease, and at Defined a parent that is not `Reviewed none`.
3. For each candidate in order, read § Holds. A held candidate is skipped and the next is tried. Otherwise § Start it. Stop at `n` starts.
4. Reply: one line per candidate, `#<n> MA-XXX · started <task id>`, or `held, <hold>`; then every action whose `lease` is `stale`, with its action text; while the floor or the ceiling reads `unmeasured`, the readings of each start. Last line `Next: /queue <column>` while a candidate is held, else `Next: nothing to start in <column>`.

## Holds

Read before each start. Each hold counts the board read together with the tickets started earlier in this pass: a start adds one to its skill's count, adds its `paths` to the overlap set, and takes one `free` row when its `verify` is true.

| Hold | Read | Holds the start when |
|---|---|---|
| Cap | actions with `lease: 'held'`, counted by `leaseSkill`, a `ship` lease on a ticket at Awaiting Human not counted | 3 `ship` leases are held, or 5 `prep` and `issue-review` leases together |
| Overlap | the candidate's `paths` against the `paths` of every action in the `flight` bucket, with `lease: 'held'`, or with `pr.state` `OPEN` | a path is in both |
| No paths | the candidate's `size` and `paths` | a `prep` or `ship` candidate has a `size` and empty `paths`; the reply names it |
| No progress | the log's last line for the same skill and ticket | it ended in the column the start would run from, with 0 questions parked; the reply names it |
| Emulator slot | `bash .claude/skills/emulator-verify/mqa.sh claims` | `verify` is true and no row reads `free` |
| GraphQL budget | the `x-ratelimit-remaining` header of `gh api -i graphql -f query='{viewer{login}}'` | it is below the floor |
| Host load | the first figure of `sysctl -n vm.loadavg`, the 1-minute load | it is above the ceiling |
| Measures | § After 10 queued tickets | the candidate is a `ship` start and a measure holds |

Floor: unmeasured, written here on the first queue run. Ceiling: unmeasured, written here on the first queue run. Until then no run starts at a 1-minute load above 60. The two readings taken before a start go into its prompt, and the run copies them into its log line's note; while either figure reads `unmeasured`, the reply prints them too. The figures reach this file through a `docs/<slug>` branch and its PR. The queue commits nothing.

## Start

One app task per ticket, task id `review-<n>`, `prep-<n>` or `ship-<n>`.

1. Write the lease: `skill=` the run's skill, `worktree=` the primary checkout, `task=` the task id.
2. A new id: `mcp__scheduled-tasks__create_scheduled_task` with that id, no schedule and the prompt below. An id that exists: `mcp__scheduled-tasks__update_scheduled_task` with the prompt filled in fresh. An id is never deleted or re-created.
3. `mcp__scheduled-tasks__run_scheduled_task`. A refusal because a run is in progress is a hold: remove the lease step 1 wrote and record the hold.

The prompt, filled in, nothing else:

```text
Run the <issue-review|prep|ship> skill on issue #<n>: `/<issue-review|prep|ship> <n>`. Work on this ticket only.
Run: unattended. Task id: <task id>. In flight at start: <f>. Readings at start: 1-minute load <l>, GraphQL remaining <g>.
Project skills this run may use: issue-review, prep, ship, unslop, emulator-verify, moneyapp-testing, heroui-native, money-rules, and code-review where the ship skill prescribes it. No superpowers:* or anthropic-skills:* skill.
The lease ~/.ship/MoneyApp/queue/leases/<n> names this task id. The skill rewrites, touches and removes it per .claude/skills/queue/SKILL.md § Lease.
A question you cannot answer is parked as a record per .claude/skills/issue-review/references/question-record.md, and the run ends.
A refused call is never turned into a permission request. It goes into your log line's note, and the run goes on or ends.
/ship: write the merge summary to ~/.ship/MoneyApp/queue/ship-<n>-summary.md. It holds the heading `## Decisions the ticket or plan did not state` over a table with the columns Decision, Who, Cost if wrong: one row per decision, the header row alone when there is none.
Last, add your line to ~/.ship/MoneyApp/queue/<yyyy-mm-dd>.md in the shape of .claude/skills/queue/references/column.md § Log, the readings in its note.
```

`<f>` is the number of held leases before this start's own.

## Merged since the last run

First in every pass. For each `~/.ship/MoneyApp/MA-XXX/state.md` whose `pr:` URL reads `MERGED` from `gh pr view <url> --json state --jq .state`, and whose ticket holds no live lease, run [merge.md](../../ship/references/merge.md) § After the merge, steps 1 to 7. Step 7 deletes that folder, so a ticket is cleaned up once. This is a standing request in `CLAUDE.md` § When to stop.

## Log

`~/.ship/MoneyApp/queue/<yyyy-mm-dd>.md`, one line per run, written by the run:

```text
<skill> <n> · <outcome> · <start> to <end> · <k> dispatches · <c> fix cycles · <q> questions parked · <f> in flight at start · <note>
```

The outcome is the ticket's column at the end, or `parked` with the record count. The note holds the readings at start and what the run met outside its skill: a refused call, a build.

## Permission rule

The user adds this to `permissions.allow` in `settings.local.json`, in `.claude/`, which git ignores. It covers starting a run and the emulator build. The skill never edits a settings file, and no run asks the user to change a permission.

```json
[
  "mcp__scheduled-tasks__create_scheduled_task",
  "mcp__scheduled-tasks__update_scheduled_task",
  "mcp__scheduled-tasks__run_scheduled_task",
  "Bash(npx expo prebuild *)",
  "Bash(bash .claude/skills/emulator-verify/mqa.sh *)"
]
```

## After 10 queued tickets

Once the log holds 10 distinct tickets, each pass reads two measures before a `ship` start.

1. Questions asked during `/ship`: the sum of `questions parked` on the `ship` lines of the log.
2. Questions that should have been asked earlier: per ticket, the rows of the table under `## Decisions the ticket or plan did not state` in `~/.ship/MoneyApp/queue/ship-<n>-summary.md`. A `ship` line with no summary file counts 0 rows. A summary file without that heading holds every `ship` start, and the reply names it.

Above 0 for the first, or 1 or more for the second, no `ship` run starts until the children of MA-149 are merged: `gh api repos/MustaMohamed/MoneyApp/issues/644/sub_issues --jq '[.[] | select(.state=="open")] | length'` reads 0. `issue-review` and `prep` starts go on.
