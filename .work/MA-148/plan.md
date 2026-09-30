# MA-148 — /ship asks nothing and ends at Awaiting Human with a merge summary
base: d5b6417a · verify: none · flags: none · expected diff: ~180 lines

Line numbers are at `d5b6417a`. 19 files outside tests. The ticket's `Size:` line missed `.claude/skills/queue/references/column.md` and `.claude/skills/issue-review/references/question-record.md`.

## Steps

### 1. The board reads a parked `/ship` ticket and an Awaiting Human ticket the way the new table states them
- Files: `docs/workflow.md` (table, :34-38), `scripts/board_next.mjs` (`decide` :339-345 and :385-388, `pillLabel` :861), `.claude/skills/board/SKILL.md:42`
- Change:
  - `docs/workflow.md` gains three rows and rewrites one. `In Progress | Blocked` and `In Review | Blocked`, both by `/ship`, typed or by `/queue Planned`, on a question `/ship` cannot rule, parked as a question record whose `Left:` names the column left. `Awaiting Human | In Review`, by `/ship`, on a change the user asks for in the task or in a PR comment newer than the merge summary. The `In Review | Awaiting Human` row's On cell reads `the merge summary` and nothing else.
  - `decide`, Awaiting Human with no open PR, returns `{ bucket: 'drift', action: 'Awaiting Human without a PR', command: '/ship <n>', elsewhere }`, the shape `In Review without a PR` has at :493-499. `elsewhere` is declared at :475, below this branch, so its declaration moves above :339.
  - `decide`, parent branch. `stays` at :387 also holds for a parent at In Progress with an open child at Blocked, so a child `/ship` parked does not report its parent as `column ahead of its furthest child`.
  - `pillLabel`'s `yours` fallback at :861 drops `read ship state`. After this step its one caller is `Blocked on a ruling from /prep`, whose `board.sh status` command gets the `set <column>` text the drift branch builds at :866, kind `you`.
  - `board/SKILL.md:42` lists `yours` as a merge or an open question record.
- Test: `first` · `__tests__/scripts/board_next.test.ts` with `__tests__/scripts/fixtures/board_next.snapshot.json`. Row 103 becomes `[103, 'drift', 'Awaiting Human without a PR', '/ship 103']`. `leaf(143)?.pill?.text` is `set Ready For Development`. A new fixture parent at In Progress with no closed child and one open child at Blocked lands in `wait` as `parent, mirrors its children`.

### 2. `/ship` takes a Planned ticket by number and nothing else
- Files: `.claude/skills/ship/SKILL.md` (frontmatter `description` :3, :9, Entry :15, :20, :24-30), `CLAUDE.md:38`, `docs/workflow.md:43`, `.claude/skills/prep/SKILL.md:43`
- Change: Entry's Ready For Development leaf row replies that the ticket has no plan, names `/prep <n>` and runs nothing. Entry step 3 becomes one line, `/ship` with no number pulls nothing and says so. The `gh project item-list` block and "or the row step 3 names" at :15 go. The description, `:9`, `CLAUDE.md:38` and `docs/workflow.md:43` drop "`/ship` alone pulls" and "runs `/prep` first", and say `/ship <n>` ends at Awaiting Human with a merge summary. `prep/SKILL.md:43` says `/ship` calls `/prep` with `--amend` only.
- Test: `none`. Skill and doc text. No file under `__tests__/` reads these files' prose.

### 3. The conductor rules every dispute, a finding has four ends, and the fix loop has four cycles
- Files: `.claude/skills/ship/SKILL.md` (:9, Phases :65-66, Artifacts :78, `state.md` template :89-112, Hard rule 4 :123, table :135-136, Fix loop :152, a new `## Rulings` section), `.claude/skills/ship/references/triage.md` (:9, :10, :14, :19, :21, :32, one new check), `.claude/skills/ship/references/implement.md:39`, `.claude/skills/ship/references/recheck.md:25`, `.claude/skills/ship/references/battery.md` (:16, charter A item 3 at :35)
- Change:
  - `## Rulings` has the conductor settle a dispute, and an ambiguous verification, by the first of four that answers. The ticket text. The frame in `~/.ship/MoneyApp/canvas/` for layout, geometry and colour. The shipped convention for glyphs, icons and number formats. The smallest change. Each ruling is an `## Adjudications` line that names which of the four settled it, and one that reached the smallest change is also a `## Decisions` line with its cost if wrong. Hard rule 4 becomes "the run asks the user nothing". The both-sides-to-the-human paths at `SKILL.md:152` and `triage.md:19` go, with their `question-visuals.md` citations, and `SKILL.md:9` drops "disputes and caps go to the human as they arise".
  - A finding ends one of four ways, in `triage.md` item 6 and its Exit counts. `fixed`. `ticket #<n>`. `not fixed`, for one still open after cycle 4. `rejected`, with the ticket line the fix contradicts, quoted. The accepted trade-off at `triage.md:14` and the PR body's Trade-offs section at `battery.md:16` and `SKILL.md:78` go. "Ruled trade-off" at `triage.md:9` and `SKILL.md:135` becomes "ruled finding". Ledger, FP and refuted closures stay as they are.
  - Triage gains a check beside CI first. A path in `git diff --name-only origin/main...HEAD` that a line under the plan's `## Non-goals` names is a finding. Charter A item 3 says the same.
  - The cap is 4 in the Phases table, the Fix loop and `recheck.md:25`. Cycles 1 and 2 continue the phase 1 implementer with SendMessage to the agent id a new `implementer:` line of `state.md` holds, the message being the Re-entry objective and the path of `findings/cycle-<n>.md`. An agent that no longer answers is replaced by a fresh implementer with the whole file. Cycles 3 and 4 dispatch a fresh implementer, three layers, and a file that lists only the findings still open. After cycle 4's re-check nothing is dispatched. Open findings are `not fixed` and phase 5 runs.
  - `prep --amend` does not reset the count, which `SKILL.md:152` and `triage.md:16` say it does. `state.md` gains a `cycle: <0-4>` line.
