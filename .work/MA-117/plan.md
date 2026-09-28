# MA-117 — Geometry files take one name, <name>.geometry.ts
base: 10b1540f · verify: none · flags: none · expected diff: ~30 lines

Lines per file outside tests: six detail importers 1 each, seven form importers 1 each, the two renamed files 0 and 2, `theme.ts` 5, `account_chips.tsx` 2, `accounts_list.geometry.ts` 3, `tests.md` 1, `display_headline.geometry.ts` 1. 19 files, the ticket's `Size:` list, none missed.

## Steps

### 1. The detail geometry file is `detail.geometry.ts`
- File: `src/modules/transactions/screens/transactions/detail/components/detail_geometry.ts`, and its importers in the same folder: `action_row.tsx:9`, `detail_hero.tsx:14`, `detail_row.tsx:10`, `detail_skeleton.tsx:14`, `note_card.tsx:11`, `transfer_flow_card.tsx:14`
- Change: `git mv` to `detail.geometry.ts`, content unchanged. Each importer's specifier becomes `./detail.geometry`. The test importer `__tests__/screens/transactions/detail/detail_skeleton.test.tsx:10` takes the new path in the same commit.
- Test: `none` · a rename adds no behaviour; `npm run typecheck` and the existing suites fail on a missed importer.

### 2. The form geometry file is `transaction_form.geometry.ts`
- File: `src/modules/transactions/screens/transactions/transaction_form/components/transaction_form_geometry.ts`, and its importers: `components/account_strip.tsx:25`, `components/amount_hero.tsx:16`, `components/form_picker_row.tsx:8`, `components/transaction_form_loading.tsx:17`, `transaction_form/index.tsx:9`, `transaction_form/transaction_form_body.tsx:33`
- Change: `git mv` to `transaction_form.geometry.ts`, content unchanged. Specifiers become `./transaction_form.geometry` and `./components/transaction_form.geometry`. Five test importers take the new path in the same commit: `__tests__/screens/transactions/transaction_form/account_strip.geometry.test.ts:11`, `date_picker_sheet.test.tsx:63`, `transaction_form_loading.test.ts:11`, `transaction_form_body.test.tsx:60`, and `__tests__/screens/budget/budget_categories_styling_architecture.test.ts:4`. No other line of those tests changes.
- Test: `none` · same reason as step 1.

### 3. Six geometry tests carry the dotted name
- File: `__tests__/components/ui/display_headline_geometry.test.ts`, `state_screen_geometry.test.ts`, `status_track_geometry.test.ts`; `__tests__/screens/budget/budget_copy_sheet_geometry.test.ts`; `__tests__/screens/onboarding_shell_geometry.test.ts`; `__tests__/screens/transactions/transactions_text_geometry.test.ts`; `.claude/rules/tests.md:19`; `src/components/ui/display_headline.geometry.ts:61`
- Change: `git mv` each to `<name>.geometry.test.ts`, one commit with no content change so git records a 100% rename. `tests.md:19` reads `budget_copy_sheet.geometry`. The lint-disable comment at `display_headline.geometry.ts:61` cites `display_headline.geometry.test.ts:85-92`, line range unchanged. `__tests__/scripts/validate_state_screen_geometry.test.ts` keeps its name.
- Test: `none` · the six suites run under their new names; `find __tests__ -name "*_geometry.test.ts"` returns the script test only.

### 4. One helper returns the slop to the touch floor
- File: `src/constants/theme.ts` (directly after `TouchSize`, `:242-244`)
- Change: add `export function touchFloorSlop(height: number): number`, returning `Math.max(0, (TouchSize.min - height) / 2)`, with a one-line comment. No other export changes.
- Test: `first` · `__tests__/constants/touch_floor_slop.test.ts` (new): `touchFloorSlop(40)` is `2`, `touchFloorSlop(28)` is `8`, `touchFloorSlop(44)` is `0`, `touchFloorSlop(56)` is `0`, and `height + 2 * touchFloorSlop(height)` is `TouchSize.min` for a height under the floor.

