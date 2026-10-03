# MA-135 — The structural guards the source-text suites carried run as lint rules or script checks
base: 87b13411 · verify: none · flags: none · expected diff: ~355 lines

A `__tests__/` path with a line range that is not on this checkout is read with `git show 10b1540f:<path>`. All 54 named files below exist at `87b13411`.

## Steps
### 1. `node scripts/validate-structural-guards.js` fails on a named-file violation and on a named file that is gone
- File: `scripts/validate-structural-guards.js` (new, ~255 lines). It reads every file through `stripComments` (`scripts/lib/strip-comments.js:2`; one argument `lines: string[]`, required, never `null`; returns a `string[]` of the same length). Collect every violation, then exit once, as `scripts/validate-state-screen-geometry.js:56-101`.
- Change: CLI only, like its two siblings. No arguments, no environment, no exports. Root is `path.join(__dirname, '..')`. Files are read with `fs`, never `git`, so a copy of the script checks the folder it is copied into.
  - Exit 0: one stdout line starting `Structural guards validated`, empty stderr.
  - Exit 1: one stderr line per violation, all rows checked before the exit. `<path>` is repo-relative with `/`, `<line>` is 1-indexed in the file on disk.
    - banned token: `<path>:<line>: `, then the matched text in backticks and the row's rule
    - required token absent: `<path>: `, then what is missing. An absence has no line (`scripts/validate-state-screen-geometry.js:77`)
    - named file not in the tree: `<path>: `, with the words `not in the tree`
  - Comments are stripped before matching and strings are kept. An identifier ban matches the whole identifier. It matches a member after `.` only when the object is `React`, so `React.useState(` reports and the store accessor `useCategoryDetailState.useState.month()` (`src/modules/budget/screens/budget/category_detail/category_detail.hook.ts:23`) does not. A required import matches a named import that wraps over several lines. A file named in several rows gets every row.

  | Row | Named files | Banned on a line | Required in the file |
  |---|---|---|---|
  | N1 | 33 paths, `__tests__/screens/budget/budget_categories_styling_architecture.test.ts:8-26` and `__tests__/screens/budget/spending_plan_styling_architecture.test.ts:5-19` | `StyleSheet` | |
  | N2 | 8 paths, `budget_categories_styling_architecture.test.ts:243-248` and `spending_plan_styling_architecture.test.ts:96,99` | `shadow-none` | |
  | N3 | 12 paths, `__tests__/screens/filter_component_architecture.test.ts:9-20` | `useCallback`, `useEffect`, `useMemo`, `useReducer`, `useState`; a module specifier ending `filter.helpers`, `filter.store` or `filter.hook`; `Colors.dark`; the 12 literals at `:32-43` | |
  | N4 | `src/modules/transactions/screens/transactions/index.tsx` | `useConfirmAction`, `useTransactionFormState`, `useTransactionStore` | `<FilterRail`; `TransactionType.` with each of `Income`, `Expense`, `Transfer`, `CCPayment` (every member, `src/constants/enums.ts:26-31`) |
  | N5 | `src/modules/transactions/screens/transactions/detail/index.tsx` | `router.`, `useTransactionFormState` | |
  | N6 | `src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx` | `} EGP` | `Strings.currencyEgp` (`:110` today) |
  | N7 | `src/components/ui/screen.tsx` | `SafeAreaView` | |
  | N8 | `src/components/ui/filter_rail.tsx` | | `<MonthFilter`, `<SegmentFilter` |
  | N9 | `src/modules/commitments/screens/commitments/index.tsx` | `CommitmentHeader` | `<FilterRail`; `CommitmentPaymentStatus.` with each of `Overdue`, `Due`, `Upcoming`, `Paid`, `Skipped` (every member, `src/constants/enums.ts:62-68`) |
  | N10 | 5 tab screens, `__tests__/screens/tab_screen_headers.test.ts:5-9` | | a named import of each of `Surface`, `Separator`, `Typography` from `heroui-native`; `<Surface`; `<Separator` |
  | N11 | `src/modules/dashboard/screens/dashboard/index.tsx` | | a named import of `Button` from `heroui-native`; `<Button` |
  | N12 | `src/modules/budget/screens/budget/index.tsx` | | `<BudgetToolRail` |
