# MA-228 — The invariant list, written at the lock and checked at review
base: abcdd61cd37e7ea917fa39a1caa1561804c6373a · verify: none · flags: none · expected diff: ~32 lines

## Steps
### 1. The overlap line has a UI rule to cite
- File: `.claude/rules/ui.md` (§ Screen layout, after the paragraph at `:22`)
- Change: one new paragraph in § Screen layout stating that no text node's box overlaps another's by more than 1 dp, citing the Header proof in `.claude/skills/emulator-verify/features/README.md` (`:66`) as where the 1 dp tolerance comes from. It adds 2 lines, so the § Bottom sheets bullets move from `:32` and `:35-36` to `:34` and `:37-38`.
- Test: none · no jest suite reads `.claude/rules/*.md`; `npm run validate:agent-assets` checks that the cited path exists and that the file has no trailing whitespace.

### 2. The non-blank line has a business rule to cite
- File: `.claude/rules/business.md` (after rule 8 at `:21`), `CLAUDE.md` (`:5`)
- Change: business rule 9 says account, category and commitment names are non-blank: a save refuses a name that is blank once its edge whitespace is stripped, per `docs/adr/2026-09-15-trim-stored-names-in-place.md` §1, and a stored name that already strips to `''` stays as stored (§3). Rules 1 to 8 keep their numbers (`business.md:12`). `CLAUDE.md:5` changes `business rules 1-8` to `business rules 1-9`.
- Test: none · no jest suite reads these files; the schemas the rule describes are already tested (`__tests__/add_account.schema.test.ts:102`, `__tests__/screens/settings/categories/add_edit_category_schema.test.ts:50`, `__tests__/commitment_form_shared.test.ts:120`).

### 3. The list exists as one file
- File: `.claude/skills/boundaries/references/invariants.md` (new; the `references/` folder is new too)
- Change: a heading, then one short paragraph. The paragraph says who reads the list: /boundaries' code scout and its lock, and /issue-review S3. It gives the Rule shape both write: the line's invariant, the screens it binds, and on a `grep` line every hit as a `path:line` site. It says `<files>` in a command means the files the work touches. It says a ticket that adds a line carries CLAUDE.md critical trigger 2 in its Rules. One line defines the marks: `device` is proven on the emulator, `grep` carries the command that lists its sites, and `test` names the jest suite that computes it. Then ten numbered list items, in this order. The wording comes from the ticket's Rules, and each item ends with its mark and what it rests on. Use a list, not a table, because the commands contain `|`. Cite sections and rule numbers, never `ui.md` line numbers, which step 1 shifts:
  1. non-blank · `test` · business rule 9 (step 2) · suites `__tests__/add_account.schema.test.ts`, `__tests__/screens/settings/categories/add_edit_category_schema.test.ts`, `__tests__/commitment_form_shared.test.ts`
  2. unique where a business rule says so (accounts, rule 8) · `test` · business rule 8 · suite `__tests__/account_name_taken.test.ts`
  3. font scale 2.0 after a cold launch: every text node whole or ending in a whole `…`, every amount whole · `device` · `docs/adr/2026-09-27-transactions-search-tally.md` §7, `docs/adr/2026-10-03-android-ellipsis-paint-typeface.md` §6
  4. no text node's box overlaps another's by more than 1 dp · `device` · `.claude/rules/ui.md` § Screen layout (step 1)
  5. every pressable's touch area, its box plus its hit slop, is at least 44 dp high · `device` · `docs/design-system.md` § Touch (`TouchSize.min`, `:105`) and convention 4 (`:121`), `touchFloorHitSlop` in `src/constants/theme.ts` (`:299`)
  6. a glyph colour clears 3:1 on each fill it draws on, measured on the untinted fill beneath any tint · `test` · `docs/adr/2026-09-26-category-colour-contrast-floor.md` §1 · suite `__tests__/category_colour_contrast.test.ts`
  7. a sheet's consumer closes it through `onOpenChange` and `onCloseComplete` and wires no `Content.onClose` · `grep` · `.claude/rules/ui.md` § Bottom sheets, first bullet · `git grep -nE '<BottomSheet\.Content|Content\.onClose' -- <files> ':!src/components/ui/sheet.tsx'`
  8. with a field focused, the field and the sheet's footer sit above the keyboard top, and the sheet closes on every path its features file names, the close proven by the screenshot · `device` · `.claude/rules/ui.md` § Bottom sheets, the keyboard-aware and `liftsAboveKeyboard` bullets; `.claude/skills/emulator-verify/SKILL.md`, the paragraph on `mqa bounds` keeping a closed sheet's nodes (`:183`)
  9. a shared current-item slot with two writers is keyed by its owner or scoped to its screen, and a cache whose value is the same for every reader is keyed by id · `grep` · `.claude/rules/state.md` rule 5, `docs/adr/2026-09-15-account-lookup-keyed-by-id.md` §1 · `git grep -nE "from '(@/|\.\./)[^']*\.(store|state)'" -- <files> | grep -v ':import type '`, which lists each store or state a touched file imports by an alias or a `../` path: a module's `store/`, the `src/store/` re-exports, a `src/components/ui` state, and a state kept in another folder, such as `src/modules/accounts/components/account_form/account_form.state.ts` or `src/modules/budget/screens/budget/budget.state.ts`. A store or state imported by a `./` path, from the importer's own folder or a folder below it, does not appear
  10. every async write sets an error the UI renders · `grep` · `.claude/rules/review.md` class 1 · `git grep -nE -A2 'catch( \([^)]*\))? \{$|(^|[^A-Za-z0-9_.])void [A-Za-z_.]+\(' -- <files>`, which shows each catch with the two lines after it, so a comment-only body is visible, and each `void` call
