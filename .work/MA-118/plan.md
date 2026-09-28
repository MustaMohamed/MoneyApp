# MA-118 — Test suites assert behaviour, not component source text (audit M35)
base: 10b1540f · verify: none · flags: none · expected diff: ~0 lines

Files outside `__tests__/`: none. Every path below is a test file, read in full at the base.

Reason codes for a deleted guard, used in the steps and copied into the PR body with each test name:

- **G**: a structural guard (what a file imports, declares or omits). It is the out-of-scope guards task's to hold as a lint rule or `scripts/` check.
- **S**: a `className` string, a pixel literal or JSX text. What it draws is the render check's to see; nothing in Jest resolves a class to a style.
- **W**: a prop wired from a template to a child. No exported function carries it, `tests.md` forbids a new render test, and Acceptance forbids a source change.
- **C**: already asserted through an interface, named at the line.

## Steps

### 1. The two budget architecture suites hold no source text
- File: `__tests__/screens/budget/budget_categories_styling_architecture.test.ts`, `__tests__/screens/budget/spending_plan_styling_architecture.test.ts`
- Change, `budget_categories_styling_architecture.test.ts`:
  - Keep `:302` 'scales transaction form geometry passed through style and icon props' with `:309` (`TRANSACTION_FORM_CONTENT_CONTAINER_STYLE.gap` is `ms(8)`); delete its `:303-308`.
  - Delete the 15 tests at `:34`, `:51`, `:63`, `:85`, `:117`, `:135`, `:145`, `:160`, `:176`, `:189`, `:241` with its comment at `:239-240`, `:257`, `:266`, `:277`, `:293`. Reasons: `:34`, `:51`, `:85` G; `:63`, `:145`, `:257`, `:277` W; `:117`, `:135`, `:160`, `:176`, `:189`, `:241`, `:266` S; `:293` G (the money-formatting script and `Strings` rule own inline copy).
  - Delete `:1-2`, `PRESENTATION_FILES` `:7-27`, `source()` `:29-31`. The imports at `:4-5` stay.
