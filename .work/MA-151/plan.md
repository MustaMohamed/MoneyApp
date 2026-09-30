# MA-151 — The /prep probe and the plan format
base: bc7d63e5f8a9dfbabb35c840e5b4d792a61b2cbd · verify: none · flags: none · expected diff: ~106 lines

Line numbers are this checkout's. A file edited by two steps carries its figure split across them.

## Steps
### 1. `/prep` probes the marked screen states between the planner and the reviewer
- File: `.claude/skills/prep/references/probe-charter.md` (new, ~24 lines)
- Change: The charter a `general-purpose` probe gets verbatim. It states, in this order: EnterWorktree into the probe worktree as the first action and no repository write outside it, with shots and the walk file written to the shots path; no commit, push, `gh` or plan edit; the `emulator-verify` skill loaded before the first device call; at most 3 states in the order given and 60 tool calls; per state the least code the plan's steps name for it, or the features file's force recipe when the state exists today, then a cropped `mqa shot` to the shots path and `mqa bounds` in dp against the frame; a row marked `new` is shot without adding it to the features file; on `build: REBUILD`, `sysctl -n vm.loadavg` first, `build held` when its first figure is above 60, else `npx expo prebuild --platform android`, `mqa build`, `mqa install`, one call each, asking nobody whatever `mqa up` prints, then `mqa up` again; the three measured dangers, each with its guard (a Metro transform stale across a commit, a warm app that keeps the old bundle, Pixel_2_API_34 at 420 dpi so geometry is `mqa bounds` dp); `mqa down` then `mqa release` on every return after the first device call. Return per state, one of `matches`, `differs, one fix: <the fact and the plan step it changes>`, `differs, choice: <question record fields Asks: to Screen:>`, `not probed`; then shot paths, `build: REUSE | REBUILD <files>`, `no slot` or `build held` when it stopped there, the tool-call count.
- File: `.claude/skills/prep/SKILL.md` (description line 3, Roles lines 19 to 22, new step after line 62, lines 64, 66, 81, 87; ~21 lines)
- Change: New step 5, Probe; steps 5, 6, 7 become 6, 7, 8 and in-file references follow (`step 6's amendment refusal` on line 51 becomes step 7, `parked at step 4 or 5` on line 87 becomes `4, 5 or 6`). Step 5 runs on a first run and on `--replan`, never on `--amend`, and only when the body has `## Screen checks` and the state list is not empty; the list is the rows whose risk is not `none` in table order, then the plan's Risks lines written `<features file> · <state>: …` not already in it, the first 3 probed and the rest `not probed`. The conductor waits in one background Bash call until `bash .claude/skills/emulator-verify/mqa.sh claims` prints a `free` row, touching `~/.ship/MoneyApp/queue/leases/<n>` each minute; creates `.claude/worktrees/MA-XXX-probe` detached at the ticket branch head with an APFS clone of the ticket worktree's `node_modules`; dispatches the charter, the issue body, the plan path, the state list and the shots path `~/.ship/MoneyApp/MA-XXX/probe/`. `no slot` and `build held` are waited out (the loop of `.claude/skills/ship/references/implement.md` line 45 with the ceiling 60) and re-dispatched with the worktree kept; after the last return the conductor runs `mqa release` from the probe worktree when `mqa claims` still names it, then `git worktree remove --force` and `git worktree prune`. One-fix facts, `not probed` states and a `REBUILD` verdict go to one planner re-dispatch, objective "revise the plan for exactly these probe results"; a `choice` is a gap of step 4, asked in a typed run with the shots in its visual and parked in an unattended one with `Asked by: prep, probe, <date>`. The step holds the line `Probe cost: unmeasured`, to be written from the `Plan:` comments of the first three UI tickets; the `Plan:` comment on line 81 gains `· probe <t> tokens, <s> of <m> states` or `· no probe`, `<t>` the sum of the run's probe dispatches as the Agent tool reports them. A run that probed and ends with no plan commit (a park, a Blocked exit) posts one comment before it ends, `Plan: parked · probe <t> tokens, <s> of <m> states`. Roles gains a Probe line; the description and the step 8 reply name the probe.
- File: `.claude/skills/prep/references/planner-charter.md` (lines 13, 37 to 39, 51 to 52, one rule after line 63; ~8 lines)
- Change: On a body with `Screen checks` the Screens section is built from its rows, one entry per row, a row marked `new` with the step that adds the state to the features file; a body without the section keeps today's rule. Risks gains three line shapes: `<features file> · <state>: <the risk>` for a risk that is a screen state, `not probed: <features file> · <state>`, and `REBUILD: <files>`. One rule for a dispatch that carries probe results: each fact rewrites the step it names, each `not probed` state and the `REBUILD` verdict become Risks lines, nothing else changes.
- File: none, a GitHub issue. Actor: the `/ship` conductor at phase 3, never the implementer.
- Change: The conductor creates the follow-up ticket by the Deferral recipe of `.claude/skills/ship/references/triage.md` line 18: title `MA-nnn — The /prep probe cost figure`, header `Part of #639 · Depends on MA-151 (#646) · Verify none · Flags none · Reviewed none`, one Acceptance line, "The prep skill holds the probe's token cost, read from the `Plan:` comments of the first three UI tickets that ran a probe", the path `.claude/skills/prep/SKILL.md` in its Context, linked with `bash scripts/board.sh link 639 <new>` at Defined. It is a child of the epic, not of #644, so `.claude/skills/queue/references/column.md` line 111 does not hold `ship` starts on it. Merge summary item 8 lists its number; the `Probe cost:` line names no ticket number.
- Test: `none`. Every file is markdown under `.claude/`; no suite under `__tests__/` reads skill prose, and `npm run lint` runs `scripts/validate-agent-assets.js` over its paths and whitespace.

