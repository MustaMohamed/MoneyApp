# MA-147 — /queue runs a column's skill on the top eligible tickets
base: 924f008b8aa56ae86a6dc95e18380c0601d0995b · verify: none · flags: none · expected diff: ~280 lines

Fixed names, used by every step:

- Lease: `~/.ship/MoneyApp/queue/leases/<issue number>`, two lines, `skill=<issue-review|prep|ship>` and `worktree=<absolute path>`. Its mtime is its last write. A holder touches it at every dispatch and every `state.md` write.
- Log: `~/.ship/MoneyApp/queue/<yyyy-mm-dd>.md`, one line per run, the shape `2026-09-29.md` in that folder already has.
- Start tools: `mcp__scheduled-tasks__create_scheduled_task`, `mcp__scheduled-tasks__run_scheduled_task`. Task ids `review-<n>`, `prep-<n>`, `ship-<n>`.

## Steps

### 1. The board read carries each ticket's lease, its `Size:` paths and the column the queue may run it from
- File: `scripts/board_size.mjs` (new, `bodySize`), `scripts/board_next.mjs` (`fetchSnapshot` :114, `bodySize` :230, `decide` :302, `actorOf` :547, `buildContext` :569, `analyze` :616), `scripts/board_page/board.js` (`actionLine` :58), `.claude/skills/board/SKILL.md` (:42 and § Snapshot shape)
- Change:
  - `fetchSnapshot` returns `leases: Array<{ number: number, skill: string, worktree: string, touchedAt: string, worktreeGone: boolean }>`, one per file in the lease folder, `touchedAt` the mtime as ISO; a missing folder is `[]`. A snapshot without `leases` reads as `[]`.
  - `bodySize` moves to `scripts/board_size.mjs` as `export function bodySize(body: string | null | undefined): null | { unparsed: true } | { files: number, lines: number, paths: string[] }`, and `board_next.mjs` imports it; `GATE`, `overGate` and `sizeText` stay. `paths` is the text after `at <sha>: `, the sha with or without backticks, split on `, ` with backticks stripped, `[]` when the line names none. `files` and `lines` keep their meaning; its one caller is `normalizeIssue` :92.
  - `buildContext` adds `leaseOf(n): 'held' | 'stale' | null`. Stale is `worktreeGone`, or `fetchedAt` minus `touchedAt` over 2 hours.
  - `decide`, after the open-question return at :357 and before the parent branch: a stale lease returns `{ bucket: 'drift', action: 'stale lease, <skill>, last write <age>', command: 'rm ~/.ship/MoneyApp/queue/leases/<n>' }`; a held lease returns `{ bucket: 'flight', action: '<skill> running, lease held' }` with no command. The In Progress and In Review returns (:467 to :500) gain `held: true` when `ctx.shipState` lacks the ticket; their `bucket`, `action` and `command` strings do not change. `actorOf` returns `'nobody'` when `d.held`.
  - Each action in `analyze` gains `lease` (`leaseOf`), `leaseSkill` (the lease file's `skill`, held or stale, `null` without a lease), `paths` (`it.size?.paths ?? []`) and `queue: 'Defined' | 'Ready For Development' | 'Planned' | null`. `queue` is non-null only for an open leaf with `actor === 'session'`, every dep closed, `questions === 0` and `lease === null`: `'Defined'` at Defined with a `/issue-review` command, `'Ready For Development'` at that column with the command `/prep <n>` exactly, `'Planned'` at Planned, In Progress or In Review with a `/ship` command.
  - `board.js` `actionLine`: an action whose actor is `nobody` prints the who span and `a.action` as text, before every other branch.
  - `board/SKILL.md`: `in flight` reads a run holding a lease, or `/ship` resumable on this machine; § Snapshot shape names `leases` and its five fields.
- Test: `first` · `__tests__/scripts/board_next.test.ts` with new items and a top-level `leases` array in `__tests__/scripts/fixtures/board_next.snapshot.json` (issue numbers above 147 and unused; `fetchedAt` is `2026-09-08T10:00:00Z`). Cases: a Planned leaf with a held lease is `flight`, no command, actor `nobody`, `queue` null, `lease` `'held'` and `leaseSkill` `'ship'`; a lease last written 3 hours before `fetchedAt` and a lease with `worktreeGone` are each `drift` with the `rm` command and `queue` null; #104 (ship state, no lease) has `queue` `'Planned'` and #129 and #105 have actor `nobody` and `queue` null; #108 has `queue` `'Ready For Development'` and #110 `'Defined'`; a Defined leaf with `Reviewed none` and an open dep has `queue` null; #107 (`/prep 107 --replan`) has `queue` null; #127 (parent, `define`, `/issue-review 127`, actor `session`) has `queue` null; an item whose fixture `size.paths` names two paths has those two as `paths`. New `__tests__/scripts/board_size.test.ts`, a `node --input-type=module` driver importing the module as `__tests__/scripts/board_comments.test.ts` does: the `Size:` line of #642, verbatim with its sha in backticks, returns `files` 14, `lines` 192 and its 14 paths in order, none with a backtick; the same line with a bare sha returns the same; a line with no `at <sha>: ` returns `paths` `[]`; a body with no `Size:` line returns `null`; `Size: several files` returns `{ unparsed: true }`. `board.js` has no suite and the skill file is prose.

### 2. `/queue <column> [n]` starts the runs it can, holds the rest and logs each one
- File: `.claude/skills/queue/SKILL.md` (frontmatter `description` and `argument-hint`, § Subcommands, § Rules)
- Change: § Subcommands gains `Defined`, `Ready For Development` and `Planned` with their skills; any other column is refused by the existing last line. New sections, in this order:
  - **One pass.** `node scripts/board_next.mjs --format json </dev/null`, candidates are the actions whose `queue` equals the column, in the script's order; `n` caps the starts of the pass.
  - **Holds**, each naming its read: the cap, actions with `lease: 'held'` counted by `leaseSkill` (3 for `ship`, 5 for `prep` and `issue-review` together); overlap, a candidate's `paths` against the `paths` of every action in the `flight` bucket or with `lease: 'held'`; `verify` true with no `free` row from `bash .claude/skills/emulator-verify/mqa.sh claims`; the GraphQL budget from the `x-ratelimit-remaining` header of `gh api -i graphql -f query='{viewer{login}}'` and the host load from `sysctl -n vm.loadavg`, read before each start. Floor and ceiling read `unmeasured, written here on the first queue run`, and until then no run starts at a 1-minute load above 60. While they read `unmeasured`, a pass prints both readings at each start in its reply and in the log line's note, and the figures reach this file through a `docs/<slug>` branch and its PR; the queue commits nothing. Each hold counts the tickets started earlier in this pass, by their skill, `paths` and `verify`, together with the live leases and the `flight` bucket: a start adds one to its skill's count, its `paths` to the overlap set, and takes one `free` row when `verify` is true. A held candidate is skipped and the next is tried.
  - **Start.** `create_scheduled_task` with no schedule, then `run_scheduled_task`. An id that already exists is reused with `run_scheduled_task` alone, never deleted or re-created, and a refusal because a run is in progress is a hold. The task prompt, as a fenced template: the skill and issue number; `Run: unattended`; the project skills the run may use by name (`issue-review`, `prep`, `ship`, `unslop`, `emulator-verify`, `moneyapp-testing`, `heroui-native`, `money-rules`, `code-review` where ship prescribes it); `superpowers:*` and `anthropic-skills:*` forbidden; write the lease before the first dispatch and remove it when the run ends for any reason; `/prep` and `/ship` make the ticket worktree the working folder with EnterWorktree before the first dispatch, and a refusal because it already is the working folder is a pass; `/issue-review` works in the primary checkout and writes nothing to it; a question is parked as a record per `question-record.md` and the run ends; never merge, approve the gate or turn on auto-merge; a `/ship` run ends at Awaiting Human, runs no post-merge step, and writes its merge summary to `~/.ship/MoneyApp/queue/ship-<n>-summary.md`, which must hold the heading `## Decisions the ticket or plan did not state` over a table with the columns Decision, Who, Cost if wrong, one row per decision and the header alone when there is none; the log line.
  - **Lease.** The path, the two lines, the touch rule and the stale test from the block above this plan's Steps. A stale lease is listed in the reply and never removed or taken by a run.
  - **Merged since the last run**, first in every pass: for each `~/.ship/MoneyApp/MA-XXX/state.md` whose `pr:` URL reads `MERGED` from `gh pr view <url> --json state --jq .state` and whose ticket holds no live lease, run `.claude/skills/ship/references/merge.md` § After the merge, steps 1 to 7.
  - **Log.** `<skill> <n> · <outcome> · <start> to <end> · <k> dispatches · <c> fix cycles · <q> questions parked · <f> in flight at start`.
  - **Permission rule.** The JSON the user adds to `.claude/settings.local.json` under `permissions.allow`: the two start tools, `Bash(npx expo prebuild *)` and `Bash(bash .claude/skills/emulator-verify/mqa.sh *)`. The skill never edits a settings file.
  - **After 10 queued tickets.** Distinct tickets in the log. Measure one is the sum of `questions parked` on `ship` lines; measure two is, per ticket, the rows of the table under `## Decisions the ticket or plan did not state` in its summary file; a summary file without that heading holds every `ship` start and is named in the reply. Above 0 for the first, or 1 or more for the second, no `ship` run starts until the children of MA-149 are merged.
  - § Rules gains: a parent is never pulled; the merge is the user's; no shell script or CLI runner starts a run; the queue answers no question.
- Test: `none` · a skill file is prose; step 1's cases pin every field the pass reads.

### 3. A typed `/issue-review`, `/prep` or `/ship` holds the same lease, and a delivery run works from the ticket worktree
- File: `.claude/skills/ship/SKILL.md` (Entry 2, third bullet, :19; Setup :30 to :49), `.claude/skills/ship/references/triage.md` (:24), `.claude/skills/prep/SKILL.md` (step 2, :28 to :41; step 4's worktree removals), `.claude/skills/issue-review/SKILL.md` (:9 "Writes nothing to disk"; step 1; step 9)
- Change: each skill writes the lease before its first dispatch and removes it at every exit, linking `../queue/SKILL.md` § Lease for the shape. `/ship` removes it when the ticket reaches Awaiting Human, Blocked or a parked record, and after the post-merge list. `/ship` writes it again on every resume and on every return from Awaiting Human, a ruling at `triage.md` :24 or a PR comment routed through phase 3, before the next dispatch; `triage.md` :24 gains that line. `/ship` Entry: a ticket with a held lease belongs to the run the lease names, a stale lease is reported, and either stops the run; the `no state.md` stop stays. `/prep` step 2 and `/ship` Setup end with EnterWorktree on the ticket worktree, before any dispatch, with the refusal-is-a-pass line. `/issue-review` writes one lease per issue under review, `<n>` and each child it reviews, at step 1 Gather, and removes them all at every exit. It states the leases as its one write, outside the checkout, and that an unattended run works in the primary checkout.
- Test: `none` · skill files are prose.

### 4. A review lens enters its worktree, and one that ran without LSP says so
- File: `.claude/skills/ship/SKILL.md` (§ Worktrees :150 to :162, Hard rule 3 :118), `.claude/skills/ship/references/battery.md` (dispatch line :27, the `Return:` lines of charters A, B and C), `.claude/skills/ship/references/recheck.md` (:8, `Return:` :21), `.claude/skills/ship/references/triage.md` (:11, charter :28)
- Change: each dispatch that names the review worktree tells the subagent to call EnterWorktree with `path` set to it as its first action; a refusal because it already is the working folder is a pass. Each `Return:` line gains `LSP: used | not used, <why>`. § Worktrees states that the review worktree is under `.claude/worktrees/` of this repository, which is what makes it enterable. Charter D is not touched.
- Test: `none` · charters are prose.

### 5. The post-merge list runs from the queue as it does from `/ship`
- File: `.claude/skills/ship/references/merge.md` (§ Present for merge :31 to :38, § After the merge :42 to :55)
- Change: § After the merge names its two callers, the `/ship` session whose watch fired and `/queue` on its next pass, and states that every step reads before it writes, so a second caller finds each step done. Step 2 gains its read: skip the comment when `gh issue view <issue> --json comments` holds a body that starts `Delivered: `, the prefix `pr_size.mjs` prints. Step 5's teardown is skipped for a ticket with a held lease. An unattended run presents at Awaiting Human, removes its lease and ends with no watch.
- Test: `none` · `pr_size.mjs` does not change and `__tests__/scripts/pr_size.test.ts` covers it.

### 6. An unattended run builds on `build: REBUILD`, and the queue's slot read is named
- File: `.claude/skills/emulator-verify/SKILL.md` (:35 `up` row, :123 to :127, :186)
- Change: "stop and ask on REBUILD" and "Ask before building" hold for a typed run; a run whose task prompt reads `Run: unattended` builds and installs once under the permission rule in `../queue/SKILL.md` and records `build: REBUILD` in its log line note. The line at :127 says the queue holds a fourth `Verify emulator` ticket on `mqa claims` and never calls `mqa claim` for a run.
- Test: `none` · `mqa.sh` does not change.

### 7. The transition table and `CLAUDE.md` name the queue
- File: `docs/workflow.md` (:5, :11, table rows :19, :20, :30, :33, :34, :35, :36, :37, :38), `CLAUDE.md` (:17 When to stop, :35, :39, the Workflow bullet on `/prep` and `/ship`)
- Change: the Who cell of each listed row gains the queue's form, `/issue-review`, `/prep` or `/ship` started by `/queue <column>`, row :35 names the queue-started `/ship` whose `board.sh status` carries the parent, and row :38 gains `/queue` as a runner of the post-merge routine. `docs/workflow.md` :11 gains one sentence on `/queue <column> [n]`. Both files state `~/.ship/MoneyApp/queue/` as not transient beside `canvas/`. `CLAUDE.md` :17 adds the queue's post-merge list, teardown and artifact deletion to the standing requests, ahead of "Nothing else is one".
- Test: `none` · `npm run lint` runs `validate:agent-assets` over both files and the skill links.

## Non-goals
- The question record, parking in `/issue-review` and `/prep`, and `/queue asks` (MA-146): `references/asks.md` and `question-record.md` are not edited.
- `/ship`'s own unattended text, its merge summary shape, and resume on a PR comment (MA-148). Step 2 puts the run's rules in the task prompt only.
- `/ship` alone pulling a ticket: `ship/SKILL.md` Entry 3 and `docs/workflow.md` :43 stay.
- A lens without LSP named in the merge summary (MA-148): step 4 stops at the lens return.
- The `/prep` probe holding an emulator lease (MA-149); `mqa.sh` is not edited.
- No file under `src/`, no shell script or CLI runner, no edit to `.claude/settings.json` or `.claude/settings.local.json`.
- No `--queue` flag or second report format on `board_next.mjs`; the caps and the overlap stay in the skill.
- PR #528 is closed at merge by the conductor, not by a step.
- The header Flags stay `none` as on the ticket. The conductor's merge summary and the PR body lead with critical trigger 4, outside the established stack: the queue starts app tasks under a permission rule.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The ticket's Context says `bodySize` returns the `Size:` paths; at this base it returns `files` and `lines` only, so step 1 adds `paths`.
- `held: true` makes #105 and #129 actor `nobody`; a test that reads either as `session` would fail. None does at this base.
- The allow rule's Bash patterns are untested against the auto mode classifier, which denied `run_scheduled_task` for `ship-625` on 2026-09-29 with no rule in place.
- Measure two reads a decisions table whose shape MA-148 owns; a changed shape there changes step 2's sentence.
- The overlap hold reads `flight` and held leases, so a ticket at Awaiting Human with an open PR does not hold an overlapping start.
- The size write-back's read matches on the `Delivered: ` prefix, since the comment names no PR; a ticket with two merged PRs gets one size line.
- A summary file written before this task, `ship-625-summary.md`, has the heading; a run whose summary lacks it holds `ship` starts until the file is fixed by hand.
- Step 7's row numbers are at this base; a merge that adds a table row moves them.

## Self-assessment
Step 2 is the one I am least sure about. It is ~110 lines of skill prose with no test beneath it, and three of its parts rest on a single observation each: the permission rule's Bash patterns, which no run has exercised; the second measure, which reads a summary file that only the 2026-09-29 test run has written and whose shape belongs to MA-148; and `/ship` parking a question from the task prompt alone, while `ship/SKILL.md` still describes typed stops. The ticket's Rule that a question met in a run is parked decides the third, and the file `ship-625-summary.md` is the precedent for the second, but a reviewer who reads Out of scope strictly could call either one MA-148's work.