- Test: `first` · `__tests__/scripts/validate_structural_guards.test.ts` (new). The script runs as a subprocess (`__tests__/scripts/validate_state_screen_geometry.test.ts:47`) from a fakeroot under `os.tmpdir()` (`__tests__/scripts/oxlint_font_size_rule.test.ts:130`) that holds copies of the script, `scripts/lib/strip-comments.js`, `src/` and `global.css`. A seeding helper throws when its target text is absent (`validate_state_screen_geometry.test.ts:57`). Cases:
  - one seeded violation per row N1 to N12, in N3 one per token kind, and in N4, N6 and N9 one per column with the other column left intact (N6: one seed adds a line that holds `} EGP`, the other replaces `Strings.currencyEgp` at `:110` with text that holds no ` EGP`): exit 1 and the `<path>:<line>: ` or `<path>: ` line
  - `React.useState(` seeded in `src/components/ui/filter_accordion.tsx` (default `React` import, `:3`): exit 1 and its `<path>:<line>: ` line
  - three violations seeded at once, `StyleSheet` (N1) and `shadow-none` (N2) on two lines of `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx` and one line in a second file: the one run's stderr holds all three `<path>:<line>` prefixes
  - a named file removed from the fakeroot: exit 1, its `<path>: ` line holds `not in the tree`, and a violation seeded in another file is still listed
  - a banned token inside a `//` comment and inside a `{/* */}` comment: exit 0
  - the `heroui-native` import at `src/modules/dashboard/screens/dashboard/index.tsx:2`, a file in N10 and N11, rewritten across three lines: exit 0

### 2. The same run fails on a tree-wide violation and on a deleted path that is back
- File: `scripts/validate-structural-guards.js` (~50 lines)
- Change: three rows matched against every `.ts` and `.tsx` path under `src/`, found by walking the folder. They report banned tokens in the step 1 format. A row that matches no file is one stderr line that names the row and holds `matches no file`.

  | Row | Files | Banned on a line |
  |---|---|---|
  | T1 | every `*.state.ts` (40 today) | `useEffect`, `setTimeout`, `async`, `Promise` |
  | T2 | every `index.tsx` below a `screens/` folder under `src/modules/` (29 today) | `useState`, `useSharedValue` |
  | T3 | every file (647 today) | `transaction_form_v2`, `TransactionFormV2` |

  Three paths must not exist, each a `<path>: ` line with the words `must not exist` when it does: `src/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.styles.ts`, `src/components/ui/tab_header.tsx`, `src/modules/transactions/screens/transactions/transaction_form_v2`.
- Test: `first` · same suite. A `.state.ts` with `async` seeded on a known line; a template with `useSharedValue`; a new file under `src/` that holds `TransactionFormV2`; each of the three paths created in the fakeroot; every `*.state.ts` removed from the fakeroot (`matches no file`); every `index.tsx` below a `screens/` folder under `src/modules/` removed from the fakeroot (the T2 line holds `matches no file`). A template seeded with `useFooState.useState.bar();`, a store accessor under the step 1 member rule, exits 0.

### 3. The same run fails when the root layout's provider tree, safe-area seed or CSS import breaks
- File: `scripts/validate-structural-guards.js` (~50 lines), reading `src/app/_layout.tsx` (`:1`, `:16-17`, `:71-74`, `:90-91`)
- Change: `src/app/_layout.tsx` is a named file under the step 1 rule. Its checks:
  - `<AppToastProvider` opens exactly once. None is a file-level line; each opening tag after the first is a `<path>:<line>` line
  - `<PortalHost` opens exactly once, reported the same way
  - the `<PortalHost` sits between the provider's opening and closing tags in source order (`__tests__/components/ui/toast_provider.test.ts:41-42` at `10b1540f`, lines this checkout's copy no longer has), else a `<path>:<line>` line at the host
  - an import from `heroui-native/provider` is a banned token; no import from `heroui-native/provider-raw` is an absence
  - `<SafeAreaProvider` carries `initialMetrics={initialWindowMetrics}`, else an absence
  - a side-effect import whose specifier ends `global.css` is present, else an absence; its specifier resolves from `src/app/` to a file on disk, else a `<path>:<line>` line at the import
