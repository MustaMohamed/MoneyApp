# ADR — a suggested budget amount rounds half up to a whole unit

- **Date:** 2026-11-21
- **Status:** accepted
- **Ticket:** MA-288 (part of #935), plan step 2
- **Decided by:** the ticket's Acceptance and Rules (reviewed 2026-11-21). Composes with
  `docs/adr/2026-08-22-money-rounding-layer.md`, whose §3 row 4 owns the rounding of
  `budgets.limit_amount`.
- **Applies to:** `resolveSuggestedAmounts` in
  `src/modules/budget/screens/budget/suggested_amounts.helpers.ts`, the "spent last month" and
  "3-month average" figures the add budget sheet offers as chips.

## 1. The decision

A suggested amount is a preview, not a stored value. Each month's spending goes to integer cents
through `toCents` (`src/utils/money.ts`), and the result rounds half up to a whole currency unit in
integer arithmetic:

- spent last month: `Math.floor((cents + 50) / 100)`, so 640.50 reads 641;
- 3-month average: `Math.floor((sumCents + 150) / 300)`, so 810.63, 606.80 and 201.07 (a mean of
  539.50) read 540, and a mean of 710.33 reads 710.

A month with no spending counts as 0 cents. A result of 0 is no suggestion, `undefined`, and draws
no chip.

## 2. Why not `roundMoney`

`roundMoney` is half-even to 2 dp, the precision of a persisted column. The suggestion is a whole
unit and the ticket asks for half up: half-even to a whole unit would read a mean of 540.50 as
540, where half up reads 541. Working in integer cents keeps a mean such as 2130.99 / 3 off the
float path.

## 3. The write still rounds once

A tapped suggestion fills the amount field as plain digits. It is rounded again only at
`BudgetRepository.setBudget`'s first statement (`src/modules/budget/repositories/budget.repository.ts:324`),
per `docs/adr/2026-08-22-money-rounding-layer.md` §3 row 4. A whole unit passes through
`roundMoney` unchanged, so the saved limit equals the chip's amount.

## 4. The invariant

The helper is listed under `toCents` in `PERMITTED` in `scripts/validate-money-rounding.js`, the
list `npm run lint` checks every `toCents` call site against.
