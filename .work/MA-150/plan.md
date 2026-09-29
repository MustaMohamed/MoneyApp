# MA-150 — Ticket body sections and review checks
base: 924f008b · verify: none · flags: none · expected diff: ~64 lines

Line numbers are counted at `924f008b`. Three differ from the ticket's Context: the trim's `$REST` is `prep/SKILL.md:60`, the Verify bullet is `CLAUDE.md:48`, the Team paragraph is `CLAUDE.md:54`.

## Steps
### 1. The ticket standard holds Copy, Screen checks, Decisions, Consumes and Produces
- File: `.claude/skills/tickets/references/ticket-body.md` (line 3, template lines 17 to 27, header table line 36, filled example header line 45 and lines 60 to 75, Context example lines 81 to 87)
- Change: the template gains three headings between Rules and Links, in this order, each filled or `none`.
  - `## Copy`: one bullet per string the task adds or alters, verbatim, with its singular, plural and zero forms.
  - `## Screen checks`: one bullet per row, `<features file> · <state> · <risk mark or none>`. The file is a name under `.claude/skills/emulator-verify/features/`, the state is a name from its States table or a name followed by `new`, and the row copies nothing else from that file. The five risk conditions are listed as the ticket's Acceptance lists them. A migration ticket has one row, the upgraded database opening on the first screen. `/tickets` and `/boundaries` write `none`; `/issue-review` writes the rows.
  - `## Decisions`: one bullet per answer, `<yyyy-mm-dd>: <question>; <option chosen>; <who chose>; <step>`.
  - Rules reads as product rules. Context gains a `Consumes` bullet and a `Produces` bullet, the contracts with sibling tickets, before the `Size:` bullet, which stays last. One sentence says no section other than Context holds a bullet starting `Size:`.
  - Line 3 gains the scope rule: the new sections apply from a ticket's next `/issue-review`, and a body at Ready For Development or later without them is neither a delta nor rewritten.
  - Header table, Verify: `emulator` when the task changes what a screen shows, and on a body with `Screen checks`, if and only if that section has a row, binding from the first `/issue-review`. A write is asserted by a repository test.
  - The MA-015 example gains the three sections: Copy with the empty-state strings, Screen checks rows on `accounts_list.md` with states from its table (`populated, all five types`, `no accounts at all`), Decisions `none`. Its header at line 45 reads `Reviewed` with a date, and one sentence above the example says it is the body after its first `/issue-review`, since a body as `/tickets` writes it has Screen checks `none`. The MA-013 Context example gains `Consumes` and `Produces` bullets above its `Size:` bullet.
- Test: `none`. No test reads these markdown files; `npm run lint` runs `scripts/validate-agent-assets.js` over the file.

### 2. `/tickets` and `/boundaries` write the new sections
- File: `.claude/skills/tickets/SKILL.md` (step 3 line 25, `--rewrite` line 35); `.claude/skills/boundaries/SKILL.md` (lines 9, 28, 29, 32)
- Change: `tickets/SKILL.md:25` drafts Copy from the parent's rules and the scout's strings or `none`, Screen checks `none`, Decisions `none` or the parent's dated rulings that bind the task, Context with `Consumes` and `Produces`; its Verify clause drops "or what the app writes". Line 35 writes the new sections on a child at Todo or Defined, keeping an existing Context. `boundaries/SKILL.md:9` names Copy and Decisions among what a task locks; line 28 sends a task's answer to Acceptance or Rules plus one Decisions line per `ticket-body.md`, and a string to Copy; line 29 adds the Decisions line for a spike's answer on a task; line 32 writes Screen checks `none` at the lock.
- Test: `none`. Markdown, no test layer.

