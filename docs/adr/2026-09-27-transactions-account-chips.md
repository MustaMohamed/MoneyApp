# ADR: One chip tap scopes the transactions tab to one account

- **Date:** 2026-09-27
- **Status:** accepted
- **Ticket:** MA-120
- **Applies to:** `toggleAccountFilter`, `countFunnelFilters` and `pruneAccountFilter` in `src/modules/transactions/screens/transactions/filter/filter.helpers.ts`; `buildAccountChips` in `src/modules/transactions/screens/transactions/transactions.helpers.ts`; `useTransactions` in `src/modules/transactions/screens/transactions/transactions.hook.ts`; `AccountChips` in `src/modules/transactions/screens/transactions/components/account_chips.tsx`

A row of chips sits between the hero and the search field: All accounts first, then one chip per active account in list order. A chip is on when the applied account filter holds exactly its one account, and All accounts is on when it holds none.

## 1. The chip writes the applied account filter and nothing else

A chip tap sets `appliedFilters.accountIds` in the screen store (`transactions.store.ts`) to that one id, or to none when the chip was already the only one on or when All accounts is tapped. Categories and the amount range stay as they were. There is no second selection field: the chips read the same applied filter the sheet writes, so the sheet's Apply, See all from an account's detail and a chip tap all land in one place. Because the list query and the month aggregate already scope by that filter, one tap re-scopes every hero figure through the existing aggregate (the 2026-09-24 transactions-month-aggregate ADR, §2) with no new arithmetic. The logic lives in `toggleAccountFilter` and the hook's `toggleAccountChip`.

## 2. The funnel counts an account selection only at two or more

One applied account is already shown by its lit chip, so the filter button's count leaves it out: `countFunnelFilters` counts accounts as 1 only when two or more are applied, and counts categories and the amount range as before. The sheet's Apply count (`countActiveFilters`) is unchanged, and so is the empty-state choice, which still reads `countActiveFilters` so one chip on with no rows shows the no-results state.

## 3. An applied account that is no longer active leaves the filter once accounts have loaded

An account archived or deleted while it sits in the applied filter would otherwise scope the tab to a chip that no longer exists. Once the account store has loaded, the hook derives the effective filter with `pruneAccountFilter`, which drops every id missing from the active account list, and writes it back to the store. Every query, the hero title, the section context label and the sheet's draft read the effective filter, so no query carries a dropped id. Before the first account load lands, the applied ids stay as they are. See all from an archived account's detail therefore lands on All accounts.