- Test: `first` · same suite. A second `<AppToastProvider>` wrapped around `<PortalHost />`; both `AppToastProvider` tags removed, and in a case of its own `<PortalHost />` removed, each asserting the `src/app/_layout.tsx: ` line that names the missing tag; `<PortalHost />` moved below `</AppToastProvider>`; a second `<PortalHost />`; the `provider-raw` specifier changed to `heroui-native/provider` (the `:17` line and the absence); `initialMetrics={initialWindowMetrics}` removed; the CSS import pointed at `../global.css` (the `:1` line); the CSS import removed. One case seeds `StyleSheet` in an N1 file, `async` in a `.state.ts` and a second `<PortalHost />` at once, and the one run's stderr holds all three `<path>:<line>` prefixes.

### 4. `npm run lint` runs the check
- File: `package.json` (`scripts.lint`, `:13`, 1 line)
- Change: the chain ends with `&& node scripts/validate-structural-guards.js`. Its consumers stay as they are: the Lint job in `.github/workflows/pr-checks.yml` and the parity chain in `CLAUDE.md` both call `npm run lint`.
- Test: `first` · same suite. `scripts.lint`, parsed from `package.json`, holds `node scripts/validate-structural-guards.js`.

### 5. The two kept suites leave the test tree
- File: `__tests__/app_layout_imports.test.ts`, `__tests__/screens/transactions/transaction_form/transaction_form_architecture.test.ts` (both deleted)
- Change: delete both. Step 3 holds the first suite's two guards (`:5`, `:14`); T3 and the third deleted path in step 2 hold the second's (`:19-26`).
- Test: `none`, a deletion. `test ! -e` on both paths, and `npm test -- --ci` stays green.

### 6. The test rules stop naming the two suites as kept
- File: `.claude/rules/tests.md:24` (1 line)
- Change: the Prune bullet loses its clause on `app_layout_imports` and `transaction_form_architecture`. In its place the bullet says a structural guard, what a file imports, declares or omits, is a lint rule or a row in `scripts/validate-structural-guards.js` under `npm run lint` and never a Jest suite.
- Test: `none`, a rules file. `npm run validate:agent-assets` checks the path it cites.

## Non-goals
- Dropped, with the reason the PR lists (Acceptance line 1):
  - `ConfirmDialog` declares `errorMessage?: string` (`__tests__/components/ui/confirm_surfaces_shape.test.ts:40`). `oxlint --type-check` in `npm run lint` already fails on it: `src/modules/accounts/screens/accounts/detail/components/archive_confirmation_dialog.tsx:41` and `src/modules/accounts/screens/accounts/detail/components/delete_confirmation_dialog.tsx:48` pass the prop, and `src/modules/categories/screens/settings/categories/components/delete_confirmation_dialog.tsx:18` omits it.
  - Text pins inside G rows that the ticket's Context does not list. They fail on a reformat or a rename and pass on a bug (audit M35): three import lines (`budget_categories_styling_architecture.test.ts:40-48`), hook bodies (`:106`, `:109`, `:111`; `__tests__/screens/filter_rail_usage.test.ts:31-32,34`), icon names and the constants `TRANSACTION_FILTERS`, `COMMITMENT_FILTERS`, `STATUS_COLORS`, `STATUS_ICONS` (`filter_rail_usage.test.ts:43,48-54,63,69-77`), `budgetAddCategory}` (`tab_screen_headers.test.ts:42`), `useSafeAreaInsets` and two padding expressions (`__tests__/components/ui/screen_safe_area.test.ts:8-10`), `className=` present in 15 files (`spending_plan_styling_architecture.test.ts:33`).
  - Names of deleted things: `spending_plan_sheet.styles` (`spending_plan_styling_architecture.test.ts:32`), `TypeChips`, `StatusFilterChips` (`filter_rail_usage.test.ts:55,78`). No file in `src/` declares them, and an import of a missing module or name is a type error. The five files that must exist (`filter_rail_usage.test.ts:21-25`) are imported, so the same type error covers them.
  - Single-file bans the ticket's Context does not list: `useState(` in `src/modules/budget/screens/budget/category_detail/category_detail.hook.ts` (`budget_categories_styling_architecture.test.ts:58-60`) and `useState` in `src/components/ui/month_filter.hook.ts` (`filter_rail_usage.test.ts:33`); `Strings` in `set_budget_sheet.state.ts` (`:110`); `setTimeout` in `transaction_form_host.hook.ts` (`:107`); `useEffect`, `useMemo` in `set_budget_sheet.tsx` (`:112-114`); React hooks, `Sheet`, `SegmentedTabs` in `filter_rail.tsx`, `month_filter.tsx`, `segment_filter.tsx` (`filter_rail_usage.test.ts:18-20,35-36`). `CLAUDE.md` § module screen anatomy bans `useState` in every `.hook.ts`, and five call it today (`src/utils/use_debounced_value.hook.ts`, `src/utils/use_async.hook.ts`, `src/utils/use_confirm_action.hook.ts`, `src/components/ui/tabs.hook.ts`, `src/modules/onboarding/screens/onboarding/welcome/welcome.hook.ts`), so a tree row for that rule has five live violations and needs the allowlist of Acceptance line 5. The others pin one file to a rule neither `CLAUDE.md` nor `.claude/rules/` states.
