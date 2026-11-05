# MA-227 — Ten commitments tickets measured against the transactions milestone
base: 08ed5d8ab2a38014adbc4f28258be8f19a8121d2 · verify: none · flags: none · expected diff: ~6 lines

Working files for steps 1 to 5 go in the implementer's session scratchpad, never in the repo. The one-off counting commands live there too (Rules: no hook or script added to the repo). Cutoff: MA-226 merged last, `7faf04d4` at 2026-10-21T18:58:34+03:00 (15:58:34Z); MA-225 `91d785ae` at 18:42:34+03:00.

## Steps
### 1. The ten tickets and every session of their runs are fixed in one table
- File: scratchpad `tickets.tsv` (outside the repo). Sources: `~/.ship/MoneyApp/queue/2026-10-2*.md` (one line per run: `<kind> <n> · <column> · <HH:MM> to <HH:MM> · …`, local time, `MA-<id>, Part of #<p>` further on the line), and session transcripts under `~/.claude/projects/-Users-musta-Code-projects-practice-MoneyApp*/<session>.jsonl`, a queued run identified by `scheduled-task name=\"prep-<n>\"` or `\"ship-<n>\"` anywhere in the file, a typed run by `<command-name>/prep</command-name>` or `/ship` with `<command-args>` naming the ticket.
- Change: Selection rule: a leaf whose parent chain reaches #777, every one of its /prep and /ship runs starting after 15:58:34Z, taken in order of its first /prep start. Read at this checkout, the first ten are #780 MA-206, #813 MA-231, #782 MA-208, #816 MA-233, #794 MA-220, #814 MA-232, #826 MA-238, #821 MA-235, #783 MA-209, #822 MA-236; spares in order #827 MA-239, #820 MA-234. Excluded: #779 and #786 (first /prep at 12:56Z, before the cutoff), #778 and #781. Confirm each parent chain with `gh issue view <n> --json parent` (#813 and #814 are under #784, itself under #777) and replace a failing ticket with the next spare. Columns: issue, MA id, kind (typed or queued) per run, each run's queue-log span, and every session id per run. A session id found in two project folders (the `MA-XXX` folder and the primary one) is one session; skip `*.superseded-*` files. A parked /prep or /ship has more than one run: #782, #794 and #822 /prep, #816 and #822 /ship. A /prep run is also every run that posted a `Plan: <blob URL>` comment (`gh issue view <n> --json comments`), a `--replan` or an `--amend` dispatched from a /ship session included: #822's second plan `ae69fac7` is one; its planner dispatches count in step 3, its tokens and minutes only if it ran queued. #822's /ship: the queue log holds only `ship 822 · parked 1 · 16:16 to 17:42` (2026-10-22.md:28) and session `6c6e633a` ends at 16:18Z, yet `ship-822-summary.md` is dated 10-22 23:35; find the session that finished it by its `board.sh status 822 "Awaiting Human"` call and its write to `ship-822-summary.md`, and record that session's kind. State every run's kind only after this check (the scheduled-task index read no typed /prep or /ship in the window). If that session cannot be found, replace #822 with spare #827.
- Test: none · no repository code changes; the table is checked by re-deriving three rows by hand from the queue log.

### 2. Per /ship: the conductor's requests, tool calls, Bash calls and tokens, and its last `conductor:` line
- File: scratchpad `ship.tsv`.
- Change: Over the conductor's own session file(s) only, no `subagents/`, summed over every session of the run, a resume included: requests = distinct `requestId` on assistant records; tokens = per distinct `requestId`, its last record's `input_tokens + cache_creation_input_tokens + cache_read_input_tokens + output_tokens` (the close audit's dedupe; the naive per-record sum is 1.96x); tool calls = distinct `tool_use` ids; Bash calls = those whose `name` is `Bash`. The `conductor:` line is the one with the highest run total, read from item 4 of `~/.ship/MoneyApp/queue/ship-<n>-summary.md` (present for all ten), else the transcript. Each row carries the baselines 123 requests, 83 Bash calls, 23M tokens and 70 calls beside the figures, and the self-reported total beside the transcript's tool-call count.
- Test: none · no repository code; cross-check one ticket's count against its `conductor:` line, which may differ by the calls a run forgets to count.

### 3. Per queued /prep: tokens, minutes to Planned, each planner dispatch's calls, and the probe's tokens
- File: scratchpad `prep.tsv`.
- Change: Tokens: the /prep session(s) plus every `subagents/agent-*.jsonl` under them, deduped per `requestId` as step 2. Minutes: from the first record of the ticket's first /prep session to the timestamp of the `bash scripts/board.sh status <n> Planned` tool call in the transcript, park waits included (the close audit's `#cohorts` rule: from the command to the `board.sh status` call; its D2 figure keeps park waits in). Queue-log spans, wrapped across midnight, are a cross-check only; parked runs named in their own column. Planner dispatches: each Agent call whose prompt carries the planner charter, in every /prep run step 1 lists; its tool calls from the return's `calls <n> · files <k>` line, beside 100, and whether its verdict is `over budget`. Probe tokens: `<t>` from the first `Plan: <blob URL>` comment that carries `probe <t> tokens` (`gh issue view <n> --json comments`); skip `Plan: parked` comments and `no probe … reused` comments, so #822's one probe counts once. A ticket whose plan comments all read `no probe` is left out of the probe median. Baselines beside: 35.2M tokens, 48 minutes.
- Test: none · no repository code.

