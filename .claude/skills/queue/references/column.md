# Queue, a column

`/queue <column> [n] [model]`, from [SKILL.md](../SKILL.md) § Subcommands. The lease and its entry check are SKILL.md § Lease.

## One pass

1. § Merged since the last run.
2. Read the board, fresh:
   ```bash
   node scripts/board_next.mjs --format json </dev/null
   ```
   The candidates are the actions whose `queue` equals the column, in the script's order. The script sets `queue` on an open leaf whose command a session runs, with every Depends on closed, no open question record, no lease, and at Defined a parent that is not `Reviewed none`. At Defined it also sets it on a parent to mark: an open parent at Defined that reads `Reviewed none`, whose command is `/issue-review <parent>`, with every Depends on closed, its own parent not `Reviewed none`, every open child at Defined, and no open question record and no lease, held or stale, on the parent or on any open child. Its children get no slot until that run has marked it, so the parent goes first, and of two nested unmarked parents the outer one. No parent is a candidate of Ready For Development or Planned. A parent whose command is its review and which gets no slot carries the reason as `queueHold`.
3. `/queue Planned` only: for each action at Awaiting Human with `pr.state` `OPEN`, a `state.md` on this machine and no lease, run the read of § Changes asked at Awaiting Human. With one or more, § Start `ship-<n>` on it, counted toward `n` and held by Cap, Emulator slot, GraphQL budget, Host load and Measures only.
4. For each candidate in order, read § Holds. A held candidate is skipped and the next is tried. Otherwise § Start it. Stop at `n` starts.
5. Reply: one line per candidate, `#<n> MA-XXX · started <task id>`, `on <model>` appended when one was given, or `held, <hold>`; `/queue Defined` only, then every action with a `queueHold`, `#<n> MA-XXX · not queued, <queueHold>`; then every action whose `lease` is `stale`, with its action text and its command; while the floor or the ceiling reads `unmeasured`, the readings of each start; then each record in the window with its Check, § After 10 queued tickets. Last line `Next: /queue <column>` while a candidate is held, else `Next: nothing to start in <column>`.

## Holds

Read before each start. Each hold counts the board read together with the tickets started earlier in this pass: a start adds one to its skill's count, adds its `paths` to the overlap set, and takes one `free` row when its `verify` is true.

A parent candidate is one run and one start. The script has already put the union of its open children's `paths` on its row, since its own `Size:` line dates from before the cut, so Overlap reads the row as it reads a leaf's. Its `verify` is not read: a review of a parent takes no `free` row, and the Emulator slot hold never holds it.

| Hold | Read | Holds the start when |
|---|---|---|
| Cap | `cap.ship` and `cap.other` of the board read: the runs holding a lease, a `ship` lease on a ticket at Awaiting Human not counted. The script counts a run once, by the `task=` line its leases share, or for a typed review of a parent by the parent's lease | `cap.ship` is 3, or `cap.other`, `prep` and `issue-review` together, is 5 |
| Overlap | the candidate's `paths` against the `paths` of every action in the `flight` bucket, with `lease: 'held'`, or with `pr.state` `OPEN` | a path is in both |
| No paths | the candidate's `size` and `paths` | a `prep` or `ship` candidate has a `size` and empty `paths`; the reply names it |
| No progress | the log's last line for the same skill and ticket; for a parent candidate, the last such line whose outcome ends `, parent`, § Log | it ended in the column the start would run from, with 0 questions parked; the reply names it. A line from the ticket's runs as a leaf, before `/tickets` cut it, holds no parent start |
| Emulator slot | `bash .claude/skills/emulator-verify/mqa.sh claims` | `verify` is true, the candidate is not a parent, and no row reads `free` |
| GraphQL budget | the `x-ratelimit-remaining` header of `gh api -i graphql -f query='{viewer{login}}'` | it is below the floor |
| Host load | the first figure of `sysctl -n vm.loadavg`, the 1-minute load | it is above the ceiling |
| Measures | § After 10 queued tickets | the candidate is a `ship` start and a measure holds |

Floor: unmeasured, written here on the first queue run. Ceiling: unmeasured, written here on the first queue run. Until then no run starts at a 1-minute load above 60. The two readings taken before a start go into its prompt, and the run copies them into its log line's note; while either figure reads `unmeasured`, the reply prints them too. The figures reach this file through a `docs/<slug>` branch and its PR. The queue commits nothing.

## Start

One app task per ticket, task id `review-<n>`, `prep-<n>` or `ship-<n>`. A parent's start is one task, `review-<parent n>`, and one lease, the parent's.