- Test: none · no jest suite reads skill markdown; `npm run validate:agent-assets` resolves every `src/`, `docs/`, `.claude/` and `__tests__/` path, and every `@/` alias, in the file (`scripts/validate-agent-assets.js:105-131`). The three commands ran at base: item 7's over `src` exits 1, and over `src/components/ui/sheet.tsx` alone it hits `:168`. Over `src/modules/commitments/screens/commitments/detail`, item 9 returns 6 imports: `components/pay_sheet.hook.ts:8`, `:9`, `:29` and `detail.hook.ts:7`, `:8`, `:17`. Over `src/modules/onboarding/screens/onboarding/add_account` it returns 5, among them `add_account.hook.ts:5`, the shared `account_form.state`. Item 10 returns 4 catches and 4 `void` calls: `components/pay_sheet.hook.ts:305`, `:331`, `components/pay_sheet.tsx:106` and `index.tsx:93`. Over `src`, item 10's catch half hits the typed `src/utils/use_async.hook.ts:30`.

### 4. /boundaries' code scout reports per item, and the lock writes the Rules
- File: `.claude/skills/boundaries/SKILL.md` (code scout bullet `:21`, step 4 `:28`)
- Change: the code scout bullet adds this work. For each line of `.claude/skills/boundaries/references/invariants.md`, the scout reports the fields, screens and shared pieces that the Building bullets or the task's title touch. It also runs each `grep` line's command over the files those touch and returns the hits. Write the path as a repo path, since the scout prompt gets the bullet text and a relative link does not resolve there. Step 4 adds one sentence for both an epic and a task: one Rule per list line the scout reported as touched, in the list's Rule shape, and no Rule for a line it did not report.
- Test: none · as step 3; the lint path check requires step 3's file to exist first.