- Test: `none`. Skill text.

### 4. `/ship` parks the three cases it cannot rule at Blocked, each as a question record, and logs a miss at review
- Files: `.claude/skills/ship/SKILL.md` (a new `## Parking` section, Resume :17, `state.md` template, Red flags :174-182), `.claude/skills/ship/references/triage.md:16`, `.claude/skills/ship/references/battery.md` (:17, charter B item 5 at :51), `.claude/skills/ship/references/implement.md:41`, `.claude/skills/prep/SKILL.md` (:47, :49, :64), `.claude/skills/issue-review/references/question-record.md` (:3, :7, table :13-27), `.claude/skills/issue-review/references/question-visuals.md:3`, `CLAUDE.md:39`
- Change:
  - `## Parking` names the three cases, for a typed run and an unattended one alike. A critical trigger of `CLAUDE.md` the header Flags do not name, checked at phase 2 entry on `git diff --name-only origin/main...HEAD` (`battery.md:17`) and at triage on the quality lens's danger-surface flags; charter B item 5 at `battery.md:51` says triage checks them against the header Flags, where it says the merge summary lists them. A ticket line that cannot hold or that the code contradicts (`triage.md:16`). Gaps `prep --amend` returns (`implement.md:41`).
  - A park runs in this order. `Left:` is read with `bash scripts/board.sh get <n>`. One record per question goes up per `question-record.md`, `Asked by:` naming `ship` and the phase, after its restatement check, with `gh issue comment`. Then `bash scripts/board.sh status <n> Blocked`. One line per record goes under a new `## Parked` heading of `state.md`, holding the record URL, the case and the miss. The lease is removed. The reply is the record URLs and `Next: /queue asks`. The worktree, the branch and `state.md` stay. The parked question is not decided.
  - The first two cases add a `Miss:` line to the record, naming the `/issue-review` check id or the `/prep` step that should have asked. Amend gaps carry none. `question-record.md`'s table gains `Miss:` after `Left:`, written by `/ship` only, and :3 and :7 name `/ship` as a writer that parks in a typed run too.
  - Resume at :17 first runs `bash scripts/board.sh questions <n>`. While it prints a record the run stops there, dispatches nothing, parks nothing, and replies `Next: /queue asks`. With none open and the ticket back from Blocked, it rewrites `issue.md` from the issue before the next dispatch.
  - `prep/SKILL.md:47`, `:49` and `:64` say that under `--amend`, gaps and a finding the planner disputes return to `/ship` and are never shown to the user. No board write there, branch and worktree kept, as today.
  - `question-visuals.md:3` drops `/ship` from the asking skills. `CLAUDE.md:39` adds `/ship` and its park at Blocked. Red flags gains "about to ask the user anything".
- Test: `none`. Skill text. The board's reading of a parked ticket is step 1's test.