### 2. The emulator rules admit the probe as a third run with its own slot and its own build
- File: `.claude/skills/emulator-verify/SKILL.md` (lines 35, 123 to 129, 133, 176 to 179, 193 to 199, 217 to 220; ~14 lines, the file is hard-wrapped)
- Change: The `up` row and the build paragraph say a `/prep` probe builds on `build: REBUILD` as the `/ship` implementer does, for the device its worktree claimed, holds the build while the 1-minute load is above 60, and that the plan's Risks carries the `REBUILD` line; "any other session asks" stays for the rest. The claim section says the probe's worktree holds its own slot from its first `mqa` call, runs `mqa release` before that worktree is removed, and that `/prep` waits on `mqa claims` when no row is free. Line 176 names the probe as a third run, before the plan is reviewed, in its own worktree with a real `node_modules`, linked to `../prep/references/probe-charter.md`; line 133 and lines 217 to 220 except the probe (a row marked `new` is shot before it is in the file; the probe runs no parity chain).
- File: `.claude/skills/emulator-verify/features/README.md` (lines 11, 12; 2 lines)
- Change: Line 11 excepts the probe of a `Screen checks` row marked `new`, which shoots the state before the plan's step adds it to the file. Line 12 says the reviewer refuses a state the file lacks unless a plan step adds it.
- File: `CLAUDE.md` (line 17; 1 line)
- Change: The standing requests gain `/prep`'s removal of its own probe worktree when the probe returns.
- File: `docs/workflow.md` (line 46; 1 line)
- Change: The delivery paragraph says that on a ticket with marked `Screen checks` rows a probe renders them on the emulator before the reviewer reads the plan.
- Test: `none`, as step 1.

### 3. The plan states nullability, untested inputs and amendments, and the reviewer returns an unruled decision as a question
- File: `.claude/skills/prep/references/planner-charter.md` (lines 21, 32, template after line 45 and after line 52, line 64; ~9 lines)
- Change: Contracts and the template's Change line say every interface row states, per field, argument and return value, whether it can be `null`, whether it is optional, and the argument order. The template gains `## Untested inputs` between Non-goals and Verification (one line per input the ticket implies that no `Test:` line covers, with the step it meets, or `none`) and `## Amendments` between Risks and Self-assessment, present only after an `--amend` (one line per amendment: `<yyyy-mm-dd> · step <k> · what changed and why`, ending `· not probed: <features file> · <state>` when the rewritten step changes what a `Screen checks` row with a risk mark shows). Line 64 becomes: rewrite the steps the discrepancy names in place, leave the rest byte-identical, add the `Amendments` line; no step and no Risks line carries amendment history.
- File: `.claude/skills/prep/references/reviewer-charter.md` (lines 13, 15, 16, a new check 8 after line 19, line 23; ~5 lines)
- Change: New check 8, Unruled decisions: a step that decides behaviour the ticket did not state is returned under `questions`, never as a finding, with a question record's fields from `Asks:` to `Screen:` and the plan's choice as option A. The Return line gains `questions`, and a plan with one is never `approve`. Check 1 adds that on a body with `Screen checks` the Screens section holds one entry per row; check 3 that an interface row without nullability and optionality is a finding; check 4 that an input no test covers and `## Untested inputs` omits is a finding, as is an amended plan whose history sits outside `## Amendments`.
- File: `.claude/skills/prep/SKILL.md` (the Review step, line 64; 1 line)
- Change: The reviewer's `questions` are gaps of step 4, asked in a typed run and parked in an unattended one, before the findings re-dispatch; the planner's next dispatch gets the answered body with the findings.
- Test: `none`, as step 1.

