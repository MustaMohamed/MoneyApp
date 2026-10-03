# ADR: Pieces another module reads leave the screen folders

- **Date:** 2026-09-28
- **Status:** accepted
- **Ticket:** #611 (MA-129), under #585
- **Applies to:** `src/utils/format_amount.ts`, `src/modules/accounts/utils/account_card.helpers.ts`, `src/modules/commitments/utils/commitment_status.ts`, `src/modules/commitments/utils/recurrence_label.ts`, `src/modules/budget/utils/budget_summary.ts`, `src/components/ui/keyboard_lift.geometry.ts`, `src/components/ui/keyboard_lift.anim.ts`, `src/components/ui/cta_footer.tsx`

Accounts and dashboard imported helpers from inside the dashboard, commitments and budget screen folders, and the edit account form imported the onboarding shell's footer and keyboard lift (audit M4). Nothing at a screen file said another module depended on it, so a refactor inside one screen could break a second module with no warning. This record fixes where such a piece lives.

## 1. A piece another module reads lives in the owner's `utils/` or in shared UI

A helper or type another module imports lives in `src/modules/<owner>/utils/`, the folder accounts and categories already use, or in `src/components/ui/` when it is UI. It never lives under `screens/`. `utils/` holds the helpers and types other modules read, display helpers included, while money math and derivations go to `domain/`, where `.claude/rules/money.md` loads, and standalone fixed tables go to `constants/`. The footer and the keyboard lift left onboarding's `components/` for shared UI, because the ticket's Acceptance bars app code outside onboarding from importing there.

Audit M4 (`docs/superpowers/reviews/2026-07-29-full-technical-audit.md:401`) sent the budget type to `entities/` and both budget pieces out through the module barrel; this record keeps deep imports instead, because they are the house form, 1 barrel import in `src/modules` (`account_form.tsx:10`) against 212 deep imports from one module into another, and barrels are audit M2's work, as `docs/adr/2026-08-19-dashboard-net-worth-refusal.md:291-294` records.

The footer is `CtaFooter` in `cta_footer.tsx`, the rename PR #580 gave `OnboardingStatusTrack` when it became `StatusTrack`. Its props did not change. Both screens keep the 48 track because `cta_footer.tsx:23` reads `Size.ctaFooterTrack`. `ONBOARDING_SHELL_TRACKS.cta` and `ONBOARDING_SHELL_TRACKS.statusTrack` had no reader in `src` after the move, so MA-137 (#625) removed both and renamed the token for the footer.

**Superseded in part 2026-10-04 (#624).** A piece no single module owns lives in `src/utils/`: the owned and owed amount composers, which dashboard, transactions, budget and accounts all print, moved into `src/utils/format_amount.ts`. The account card row builders moved to their owner's `utils/` under this section, from dashboard to accounts. `docs/adr/2026-10-04-owned-owed-composers-shared-home.md` records both.

## 2. The module a piece left keeps no re-export

Every importer names the new path. A re-export in the old file, or a barrel `index.ts` in a `utils/` folder, would let the next caller import from the screen folder again. Whole files moved with `git mv`, so `git log --follow` keeps their history.

`budget.helpers.ts` was split rather than moved. `OverallVM`, `BudgetDashboardSummaryVM` and `budgetBandColor` went to `budget_summary.ts`, and `budget.helpers.ts` imports them back for its own use. `OverallVM` moved only because `BudgetDashboardSummaryVM` extends it.

## 3. The money helpers moved with bodies unchanged

`formatOwnedAmountParts`, `formatCommitmentAmount` and `buildInfoRows` compose money strings on screen. Their bodies moved byte for byte, and so did those of `budgetBandColor` and `resolveKeyboardLift`. Every comment on them moved unchanged except the seven-line JSDoc on `formatOwnedAmountParts`, which became one line under the comment rule in `CLAUDE.md` § Conventions. `net_worth_breakdown_sheet.helpers.test.ts`, `account_card.helpers.test.ts`, `commitment_status.test.ts`, `recurrence_label.test.ts` and `budget.helpers.test.ts` pass with no assertion changed.

## 4. Screen stores and module `components/` stay open

A screen store read across modules, such as `useDashboardStore` in `accounts_list.hook.ts`, and a module `components/` folder read across modules are not covered here. Both are follow-up tasks under #585.