### 3. The reviewer charter walks states, checks copy and writes Screen checks
- File: `.claude/skills/issue-review/references/reviewer-charter.md` (inputs line 5, Self list lines 9 to 15, P4 line 22)
- Change: three checks after S6, tickets only.
  - **S7 States.** Each Acceptance line is walked through zero, one, many, negative, loading, failed, archived, deleted, other currency, font scale 2.0. A state the code can reach and no line covers is an `ask`, and each of its options carries the `Screen checks` row it adds.
  - **S8 Copy.** Every string the change adds or alters is listed and compared with `## Copy` and `src/constants/strings.ts`. A missing string or form is an `ask`, and each of its options carries the `Copy` bullet it adds.
  - **S9 Screen checks.** The rows are built from the code map and the features files, with risk marked by the five conditions, and returned as a mechanical delta with replacement text. A state the features file lacks is marked `new`.
  - Line 5 adds the features folder path to the inputs. P4 reads as the header table in step 1 does, and binds only a body that has `Screen checks`.
- Test: `none`. Markdown, no test layer.

### 4. `/issue-review` applies mechanical deltas without a gate and stops for an `ask` only
- File: `.claude/skills/issue-review/SKILL.md` (lines 3, 9, 29, 42, 44, 45, 46); `.claude/skills/issue-review/references/question-visuals.md` (line 11); `docs/workflow.md` (line 7)
- Change: `SKILL.md:44` drops **"Apply these deltas?"** and its "Anything but yes" sentence. A typed run shows the mechanical deltas as applied, then asks each open record and each `ask`; a run with none has no stop. Line 45 applies mechanical deltas in every run and writes one Decisions line per answer on a body that has the section, the step named `/issue-review`. On such a body, line 45 also writes the `Copy` bullet for an answer that settles a string and the `Screen checks` row for an answer that settles a screen state, in the same edit as the Acceptance or Rules bullet, and sets `Verify emulator` with the first row. Line 46's pass condition reads "every mechanical delta applied and every `ask` answered". Line 3's "edited on approval" and line 9's "One stop for the user" follow. Line 29 names the state walk, the copy check and Screen checks in the Self summary. Line 42 adds `.claude/skills/emulator-verify/features/` to the dispatch. `question-visuals.md:11` drops `Apply these deltas?` from the gate row. `docs/workflow.md:7` replaces "edit the bodies on my approval" with the same rule.
- Test: `none`. Markdown, no test layer.

### 5. Every site that writes an answer writes its Decisions line
- File: `.claude/skills/issue-review/references/question-record.md` (line 21); `.claude/skills/queue/references/asks.md` (line 28); `.claude/skills/prep/SKILL.md` (line 45); `.claude/agents/layla.md` (line 26); `CLAUDE.md` (lines 48, 54)
- Change: `into:` stays `Acceptance` or `Rules`. `question-record.md:21` says an answer also writes one Decisions line on each ticket it binds, when that body has the section. `asks.md:28` appends that line in the same `gh issue edit`, the question from `Asks:`, the option's letter and text, the user, and the step from `Asked by:` answered at `/queue asks`. An option that settles a string or a screen state carries, beside its `writes:`, the `Copy` bullet or the `Screen checks` row it adds, stated at `question-record.md:21`; `asks.md:28` writes that bullet or row in the same `gh issue edit` on a body that has the sections, and sets `Verify emulator` with the first row. `prep/SKILL.md:45` applies an answer to Acceptance or Rules, no longer Context, plus, on a body that has the section, the Decisions line with step `/prep`. On a body that has the sections, `prep/SKILL.md:45` also writes the `Copy` bullet for an answer that settles a string and the `Screen checks` row for an answer that settles a screen state, in the same `gh issue edit`, and sets `Verify emulator` with the first row. `layla.md:26` and `CLAUDE.md:54` keep the ruling under `## Rules` unchanged and have the main thread add its dated line under `## Decisions` on a body that has the section. `CLAUDE.md:48` drops "or what the app writes" and says a write is asserted by a repository test.
- Test: `none`. Markdown, no test layer.