### 4. One seam is trimmed without asking, two or more are a question, and a seam ruled at `/queue asks` is trimmed on the next `/prep`
- File: `.claude/skills/prep/SKILL.md` (lines 9, 49, 51, 59, 62, 92; ~6 lines)
- Change: A size gap with one seam is trimmed at it with no ask, typed or unattended. With two or more, a typed run shows each seam as a column with its visual and asks exactly **"Which seam?"**, then trims at the answer; an unattended run parks one record whose options are the seams, recommended first, each `writes: Seam: <the first part's Acceptance lines in one line>` and `into: #<n> Rules`, and sends the ticket to Blocked. Line 49 loses "`/prep` does not park two cases itself" and `unattended trim: MA-149`. The trim comment on line 59 starts `Trimmed at /prep, one seam:` when the planner's gap held one seam and no Rules `Seam:` line, `Trimmed at /prep, seam chosen <yyyy-mm-dd>:` for a seam answered in the session, and the same with the date on the Rules line for a trim at a `Seam:` line; `$REST` on line 62 omits a Rules line that starts `Seam:`. Lines 9 and 92 state the stops and the rule the same way.
- File: `.claude/skills/prep/references/planner-charter.md` (line 20; 1 line)
- Change: The size gap names every seam that brings the first part under the gate with room, recommended first, each with the fields today's single seam has. A Rules line that starts `Seam:` is the seam the user chose: while the body still holds an Acceptance line that seam puts in the remainder, the gap carries that seam alone.
- File: `.claude/skills/queue/references/asks.md` (step 4 item 2, line 28; 1 line)
- Change: A `writes:` text that starts `Seam:` is written with `, ruled <yyyy-mm-dd>`, the answer's date, at its end.
- File: `.claude/skills/issue-review/references/question-visuals.md` (lines 15, 25; 2 lines)
- Change: The structure row's seam question is `Which seam?` among two or more seams, one column per seam. Line 25's gate on one proposal no longer names a seam as its example.
- File: `docs/workflow.md` (lines 31, 33; 2 lines)
- Change: The trimmed row reads "with one seam that brings it under, or the seam I chose among two or more". The unattended `/prep` row adds a choice between two or more seams to what is parked.
- File: `CLAUDE.md` (line 37; 1 line)
- Change: A plan over the gate is trimmed at its one seam, and two or more seams are a question.
- Test: `none`, as step 1.

### 5. The merge summary lists an unasked trim, one screenshot per `Screen checks` row, and the states an amend left unprobed
- File: `.claude/skills/ship/SKILL.md` (Setup, after the block ending on line 45; ~2 lines)
- Change: Setup reads the issue's comments that start `Trimmed at /prep, one seam:` and writes each as a `state.md` → `## Decisions` line, `<date> <the seam and the remainder's number> · /prep, one seam · <cost if wrong>`. Item 6 of the merge summary prints it with no edit to `merge.md`.
- File: `.claude/skills/ship/references/merge.md` (item 7, line 39; 1 line)
- Change: One screenshot per `Screen checks` row of `issue.md` on a body that has the section, else per screen the plan's Screens section lists, from `findings/render/`; then each state `state.md` logs as not probed. The item keeps its place and number.
- File: `.claude/skills/ship/references/implement.md` (Re-entry, after line 48; 1 line)
- Change: A new Re-entry bullet, Amend logged: after every `prep --amend`, whichever phase called it, each `not probed:` state in the amended plan's `## Amendments` section is a `state.md` Log line, `- <date> not probed after amend: <features file> · <state>`.
- Test: `none`, as step 1.

### 6. A record holds an `ask` only on the same issue, check id and `Blocks:` line, and only a typed run moves a deferred issue back
- File: `.claude/skills/issue-review/SKILL.md` (step 6 line 44, step 8 line 46; 2 lines)
- Change: Line 44: a record holds an `ask` when it sits on the `ask`'s issue, its `Asked by:` line names the same check id and its `Blocks:` line names the same line; any other `ask`, a second from the same check on the same issue included, is asked or parked on its own. Line 46: "each issue with an unanswered `ask` from this run" becomes, in a typed run, each issue with an `ask` the user deferred; an unattended run makes no such move.
- Test: `none`, as step 1.

### 7. An answer on an epic writes its Rules line only
- File: `.claude/skills/tickets/references/ticket-body.md` (§ Writing an answer, line 56; 1 line)
- Change: The section's closing sentence is scoped to a task body. One sentence is added: on an epic an answer writes its Rules line and nothing else, no Decisions line and no section `../../epic/references/epic-body.md` lacks, at `/issue-review` and `/queue asks` alike. `.claude/skills/issue-review/SKILL.md` line 45 and `.claude/skills/queue/references/asks.md` line 28 cite the section and stay as they are.
- Test: `none`, as step 1.

