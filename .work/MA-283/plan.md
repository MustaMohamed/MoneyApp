# MA-283 — Land the commitments audit changes
base: fadaa567b5179badff1027309d45b97250a74403 · verify: none · flags: none · expected diff: ~110 lines

Every path below is under the repo root unless it starts `~/`. A skill or rule line is one long markdown line, so a reworded paragraph counts once.

## Steps
### 1. The render lens reads the implementer's evidence, and both read a cut of each features file (pass evidence, named rows)
- File: `.claude/skills/ship/references/implement.md` (task layer `:32`, charter item 8 `:64`, `:66`, return `:69`); `.claude/skills/ship/references/battery.md` (render lens dispatch `:25`, charter D items 1, 2 and 6 at `:73`, `:74`, `:78`); `.claude/skills/ship/references/returns.md` (`:9`); `.claude/agents/render.md` (`:3`, `:7`, `:12`); `.claude/skills/emulator-verify/features/README.md` (§ The rule `:13`, § File shape `:20`, § Invariant pass `:72`); `.claude/skills/ship/SKILL.md` (Artifacts tree `:78-87`)
- Change:
  - Features cut, defined once at README `:13`: the conductor writes `~/.ship/MoneyApp/MA-XXX/features/<screen>.md` per features file, holding its `Reach it`, `Outbound` and `Gotchas` sections whole, its `Seeding and forcing states` section whole where the file has one (rows cite it for their seed, `commitments.md:28`, `:34`), the `States` table header and the rows whose state the plan's Screens list names, and the lift row the pass's sheet line reads (README `:79`, e.g. `edit, reach and lift` in `transaction_form.md:49`); force and proof stay in each row. Neither the implementer nor the lens gets the whole file. A state the plan's Screens names with no row in the cut reads `unread`, as `:72` reads an unnamed `device` line.
  - Proof cell, README § File shape `:20`: one sentence added, a proof cell holds assertions only: no ticket ids, history or reasons; force and proof stay in the table (Rules, conductor's cut).
  - Timing (Rules: conductor's cut): before P1 for each file of the plan's Screens (implement.md `:32` names the cut paths beside the Screens section); before the battery, every file on the `screens:` Log line is cut again from the pushed head in the implementation worktree, not only the new files (battery.md `:25`), so a row the PR adds reaches the lens. The implementer reads a state whose row a plan step adds (README `:11`, `:12`) from that row as the step commits it. A screen the implementer adds to its screens list from a shared-component importer (`:66`) is read for its `Reach it`, `Outbound` and `Gotchas` sections and the lift row its sheet line reads (README `:79`). SKILL.md's Artifacts tree gains the `features/` line.
  - Charter item 8 (implement.md `:64`): "The walk is the recipes from `emulator-verify/features/<screen>.md`" becomes the recipes from the cut paths in the dispatch; a state the implementer meets that the file lacks still goes into the features file in the commit.
  - Evidence (implement.md `:66`): the pass runs at a committed head; for each screen it records, its box read (`mqa bounds '~'`) and `mqa shot` at each viewport are saved under `findings/render/` as `<features stem>-<sha7>-v<k>.bounds.txt` and `.png`, `<sha7>` that head; a fix commits and re-shoots. `:69`: the `## Invariants` section lists those paths per screen. The 15-line return gains no line. The size-gate clause of `:66` (`expected diff` plus the fix's estimate) stays as it is.
  - Lens (battery.md `:25`): the dispatch adds the `invariants:` Log line(s) verbatim, the implementer's report path with its `## Invariants` range from `grep -n '^## ' <report>`, unopened, and the cut paths. Charter D item 1 (`:73`): the evidence at that range is what item 6 reads; for the plan's states the shots stay the claim tested. Item 2 (`:74`): recipes come from the cut. Item 6 (`:78`): reads each screen's evidence against the list's `device` lines as § Invariant pass judges a walked screen, then walks only, among the first eight of `screens:`, each screen recorded with an `unread` node, each with no evidence named by the battery's head sha, and one recorded screen of its choosing; a finding read from evidence is reported as a walked one, its evidence path as the screenshot path, `blocking` as today. The plan's states (items 2 to 5) are still walked.
  - returns.md `:9`: the implementer's `## Invariants` range goes to the render lens by path, unopened, beside the two hand-offs it already names.
  - render.md `:3` description and `:7` dispatch list name the evidence, the `invariants:` line and the cut; `:12` takes recipes from the cut and README § Invariant pass, never the whole file.
  - README `:72`: the pass's paragraph names the evidence the implementer saves and the lens's read-then-walk-the-gaps; it keeps "runs on every `Verify emulator` ticket, at implement and at the battery" and the trigger-2 sentence.
- Test: `none` · skill and agent prose; `npm run lint` (`scripts/validate-agent-assets.js:104-129`) checks every cited repo path.

### 2. /prep counts a plan at 1.25 times its estimate, and the merge summary flags a Delivered figure over 400 (size check)
- File: `.claude/skills/prep/SKILL.md` (step 7, `:101`; step 8 reply `:117`; Rules `:122`); `.claude/skills/prep/references/planner-charter.md` (Size bullet `:20`); `.claude/skills/prep/references/reviewer-charter.md` (check 7 `:19`); `.claude/skills/tickets/references/splitting.md` (`:22`, `:34`); `.claude/skills/ship/references/merge.md` (item 4 `:39`)
- Change:
  - prep `:101`: the figure goes through one more stage, `| awk '{print $1 * 1.25}'`, its comment `over 400 trims; no figure (no output) trims too`; the step count line `:100` stays. Reply `:117`: "the step count and expected diff from step 7's two counts" becomes the step count, the header's `expected diff` and the counted figure, `expected diff` × 1.25. Rules `:122`: the plan's ~400 changed lines outside tests are its `expected diff` × 1.25, as step 7 counts it.
  - planner `:20` and reviewer `:19`: the summed estimate is multiplied by 1.25 before it is held against ~400; the header's `expected diff` stays the unmultiplied sum, which step 7 multiplies. The planner bullet cites the merge summary's Delivered flag (merge.md item 4) as the check on its estimate; the flag opens no ticket.
  - splitting.md `:22`: every step counts the gate the same way except `/prep`, whose planner, reviewer and step 7 hold `expected diff` × 1.25 against ~400. `:34`: the 1.35, 1.64 and 56-plan figures give way to 1.25 at the median over the 51 commitments tickets; the "gate working" sentence goes; the 111k and 168k per-line figures stay. The 400 gate, the `Size:` line, `promote`, `scripts/board.sh:76` and `scripts/board_next.mjs:239` do not change.
  - merge.md item 4: the `Delivered:` line of `node .claude/skills/ship/scripts/pr_size.mjs <pr>`, flagged `over 400` with `planned ~<n>` from the plan header beside it when its lines outside tests pass 400; `none` otherwise.
- Test: `none` · skill prose. The implementer runs the new pipe once on a scratch file holding `expected diff: ~320 lines` and once with `~321` and reads `400` and `401.25`.

### 3. An epic carries a Reuse table that tickets copy and review checks (reuse map)
- File: `.claude/skills/epic/references/epic-body.md` (`:3`, template `:11-15`); `.claude/skills/boundaries/SKILL.md` (`:9`, code scout `:21`, lock `:28`); `.claude/skills/tickets/SKILL.md` (step 3 `:25`); `.claude/skills/tickets/references/ticket-body.md` (Context, between `:39` and `:40`); `.claude/skills/tickets/references/splitting.md` (prelude `:18`); `.claude/skills/issue-review/references/reviewer-charter.md` (S4 `:13`); `docs/workflow.md` (`:7`)
- Change:
  - epic-body.md: `:3` says seven sections; the template gains `## Reuse` after `## Building`, a table `| Screen | Shared pieces | Path | Owner |`, one row per screen, Owner a Building line or a prelude ticket that changes the piece first, and `none` for an epic with no shared piece. Template paths are placeholders (`<path>`) so lint does not resolve them.
  - boundaries `:21`: the code scout also reports the shared pieces each screen takes from `src/components/ui/` and earlier modules; `:28`: the epic lock writes the Reuse table from that report; `:9` names Reuse among an epic's locked sections.
  - tickets `:25`: Context copies the epic's Reuse row for each screen the task owns as a `Reuse:` bullet above `Size:`; ticket-body.md adds the bullet's line in that position (`Size:` stays last).
  - splitting.md `:18`: a prelude is also allowed for a shared piece one screen must change before another screen's task can take it; it names the ticket that consumes it.
  - reviewer-charter.md S4: an epic body with no `## Reuse` section is a mechanical delta.
  - workflow.md `:7`: the epic's locked sections list gains Reuse after Building.
- Test: `none` · skill prose; lint.

### 4. /ship has no conductor budget, and one mode with its reason (conductor budget, fix lane)
- File: `.claude/skills/ship/SKILL.md` (`:17`, `:68`, `:70-72`, `:112`, `:115`, `:130`, `:196`); `.claude/skills/ship/references/merge.md` (`:26`, `:39`, `:85`)
- Change: § Conductor budget (`:70-72`) is deleted with every `conductor:` mention: the resume's call-count clause (`:17`), the two example Log lines (`:112`, `:115`), the Log list's mention (`:130`), park step 4's tail (`:196`), merge step 3's first clause (`:26`), item 4's last sentence (`:39`) and the checklist clause (`:85`). `:68` keeps "no fast lane and no mode" and adds the reason: a fix line costs 101k tokens, 1.2 times a feature line, and 2 of 14 fix tickets sat under 60 lines. After the step, `git grep -n 'conductor:' -- .claude` prints nothing.
- Test: `none` · skill prose; the grep above is the check.

### 5. /ship writes undecided decisions onto the ticket and frame rulings beside the canvas; every frame reader applies them; device QA redraws (write-back)
- File: `.claude/skills/ship/references/merge.md` (step 2 `:25`, `:32`, item 6 `:41`, new § Write-back after § Present for merge, checklist `:86`); `.claude/skills/tickets/references/ticket-body.md` (Decisions `:27`); `.claude/skills/device-qa/SKILL.md` (new step 4 after `:16`); `.claude/commands/qa.md` (new step 5 after `:10`); `.claude/skills/boundaries/SKILL.md` (step 1 `:19`); the frame readers: `.claude/skills/ship/SKILL.md:177`, `.claude/skills/ship/references/implement.md:64`, `.claude/skills/ship/references/battery.md:76`, `.claude/skills/issue-review/SKILL.md:42`, `.claude/skills/issue-review/references/reviewer-charter.md:28`, `.claude/skills/issue-review/references/children-lens.md:13`, `.claude/skills/issue-review/references/question-visuals.md:30`, `.claude/skills/issue-review/references/question-record.md:23`, `.claude/skills/prep/SKILL.md:59`, `:63`, `:80`, `.claude/skills/prep/references/planner-charter.md:19`, `.claude/skills/prep/references/reviewer-charter.md:20`, `.claude/skills/emulator-verify/features/README.md:20`
- Change:
  - merge.md § Write-back, run as step 2 before `board.sh status <n> "Awaiting Human"` (no renumbering; `battery.md:17` cites step 4):
    - Decisions: each row item 6 would print becomes `<yyyy-mm-dd> · <Decision> · as built · <Who> · /ship` under the ticket body's `## Decisions`, replacing `none`; a row whose Decision the section already holds is skipped, so a resumed phase 5 writes nothing twice. One `gh issue view <n> --json body --jq .body` to a file under `~/.ship/MoneyApp/MA-XXX/`, edited, one `gh issue edit <n> --body-file`. A body with no `## Decisions` gets nothing. No written line starts `Delivered: ` (`:71` keys on it).
    - Rulings: for each written row that changes what a frame shows, one line appended to `~/.ship/MoneyApp/canvas/rulings.md` (created when absent): `- <yyyy-mm-dd> · <canvas> · <frame id> · <ruling> · MA-XXX (#<n>) · undrawn`. An `undrawn` line overrides its frame for every step that reads the frame until device QA redraws it and rewrites `undrawn` as `drawn <yyyy-mm-dd>`; two undrawn lines on one frame that differ, the later date wins. No Artifact publish and no frame redraw inside a /ship run.
  - merge.md `:32` and checklist `:86`: nothing is posted beyond the PR body edit of step 4 and the ticket body edit of § Write-back. `:41` unchanged in content; § Write-back reads its rows.
  - ticket-body.md `:27`: Decisions admits the /ship as-built line beside answers and parent copies.
  - Each frame reader above gains one clause: the frame is read with its `undrawn` lines in `~/.ship/MoneyApp/canvas/rulings.md` applied, per `.claude/skills/ship/references/merge.md` § Write-back.
  - device-qa step 4, after the record: redraw every frame with an `undrawn` line, republish each canvas changed, refresh its local copy under `~/.ship/MoneyApp/canvas/` where one exists, and mark each line drawn. qa.md step 5 says the same in one line.
  - boundaries step 1: on an epic whose screens have a canvas, report each `undrawn` line on that canvas before the first question.
- Test: `none` · skill prose; lint.

### 6. The milestone sheet holds first lines and Decisions; the review lenses read the backlog (load cuts)
- File: `.claude/skills/issue-review/SKILL.md` (step 1 `:37`); `.claude/skills/issue-review/references/reviewer-charter.md` (`:5`); `.claude/skills/issue-review/references/children-lens.md` (`:5`); `.claude/skills/ship/references/battery.md` (item 4 `:20`, charter B item 3 `:50`, charter C opening `:60` and item 1 `:62`)
- Change:
  - `:37`: the `gh issue list` command keeps `--json number,title,labels,state,body` and adds `--jq '.[] | {number, title, labels: [.labels[].name], state, first: (.body | split("\n")[0]), decisions: ([.body | split("\n## ")[] | select(startswith("Decisions\n"))][0] // "none")}'`, so no full body enters the sheet.
  - reviewer-charter `:5` and children-lens `:5`: the sheet's fields read "header line and `## Decisions` lines".
  - battery `:20`: the benchmark inputs are `docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md` and `.claude/rules/review.md`; the audit `docs/superpowers/reviews/2026-07-29-full-technical-audit.md` is read only by `grep -n '<ID>'` for an ID the backlog lacks (H14, M42, L27 and M25 today). `:62` cites IDs from those two files, the audit by the same grep. Charter B item 3 (`:50`) and charter C's opening (`:60`) name the same benchmark inputs in place of "the audits", the audit by `grep` only.
- Test: `none` · skill prose. The implementer runs the `--jq` filter once through `jq -c` on a two-issue JSON array in its scratch space, one body with `## Decisions` between two sections and one without, and reads the section text and `none`.

### 7. The invariant list has line 11, the local day boundary (day boundary)
- File: `.claude/skills/boundaries/references/invariants.md` (Marks `:5`, after line 10 at `:16`); `.claude/rules/state.md` (after rule 5 at `:24`)
- Change:
  - `:5`: a line carries one mark or two.
  - Line 11, before `## Commitments count`: a preview that shows a figure derived from today recomputes when the local day changes while its screen or sheet stays open. `grep` `test` · `.claude/rules/state.md` rule 6 · `git grep -nE 'new Date\(\)|toLocalDateString\(' -- <files>`, each hit reads the day through `useLocalToday` (`src/utils/use_local_today.hook.ts`) or `useLocalDayChange` (`src/utils/use_local_day_change.hook.ts`) or is a write-time stamp · suites `__tests__/use_local_today.hook.test.ts` and `__tests__/use_local_day_change.hook.test.ts`, plus a midnight case in the hook suite of any preview a ticket adds, as `__tests__/screens/commitments_pay_sheet.hook.test.ts:2057` does. No `device` mark; lines 1 to 10 unchanged.
  - state.md rule 6 under the heading at `:16`: the same rule in one line, citing `docs/adr/2026-10-21-derived-payment-state.md:18`.
- Test: `none` · rule prose; the two suites it names exist at base.

### 8. No test compares a `Strings` value with its own text (copy mirrors)
- File: `.claude/skills/ship/references/implement.md` (test-writer charter item 2 `:18`); `.claude/rules/tests.md` (new bullet after `:13`); the 27 suites of the ticket's Grep bullet
- Change:
  - Bar, in both files: no test compares a `Strings` value, a member or a call of one, alone or inside an object or array literal, with a literal of its own text by `toBe` or `toEqual`. In tests.md the bullet also says a mirror block is deleted whole and a block that asserts something else loses only the mirror assertion, so the pruning sentence at `:27` does not apply to it.
  - Deletion, `owned by implementer`: first `npm test -- --ci > .work/MA-283/count.log 2>&1; grep -E '^Tests:' .work/MA-283/count.log`. Then run the Grep bullet's command and read each hit's `expect(…)`. A hit is a mirror when the expect's subject is a `Strings` member or call, alone or in an object or array literal, and the `.toBe(`/`.toEqual(` argument is a literal with no `Strings`; an `it.each` table whose every row is one goes whole. Not mirrors: `.not.toMatch` (`account_detail_archived.strings.test.ts:28`), and an expect whose subject is another function taking a `Strings` value as input, as Context excludes `accounts_list.reorder.test.ts:112` (so `edit_account.helpers.test.ts:122` stays, the resolver's routing). Mixed blocks lose the mirror line only (`onboarding_welcome.geometry.test.ts:50`). A file left with no test is removed with `git rm`; an import left unused goes. The same count again; the commit body carries `Tests: <before> before, <after> after`. No non-test file cites a full path of any of the 27 suites (checked at base).
- Test: `none` · owned by implementer; the step deletes tests and adds none. After it, the Grep command's hits read as non-mirrors only, and `npm test -- --ci` is green.

## Non-goals
- No change to `scripts/board.sh`, `scripts/board_next.mjs`, `.claude/skills/ship/scripts/pr_size.mjs`, `scripts/validate-agent-assets.js` or the 400-line gate itself.
- No change to `expected diff` in `implement.md:66`'s fix allowance or `triage.md:16`.
- No bulk rewrite of the 19 features files; no edits to any features file in this PR.
- No change to invariant lines 1 to 10, question records, one-round /prep, `/queue`.
- No fix lane, no second /ship mode, no conductor budget at any figure.
- No Artifact publish or frame redraw; `~/.ship/MoneyApp/canvas/rulings.md` is not created by this PR.
- No mirror replaced by a behavioural assertion; the #904 double read and the six revert-proof tests are their own tickets.
- No app code under `src/`.

## Untested inputs
- The jq projection on a body whose `## Decisions` is the last section, and on a body with an empty Decisions section (step 6).
- `expected diff` at exactly 320 (passes, 400) and absent (no output, trims) (step 2).
- Evidence named by a sha older than the battery head, e.g. after the `after` test commit (step 1).
- A rulings file with two `undrawn` lines on one frame (step 5).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- After step 4: `git grep -n 'conductor:' -- .claude` prints nothing. After step 8: the Grep bullet's command lists no mirror.

## Risks
- Step 1, literal "evidence at the battery's head sha": an `after` test commit moves the head past the implementer's evidence, so on a ticket with `after` cases the lens walks every screen, as today.
- Step 8: `edit_account.helpers.test.ts` and possibly helper suites keep every test, since their hits compare resolver output; a reviewer reading the 27-site list as 27 deletions will flag it. Rules (mirror bar) and Context's `accounts_list.reorder.test.ts:112` exclusion settle it.
- Step 8 changes `__tests__/` only by deletion; the implementer's charter bars test edits except `owned by implementer`, which this step is.
- Conductor duties no step carries: the merge summary names CLAUDE.md critical trigger 2, says to restart the session before the next /ship (`.claude/agents/render.md` changed), states the test counts from step 8's commit body, and names any lease in `~/.ship/MoneyApp/queue/leases` other than its own, merging only when there is none; the two `Part of none` Todo tasks are already open as #928 (MA-284, the #904 double read) and #929 (MA-285, the six revert-proof tests), so the conductor opens no issue and the merge summary's item 8 lists both.
- /queue runs read skills from the primary checkout; the post-merge pull changes them under a live run.

## Self-assessment
Step 1 is the one I am least sure of. The ticket fixes what the lens reads and walks, but its timing words, "evidence at the battery's head sha", collide with the `after` test writer's commit, which lands between the implementer's shots and the push; the plan keeps the literal reading and lists the cost. The second soft spot is step 8's mirror test on the helper suites: the ticket's Context counts `edit_account.helpers.test.ts` as a site, while its Rules define a mirror as a `Strings` value compared with its own text, and the one grep hit there compares a resolver's output. I followed the Rules.
