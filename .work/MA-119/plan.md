# MA-119 — One render-suite rule that matches what PRs do
base: 10b1540f · verify: none · flags: none · expected diff: ~16 lines

Lines per file, added plus removed: `.claude/rules/tests.md` 4, `.claude/skills/prep/references/planner-charter.md` 4, `.claude/skills/prep/references/reviewer-charter.md` 2, `.claude/skills/ship/references/implement.md` 2, `.claude/skills/moneyapp-testing/SKILL.md` 2, `CLAUDE.md` 2. Six files, the ticket's `Size:` list, none missed.

The rule's name in every citation below is `.claude/rules/tests.md`, Render-suite policy. Step 1 keeps that bold label unchanged so the five citing files resolve to it.

## Steps
### 1. `tests.md` states the rule once, dated, and its placement line defers to it
- File: `.claude/rules/tests.md` (line 17, and the bold lead sentence of line 19 only)
- Change: the bold lead of line 19 keeps the label "Render-suite policy" and the M36 reference, reads "resolves audit M36, decided 2026-08-05, amended 2026-09-28" so the 2026-08-05 decision stays the subject of the sentence after it, and replaces "don't add to them" with the rule: a case may be added to an existing `.tsx` suite when an Acceptance line names render-only wiring, its style assertions bind to tokens or named constants, and no new `.tsx` file is created. "Keep the files" and "prune by reading" stay. Line 17 keeps `__tests__/`, `snake_case` and logic-only `.ts` for new files, and its second sentence says a new case in an existing `.tsx` suite follows the Render-suite policy below. Every sentence of line 19 after the bold lead stays byte-identical.
- Test: `none` · markdown; `npm run lint` runs `scripts/validate-agent-assets.js` over it (path references, trailing whitespace, banned phrases).

### 2. The planner charter cites the rule in both places
- File: `.claude/skills/prep/references/planner-charter.md` (lines 14 and 62)
- Change: line 14 replaces "no render tests" with "no new `.tsx` test file, and a case in an existing one only under `.claude/rules/tests.md`, Render-suite policy". Line 62 replaces "Logic-only `.ts` tests under `__tests__/`; no component render tests" with a sentence that keeps logic-only `.ts` for new files and cites the same rule for a case in an existing `.tsx` suite. The three conditions are not restated in either line.
- Test: `none` · markdown, covered by `npm run lint`.

### 3. The plan reviewer charter cites the rule
- File: `.claude/skills/prep/references/reviewer-charter.md` (line 16, check 4)
- Change: replace "no render tests" with the citation from step 2; "logic-only `.ts` under `__tests__/`" reads as the rule for new files. The three conditions are not restated.
- Test: `none` · markdown, covered by `npm run lint`.

### 4. The test-writer charter cites the rule
- File: `.claude/skills/ship/references/implement.md` (line 18, charter item 2)
- Change: "in `__tests__/` as a logic-only `.ts` file" becomes "in `__tests__/` as a logic-only `.ts` file, or as a case in the existing `.tsx` suite the `Test:` line names, under `.claude/rules/tests.md`, Render-suite policy". Items 3 to 6 of the charter stay byte-identical.
- Test: `none` · markdown, covered by `npm run lint`.

### 5. The testing skill's overview cites the rule
- File: `.claude/skills/moneyapp-testing/SKILL.md` (line 10, first sentence)
- Change: replace "no `.tsx` render tests" with "no new `.tsx` file; a case in an existing `.tsx` suite follows `.claude/rules/tests.md`, Render-suite policy". The rest of the paragraph stays byte-identical.
- Test: `none` · markdown, covered by `npm run lint`.

### 6. CLAUDE.md's structure line cites the rule
- File: `CLAUDE.md` (line 112, the `__tests__/` row of the fenced tree)
- Change: the row stays one line with its column alignment and reads: snake_case tests, new files logic-only `.ts`, `.tsx` suites per `.claude/rules/tests.md` Render-suite policy. "slated for cleanup" goes, because the 2026-08-05 decision already kept the files.
- Test: `none` · markdown; `scripts/validate-agent-assets.js` checks every path in this fence resolves.