### 4. Per queued /ship: minutes to Awaiting Human
- File: scratchpad `ship.tsv` (the column step 2 left).
- Change: From the first record of the ticket's first /ship session to the timestamp of the `bash scripts/board.sh status <n> "Awaiting Human"` tool call, in whichever session step 1 found making it, park waits included; queue-log spans a cross-check only; baseline 86 minutes beside each.
- Test: none · no repository code.

### 5. The full table is an artifact page with the medians
- File: scratchpad `ten-ticket-measurement.html`, published with the Artifact tool after the `artifact-design` skill loads (icon `chart`).
- Change: One row per ticket, ordered as step 1, with issue, MA id and run kind; the columns of steps 2 to 4, each figure beside its baseline; a median row. The medians the skills take: conductor tool calls per /ship (transcript count), planner calls per dispatch, probe tokens over the tickets that ran a probe. A method line: tokens deduped per `requestId`, minutes from the first session's first record to the `board.sh status` call, park waits included.
- Test: none · no repository code.

### 6. The /ship skill's conductor budget carries the ten-ticket median
- File: `.claude/skills/ship/SKILL.md` (§ Conductor budget, the paragraph at :72)
- Change: Append one sentence: over the first ten commitments tickets after MA-225 and MA-226, the median run made `<m>` tool calls against the 70, `<r>` requests and `<b>` Bash calls, the table at the step 5 URL. Avoid the phrases `scripts/validate-agent-assets.js` bans (unslop rule 2).
- Test: none · skill prose; `npm run lint` covers it.

### 7. The /prep skill's planner budget and probe cost carry the ten-ticket medians
- File: `.claude/skills/prep/SKILL.md` (**Planner budget.** at :61; `Probe cost: unmeasured.` at :92)
- Change: :61 gains one sentence: the median planner dispatch over the ten tickets made `<m>` calls against the 100, and `<o>` of `<d>` returned `over budget`. :92: the two sentences `Probe cost: unmeasured. The figure is written here from the \`Plan:\` comments of the first three UI tickets that ran a probe.` become `Probe cost: <t> tokens, the median over the <k> of the ten tickets that ran a probe, from their \`Plan:\` comments.`; the `<t>` definition and the parked-run sentence after them stay byte-identical. With no probe among the ten, the line keeps `unmeasured` and says none of the ten ran one.
- Test: none · skill prose; `npm run lint` covers it.

### 8. A comment on #801 links the table
- File: none in the repo; `gh issue comment 801`.
- Change: Body: the artifact URL and one line per median beside its baseline (conductor calls / 70, requests / 123, Bash / 83, tokens / 23M; queued /prep tokens / 35.2M, minutes / 48; planner calls / 100; queued /ship minutes / 86). Post it after the PR's skill edits are pushed, so the figures match.
- Test: none.

## Non-goals
- MA-225's conductor budget, bounded returns and bounded reads; MA-226's one-round review, probe beside the reviewer and planner budget: the budgets themselves stay 70 and 100.
- Any hook, script or test in the repo that counts tool calls or tokens (Rules).
- Re-measuring the transactions baselines. A typed run step 1 finds keeps its row, and steps 3 and 4 leave it out of the queued medians.
- `docs/workflow.md`, `queue/SKILL.md` and the probe charter.

## Untested inputs
- none: no repository code changes.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The scheduled-task enqueue record can precede the run's first record; minutes start at the session's first record, and the queue-log span is a cross-check only.
- A `.superseded-*` transcript may hold requests the live file lost; if a run's requests drop below its dispatch count, count both files deduped per `requestId`.
- The session that finished #822's /ship is not in the scheduled-task index; if step 1's lookup finds no session with the `Awaiting Human` call, #827 takes its row.

## Self-assessment
Step 1's run list is the least sure. Runs are found three ways (queue-log lines, scheduled-task or typed markers, `Plan:` comments), and #822 already showed a resume and a second plan that none of the first two finds. A run missed there drops its planner dispatches from step 3 and moves the `board.sh status` timestamp steps 3 and 4 measure to.