- Change, `spending_plan_styling_architecture.test.ts`:
  - Keep `:27` 'uses HeroUI and Uniwind classes instead of feature-level StyleSheets' with `:36-43` (`existsSync` of `spending_plan_sheet.styles.ts` is false, a file's existence and not its text); delete its `:28-34`.
  - Delete the tests at `:46` (W), `:57`, `:77`, `:94`, `:118` (S).
  - Delete `readFileSync` from `:1`, `PRESENTATION_FILES` `:4-20`, `source()` `:22-24`.
- Test: `none` · the step is the test change; both suites run green with one test each.

### 2. The filter and tab-header suites hold no source text
- File: `__tests__/screens/filter_component_architecture.test.ts`, `__tests__/screens/filter_rail_usage.test.ts`, `__tests__/screens/tab_screen_headers.test.ts`
- Change:
  - `filter_component_architecture.test.ts`: delete the file. Both tests (`:47`, `:58`) are G.
  - `filter_rail_usage.test.ts`: delete the file. All three tests (`:13`, `:39`, `:58`) are G; the five `exists()` lines at `:21-25` assert that files are present, which a rename or a fold of `month_filter.state.ts` into its hook turns red with no change in behaviour.
  - `tab_screen_headers.test.ts`: keep `:51` 'does not keep the unused custom TabHeader wrapper' (`existsSync`). Delete `:22`, `:33`, `:39`, `:45` (G), `screenFiles` `:4-10`, `source()` `:12-14`, `herouiImport()` `:16-19`, `readFileSync` in `:1`.
- Test: `none` · the step is the test change; `tab_screen_headers.test.ts` runs green with one test.

### 3. The confirm and sheet source suites are gone
- File: `__tests__/screens/shared/confirm_action_consumers.test.ts`, `__tests__/components/ui/confirm_surfaces_shape.test.ts`, `__tests__/components/ui/sheet_dismissibility.test.ts`
- Change: delete the three files.
  - `confirm_action_consumers.test.ts:9`: C for the message (`__tests__/screens/transactions/transactions_hook.test.ts:267-280` asserts `state.deleteErrorMessage`), W for its path into the sheet. `:20`: W.
  - `confirm_surfaces_shape.test.ts:24` (it.each, two rows): S; `resolveFlatButtonStyle` is asserted in `__tests__/components/ui/button_content.test.ts`, the `flat` attribute on a JSX tag is not. `:40`: G. `:44`: S.
  - `sheet_dismissibility.test.ts:9`: W.
- Test: `none` · deletions; `__tests__/screens/shared/` is left empty and is removed with its last file.

### 4. The toast and safe-area suites hold no source text
- File: `__tests__/components/ui/toast_provider.test.ts`, `__tests__/components/ui/screen_safe_area.test.ts`
- Change:
  - `toast_provider.test.ts`: delete `:1-2`, `:6` and the describe at `:28-44` with the blank line at `:27` (three tests, G: what `src/app/_layout.tsx` mounts and imports). The four tests at `:9`, `:13`, `:19`, `:23` stay unedited.
  - `screen_safe_area.test.ts`: delete the file. `:5` is W for the two padding lines (`hasEdge` is module-private in `src/components/ui/screen.tsx:21`) and G for `SafeAreaView`.
- Test: `none` · the step is the test change.

### 5. The two transactions render suites read no template
- File: `__tests__/screens/transactions.screen.test.tsx`, `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx`
- Change:
  - `transactions.screen.test.tsx`: delete `:1-2` and the test at `:206-216` 'keeps form and delete orchestration out of the screen template' (G). No other line.
  - `detail_screen_actions.test.tsx`: delete `:1-2` and the test at `:17-25` 'keeps navigation and form orchestration out of the screen template' (G). The five render tests stay unedited.
- Test: `none` · the step is the test change.

### 6. No render suite asserts a `className`, the two kept lines excepted
- File: `__tests__/components/ui/tabs.test.tsx`, `__tests__/components/ui/filter_rail.test.tsx`, `__tests__/components/ui/month_filter.test.tsx`, `__tests__/screens/budget/set_budget_sheet.test.tsx`, `__tests__/screens/budget/budget_copy_sheet.test.tsx`
- Change (every deletion is S):
  - `tabs.test.tsx`: delete `:149-161`, four `expect.stringContaining` assertions. `:162-174` stay, `:166`, `:167` and `:172` byte-identical. The test keeps its name; `getByTestId` leaves the destructure at `:139`.
  - `filter_rail.test.tsx`: delete the test at `:56-84` 'uses compact rounded rail spacing', all four assertions `className`.
  - `month_filter.test.tsx`: delete `:28-39`; the test keeps its name and `:40-43`; `getByTestId` leaves its destructure at `:24`.
  - `set_budget_sheet.test.tsx`: delete `:172-179` and `:191-194`; both tests keep their names and their `toHaveStyle` lines (`:180-181`, `:187-190`); `getByLabelText` leaves the destructure at `:168`.
  - `budget_copy_sheet.test.tsx`: delete the tests at `:178-204` and `:206-232`, each one `.props.className` assertion. The `Checkbox` mock drops `className` at `:59`, `:65`, `:72`; `testID="checkbox-root"` stays.
- Test: `none` · `tests.md` forbids adding to a render suite; the token-bound assertions that remain are the coverage.

## Non-goals
- No file under `src/`, `scripts/` or `.oxlintrc.json` changes; no lint rule or script check for a deleted guard.
- `.claude/rules/tests.md` is not edited: its Prune bullet ("They live in ...") reads stale after this PR, and the policy text is MA-119's.
- `__tests__/app_layout_imports.test.ts` and `__tests__/screens/transactions/transaction_form/transaction_form_architecture.test.ts` stay until the guards task.
- `__tests__/typography_tokens.test.ts`, `semantic_colour_agreement.test.ts`, `app_config_plugins.test.ts`, `app_icon_assets.test.ts`, `__tests__/scripts/validate_state_screen_geometry.test.ts`, `validate_money_formatting.test.ts`, `oxlint_font_size_rule.test.ts` are unchanged; the last two write fixtures to a temp folder and read no component.
- No new render test or render case, and no new suite replacing a deleted one.
- No rename or move of a kept test or file.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Once, before hand-off: `grep -rln "readFileSync" __tests__` returns the five carve-out suites, the two kept-until-guards suites and nothing else; `grep -rn "className" __tests__ --include="*.tsx"` returns `tabs.test.tsx:166-172` in its new position, the `Card` mock type in `__tests__/screens/dashboard/transactions_card.test.tsx:15`, and nothing else.
- `git diff --stat origin/main -- src scripts` is empty.
- Test lines: about 890 removed, none added. Six files deleted (`filter_component_architecture`, `filter_rail_usage`, `confirm_action_consumers`, `confirm_surfaces_shape`, `sheet_dismissibility`, `screen_safe_area`), eleven edited.
- The PR body lists every deleted test by file and name with its reason code spelled out.

## Risks
- `__tests__/screens/budget/budget_categories_styling_architecture.test.ts`: MA-117 step 2 changes its import at `:4`. Whoever merges second rebases; this ticket keeps that import line, so the conflict is the deleted block around it.
- `__tests__/screens/transactions.screen.test.tsx`: MA-092 edits `:94`, `:130`, `:261`, `:342`, and its plan line 105 relies on the test at `:207` that step 5 deletes. Different hunks; MA-092's note goes stale, not its code.
- `__tests__/components/ui/tabs.test.tsx` and the other four render suites: MA-092, MA-125 and MA-106 name none of them.
- An `existsSync(...) === false` assertion is read here as outside M35, which names source text, and no refactor that keeps behaviour turns it red. If the reviewer reads it as inside, step 1 deletes `spending_plan_styling_architecture.test.ts` whole and step 2 deletes `tab_screen_headers.test.ts` whole.
- `__tests__/screens/filter_rail_usage.test.ts` is deleted whole, not edited: MA-117, MA-092, MA-125 and MA-106 do not name it.
- Line numbers are the base's. Any merge into these files before `/ship` shifts them; the test names are the anchor.
- Amended after review round 1: step 2 deletes `filter_rail_usage.test.ts` whole (its `exists() === true` lines break on a rename, and the `STATUS_ICONS` equality copied a typed table); step 4's range is `:28-44`; step 6 names the unused `getByTestId` at `tabs.test.tsx:139`.

## Self-assessment
The least sure part is the two tests kept for an `existsSync(...) === false` assertion alone (`spending_plan_styling_architecture.test.ts:27`, `tab_screen_headers.test.ts:51`). Acceptance bans reading a source file and asserting on its text, and these read nothing, so the literal reading keeps them under their old names, which now describe more than they assert. The ticket does not rule on file existence either way.
