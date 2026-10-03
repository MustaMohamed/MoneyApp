# ADR: The owned and owed composers live in the shared amount formatting file

- **Date:** 2026-10-04
- **Status:** accepted
- **Ticket:** #624 (MA-136), under #585
- **Applies to:** `src/utils/format_amount.ts`, `src/modules/accounts/utils/account_info_rows.ts`, `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts`, `src/modules/transactions/screens/transactions/transactions.helpers.ts`, `src/modules/budget/screens/budget/category_detail/components/live_month_card.helpers.ts`

The owned-sign composer sat in dashboard's `utils/`, its owed twins in the net worth sheet helpers, and transactions, budget and the account detail each composed the same owned sign on their own. A change to the sign rule (ADR 2026-08-27 decision 1, the zero-gated sign of #332) had five places to land. The account card row builders sat in dashboard while accounts read them and they read accounts' store type and domain.

## 1. The owned and owed composers live in `src/utils/format_amount.ts`

`formatOwnedAmountParts`, `formatLiabilityRowValue` and `formatLiabilityAmountParts` sit together in `src/utils/format_amount.ts`, beside `formatDisplayMagnitude` and `signAmountText`, which they call. Dashboard, transactions, budget and accounts all print an owned amount, so no single module owns the composer. That adds `src/utils/` as a third home beside a module's `utils/` and shared UI, and reverses ADR 2026-09-28 §1 for a piece no single module owns. `format_owned_amount.ts` was folded into the file, not moved whole, so its one commit of history (#623) ends at its deletion. The dashboard module keeps no re-export.

## 2. The three copies call the owned composer

`formatHeroAmount` (transactions hero), `resolveLiveMonthLeftPresentation` (category detail live month card) and `formatAccountBalanceParts` (account detail balance, adjust balance sheet, archive confirmation) take their sign from `formatOwnedAmountParts`.

The account detail passes its own magnitude as the optional third argument, `formatAmount(Math.abs(balance), decimals)` with its `printsAsZero`. `formatDisplayMagnitude` prints an exact zero at 0dp and escalates a sub-unit amount to 2dp, so on its default magnitude the hero would print `0 USD` for `0.00 USD` and `−0.40 EGP` for `0 EGP` at a balance of −0.4. Every two-argument call prints what it printed before.

## 3. Accounts owns the account card row builders

`buildInfoRows`, `buildMonthRows`, `InfoRow` and `InfoRowKind` moved with `git mv` to `src/modules/accounts/utils/account_info_rows.ts`, so `git log --follow` keeps their history. Dashboard's account card imports them from accounts, and accounts no longer imports dashboard for them. The one accounts import of dashboard left is `useDashboardStore` in `accounts_list.hook.ts`, a screen store, which ADR 2026-09-28 §4 leaves to a task under #585.

## 4. Strings and assertions are unchanged

Every screen prints the same string for the same amount and currency. `net_worth_breakdown_sheet.helpers.test.ts` and `account_card.helpers.test.ts` changed their import lines only; no assertion was added, edited or removed.