1. Write the lease: `skill=` the run's skill, `worktree=` the primary checkout, `task=` the task id, only when no file exists at that path. A present file is a hold, named in the reply. For a parent the queue writes the parent's lease only; the run writes one per child it reviews, each with the same `task=` line, [issue-review](../../issue-review/SKILL.md) step 1.
2. A new id: `mcp__scheduled-tasks__create_scheduled_task` with that id, no schedule and the task prompt. An id that exists: `mcp__scheduled-tasks__update_scheduled_task` with the task prompt, title and description filled in fresh. An id is never deleted or re-created. The id is keyed on the issue number, so a ticket reviewed as a leaf and cut since keeps its `review-<n>`, and the update replaces the leaf's prompt with the parent's. The task prompt is the run prompt below; with a model it is § Wrapper holding the run prompt, since the app opens a task's session on its default model and takes no model from the create or update call.
3. `mcp__scheduled-tasks__run_scheduled_task`. A refusal because a run is in progress is a hold. On any refusal or error at the create, update or run call, remove the lease step 1 wrote and record the hold.

The run prompt, filled in, nothing else:

```text
Run the <issue-review|prep|ship> skill on issue #<n>: `/<issue-review|prep|ship> <n>`. Work on <this ticket only|this parent and the children its review covers, nothing else>.
Run: unattended. Task id: <task id>. In flight at start: <f>. Readings at start: 1-minute load <l>, GraphQL remaining <g>. Model: <model or app default>.
Project skills this run may use: issue-review, prep, ship, unslop, emulator-verify, moneyapp-testing, heroui-native, money-rules, and code-review where the ship skill prescribes it. No superpowers:* or anthropic-skills:* skill.
The lease ~/.ship/MoneyApp/queue/leases/<n> names this task id. The skill rewrites, touches and removes it per .claude/skills/queue/SKILL.md § Lease. Each lease this run writes on a child carries the same task= line.
A question you cannot answer is parked as a record per .claude/skills/issue-review/references/question-record.md, and the run ends.
A refused call is never turned into a permission request. It goes into your log line's note, and the run goes on or ends.
/ship: write the merge summary to ~/.ship/MoneyApp/queue/ship-<n>-summary.md. It holds the heading `## Questions that should have been asked earlier` over a table with the columns Record, Check: one row per `## Parked` line of state.md whose `miss:` is not `none`, the header row alone when there is none.
Before your last message, add your line to ~/.ship/MoneyApp/queue/<yyyy-mm-dd>.md in the shape of .claude/skills/queue/references/column.md § Log, `, parent` after its outcome when issue #<n> has open sub-issues, the readings and the model you are running as in its note, `wrapped` after it when Model above names one.
```

`<f>` is `cap.ship` plus `cap.other` of the board read, plus the starts made earlier in this pass.

## Wrapper

The task prompt when a model was given. The task's session reads the wrapper only; the agent reads the run prompt and does everything a run does today, lease, records, log line and all. The session's own work is one Agent call and the repeat of its last message. That session's start on the default model is the wrapper's cost, tens of thousands of tokens a run, which `wrapped` in the log note marks, so a cost comparison by model can set those lines apart.

Shown on Defined, 2026-10-03. The first `/queue Ready For Development <model>` and the first `/queue Planned <model>` are watched to their end for two things no run has shown: whether the agent's EnterWorktree lets its own dispatches write into the ticket worktree, and whether a full battery fits the agent's context. A skill that meets a refusal ends with it in its log note and the lease released; an agent that dies ends by the wrapper's failure line.

```text
Make one call and nothing before it, except the unslop load the prompt hook asks for: the Agent tool, subagent_type `claude`, model `<model>`, run_in_background true, with the text between the two `-----` lines as its prompt, unchanged. Wait for its completion notice. Reply with its last message unchanged, and end. Read no file, run no skill, write nothing yourself, except on failure: when the call is refused, or the agent returns an error or no last message, append `<skill> <n> · wrapper failed · <start> to <end> · 0 dispatches · 0 fix cycles · 0 questions parked · <f> in flight at start · <the refusal or error>, <model> wrapped` to ~/.ship/MoneyApp/queue/<yyyy-mm-dd>.md, with <skill>, <n>, <f> and the task id read from the run prompt, run `grep -rlx 'task=<task id>' ~/.ship/MoneyApp/queue/leases | xargs rm -f`, which removes the lease on <n> and on each child a parent's review leased, reply with that line, and end.
-----
<run prompt>
-----
```

## Changes asked at Awaiting Human

The PR's comments, reviews and review comments created after the summary file's last write, bots left out, less those `state.md` logs as triaged ([merge.md](../../ship/references/merge.md) § A change after the summary). `asks` prints their count across every page; paste the function and call it in one Bash call:

```bash
asks() {
  local f="$HOME/.ship/MoneyApp/queue/ship-<n>-summary.md" since
  [ -f "$f" ] || { echo 0; return; }
  since=$(date -u -r "$f" +%Y-%m-%dT%H:%M:%SZ)
  { gh api --paginate repos/MustaMohamed/MoneyApp/issues/<pr>/comments --jq ".[] | select(.user.type != \"Bot\" and .created_at > \"$since\") | .html_url"
    gh api --paginate repos/MustaMohamed/MoneyApp/pulls/<pr>/reviews --jq ".[] | select(.user.type != \"Bot\" and .submitted_at > \"$since\") | .html_url"
    gh api --paginate repos/MustaMohamed/MoneyApp/pulls/<pr>/comments --jq ".[] | select(.user.type != \"Bot\" and .created_at > \"$since\") | .html_url"
  } | grep -vxF -f <({ echo -; grep -oE 'https://github\.com/[A-Za-z0-9/_#-]+' "$HOME/.ship/MoneyApp/MA-XXX/state.md" 2>/dev/null; }) | wc -l | tr -d ' '
}
asks
```

Above 0 is a change the user asked for. With no summary file it prints 0 and reads nothing.

## Merged since the last run

First in every pass. For each `~/.ship/MoneyApp/MA-XXX/state.md` whose `pr:` URL reads `MERGED` from `gh pr view <url> --json state --jq .state`, and whose ticket holds no live lease, run [merge.md](../../ship/references/merge.md) § After the merge, steps 1 to 7. Step 7 deletes that folder, so a ticket is cleaned up once. This is a standing request in `CLAUDE.md` § When to stop.

## Log

`~/.ship/MoneyApp/queue/<yyyy-mm-dd>.md`, one line per run, written by the run:

```text
<skill> <n> · <outcome> · <start> to <end> · <k> dispatches · <c> fix cycles · <q> questions parked · <f> in flight at start · <note>
```

The outcome is the ticket's column at the end, or `parked` with the record count. A run on a ticket with open sub-issues writes `, parent` after either, `Defined, parent` or `parked 2, parent`, which is how the No progress hold tells that run from an earlier one on the same number as a leaf. The note holds the readings at start, the model the run ran as with `wrapped` after it when it ran inside § Wrapper, and what the run met outside its skill: a refused call, a build. `wrapper failed` is the outcome of a wrapped run whose agent never returned a last message; it is no column, so the No progress hold lets the next pass start the ticket again.

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

Once the log holds 10 distinct tickets, each pass reads two measures before a `ship` start. One ticket that asks is that ticket's miss; three in the window are the process's.

Window start: none, the whole log.

When that line names a PR, the window starts at its merge, read once a pass, and an unmerged PR starts nothing:

```bash
gh pr view <pr> --json mergedAt --jq .mergedAt
```

The window is the ten most recent distinct tickets with a `ship` line that ended after the window start, and those lines. A line ended on its file's date, at its end time, in this machine's local time; the merge time is UTC and is converted before the two are compared. A `wrapper failed` line is no ticket's line. Each measure counts tickets.

1. Questions asked during `/ship`: the tickets with a line whose `questions parked` is above 0.
2. Questions that should have been asked earlier: of those tickets, the ones with a record whose `Miss:` line is not `none`.

A ticket's records are the comments on its issue that `/ship` parked after the window start, open or answered, and a record's Check is its `Miss:` line, `none` without one. Only a ticket measure 1 counts is read, so a pass where no ticket asked makes no call:

```bash
gh api --paginate repos/MustaMohamed/MoneyApp/issues/<n>/comments --jq '.[] | select((.body | test("^Question:") and test("\nAsked by: ship")) and .created_at > "<mergedAt, or 0 with no window start>") | .html_url'
```

A measure holds at 3 tickets or more: no `ship` run starts in that pass, and the reply names each record and its Check, the `/issue-review` check id or `/prep` step that should have asked. `issue-review` and `prep` starts go on. A held `ship` start writes no `ship` line, so no run of clean lines lifts a hold. A PR that sets `Window start:` to its own number does, when it merges, and there are two:

- the fix of a step the hold named;
- on the user's word that the records are those tickets' own misses, a PR that changes that line alone.

No pass moves the line, and no other edit does.

Under 3 nothing is held. The reply still names each record in the window with its Check.
