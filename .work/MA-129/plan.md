# MA-129 — Account card helpers, commitment status, budget summary and the onboarding shell leave their screens
base: 10b1540f06d8d699fa269d5a6154e145bb158a94 · verify: none · flags: money path · expected diff: ~200 lines

Lines per file outside tests. Step 1: `format_owned_amount.ts` 26 (new), `net_worth_breakdown_sheet.helpers.ts` 19, `account_card.helpers.ts` 1, `stat_cards.tsx` 4, `net_worth_breakdown_sheet.tsx` 2, `account_card.tsx` 1, `budget_card.tsx` 1, `hero_card.tsx` 1, `total_balance_strip.tsx` 1. Step 2: `account_card.tsx` 1, `account_facts.helpers.ts` 1, `accounts_list.helpers.ts` 1, ADR 2026-09-07 1. Step 3: `commitment_status.ts` 2, `recurrence_label.ts` 1, six commitments importers 1 each, `replacement_account_sheet.helpers.ts` 2, ADR 2026-08-21 1. Step 4: `budget_summary.ts` 24 (new), `budget.helpers.ts` 24, `budget_buckets.helpers.ts` 3, `spending_plans.helpers.ts` 3, `budget_card.tsx` 2, `dashboard.helpers.ts` 1, `dashboard.hook.ts` 1, `dashboard.repository.ts` 1. Step 5: `keyboard_lift.geometry.ts` 11 (new), `keyboard_lift.anim.ts` 1, `onboarding_shell.geometry.ts` 10, `onboarding_shell/index.tsx` 1, `edit_account/index.tsx` 1. Step 6: `cta_footer.tsx` 6, `onboarding_shell/index.tsx` 2, `edit_account/index.tsx` 3. Step 7: the new ADR 30. Sum 196, 7 steps.

36 files: the ticket's `Size:` list of 34, plus two it missed, `docs/adr/2026-09-07-list-caption-reads-card-rows.md` (line 6 names `buildInfoRows` by path) and the decision record the money path flag asks for.

Homes. A module's shared helpers go to `src/modules/<module>/utils/`, the folder `src/modules/accounts/utils/` and `src/modules/categories/utils/` already use. Shared UI is `src/components/ui/`. Every new import of a moved piece uses the `@/` alias, except where a step says relative.

## Steps

### 1. `formatOwnedAmountParts` lives in the dashboard module's shared folder
- File: `src/modules/dashboard/utils/format_owned_amount.ts` (new), `src/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.helpers.ts` (`:53-69`, `:27`), `account_card.helpers.ts:19`, `account_card.tsx:18`, `budget_card.tsx:17`, `hero_card.tsx:20`, `stat_cards.tsx:18-21`, `net_worth_breakdown_sheet.tsx:20-27`, `total_balance_strip.tsx:22`, all in `src/modules/dashboard/screens/dashboard/components/`
- Change: the function and its JSDoc move byte-identical, signature `formatOwnedAmountParts(value: number, baseCurrency: Currency): { value: string; code: string }`. `net_worth_breakdown_sheet.helpers.ts` imports it for `resolveNetWorthForeignCaption` and does not re-export it. The seven other files import it from `@/modules/dashboard/utils/format_owned_amount`.
- Test: `none` · Acceptance bars a new assertion. `__tests__/screens/dashboard/net_worth_breakdown_sheet.helpers.test.ts:120-156` runs unchanged against the new file, its import at `:5-10` split in two.

### 2. `account_card.helpers.ts` lives in the dashboard module's shared folder
- File: `src/modules/dashboard/screens/dashboard/components/account_card.helpers.ts` to `src/modules/dashboard/utils/account_card.helpers.ts`, `src/modules/dashboard/screens/dashboard/components/account_card.tsx:17`, `src/modules/accounts/screens/accounts/detail/components/account_facts.helpers.ts:4`, `src/modules/accounts/screens/accounts/list/accounts_list.helpers.ts:6-9`, `docs/adr/2026-09-07-list-caption-reads-card-rows.md:6`
- Change: `git mv`, no content change, the alias import from step 1 holds. The three importers read `@/modules/dashboard/utils/account_card.helpers`. The ADR's Applies-to line names `buildInfoRows` in the new path.
- Test: `none` · `__tests__/screens/dashboard/account_card.helpers.test.ts:10` changes its import path, and the file stays where the ADR's line 16 cites it.

