# MA-229 — The whole-screen invariant pass at implement and at the battery, and the class ticket's shape
base: 70a1b93e · verify: none · flags: none · expected diff: ~44 lines

## Steps
### 1. features/README.md carries the invariant pass, and the walk-size guidance puts the pass outside its count
- File: `.claude/skills/emulator-verify/features/README.md` (a new **Invariant pass** template paragraph after the Band proof at `:68`, before the Toast fade proof at `:70`); `.claude/skills/emulator-verify/SKILL.md` (`:161-163`, "Four is a normal size"; the `Going wide` row at `:347`)
- Change: the template names the invariant list, `.claude/skills/boundaries/references/invariants.md`, and its `device` lines 3, 4, 5 and 8 (`invariants.md:9-11`, `:14`), and holds, in recipe order:
  - (a) the `Font scale` force (`:57`) at 2.0 and its cold launch, then `mqa wait` on a node the screen draws from its data (SKILL.md:177-180);
  - (b) on each screen, after its `Reach it` (an `mqa open` or a tap that navigates), `mqa wait` on a node the screen draws from its data before the first read (SKILL.md:177-180); then at each viewport, `mqa read '~'` for every labelled node's box, since no screen root carries a testID (`:16`) and `~` with an empty substring matches every node, so the scope is the snapshot's first node (`mqa.sh:768`, `:840-842`); `mqa bounds` on each pressable, the pressables being the nodes the unscoped `mqa read` lists at that viewport, less `field` and `scroll`, since the unscoped read takes the interactive-only snapshot (`mqa.sh:872`, `snap_file -i`); one `mqa shot`; then one `mqa scroll down`, `--in` the sheet's scroll view when the screen is a sheet (SKILL.md:345), repeated until a scroll leaves the read unchanged, the end the Clearance proof reaches (`:64`);
  - (c) each node judged at a viewport where its box reads whole, top and bottom inside the viewport, since a box at the edge reads shorter (SKILL.md:180-182) and one below reads at zero size (`mqa.sh:784`);
  - (d) the checks: line 3, each shot read for a text cut at an edge or an ellipsis that is not a whole `…`; line 4, no two text boxes overlapping by more than 1 dp, the Header proof's tolerance (`:66`); line 5, a pressable box under 44 dp high is a finding unless its source takes its slop from `touchFloorHitSlop` or `TouchSize.min` (`src/constants/theme.ts:280-282`, `:299-302`), and a Band proof row (`:68`), not the pass, proves that the slop takes the tap. An overlap counts only between two nodes the viewport's shot draws, and a pressable is judged only when the shot draws it, since the read keeps every labelled node inside the root's box with no visibility filter (`mqa.sh:844-845`) and keeps a closed sheet's and a popped screen's nodes (SKILL.md:184); two nodes with one label at one box are one node listed twice (`transaction_form.md:90`);
  - (e) each sheet the screens open, once in the run, on the first screen of the screens list that opens it: its lift read as its features file's lift row reads it (`transaction_form.md:49`, `:108`), and the sheet closed once by each Outbound row whose action the sheet carries (`transaction_form.md:80-86`), the shot after each close showing it gone, since `mqa bounds` keeps a closed sheet's nodes (SKILL.md:184); a sheet whose file has no lift row reports its lift `unread`, and one with no Outbound row of its own reports its close `unread`;
  - (f) a node the read cannot list, text a shot shows that the read lacks, or a node with no viewport where its box reads whole, is reported `unread`;
  - (g) `font_scale` back to 1.0 after the pass;
  - (h) the pass is not a Screen checks row, does not count against the render lens's four states, and adds no mqa verb: it uses the `Font scale` force, `read`, `bounds`, `shot` and the verbs the features files' `Reach it` and Outbound recipes already use; a ticket that changes the pass carries CLAUDE.md critical trigger 2 in its Rules;
  - (i) a screen the user can reach that the PR touches and that has no features file gets one before the pass shoots it, per § File shape (`:18-20`), with its `Reach it` and the States row the pass walks the screen in, and its § Files row.
  SKILL.md: one clause at `:161-163` and one in the `:347` row, each naming the invariant list and the invariant pass: the pass, at most eight screens, sits outside the four-scenario count and is not going wide.
