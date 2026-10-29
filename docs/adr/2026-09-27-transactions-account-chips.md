# ADR: One chip tap scopes the transactions tab to one account

- **Date:** 2026-09-27
- **Status:** accepted
- **Ticket:** MA-120
- **Applies to:** `toggleAccountFilter`, `countFunnelFilters`, `pruneAccountFilter`, `AccountChipModel` and `buildAccountChips` in `src/components/ui/account_chips.helpers.ts`; `useTransactions` in `src/modules/transactions/screens/transactions/transactions.hook.ts`; `useCommitments` in `src/modules/commitments/screens/commitments/commitments.hook.ts`; `AccountChips` in `src/components/ui/account_chips.tsx`; `useAccountChipFilter` in `src/modules/accounts/store/use_account_chip_filter.hook.ts`

A row of chips sits between the hero and the search field: All accounts first, then one chip per active account in list order. A chip is on when the applied account filter holds exactly its one account, and All accounts is on when it holds none. Each account chip leads with its account-type icon in the account's glyph tone, matching the sheet's account pill, instead of the frame's coloured dot (ruled 2026-09-27).

**Amended 2026-10-21 (#781, MA-207).** Each account chip leads with a 20 dp account-type tile on the account colour, `AccountColorTile`, in place of the type icon in glyph tone, and the chip holds `Size.compactChipHeight`. All accounts has no tile, and an archived or deleted account gets no chip. `buildAccountChips` restates the `is_archived = 0 AND is_deleted = 0` filter of `getAccounts` (`src/modules/accounts/database/accounts.ts`), so a shared reader that passes another account list still gets no archived or deleted chip. The tile draws on the transactions list as on the commitments list (ruled 2026-10-20, epic #777).

## 1. The chip writes the applied account filter and nothing else

A chip tap sets `appliedFilters.accountIds` in the screen store (`transactions.store.ts`) to that one id, or to none when the chip was already the only one on or when All accounts is tapped. Categories and the amount range stay as they were. There is no second selection field: the chips read the same applied filter the sheet writes, so the sheet's Apply, See all from an account's detail and a chip tap all land in one place. Because the list query and the month aggregate already scope by that filter, one tap re-scopes every hero figure through the existing aggregate (the 2026-09-24 transactions-month-aggregate ADR, §2) with no new arithmetic. The logic lives in `toggleAccountFilter` and the hook's `toggleAccountChip`.

## 2. The funnel counts an account selection only at two or more

One applied account is already shown by its lit chip, so the filter button's count leaves it out: `countFunnelFilters` counts accounts as 1 only when two or more are applied, and counts categories and the amount range as before. The sheet's Apply count (`countActiveFilters`) is unchanged, and so is the empty-state choice, which still reads `countActiveFilters` so one chip on with no rows shows the no-results state.

## 3. An applied account that is no longer active leaves the filter once accounts have loaded

An account archived or deleted while it sits in the applied filter would otherwise scope the tab to a chip that no longer exists. Once the account store has loaded, the hook derives the effective filter with `pruneAccountFilter`, which drops every id missing from the active account list, and writes it back to the store. Every query, the hero title, the section context label and the sheet's draft read the effective filter, so no query carries a dropped id. Before the first account load lands, the applied ids stay as they are. See all from an archived account's detail therefore lands on All accounts.

**Extended 2026-10-28 (#834, MA-241).** `toggleAccountFilter`, `pruneAccountFilter` and `countFunnelFilters` moved from the transactions filter helpers to `src/components/ui/account_chips.helpers.ts`, beside `buildAccountChips`, because the commitments tab mounts the same chips. The toggle and the prune are generic over any filter with `accountIds`, so the commitments filter keeps its other fields, and `countFunnelFilters(activeCount, accountIds)` takes the count each tab's own counter gives. The commitments tab follows §1 to §3 as the transactions tab does: a chip writes the applied account filter, the funnel counts accounts only at two or more, and an account that is no longer active leaves the filter once accounts have loaded. Two or more applied accounts light no chip on either tab, and only no account lights All accounts (Decision 2026-10-23, C).

**Extended 2026-10-28 (#889, MA-271).** The effective filter and the prune of §3, and the chips and the toggle of §1, run once in `useAccountChipFilter` (`src/modules/accounts/store/use_account_chip_filter.hook.ts`). `useTransactions` and `useCommitments` both call it with their applied filter and their screen store. The prune reads the store's current filter, never the render's, so a chip press that lands before it survives. Each hook keeps its own funnel count through `countFunnelFilters`.