### 3. `commitment_status.ts` and `recurrence_label.ts` live in the commitments module's shared folder
- File: `src/modules/commitments/screens/commitments/commitment_status.ts` and `recurrence_label.ts` to `src/modules/commitments/utils/`; importers `src/modules/commitments/screens/commitments/index.tsx:19`, `components/commitment_row.tsx:24`, `detail/components/current_cycle_card.tsx:20`, `detail/components/detail_hero.tsx:14`, `detail/components/payment_row.tsx:9`, `detail/detail.hook.ts:16`, `src/modules/accounts/screens/accounts/detail/components/replacement_account_sheet.helpers.ts:3-4`; `docs/adr/2026-08-21-currency-aware-display-decimals.md:181`
- Change: `git mv` both. Their entity imports stay relative and become `../entities/...`, in place, so `STATUS_LABELS` stays at `commitment_status.ts:23-29`, the range `.claude/skills/emulator-verify/features/commitments.md:17` cites. Importers read `@/modules/commitments/utils/commitment_status` and `@/modules/commitments/utils/recurrence_label`. The ADR names the new path.
- Test: `none` · import path in `__tests__/screens/commitment_status.test.ts:13` and `__tests__/recurrence_label.test.ts:2`, path string in `__tests__/screens/filter_rail_usage.test.ts:60`.

### 4. The budget summary types and the band colour live in the budget module's shared folder
- File: `src/modules/budget/utils/budget_summary.ts` (new), `src/modules/budget/screens/budget/budget.helpers.ts` (`:27-36`, `:110-117`), `budget_buckets.helpers.ts:6-9`, `spending_plans.helpers.ts:37-42`, `src/modules/dashboard/screens/dashboard/components/budget_card.tsx:11-12`, `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts:14`, `dashboard.hook.ts:8`, `src/modules/dashboard/repositories/dashboard.repository.ts:5`
- Change: `OverallVM`, `BudgetDashboardSummaryVM` and `budgetBandColor(pct: number): string` with its JSDoc move byte-identical. `budget.helpers.ts` imports the three for `:210`, `:319`, `:386`, `:400` and re-exports none. The two budget helpers files and the four dashboard files import from `@/modules/budget/utils/budget_summary`.
- Test: `none` · `__tests__/budget.helpers.test.ts:459-488` runs unchanged, `budgetBandColor` leaving the import at `:4-21` for its own line.

### 5. The keyboard lift lives in shared UI
- File: `src/components/ui/keyboard_lift.geometry.ts` (new), `src/modules/onboarding/components/onboarding_shell/onboarding_shell.anim.ts` to `src/components/ui/keyboard_lift.anim.ts`, `src/modules/onboarding/components/onboarding_shell/onboarding_shell.geometry.ts` (`:1`, `:41-49`), `onboarding_shell/index.tsx:11`, `src/modules/accounts/screens/accounts/edit_account/index.tsx:19`
- Change: `resolveKeyboardLift(platform: PlatformOSType, keyboardHeight: number, bottomInset: number): number` and its JSDoc move byte-identical to the new geometry file, and the `PlatformOSType` import leaves `onboarding_shell.geometry.ts` with it. `git mv` the anim file. Its one changed line is the import, `./keyboard_lift.geometry`. `useKeyboardLiftAnim` keeps its name, `KEYBOARD_LIFT_MS` and body. Both screens import it from `@/components/ui/keyboard_lift.anim`.
- Test: `none` · `__tests__/screens/onboarding_shell_geometry.test.ts:65-77` runs unchanged, `resolveKeyboardLift` leaving the import at `:3-10` for its own line. The file keeps its name and place.

### 6. The footer lives in shared UI
- File: `src/modules/onboarding/components/onboarding_shell/onboarding_footer.tsx` to `src/components/ui/cta_footer.tsx`, `onboarding_shell/index.tsx` (`:8`, `:50`), `src/modules/accounts/screens/accounts/edit_account/index.tsx` (`:18`, `:149`)
- Change: `git mv`. Exports become `CtaFooter` and `CtaFooterProps`, props unchanged: `{ footnote: string; message?: string; cta: ReactNode }`. The CTA slot's height reads `Size.onboardingCtaTrack` and the `ONBOARDING_SHELL_TRACKS` import goes. `StatusTrack` is imported as `./status_track`. Every class, padding and spacer stays. `ONBOARDING_SHELL_TRACKS` stays whole in `onboarding_shell.geometry.ts`. Both screens import `CtaFooter` from `@/components/ui/cta_footer` and pass the props they pass today.
- Test: `none` · a component, and the repo adds no render test. `onboarding_shell_geometry.test.ts:14-19` still binds `ONBOARDING_SHELL_TRACKS.cta` to `Size.onboardingCtaTrack`, the token the footer now reads.

### 7. The decision is on record
- File: `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md` (new)
- Change: the header block of `docs/adr/2026-09-27-account-strip-one-write.md`, ticket #611 (MA-129) under #585, Applies-to listing the six new homes. Four decisions: a helper or type another module reads lives in the owner's `utils/` or in `src/components/ui/`, never under `screens/`; the module a piece left keeps no re-export; `formatOwnedAmountParts`, `formatCommitmentAmount` and `buildInfoRows` moved with bodies unchanged, proven by the five suites named under Verification whose assertions did not change; a cross-module read of a screen store or a module `components/` folder stays open under #585.
- Test: `none` · a document.