- No change to `.oxlintrc.json` or `scripts/oxlint-plugin-moneyapp.js`. An oxlint override keyed on a named file stays silent when the file is gone (Acceptance line 6), so every row is a script row.
- No tree-wide ban of `shadow-none` (6 uses on a transparent `Surface`: `src/components/ui/filter_rail.tsx:33` and the five tab screens), of ` EGP` (`src/utils/format_amount.ts:131`) or of `SafeAreaView`. N2, N6 and N7 stay on their named files.
- No allowlist in the script, and no change under `src/`.
- No `.gitignore` entry. The fixtures live under `os.tmpdir()`.
- `__tests__/typography_tokens.test.ts` stays. It reads `src/app/_layout.tsx` at `:14` for the `useFonts` faces, `.claude/rules/ui.md` cites it as the font-chain guard, and Acceptance names two suites.
- The W rows and the render-suite policy (ticket Out of scope).

## Untested inputs
- A banned token inside a string literal or JSX text reports, because `stripComments` keeps strings. Step 1.
- A file under `src/` that is neither `.ts` nor `.tsx` and holds `transaction_form_v2` is not scanned, as in the suite T3 replaces (`transaction_form_architecture.test.ts:14`). Step 2.
- T3's `matches no file` line needs a `src/` with no `.ts` or `.tsx` file, a tree where the 54 named files already report `not in the tree`. Step 2.
- `errorMessage?: string` removed from `src/components/ui/confirm_dialog.tsx:23` has no Jest case. The one-off run under Verification covers it.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Once, for the PR's dropped list: with `src/components/ui/confirm_dialog.tsx:23` deleted in the working tree, `npm run lint` exits non-zero and names `archive_confirmation_dialog.tsx:41`. Restore the line.

## Risks
- A commit on `main` after `87b13411` that adds a banned token or renames a named file turns `npm run lint` and the suite's exit 0 cases, whose fakeroot copies `src/`, red on rebase. Acceptance line 5 then needs an allowlist the script does not have, and its lines count against the gate, which has ~45 lines of room.
- Every row passes on the tree at `87b13411` (planner's probe of the same rows: exit 0, 54 named files, 647 `src` files). A violation the implemented script reports at that base is a defect in the script.
- The required tokens in N4 and N8 to N12 are text pins. A rename that changes no behaviour (`MonthFilter`, `BudgetToolRail`, a named `heroui-native` import turned into a namespace import) fails the check, and the fix is the row in the PR that renames.
- `stripComments` keeps the rest of a line after an unpaired quote in JSX text (`scripts/validate-state-screen-geometry.js:14-17`), so a banned token in a trailing comment on that line reports.

## Self-assessment
Step 1 is the one I am least sure about, on two counts. The ticket leaves "worth keeping" to the task, and I drew the line at the guards its Context lists: those are rows, and the other assertions in the same G rows are dropped under Non-goals. A reader who wanted every ban in those rows kept (about 35 more lines, which puts the script at the gate) will read the last dropped group as too generous. The second count is the required tokens in N4 and N8 to N12. They are the same source-text pins audit M35 removed from Jest, now in a script, kept because the Context names them. The size figure comes from a working draft of the script, 347 lines after `oxfmt`, plus the tree-row floor and two one-line edits.