## Non-goals
- Converting or deleting source-text assertions in any suite (MA-118).
- The list of partial relatives in line 19 of `.claude/rules/tests.md`, `filter_rail_usage` included. The mention is MA-118's by the user's ruling of 2026-09-28 (#587, MA-118 plan step 2). This plan edits the bold lead of line 19 and no other character of the line.
- The "They live in" list in line 24 of `.claude/rules/tests.md`. It does not contradict the rule, and no Acceptance line covers it.
- Recounting the figures in `.claude/rules/tests.md` (43 suites, ~105 interactions, 62 of 63). `find __tests__ -name "*.test.tsx" | wc -l` reads 41 at this base; the figure does not bear on the rule.
- Any line in `.claude/skills/ship/references/battery.md` or another review lens (ticket Rules).
- `docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md` and everything else under `docs/superpowers/` and `docs/scopes/`.
- An ADR. The ticket carries no Flag, and Acceptance places the decision's date in `tests.md`.
- Restating the three conditions outside `tests.md`. The five other files cite.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`, then `grep -rnE "no render tests|no component render tests|render tests\. |slated for cleanup|don't add to them" CLAUDE.md .claude/rules .claude/skills` returns nothing, and `grep -rn "Render-suite policy" CLAUDE.md .claude/rules .claude/skills` lists six files.

## Risks
- `.claude/rules/tests.md:19` is one physical line that three Planned branches edit. MA-117 step 3 renames `budget_copy_sheet_geometry` to `budget_copy_sheet.geometry`, MA-118 step 2 changes "four" to "three" and drops `filter_rail_usage`, and step 1 here rewrites the bold lead. The second and the third to merge get a textual conflict and resolve it by keeping every edit already on main and adding their own. After all three the line reads this plan's bold lead, "three have partial relatives", and the list `set_budget_sheet.hook`/`.state`, `budget_copy_sheet.geometry`.
- The `/ship` rebase of MA-119 never edits the list of partial relatives, in either merge order. If MA-118 or MA-117 merged first, the rebase takes the sentences after the bold lead as main has them. If MA-119 merges first, `filter_rail_usage` stays in the line until MA-118's PR removes it.
- MA-118 step 6 carries `Test: none` with the reason "`tests.md` forbids adding to a render suite" (its plan line 66), and its reason code W on line 10 reads "`tests.md` forbids a new render test". After MA-119 merges both are false where an Acceptance line names the wiring. MA-118's Acceptance forbids a source change and adds no case, so its steps stand, and its reviewer reads the reason against the new rule.
- MA-117 (plan line 31) and MA-106 (plan line 30) cite `tests.md` for "no new render test" and for M35. Both stay true under the rule. No action.
- MA-092, MA-125 and MA-106 share no file with this plan. Each names `CLAUDE.md` only as the source of the CI parity chain and edits none of the six files.
- The `/prep` and `/ship` conductors paste the charters into dispatches. A session that read a charter before this PR merged keeps the old text until it reads the file again.
- A seventh statement of the placement rule added on main before this merges would not cite the rule. The grep in Verification finds the known wordings only.
- Amended 2026-09-28 on the user's ruling that MA-118 owns the `filter_rail_usage` mention on `tests.md:19` (MA-118's plan amended at `e192cc6f`). The Non-goal, the two Risks on line 19 and the Self-assessment no longer assign the mention to MA-119 or to its rebase, and the reference to MA-118's plan line 65 reads 66. No step and no figure in the header changed.

## Self-assessment
Step 1 is the least sure. The rule shares a physical line with the evidence sentences that MA-117 and MA-118 edit, so the plan confines the edit to the bold lead and leaves the rest byte-identical. Three branches still conflict on that line, and each resolution depends on the person rebasing keeping the edits already on main. The other uncertain point is "render-only wiring": the ticket uses the term without defining it, and the plan carries it into `tests.md` as written, next to the existing "render→handler binding" sentence, without adding a definition.