## Decision record
- `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md`: pieces another module reads live in the owner module's `utils/` or in shared UI, moved with bodies unchanged and no re-export; step 7 adds the file.

## Non-goals
- `useDashboardStore` read by `src/modules/accounts/screens/accounts/list/accounts_list.hook.ts:10`, and `BudgetEditTargetVM` read by `src/test_helpers/budget.ts:3`.
- Pieces leaving the transactions screens, MA-128 (#610).
- Any other onboarding shell file: header, progress rail, broadsheet, ambient wash, `onboarding_rise.ts`, and `resolveProgressRail`, `ONBOARDING_SHELL_TRACKS`, `resolveAmbientWashGeometry` in `onboarding_shell.geometry.ts`.
- Moving the rest of `budget.helpers.ts` or `net_worth_breakdown_sheet.helpers.ts`.
- Adding `formatOwnedAmountParts` to `src/utils/format_amount.ts`.
- Renaming or moving a test file, MA-117 (#586) renames the geometry suites. No new test, no edited assertion.
- A re-export, a barrel `index.ts` in a `utils/` folder, or an export from a module's `index.ts`.
- Editing `CLAUDE.md`, `.claude/rules/` or `.claude/skills/`.
- Any change to copy, tokens, class names or layout.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Cross-module reads: `grep -rnE "from '@/modules/(dashboard|commitments|budget)/screens/" src | grep -v "^src/app/"`, filtered to lines whose file is outside the imported module, returns `accounts_list.hook.ts:10` and `src/test_helpers/budget.ts:3` only. `grep -rn "modules/onboarding/components" src | grep -v "^src/modules/onboarding/"` returns nothing.
- Same figures: `net_worth_breakdown_sheet.helpers.test.ts`, `account_card.helpers.test.ts`, `commitment_status.test.ts`, `recurrence_label.test.ts` and `budget.helpers.test.ts` pass, and `git diff origin/main...HEAD -- __tests__` shows changed lines inside import statements and at `filter_rail_usage.test.ts:60` only.
- History: `git diff -M --summary origin/main...HEAD` lists five renames, `account_card.helpers.ts`, `commitment_status.ts`, `recurrence_label.ts`, `keyboard_lift.anim.ts`, `cta_footer.tsx`. `git grep -n "export .* from" -- src/modules/dashboard src/modules/commitments src/modules/budget src/modules/onboarding` shows no re-export of a moved symbol.

## Risks
- `src/modules/commitments/screens/commitments/index.tsx`, MA-125: it edits `:237` and `:264`, this plan `:19`. The second to merge rebases and keeps both.
- `src/modules/commitments/screens/commitments/index.tsx` and `docs/adr/2026-08-21-currency-aware-display-decimals.md`, MA-128 (#610), no plan read: different lines by the ticket. The second to merge rebases and keeps both.
- `__tests__/screens/onboarding_shell_geometry.test.ts`, MA-117: it renames the file to `onboarding_shell.geometry.test.ts` with no content change, this plan edits the import at `:3-10`. If MA-117 merges first, step 5's edit lands in the renamed file. If this merges first, MA-117's `git mv` carries the edit.
- `__tests__/screens/filter_rail_usage.test.ts`, MA-118: it deletes the file, this plan edits `:60`. If MA-118 merges first, step 3 drops the edit and the rebase resolves the conflict as deleted. If this merges first, MA-118 deletes the file as planned.
- MA-092, MA-106, MA-119: no shared file. MA-092 and MA-125 edit `.claude/skills/emulator-verify/features/commitments.md`, which this plan reads at `:17` and does not edit.
- oxfmt orders imports, so a relative import that becomes an alias moves within its block. A shift of lines 1-22 in `commitment_status.ts` would break the `:23-29` citation, which is why step 3 keeps those two imports relative.
- A squash merge records each move and its edit in one commit. `cta_footer.tsx` changes about 6 of 27 lines, above git's 50% rename threshold, and the other four change one or two lines.
- `utils/` is new in dashboard, commitments and budget, and `CLAUDE.md`'s module shape does not list it. A ruling for another folder changes paths in steps 1 to 4 and no line count.

## Self-assessment
Step 6 is the least sure. The ticket says the footer goes to shared UI and reads `Size.onboardingCtaTrack`, and it does not say what the component is called there. The plan renames it `CtaFooter` in `cta_footer.tsx`, following PR #580, which lifted `OnboardingStatusTrack` as `StatusTrack`. That rename is the only identifier change in the PR, and a reviewer who reads "behaviour-neutral move" strictly could ask for `OnboardingFooter` kept under the new path. The second uncertain point is the `utils/` folder name in steps 1 to 4: accounts and categories use it today, the ticket names no folder, and `components/` was ruled out because #585 lists cross-module reads of module `components/` as a later task.
