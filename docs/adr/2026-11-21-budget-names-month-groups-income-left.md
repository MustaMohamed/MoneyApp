# ADR: Budget names are unique per category and month, a sheet group binds its month, Income left keeps its sign

- **Date:** 2026-11-21
- **Status:** accepted
- **Ticket:** MA-287, under #935
- **Applies to:** `src/modules/budget/repositories/budget.repository.ts` (`setBudget`, `BudgetNameTakenError`), `src/modules/budget/screens/budget/budget_buckets.helpers.ts` (`resolveBudgetRuleGroups`), `src/modules/budget/screens/budget/budget.hook.ts`, `src/modules/budget/screens/budget/components/set_budget_sheet.hook.ts`, `src/modules/budget/screens/budget/budget.helpers.ts` (`buildBudgetCategoriesSummary`), `src/modules/budget/screens/budget/components/summary_card.tsx`, `src/modules/budget/screens/budget/components/budget_summary_parts.tsx`

The audit found three budget defects. A same-name save overwrote a sibling's limit (H3), a group set in one month rewrote the category's default for every month without its own group (M9), and the summary clamped an over-allocated month's income figure at 0 (M8). This record states the rule each fix holds.

## 1. One name per category and month, checked inside the write

`setBudget` reads the category's budgets for the month inside its `withExclusiveWriteTransactionAsync` task, before `setBudgetRow`. A row with another id whose name matches, trimmed and compared without case, throws `BudgetNameTakenError` carrying the trimmed name as typed, and the transaction writes nothing. The budget being edited never counts against itself. The check sits in the write, not in the sheet, so two saves cannot both pass it.

Copy (`copyBudgetsToMonth`) keeps replacing a same-name budget in the target month through `buildBudgetCopyWrites`; replacing is what the user asked for there.

No migration: `013_named_monthly_budgets.ts` already holds `UNIQUE(category_id, effective_from, name)` with `name COLLATE NOCASE`.

The sheet maps the error to `Strings.budgetNameTaken(category, name, month)`, the month as its name alone. Any other failure keeps `Strings.budgetSaveError`.

## 2. A group set on the sheet binds its month only

The save writes `budget_month_category_groups` for its month and nothing else. `categories.budget_group` loses its one writer and keeps its seeded value. A month with no group of its own and no income reads that default; setting a month's income snapshots it; copy and "Use these" carry the source month's groups. A custom category, seeded with no group, starts such a month not grouped. A default an earlier save rewrote keeps that value.

The add sheet starts on the group the tab shows for the category in that month, `resolveBudgetRuleGroups` over the month's snapshot, and a category picked on the sheet moves to its own shown group unless the sheet opened from a 50/30/20 group. An untouched save resubmits the shown group, so the month shows what it showed before.

## 3. Income left is income minus category budgets, unclamped

`incomeLeft` is `snapToZero(expectedIncome - planned)`, `planned` the month's category budgets. Spending plans stay out: a plan caps spending the category figures already count. Over is `exceedsToCent(planned, expectedIncome)`, so budgets under a cent above income read 0 under Income left. Over reads `Over income` with the magnitude in `text-negative`, the colour of the summary balance's over state. With no income for the month the figure reads `Set income`, and a tap opens the income sheet.
