# MA-193 — The shared sheet's prop resolvers live in a .ts sibling of sheet.tsx
base: a23d3b9ef70e037bc7b2e1b082a77b4746b58de8 · verify: none · flags: none · expected diff: ~210 lines

## Steps
### 1. The resolvers live in `sheet.helpers.ts`, and `Sheet` reads them from it
- File: `src/components/ui/sheet.helpers.ts` (new, the `<component>.helpers.ts` name 53 files under `src/` use, `confirm_dialog.helpers.ts` among them); `src/components/ui/sheet.tsx` (`:18-146`, `:9`, `:13`)
- Change: move `sheet.tsx:18-146` verbatim, comments and JSDoc included. Exported from the new file: `SHEET_FOOTER_CLEARANCE`, `resolveSheetSizeAboveOne`, `SnapPoint`, `resolveSnapPoints`, `resolveKeyboardProps`, `shouldBlurInputOnClose`, `resolveSheetContentPadding`, `resolveSheetClosedAtRestProps`, `resolveSheetCloseGestureProps`, plus `SheetSize` and `FocusedInput`, which become exported types because `SheetProps.size` (`:157`) and `Sheet` (`:212`) read them. `SHEET_SIZES`, `SIZE_PCT`, `isSheetSize`, `resolveSnapPoint`, `SheetContentProps`, `BlurInputOnCloseInput`, `SheetContentPaddingInput` and `SHEET_CLOSING_FAIL_OFFSET` stay private. Every signature stays byte-identical: `resolveSnapPoints(size: SheetProps['size'], snapPoints: SheetProps['snapPoints'])`, both required, both `undefined`-able, never `null`, through `import type { SheetProps } from './sheet'` (Acceptance 2 allows types from the component's file). Value imports are only `Size` from `@/constants/theme` and `ms` from `@/utils/responsive`. React, `TextInput`, HeroUI's `BottomSheet` and `SheetCloseLifecycle` come in as whole `import type` declarations, which Babel erases; `typeof BottomSheet.Content` and `typeof TextInput.State.currentlyFocusedInput` typecheck on type-only imports (tsc probe in scratchpad, with a negative control on each). `sheet.tsx` drops the block, `Size` from `:9` and the `:13` import, and imports the six resolvers it calls plus `type FocusedInput, type SheetSize, type SnapPoint` from `./sheet.helpers`. It keeps `SheetProps`, `Sheet` and the `useBottomSheetAwareHandlers` re-export (`:16`). Until steps 3 and 4 it carries one bridge line, `export { SHEET_FOOTER_CLEARANCE, resolveSheetSizeAboveOne } from './sheet.helpers';`, so the 13 consumers and their suites still compile.
- Test: `first` · import lines only, no assertion touched: `__tests__/components/ui/sheet_snap_points.test.ts:1`, `sheet_content_padding.test.ts:1`, `sheet_keyboard_props.test.ts:1`, `sheet_rest_props.test.ts:1-4` and `sheet.hook.test.ts:3` import from `@/components/ui/sheet.helpers`.

### 2. Lint refuses a value import of HeroUI, gorhom or the component into the helpers file
- File: `.oxlintrc.json` (`overrides`)
- Change: one override with `files: ["src/components/ui/sheet.helpers.ts"]` sets `no-restricted-imports` to `error`, with `paths` naming `heroui-native`, `@gorhom/bottom-sheet`, `./sheet` and `@/components/ui/sheet`, each `allowTypeImports: true` and a `message`, plus a one-line comment above it. An oxlint 1.77 probe in scratchpad: a per-file override flags a single-line and a wrapped value import from each name, passes `import type`, and leaves other files alone.
- Test: `none` · a structural guard is a lint rule, never a Jest suite (`.claude/rules/tests.md`). The gate is shown once: a temporary `import { BottomSheet } from 'heroui-native';` in the helpers file fails `npm run lint`, and reverting it passes.

### 3. The nine footer-padded sheets import the clearance from the helpers file
- File: `replacement_account_sheet.tsx:6`, `budget_copy_sheet.tsx:10`, `set_budget_sheet.tsx:10`, `spending_plan_sheet/index.tsx:4`, `add_edit_category_sheet.tsx:11`, `reassign_category_sheet.tsx:8`, `pay_sheet.tsx:11`, `commitments/filter/index.tsx:6`, `transactions/filter/index.tsx:6` (paths in Context's `Size:` line); `src/components/ui/sheet.tsx` (bridge)
- Change: each file keeps `Sheet` and `useBottomSheetAwareHandlers` on `@/components/ui/sheet` and takes `SHEET_FOOTER_CLEARANCE` from `@/components/ui/sheet.helpers`. The bridge drops `SHEET_FOOTER_CLEARANCE`.
- Test: `first` · mock keys only: delete `SHEET_FOOTER_CLEARANCE` from the `@/components/ui/sheet` mock in `__tests__/screens/budget/budget_copy_sheet.test.tsx:38`, `budget/set_budget_sheet.test.tsx:34`, `commitments/filter/filter_sheet.test.tsx:18`, `commitments/pay_sheet_converted_total.test.tsx:41`, `commitments/pay_sheet_rate_error.test.tsx:40` and `transactions/filter/filter_sheet.test.tsx:19`. No line in them reads 120 or 124 outside the key, so the real constant loads.

### 4. The four fixed-height sheets import the size resolver from the helpers file, and `sheet.tsx` re-exports nothing moved
- File: `adjust_balance_sheet.tsx:10-14`, `income_sheet.tsx:7-11`, `rate_editor_sheet.tsx:8-12`, `date_picker_sheet.tsx:7` (paths in Context's `Size:` line); `src/components/ui/sheet.tsx` (bridge)
- Change: each file keeps `Sheet` (and `useBottomSheetAwareHandlers` where it has it) on `@/components/ui/sheet` and takes `resolveSheetSizeAboveOne` from `@/components/ui/sheet.helpers`. Delete the bridge line. With it gone, `npm run typecheck` fails on any file or suite that still takes a moved symbol from `@/components/ui/sheet`, `typeof import(...)` reads included.
- Test: `first` · import lines and mock keys only: `__tests__/screens/accounts/adjust_balance_sheet_save_error.test.tsx:5` and `__tests__/screens/transactions/transaction_form/date_picker_sheet.test.tsx:67` import from `@/components/ui/sheet.helpers`, and their `resolveSheetSizeAboveOne` mock keys (`:19-21`, `:22-24`), which read it off `typeof import('@/components/ui/sheet')`, are deleted. `transaction_form_body.test.tsx:50` loses its identity stub: its `MockSheetProps` (`:27-32`) records no `size`. Written first, the three suites fail until the components move (the mocked module no longer supplies the resolver).

### 5. Rules, skill and features file name the helpers file for the moved resolvers
- File: `.claude/rules/ui.md:37`, `.claude/skills/heroui-native/SKILL.md:64`, `.claude/skills/emulator-verify/features/transaction_form.md:51, :54, :78, :110`
- Change: `ui.md:37` and `SKILL.md:64` cite `components/ui/sheet.helpers.ts` for `resolveSheetSizeAboveOne`. `:51` and `:110` cite `src/components/ui/sheet.helpers.ts` beside `resolveSheetClosedAtRestProps`. `:54`'s base copies `origin/main`'s `sheet.tsx`, `sheet.helpers.ts`, `sheet.hook.ts` and `sheet_close_lifecycle.ts`, and its last step checks out the four files. `:78`'s base runs on `origin/main`'s `sheet.tsx` and `sheet.helpers.ts`, and its last step checks out both. `:78` is outside Context's list, but its base copy stands in for the code without `resolveSheetCloseGestureProps`, which now lives in the helpers file. The `animationConfigs` force at `:54` and `:78` still goes into `sheet.tsx`.
- Test: `none` · docs have no test layer; `npm run lint` runs `scripts/validate-agent-assets.js`, which fails on a cited `src/` path that does not exist, so this step follows step 1.

## Non-goals
- H7 (sheet children mount eagerly): untouched.
- No resolver renamed, re-signed or given a new case; `SheetProps`, `Sheet`, `useSheetCloseLifecycle` and the `useBottomSheetAwareHandlers` re-export stay where callers import them.
- Mocks whose keys stay on the component's module are left as they are: `filter_rail.test.tsx`, `month_filter.test.tsx`, `set_budget_sheet.hook.test.ts`, `spending_plan_sheet_hook.test.ts`, `amount_hero.test.tsx`, `budget_picker_sheet.test.tsx`, `transaction_form_host.test.tsx`.
- Doc lines that name `sheet.tsx` for what stays in it (`transaction_form.md:74`'s testIDs, the `animationConfigs` force) or cite a resolver with no file (`budget.md:31`, `account_detail.md:42`) are not edited.

## Untested inputs
- `Sheet`'s calls of the six resolvers, whose JSX does not change: no suite asserts them; render suites that mount the real `Sheet` (`__tests__/screens/budget/budget_screen.test.tsx`) load the new import path (step 1).
- The features-file recipes: a walk reads them, no test does (step 5).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- oxfmt `sortImports` (`.oxfmtrc.json`) reorders the new import lines; run `npm run format` before each commit or `format:check` fails.
- Steps 3 and 4 trade a mocked value for the real one under jest's font scale 2 (`transaction_form_body.test.tsx:727-728`): `rate_editor_sheet.tsx:177` hands the mocked `Sheet` `md`. An assertion that reads a size or a clearance would turn red, and grep finds none.
- `sheet.helpers.ts` types `resolveSnapPoints` from `sheet.tsx`, a type-only cycle that Babel erases. `import/no-cycle` is off in `.oxlintrc.json`, and turning it on would flag this cycle.
- The override in step 2 names one path, so a rename of the helpers file leaves it matching nothing, with no error.

## Self-assessment
Step 2 is the step I am least sure about. The ticket names no guard, and `.oxlintrc.json` is a file its `Size:` line does not list. I added it because Acceptance 2 is a statement about what a file imports, and `.claude/rules/tests.md` puts that check in lint, so without the step that line has no gate that can fail. If the conductor reads it as scope beyond the ticket, deleting the step costs ~22 lines and leaves Acceptance 2 checked by reading the diff. Second, step 1 types `resolveSnapPoints` through `import type { SheetProps } from './sheet'` to keep Rule 1's signature byte-identical. Writing `SheetSize | undefined` instead gives the same type with no cycle, and either reading satisfies the ticket.