- Test: none · docs only; no jest suite reads these files, and `npm run lint` (`scripts/validate-agent-assets.js`: path refs, trailing whitespace, certification phrases) is the check.

### 2. The implementer runs the pass on the screens list and returns `screens:` and `invariants:`
- File: `.claude/skills/ship/references/implement.md` (Fix dispatch `:39`, a new `Unwalked logged` bullet after Amend logged at `:49`, charter step 8 at `:63`, the return at `:66`, Exit `:70`); `.claude/skills/ship/references/returns.md` (return order `:5`, open list `:9`)
- Change:
  - Step 8's bold lead is rewritten in place, for example "Render pass and invariant pass, only when the header says `Verify emulator`: the plan's states, then the screens list." The step keeps the render pass on the plan's states and adds, inside the same numbered step with no renumbering, the invariant pass of `features/README.md` § Invariant pass on the invariant list's `device` lines, `Verify emulator` only, in the same walk, on the first eight screens of the screens list. The screens list: the screens the `Screen checks` rows name, or the plan's Screens on a body without that section, first and in that order; then each screen that mounts a shared component the PR changed, found by `git grep` on the component's import path, repeated on each importer until every chain ends at a screen's `index.tsx`; each named by its features file; a reachable screen without one gets one in this commit (step 1, item i). Each read and shot goes under the render findings path. A failing node in the PR's files is fixed in this PR, fast subset, re-shoot, while the plan's `expected diff` plus the fix's estimate stays within `splitting.md` § Size gate; over it, the node stays on the `invariants:` line and triage defers it.
  - Return `:66`: after `chain:`, on a `Verify emulator` ticket, `screens: <features file>, <features file>, …`, the whole list in its order, and `invariants: holds` or `invariants: <screen>: <node>[, <screen>: <node>]`, ending ` · unread <k>` when the pass reported any `unread`. The report gains `## Invariants`: per walked screen, each failing node with its box and shot path, each `unread` node, lift and close, and the read and shot paths.
  - Fix dispatch `:39`: a fix cycle re-runs the pass at the fix head on each screen a fixed node sits on, and returns its `invariants:` line again.
  - `Unwalked logged`, after `:49`: each screen past the eighth on the `screens:` line is a `state.md` Log line, `- <date> unwalked: <features file>`; phase 5 prints it.
  - Exit `:70`: the conductor writes the `screens:` line and each `invariants:` line, a fix cycle's included, as `state.md` Log lines of their own, in the order returned.
  - returns.md `:5`: the implementer's lines after `chain:` gain `screens:` and `invariants:` on a `Verify emulator` ticket. `:9`: the open list gains an `invariants:` line that names a node, the implementer's, at its `invariants` range; a line reading `holds`, with or without ` · unread <k>`, opens nothing.
- Test: none · docs only, as step 1.