### 5. On `build: REBUILD` a `/ship` run builds, asks nothing, and holds the build under host load
- Files: `.claude/skills/emulator-verify/SKILL.md` (:35, :188-195), `.claude/skills/emulator-verify/mqa.sh` (`build_verdict` :439, `usage` :1127), `.claude/skills/ship/references/implement.md` (charter item 8 at :54, Re-entry :37-41), `.claude/skills/ship/references/battery.md:24`
- Change:
  - `emulator-verify/SKILL.md` says a `/ship` run, typed or unattended, builds and installs once for the device its worktree claimed, under `column.md` § Permission rule, and asks nothing. A typed session outside `/ship` still asks.
  - Before `mqa build` the implementer reads `sysctl -n vm.loadavg`. With the first figure above the ceiling of `column.md` § Holds, 60 while that line reads `unmeasured`, it returns `build held` with its SHA and builds nothing. The conductor waits in one background Bash call that re-reads the load each minute and touches the lease, then re-dispatches on the SHA as Re-entry's over-budget bullet does. It is not a cycle.
  - A render lens that reports `build: REBUILD` stays as charter D item 3 and `.claude/agents/render.md:11` state it. The conductor has the implementer build under the same hold, then dispatches the lens again.
  - The conductor logs `build: REBUILD` and the files `mqa up` listed in `state.md`. Step 6 prints it.
  - `mqa.sh:439` ends `Build once: mqa build && mqa install`, as :427 does, in place of `Ask before building:`. `:1127` reads `# on build: REBUILD, build and install once, then up again`.
- Test: `none`. `git grep -l mqa -- __tests__` prints nothing, and the change to `mqa.sh` is two strings.

