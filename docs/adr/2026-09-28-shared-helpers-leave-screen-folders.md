# ADR: Pieces another module reads leave the screen folders

- **Date:** 2026-09-28
- **Status:** accepted
- **Ticket:** #611 (MA-129), under #585
- **Applies to:** `src/modules/dashboard/utils/format_owned_amount.ts`, `src/modules/dashboard/utils/account_card.helpers.ts`, `src/modules/commitments/utils/commitment_status.ts`, `src/modules/commitments/utils/recurrence_label.ts`, `src/modules/budget/utils/budget_summary.ts`, `src/components/ui/keyboard_lift.geometry.ts`, `src/components/ui/keyboard_lift.anim.ts`, `src/components/ui/cta_footer.tsx`

Accounts and dashboard imported helpers from inside the dashboard, commitments and budget screen folders, and the edit account form imported the onboarding shell's footer and keyboard lift (audit M4). Nothing at a screen file said another module depended on it, so a refactor inside one screen could break a second module with no warning. This record fixes where such a piece lives.

## 1. A piece another module reads lives in the owner's `utils/` or in shared UI

A helper or type another module imports lives in `src/modules/<owner>/utils/`, the folder accounts and categories already use, or in `src/components/ui/` when it is UI. It never lives under `screens/`. The footer and the keyboard lift went to shared UI rather than to onboarding's `components/`, because no app code outside onboarding imports from there.

The footer is `CtaFooter` in `cta_footer.tsx`, the rename PR #580 gave `OnboardingStatusTrack` when it became `StatusTrack`. Its props did not change. Its CTA slot reads `Size.onboardingCtaTrack`, the token `ONBOARDING_SHELL_TRACKS.cta` also reads, so both screens keep the 48 track.

`commitment_status.ts` keeps its two entity imports relative. An alias import would move within the block when oxfmt sorts it, and `STATUS_LABELS` would leave lines 23-29, the range `.claude/skills/emulator-verify/features/commitments.md` cites.

## 2. The module a piece left keeps no re-export

Every importer names the new path. A re-export in the old file, or a barrel `index.ts` in a `utils/` folder, would let the next caller import from the screen folder again. Whole files moved with `git mv`, so `git log --follow` keeps their history.

`budget.helpers.ts` was split rather than moved. `OverallVM`, `BudgetDashboardSummaryVM` and `budgetBandColor` went to `budget_summary.ts`, and `budget.helpers.ts` imports them back for its own use. `OverallVM` moved only because `BudgetDashboardSummaryVM` extends it.

## 3. The money helpers moved with bodies unchanged

`formatOwnedAmountParts`, `formatCommitmentAmount` and `buildInfoRows` compose money strings on screen. Their bodies and JSDoc moved byte for byte, and so did `budgetBandColor` and `resolveKeyboardLift`. `net_worth_breakdown_sheet.helpers.test.ts`, `account_card.helpers.test.ts`, `commitment_status.test.ts`, `recurrence_label.test.ts` and `budget.helpers.test.ts` pass with no assertion changed. `git diff origin/main...HEAD -- __tests__` touches import statements only.

## 4. Screen stores and module `components/` stay open

A screen store read across modules, such as `useDashboardStore` in `accounts_list.hook.ts`, and a module `components/` folder read across modules are not covered here. Both are follow-up tasks under #585.