### 3. `state.md` holds the three lines, and the merge summary prints the unwalked screens and the unread count
- File: `.claude/skills/ship/SKILL.md` (the `state.md` template's Log at `:107-112`, the own-lines sentence at `:127`); `.claude/skills/ship/references/merge.md` (item 7 at `:42`)
- Change: the template's Log gains, after the P1 line at `:108`, `- <date> screens: <features file>, …`, `- <date> invariants: holds | <screen>: <node>[, …][ · unread <k>]` and `- <date> unwalked: <features file>`. `:127` names the `screens:`, `invariants:` and `unwalked:` lines ([references/implement.md](references/implement.md) → Unwalked logged, Exit) among the lines that stay their own. Item 7 at `:42`, after the states not probed: each `unwalked:` Log line's screen, and the unread count of the last `invariants:` Log line when it carries one.
- Test: none · docs only, as step 1.

### 4. The ticket standard and the issue reviewer carry the pass and the class ticket's shape
- File: `.claude/skills/tickets/references/ticket-body.md` (Screen checks risk line `:24`, the Context bullets `:36-39`, the Verify row `:48`); `.claude/skills/issue-review/references/reviewer-charter.md` (S3b at `:12`)
- Change:
  - `:24` gains one sentence naming the invariant list and the invariant pass: the list's `device` lines are proven by the pass (`features/README.md` § Invariant pass) on every screen the PR touches, at implement and at the battery, so no row is written for them, and a `large font` row stays for the task's own states; a class ticket writes one row per screen state a site changes, `none` only when no site changes what a screen shows.
  - The Context template gains, before `Consumes:` at `:37`, the bullet `- Grep: <command> · <count> sites`, on a class ticket only: the command that lists its sites and what it returned, never in Acceptance. The labelled-bullet shape follows `Size:` at `:39`; CLAUDE.md lists naming as not critical.
  - `:48`: `emulator` also when a shared component the task changes alters what a screen that mounts it shows.
  - S3b `:12`: the class ticket the delta rewrites carries the `Grep:` bullet, one Acceptance line per site in outcome words, and one Screen checks row per screen state a site changes, `none` only when no site changes what a screen shows.
- Test: none · docs only, as step 1.

### 5. The render lens re-runs the pass at the battery, and the render agent's definition says so
- File: `.claude/skills/ship/references/battery.md` (render dispatch `:25`, charter D `:73-77`, its cap at `:74`, evidence rule `:79`, return `:81`); `.claude/agents/render.md` (description `:3`, dispatch line `:7`, rule 4 `:12`, rule 5 `:13`)
- Change:
  - `:25`: the render lens dispatch adds the `screens:` Log line of `state.md`, verbatim.
  - `:74`: the cap names the invariant list and the invariant pass: at most four states, the pass of the new item 6 outside the four; on a class ticket, one whose Context carries a `Grep:` bullet (step 4), every Screen checks row, the cap lifted.
  - A new charter D item 6 after `:77`: the invariant pass of `features/README.md` § Invariant pass, in the same walk, on the first eight screens of the `screens:` line, the ones the implementer walked; a failing node is `blocking`; for a pressable whose box reads under 44 dp the lens reads its source for a slop from `touchFloorHitSlop` or `TouchSize.min` before judging it.
  - `:79`: the `blocking` list adds a failing invariant node. `:81`: the report also holds the pass's result per screen and its `unread` nodes.
  - render.md `:3`: the description gains that the agent re-runs the invariant pass of the invariant list's `device` lines on the PR's screens, inside the quoted string. `:7`: the dispatch carries the `screens:` line. `:12`: the scenarios and the invariant pass are recipes copied from `features/<screen>.md` and `features/README.md` § Invariant pass. `:13`: grep the source also for the slop of a pressable whose box reads under 44 dp in the pass.
- Test: none · docs only, as step 1.

### 6. Triage sorts a failing invariant node and opens the class ticket in its shape
- File: `.claude/skills/ship/references/triage.md` (item 6: `blocking` at `:13`, Beyond this ticket at `:15`, the family check at `:17`, Deferral at `:18`)
- Change:
  - A new bullet after `:13`: a failing invariant-pass node, from the implementer's `invariants` range or the render lens: in the PR's files, the fix list while the recount per `splitting.md` § Size gate stays within the gate, a deferral over it; outside the PR's files, sorted as Beyond this ticket at `:15`, the fix list within the gate and the class ticket with its grep over it.
  - `:17`: a class ticket, new or re-scoped from an instance ticket, carries its grep command and count as Context's `Grep:` bullet (step 4), one Acceptance line per site in outcome words, and one Screen checks row per screen state a site changes, `none` only when no site changes what a screen shows; Verify follows the rows per ticket-body.md § Header line.
  - `:18`: "Screen checks `none`" holds except on a class ticket, whose rows the family check writes.
- Test: none · docs only, as step 1.

### 7. The workflow graph's implementer node names the list and the pass
- File: `docs/workflow-graph.html` (the `impl` node's `sub` at `:386`)
- Change: the three `sub` strings rewritten in place, still three, each at most 30 characters (the node is 170 wide, sub text 11.5 px), naming the render pass and the invariant-list pass on `Verify emulator` and keeping the 120-call budget the `tw1` node's "60 tool calls" (`:385`) and `.claude/skills/ship/SKILL.md:62` pair it with, for example `['plan → commits, 120 calls', 'Verify emulator: render pass', 'invariant-list pass, no push']`. `h` stays 80, so the `STOP` edge at `:412` and the `tw2` node at `:387` stay where they are.
- Test: none · a static page no suite loads; a browser look at the /ship panel.

## Non-goals
- The invariant list, /boundaries, /issue-review S3 and `docs/workflow.md:7`: MA-228 (#806), merged at 70a1b93e.
- The conductor budget, `returns.md` beyond the two implementer lines and the open-list entry of step 2, and `state.md`'s line set beyond the three lines of step 3: MA-225 (#803).
- Any device pass at /prep, and the planner, probe and reviewer charters: MA-226 (#804) and the parent's Not building.
- `mqa.sh` and any new mqa verb.
- Any features file but README: no `large font` row added or removed, no Outbound or lift row added to a sheet that lacks one.
- The graph's `/boundaries` node at `:266` and the /prep panel: MA-228 and MA-226.
- Renumbering implement.md's charter steps.
- The commitments close count: MA-230. A light-theme contrast check: #802 Not building.

## Untested inputs
- A screens list past eight screens: steps 2, 3.
- A screen the PR touches through a shared component only, and one with no features file: steps 1 (item i), 2.
- A sheet with no lift row, and a sheet that lives in its screen's file with no Outbound row of its own: step 1 (item e).
- A pressable under 44 dp whose slop comes from `touchFloorHitSlop` or `TouchSize.min`: steps 1, 5.
- An `invariants:` line with `unread` and no failing node, which opens no report: step 2.
- A class ticket whose sites change no screen, Screen checks `none`: steps 4, 6.
- A failing node in the PR's files past the gate, deferred: steps 2, 6.
- A failing node outside the PR's files, sorted to the fix list or the class ticket: step 6.
- A fix cycle's re-run of the pass at the fix head: step 2.
- A class ticket with more than four Screen checks rows at the lens: step 5.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-227 (#805) edits the conductor budget paragraph of `.claude/skills/ship/SKILL.md`; a rebase meets it there, apart from step 3's template lines.
- An edit to `.claude/agents/render.md` reaches only sessions started after the merge (CLAUDE.md agent snapshot); a /ship session open at the merge dispatches the old render lens.
- Most sheets live in their screen's features file (`transactions.md` Outbound `:111-118`) with no Outbound row of their own, so item e reports their close `unread` until a ticket adds the rows; `transaction_form.md:80-86` is the one sheet file whose Outbound rows are the sheet's closes.
- `mqa read '~'` scopes to the snapshot's first node; if that node is not the full window, nodes outside it read `unread`.

## Self-assessment
Step 1 item e is the step I am least sure of. The ticket reads a sheet's close paths from "its features file's Outbound table", and only `transaction_form.md` is a sheet with a file of its own; the filter, month picker, copy and category sheets live in their screen's file, whose Outbound rows are the screen's exits. I read the sheet's closes as the Outbound rows whose action the sheet carries, with none reporting `unread`, which follows the ticket's own `unread` rule and README:13's "Neither invents scenarios", but it means most sheets report their close `unread` on the first PRs the pass runs on.