### 6. The run ends at Awaiting Human with the merge summary, and a change the user asks for returns it to In Review
- Files: `.claude/skills/ship/references/merge.md` (:16, :18-31, :38, Checklist :61-68), `.claude/skills/ship/SKILL.md` (:53, Phases :67, Artifacts :73-83, `## Decisions` template :105-106), `.claude/skills/ship/references/battery.md:84`, `.claude/skills/ship/references/implement.md:61`, `.claude/skills/ship/references/triage.md:24`, `.claude/skills/queue/SKILL.md:14`, `.claude/skills/queue/references/column.md` (§ One pass :5-14, one new section)
- Change:
  - `merge.md` § Present for merge is one summary headed by the PR URL, then ten items in this order, each written `none` when empty except item 6, whose heading and table header row are always written. 1 findings `not fixed` after cycle 4. 2 decisions that reached "smallest change". 3 the header Flags verbatim and the `REBUILD` line. 4 the CI re-read, the commits after the last re-check, each lens whose return reads `LSP: not used`. 5 what was built, one line per Acceptance line. 6 every other decision under the heading `## Decisions the ticket or plan did not state`, a table with the columns Decision, Who, Cost if wrong, copy decisions first; `column.md:50` and `:89` read this heading. 7 one screenshot per screen the plan's Screens section lists, from `findings/render/`. 8 tickets opened. 9 `rejected` findings, each with the line cited. 10 questions that should have been asked earlier, the `## Parked` lines of `state.md` that carry a miss, each with its check.
  - Every item reads a file, so a session that did not run the battery can write the summary. `battery.md:84`'s `state.md` line records `LSP: not used` beside each lens that returned it, and item 4 reads that line. The `## Decisions` line at `SKILL.md:105-106` becomes `<date> <decision> · <who> · <cost if wrong>`, written when the decision is made, and `implement.md:61` has the conductor write one per plan deviation the implementer returns. Item 6 reads `## Decisions` plus this run's `## Adjudications` lines that items 2 and 9 do not already hold.
  - The battery line, the Trade-offs bullet, the open-disputes bullet and the device QA caveat at :24-29 go. `merge.md:38` reads "stop and report" where it says "stop and ask".
  - The run ends in this order. `board.sh status <n> "Awaiting Human"`. The summary written to `~/.ship/MoneyApp/queue/ship-<n>-summary.md`, by every run. The screenshots sent with `SendUserFile`. The summary as the run's last message. Nothing is posted on the issue or the PR. No run merges, approves a review or turns on auto-merge.
  - A message in the task after the summary, or a PR comment, review or review comment created after that file's last write, is a finding of a new triage. A resume at phase 5 reads them first. Before phase 5 overwrites the file it reads again for anything newer than the previous file's last write, and one not yet triaged goes through phase 3 first. Then `board.sh status <n> "In Review"`, the lease written whole before the next dispatch (`skill=ship`, `worktree=` the implementation worktree, `task=` kept when the lease is the run's own and absent otherwise), then phase 3. `SKILL.md:53` states the whole lease where it now says `worktree=`, and `triage.md:24` points there.
  - `column.md` § One pass gains a step after the board read at step 2 and before the candidates loop at step 3, for `/queue Planned`, so its actions and its hold counts come from that read. For each action at Awaiting Human with `pr.state` `OPEN`, a `state.md` on this machine and no lease, it reads the PR's comments, reviews and review comments created after the summary file's last write. With one or more it runs § Start on `ship-<n>`, counted toward `n` and held by Cap, Emulator slot, GraphQL budget, Host load and Measures only. `queue/SKILL.md:14` names the case.
- Test: `none`. Skill text.

### 7. A markdown-and-shell ticket gets the built-in code review at `low`
- Files: `.claude/skills/ship/SKILL.md` (Deep mode :140-148, `state.md` template), `.claude/skills/ship/references/battery.md:25`, `.claude/skills/ship/references/recheck.md:10`
- Change: the level is decided with deep mode at phase 2 entry and written to `state.md` as `review_level: low | medium | high`. It is `low` when every path on the `Size:` line of `issue.md` ends in `.md` or `.sh`. `low` holds with deep mode on, unless the header Flags are not `none`, and then it is `high`. Otherwise `high` in deep mode and `medium` out of it, as today. `battery.md:25` passes the recorded level. `recheck.md:10` passes `low` when `review_level` is `low`, else `medium` as now.
- Test: `none`. Skill text.

### 8. Device QA is the user's step when an epic or module closes
- Files: `CLAUDE.md` (:28, :48, :50), `.claude/skills/device-qa/SKILL.md` (:3, :10, :14-16, :53, :62, :63), `.claude/skills/emulator-verify/SKILL.md` (:14-17, :284, :310), `.claude/commands/qa.md` (:2, :5-12)
- Change: trigger 8 reads "Device QA by me, on real hardware, when an epic or module closes". `CLAUDE.md:48` says emulator verification is the check each `Verify emulator` ticket gets, and :50 says device QA builds from the primary checkout. `device-qa/SKILL.md` and `qa.md` describe a pass the user walks at that close, scoped to the screens the epic's or module's merged PRs changed, built from `main`, recorded as a `## Device QA` comment on the epic's issue, with no gate before a merge and no route back to an implementer. The template's verdict line at `device-qa/SKILL.md:53` and the mistakes row at :63 drop the route back too; a failed item is listed in the comment. `emulator-verify/SKILL.md` says its run is the per-ticket check and that fonts, shadows, gesture feel and performance wait for device QA at that close. `merge.md:27` already left in step 6.
- Test: `none`. Skill text.

## Non-goals
- The typed run's merge watch at `merge.md:31-36`, the lease's § Release at `queue/SKILL.md:38`, and § After the merge. MA-147 owns them.
- `column.md` § After 10 queued tickets, the figures of § Holds, § Permission rule and § Log. The summary holds the heading the measure reads, and the measure does not change.
- `.claude/skills/queue/references/asks.md`, and any line of `question-record.md` other than :3, :7 and the `Miss:` row.
- `.claude/agents/render.md` and battery charter D. The lens reports a rebuild and never builds.
- One screenshot per `Screen checks` row, and the one-seam trim listed as a decision. MA-149.
- `scripts/board.sh`, `scripts/board_page/`, and `queueOf` in `scripts/board_next.mjs`. The script queues no Awaiting Human action. The queue reads PR comments with `gh`.
- A device QA ticket, gate, board column or checklist change. `docs/adr/`, `docs/scopes/` and `docs/superpowers/` keep every line.
- Anything under `src/`. The size gate's figures.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `npm run lint` runs `scripts/validate-agent-assets.js`. Every repo path written in a `.claude/` file or `CLAUDE.md` must exist or carry a placeholder, and the phrases at its :202 fail any tracked `.md`.
- After step 8, `git grep -nE "before any merge of a UI change|Gate 3 is the user|a dispute or a cap|pulls the top Planned row|pull the next ticket off the board|go to the human|stop and ask" -- . ':!docs/scopes' ':!docs/superpowers' ':!docs/adr' ':!.work'` prints nothing. At `d5b6417a` it prints 13 lines.

## Risks
- "The run ends at Awaiting Human" is read as the last board move a run makes. If the typed run's merge watch must go too, `merge.md:31-36` and `queue/SKILL.md:38` change and the plan is amended.
- `column.md:88-89` counts the rows under `## Decisions the ticket or plan did not state` as "questions that should have been asked earlier", and the ticket gives that name to the summary's last item. This plan puts the heading on item 6 and leaves the measure alone, so the two names disagree until someone rules which rows the measure counts.
- The four ends leave ledger, FP and refuted closures in place. Read strictly, the Acceptance line allows none of them.
- A change the user asks for after cycle 4 has no cycle left and ends `not fixed` or as a ticket. The ticket states no other rule.
- The parent `stays` change in step 1 is not named by the ticket. Without it a parked child's parent reads as drift with a command that moves it back.
- SendMessage reaches an implementer only inside the session that dispatched it. A run resumed by `/queue` starts cycles 1 and 2 with a fresh implementer.
- The `Miss:` line name and the `build held` return are this plan's choices. MA-149 or a later reader of the record may expect another name.

## Self-assessment
Step 6 is the one I am least sure of. The ten items and their order come from the ticket, but three things around them are my reading. The queue's measure heading goes on item 6 because its three columns match that item's words. The typed run keeps its merge watch because the post-merge list is MA-147's. The queue resumes an Awaiting Human ticket past the Overlap and No progress holds, which would otherwise hold it against its own open PR and its own last log line. `column.md` was written after the ticket's Context, so none of the three has a ticket line behind it.
