# ADR — the budget sheet's status line and chips read the sheet month's own figures

- **Date:** 2026-11-23
- **Status:** accepted
- **Ticket:** MA-319 (part of #935), plan step 7
- **Decided by:** the ticket's Acceptance, Rules and Copy (reviewed 2026-11-23). Composes with
  `docs/adr/2026-11-21-suggested-amounts-half-up.md` and `docs/adr/2026-08-22-money-rounding-layer.md`.
- **Applies to:** `resolveSetBudgetStatusLine` and `resolveSetBudgetSuggestions` in
  `src/modules/budget/screens/budget/components/set_budget_sheet.helpers.ts`, fed by
  `useSetBudgetSheet` in `set_budget_sheet.hook.ts`.

## 1. The edit line reads the budget's own spending against its saved limit

When editing, the footer reads `<spent> of <limit> spent so far in <Month>.` in the current month
and `<spent> of <limit> spent in <Month>.` in another. `spent` is the budget's own spending,
`spendByBudgetId` through `editingRow.spent`, the figure the budget row shows. `limit` is the saved
`limit_amount`, through `editingRow.limit`. The typed limit never enters the line, so typing a new
limit leaves it unchanged.

Both figures go through `formatAmount` at `CURRENCY_CONFIG[Currency.EGP].decimals`, the 0 dp the
budget row's `spentLabel` and `plannedLabel` print, so the line and the row read the same digits.

## 2. Only the sheet month's snapshot feeds the line and the chips

The chips and the status line show only while `useBudgetStore`'s `loaded` is true and its
`loadedMonth` equals the sheet's `selectedMonth`, the guard `budget.hook.ts` applies to its own
ledger (Invariant 9). While another month's snapshot is in the store, neither shows, so no figure
from another month reaches the sheet.

## 3. A chip adds no rounding point

A chip writes its plain-digit text to the limit field through the same `setLimitText` a keystroke
uses. The limit rounds once, at `BudgetRepository.setBudget`'s `roundMoney(input.limit)`, per
`docs/adr/2026-08-22-money-rounding-layer.md` §3 row 4. The chip's amount is already a whole unit
(`docs/adr/2026-11-21-suggested-amounts-half-up.md` §1), which that rounding leaves unchanged.

## 4. Another currency counts at its EGP amount

The spending behind both chips and the edit line sums `transaction_row.egp_amount`
(`src/modules/budget/database/budget_stats.ts:15`), so a USD transaction counts at the EGP amount
stored when it was written. The sheet passes `spendByMonth` through unchanged.