## Non-goals
- `.claude/skills/emulator-verify/mqa.sh` is not edited; its "Any other session asks first" text stays at lines 427, 439 and 1127.
- `.claude/skills/ship/references/battery.md`, `.claude/agents/render.md` and charter item 8 of `.claude/skills/ship/references/implement.md` read the plan's Screens section and are not edited.
- `.claude/skills/queue/references/column.md`: § Holds, its ceiling line and § After 10 queued tickets stay, MA-147.
- `.claude/skills/issue-review/references/question-record.md`: the record's lines and its restatement check stay, MA-146.
- `.claude/skills/ship/references/merge.md`: the ten items keep their order and the summary keeps its path, MA-148. Only item 7's text changes.
- `.claude/skills/tickets/references/ticket-body.md`: the Copy, Screen checks and Decisions definitions and the risk marks stay, MA-150. `.claude/skills/epic/references/epic-body.md` gains no section.
- `.claude/skills/tickets/references/splitting.md` § Size gate, `scripts/`, `__tests__/` and `src/` are untouched.
- No typed answer to "Which seam?" is written into Rules; only `/queue asks` writes the `Seam:` line.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gates, each run from the worktree root, base result at `bc7d63e5` first, then the result after its step. `S=.claude/skills`.
  - Step 1: `test -f $S/prep/references/probe-charter.md` exits 1, then 0. `grep -c 'Probe cost:' $S/prep/SKILL.md` prints 0, then 1. `grep -c 'not probed' $S/prep/references/planner-charter.md` prints 0, then 1 or more.
  - Step 2: `grep -c probe $S/emulator-verify/SKILL.md $S/emulator-verify/features/README.md CLAUDE.md docs/workflow.md` prints 0 for each file, then 1 or more for each.
  - Step 3: `grep -cE '^## (Amendments|Untested inputs)' $S/prep/references/planner-charter.md` prints 0, then 2. `grep -c 'add one line under Risks' $S/prep/references/planner-charter.md` prints 1, then 0. `grep -c questions $S/prep/references/reviewer-charter.md` prints 0, then 1 or more.
  - Step 4: `grep -c 'unattended trim: MA-149' $S/prep/SKILL.md` prints 1, then 0. `grep -c 'Trim at this seam?' $S/prep/SKILL.md $S/issue-review/references/question-visuals.md` prints 1 for each, then 0 for each. `grep -c 'Seam:' $S/queue/references/asks.md $S/prep/references/planner-charter.md $S/prep/SKILL.md` prints 0 for each, then 1 or more for each.
  - Step 5: `grep -c 'Trimmed at /prep, one seam:' $S/ship/SKILL.md $S/prep/SKILL.md` prints 0 for each, then 1 for each. `grep -c 'not probed' $S/ship/references/implement.md $S/ship/references/merge.md` prints 0 for each, then 1 for each.
  - Step 6: `grep -c 'each issue with an unanswered' $S/issue-review/SKILL.md` prints 1, then 0. `grep -c 'Blocks:' $S/issue-review/SKILL.md` prints 0, then 1.
  - Step 7: `grep -c 'epic-body.md' $S/tickets/references/ticket-body.md` prints 0, then 1.

## Risks
- The ticket's line numbers are at `924f008b`; this plan's are at `bc7d63e5`. A merge that touches these files before the implementer runs moves them again.
- `.claude/skills/ship/SKILL.md` no longer holds "Prep's two stops survive": MA-148 made `/ship` reply `Next: /prep <n>` on a Ready For Development ticket (line 20). Its edit here is the Setup line of step 5, the carrier of the trim decision.
- `.claude/skills/queue/references/asks.md` is a file the ticket's `Size:` line missed. Without its one line nothing writes the date the Acceptance line asks for on the `Seam:` Rules line.
- The probe's ceiling is written as 60 in three files, while `.claude/skills/queue/references/column.md` line 32 reads `Ceiling: unmeasured` with 60 as its stand-in. A measured ceiling written there later leaves the probe's at 60.
- The `Plan:` comment's token figure needs the Agent tool to report a dispatch's total tokens. A session where it does not has no figure to write.
- `.work/MA-151/plan.md` is a tracked `.md` on the branch, so the banned phrases of `scripts/validate-agent-assets.js` lines 197 to 213 fail `npm run lint` in this file as in any other.
- The new prose names paths: a cited path that does not exist fails `npm run lint`, so the charter and its first link land in one commit (step 1).

## Self-assessment
Step 4 is the one I am least sure about. The `Seam:` Rules line passes through three files, the record `/prep` parks, the date `asks.md` adds and the planner's one-seam gap on the next run, and only an unattended ticket with two or more seams exercises the chain. No test reads any of it, `asks.md` was outside the ticket's `Size:` list, and the planner has to recognise a `Seam:` line from prose alone; a run that words the line differently from `Seam:` breaks the hand-off with nothing failing.