### 5. /issue-review S3 checks locked Rules against the list
- File: `.claude/skills/issue-review/references/reviewer-charter.md` (inputs `:5`, S3 `:11`), `.claude/skills/issue-review/SKILL.md` (dispatch paths `:42`)
- Change: the charter's inputs paragraph names the invariant list's path, and SKILL.md step 4 adds the list's path to the paths it dispatches, beside `.claude/skills/emulator-verify/features/`. S3 adds the check for an epic and for a task whose header reads `Part of none`. The reviewer maps the screens from Building or the title, reads each list line against them, and runs a `grep` line's command over the files the body touches. A line those screens meet that no Rule states is a mechanical delta, citing the list line, whose replacement text is the Rule in the list's shape. On an epic the delta is a Rule, or, once the epic has tickets, a comment on the epic plus a Rules line on the owning ticket. On a `Part of none` task it is a Rules line on the task, and once the task is split, also on the child that owns it. SKILL.md step 7 (`:45`) already routes both landings and stays unchanged. S7 (`:16`) is unchanged.
- Test: none · as step 3.

### 6. The workflow doc and graph name the invariant step at the lock
- File: `docs/workflow.md` (`:7`), `docs/workflow-graph.html` (`:266`, node `bnd`)
- Change: in the define paragraph, after the `/boundaries <n>` sentence, add one sentence. It says the lock writes one Rule per line of the invariant list that the work meets, linked as `../.claude/skills/boundaries/references/invariants.md` (the paragraph's link form, `docs/workflow.md:11`), and that `/issue-review`'s S3 checks the Rules against it. In the graph, rewrite node `bnd`'s `sub` array in place. Keep three strings, none longer than the 26 characters of `'prior art, history, danger'`. Keep the scouts and the one-question interview, and name the Rule per invariant at the lock. `x`, `y`, `w`, `h: 66` and the edges at `:288-296` stay unchanged. With a fourth string the text would overrun `h: 66` (`draw` at `:197`), and a taller node moves the edges at `:290` and `:296`. Leave MA-226's hunks alone: `docs/workflow.md:46` and `docs/workflow-graph.html:330-367`.
- Test: none · lint checks `docs/workflow.md` only for the banned phrases (`scripts/validate-agent-assets.js:197-213`) and does not check the HTML; open the page once in a browser and check that the three lines fit inside the box.

## Non-goals
- The whole-screen pass, its recipe in `features/README.md`, and the edits to implement.md, battery.md, render.md, ticket-body.md:24 and the graph's implementer node: MA-229.
- The commitments close count: MA-230.
- The invariant Rules on #777 and its children, and the recount of their `Size:` lines: #802's review.
- The /ship conductor's return shape and state.md lines: MA-225 (#803).
- Any change to S7's ten states, to `.claude/skills/issue-review/SKILL.md:45`, or to the epic and ticket body standards.
- New jest tests, or any lint rule that parses the list.

## Untested inputs
- The three `grep` commands over a real epic's files (step 3); the first `/boundaries` lock after merge is their first use.
- S3 on an epic Self-reviewed after its tickets exist, and on a split `Part of none` task (step 5).
- The graph's three `sub` strings at the box width (step 6).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Once, after step 3: run each alternative of commands 7, 9 and 10 with `<files>` replaced by `src`. Each returns at least one hit, or hits the file named here: command 7's `<BottomSheet\.Content` hits `src/components/ui/sheet.tsx:168` with the `:!` exclude dropped, and its `Content\.onClose` hits `.claude/rules/ui.md` § Bottom sheets.

## Risks
- After step 1, issue bodies that cite `rules/ui.md:32` and `:35-36` (#802 Rule 1, this ticket's Context) point two lines early; the repository has no such citation (`git grep -nE "ui\.md:[0-9]+"` returns nothing outside frozen history).
- Command 9's sites are store and state imports, so a task that touches many screens locks a long Rule: over `src/modules/transactions/screens` it returns 35 hits.
- MA-226 (#804) edits other hunks of `docs/workflow.md` and `docs/workflow-graph.html`; whichever PR merges second rebases.

## Self-assessment
Step 5 is the step I am least sure about. The epic route "after /tickets, a comment plus a Rules line" holds only when S3 runs on an epic whose tickets already exist. SKILL.md:33 and :41 allow that only for a parent whose header still reads `Reviewed none`. The S3 text names that landing and SKILL.md:45 routes it, but an epic marked before its cut never reaches it. Command 9 is the weakest of the three commands, since a grep cannot tell a shared slot from a store.