### 5. The three sites read the helper
- File: `src/modules/transactions/screens/transactions/components/account_chips.tsx:21`, `src/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry.ts:29-30`, `src/modules/accounts/screens/accounts/list/accounts_list.geometry.ts:88-89`
- Change: `CHIP_SLOP_Y = touchFloorSlop(Size.compactChipHeight)`, and `TouchSize` leaves that file's import. `ACCOUNT_STRIP_CHIP_SLOP_Y = touchFloorSlop(ACCOUNT_STRIP_CHIP_HEIGHT) + Spacing.xxxxs`; `TouchSize` stays for `FACT_ROW_MIN_HEIGHT`. The grip's `top` and `bottom` are `touchFloorSlop(Size.reorderGripSlot)`; `right` at `:90` stays `TouchSize.min - Size.reorderGripSlot` inline. No exported name changes.
- Test: `none` new · `__tests__/screens/transactions/transaction_form/account_strip.geometry.test.ts` and `__tests__/screens/accounts/accounts_list.geometry.test.ts` pass with no edit beyond step 2's import path. `account_chips.tsx` keeps its constants module-private in a `.tsx`, and `tests.md` forbids a new render test.

## Non-goals
- No rename of `__tests__/scripts/validate_state_screen_geometry.test.ts`, `scripts/validate-state-screen-geometry.js`, or `__tests__/geometry_tokens.test.ts`.
- No edits under `docs/scopes/` or `docs/superpowers/`, which cite the old test names and are frozen history.
- No move of the already dotted tests at `__tests__/` root or `__tests__/screens/` into other folders.
- No move of `account_chips.tsx` constants into a geometry file, and no helper for the grip's full-difference `right` inset.
- No change to any file that exists only on the MA-092, MA-125 or MA-106 branches.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`, then `find src -name "*_geometry.ts"` returns nothing and `grep -rn "_geometry'" src __tests__` returns nothing.
- History: `git log --follow --oneline` on each of the eight renamed paths shows commits older than this branch.

## Risks
- Step 5 changes no value on any window. `src/utils/responsive.ts:10` clamps the scale between 0.85 and 1.15, so `Size.compactChipHeight`, `ms(28)`, is 24 to 32 and `Size.reorderGripSlot`, `ms(16)`, is 14 to 18. Both stay under `TouchSize.min`, 44 and unscaled, so the helper's `Math.max(0, …)` never fires at `account_chips.tsx:21` or `accounts_list.geometry.ts:88-89`. `ACCOUNT_STRIP_CHIP_HEIGHT`, `ms(40)`, is 34 to 46, and `transaction_form.geometry.ts:29-30` holds the same `Math.max(0, …)` at base.
- A squash merge keeps rename history only while git's similarity detection matches; an edit to a renamed test in the same PR lowers the match. Steps 1 to 3 change no content in the renamed files except step 5's two lines in `transaction_form.geometry.ts`.
- `__tests__/screens/transactions/transactions_text_geometry.test.ts`, MA-092 (step 2 adds cases) and MA-125 (step 1 moves a describe out and changes the import at `:6`): whoever merges second rebases and applies its edits to `transactions_text.geometry.test.ts`; if this ticket is second, it re-runs the `git mv` on the rebased file and checks no file remains at the old name.
- `__tests__/components/ui/state_screen_geometry.test.ts`, MA-125 (step 4 adds cases): the same, target name `state_screen.geometry.test.ts`.
- `__tests__/components/ui/text_scale_geometry.test.ts`, MA-125 creates it under the underscore name: if MA-125 merges first, this ticket's rebase adds a `git mv` to `text_scale.geometry.test.ts`, inside Acceptance's `find` line; if this ticket merges first, MA-125's plan is amended to create the dotted name.
- `src/constants/theme.ts`, MA-125 (step 3 adds `Size.tabScreenBottomClearance`): different regions of the file, a textual conflict is unlikely; whoever merges second rebases and keeps both additions.
- `src/modules/transactions/screens/transactions/components/transactions_text.geometry.ts` and `src/components/ui/state_screen.geometry.ts`, MA-092 and MA-125: this ticket edits neither, no action.
- MA-106's plan names no file this ticket renames or edits.

## Self-assessment
Step 3 is the one I am least sure about. MA-092 and MA-125 edit two of the six tests it renames, and MA-125 creates a seventh under the underscore name, so the step's final file list depends on merge order and whoever merges second repeats a `git mv` during a rebase. A file left at an old name fails no suite; only Verification's `find` line shows it. Step 5 carries no value risk: the scale clamp at `responsive.ts:10` keeps both unclamped heights under 44, so all three sites compute what they compute at base, and no device check is needed.