### 6. The `/prep` trim carries the new sections
- File: `.claude/skills/prep/SKILL.md` (line 15, `$REST` and `$BODY` at line 60)
- Change: line 15 lists Copy, Screen checks and Decisions after Rules, and accepts a body reviewed before this task without them. Line 60: each `Screen checks` and `Copy` row moves to the part that holds its Acceptance line, and `Decisions` is copied to both. `$REST` carries every new section, filled or `none`. `$BODY` gains no section it lacked, and its Verify follows its remaining rows when it has `Screen checks`.
- Test: `none`. Markdown, no test layer.

### 7. `/ship` triage carries the new sections
- File: `.claude/skills/ship/references/triage.md` (lines 17 and 18 only)
- Change: line 17, at each of its three sites that edit an open ticket's Acceptance, brings the site's `Screen checks` and `Copy` rows when that body has the sections, and sets `Verify emulator` with the first row. Line 18's deferral body carries Copy, Screen checks and Decisions, each filled or `none`, Screen checks as `/tickets` writes it.
- Test: `none`. Markdown, no test layer.

## Non-goals
- The `/prep` probe, the plan's Screens section from `Screen checks` rows, the merge summary's screenshot per row, the plan format and the trim rule by seams: MA-151. `prep/references/planner-charter.md` and `prep/references/reviewer-charter.md` stay untouched.
- The record's fields and parking: MA-146. `question-record.md` changes at line 21 only.
- `triage.md` lines 16 and 19: MA-148.
- `scripts/board.sh`, `scripts/board_next.mjs`, anything under `src/` or `__tests__/`.
- `splitting.md:43` and `sizing-charter.md:12`, which key on `Verify emulator`.
- Rewriting any open ticket's body to add the sections.
- A `Frame` column or a "cost if wrong" field from the design notes; the ticket's Acceptance names the fields.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- After step 5: `git grep -c "what the app writes" -- .claude CLAUDE.md` prints nothing, 4 files at base.
- After step 4: `git grep -c "Apply these deltas" -- .claude docs/workflow.md` prints nothing, 2 files at base.
- After step 1: `grep -c "^## Screen checks" .claude/skills/tickets/references/ticket-body.md` prints 2, 0 at base.
- After step 7: `git diff 924f008b -- .claude/skills/ship/references/triage.md` shows two changed lines.
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A bare features file name in a `Screen checks` row passes `PATH_REF`; a row written as a full `.claude/...` path with a `new` file would fail `npm run lint`.
- Step 5 removes Context as a target at `prep/SKILL.md:45`, following the Acceptance line; a gap that states a code fact then lands in Rules.
- Steps 6 and 7 let a trim or a triage edit change `Verify` on a body at Ready For Development, derived from the if-and-only-if line; the ticket does not state it.
- The Copy forms and the meaning of `Consumes` and `Produces` come from the design notes linked under Links, sections 1 to 3, not from the ticket body.
- MA-151 rewrites `prep/SKILL.md` lines 45 and 60 after this; a merge of MA-151 first conflicts on both.
- The `layla.md` edit reaches subagents only after a session restart.
- Amended after review round 1: steps 4 and 5 write the `Copy` bullet or `Screen checks` row with an answer, since `asks.md:47` promotes with no second review (F1); step 1's MA-015 example reads as a reviewed body (F2).
- Amended after review round 2: step 5 conditions the Decisions line at `prep/SKILL.md:45`, `layla.md:26` and `CLAUDE.md:54` on a body that has the section (F1) and has `prep/SKILL.md:45` write the `Copy` bullet or `Screen checks` row (F2); step 3's S7 and S8 have each option carry its row or bullet (F3).
- The amended step 5 has a record's option carry its `Copy` bullet or `Screen checks` row inside the `Options:` line; records parked before this task carry none, and their answers write Acceptance or Rules only.

## Self-assessment
Step 1 is the one I am least sure about. The ticket fixes what a `Screen checks` row and a `Decisions` line hold, and leaves the separator, the wording of the five risk marks and the Copy bullet's layout to this plan. MA-151's probe reads those rows, so a format chosen here binds it. The ` · ` separator is chosen because a features state name such as `populated, all five types` holds a comma.
