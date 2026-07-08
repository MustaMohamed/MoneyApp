# Budget Phase 1 Monthly Core Design

## Summary

Phase 1 turns the Budget tab into a monthly budget workspace. It implements the approved main-screen direction: a compact month selector, a monthly summary card, category allocation rows, an icon tool rail, copy-from-month with category selection, and a matching dashboard Budget summary card.

This phase intentionally does not add Spending Plans persistence, weekly/travel budgets, or a redesigned 50/30/20 workflow. Those are Phase 2 and Phase 3.

## Product Scope

### In Scope

- Main Budget tab monthly view.
- Month selector using the same shared month picker pattern used by other tabs.
- Summary card with Budgeted, Spent, and Left for the selected month.
- Category allocation rows for the selected month.
- Add, edit, and remove category allocations for the selected month.
- Copy from a selected source month with a checklist so the user can choose which categories to copy.
- Loading, empty, and refresh-safe states for monthly budget data.
- Dashboard Budget card for the current month.
- Code-standard cleanup needed to keep Budget screen logic out of UI components.

### Out of Scope

- New database tables for temporal/travel/weekly Spending Plans.
- Plan detail screens, plan transactions, plan progress rules, or plan archive flows.
- 50/30/20 visual redesign beyond keeping the existing tab working.
- Budget alerts, notifications, rollover carry-forward, or automatic category suggestions.
- Any new dependency or native-code change.

## UX Design

### Budget Main Screen

The first screen remains the actual Budget workspace, not an explainer. The screen uses:

- Header: `Budget`.
- Month rail: previous arrow, gold month pill, next arrow.
- Tabs: current category-budget surface remains the default. Existing 50/30/20 remains available and unchanged.
- Compact monthly summary card: Budgeted / Spent / Left, progress bar, and small month status metadata.
- Icon tool rail directly under the summary:
  - Copy: opens the copy-from-month sheet.
  - Category: opens the add category budget sheet.
  - Plan: visible as the future Spending Plans affordance but disabled in Phase 1.
- Category allocation list: category icon, category name, spent/limit/left, progress bar, edit/remove gestures as today.

The Plan affordance is deliberately not wired to create data in Phase 1. This prevents a partial Spending Plans implementation while preserving the approved direction for the main screen.

### Copy Previous Month Sheet

The Copy tool opens a bottom sheet with:

- Source month control: defaults to the previous month relative to the selected month.
- Compact previous/next source controls let the user choose an earlier source month.
- Source month forward navigation stops at the month before the destination month.
- Destination month label: selected month.
- A checklist of source-month budget categories.
- Category name, icon, previous amount, and status:
  - `New` when the selected month has no explicit allocation for that category.
  - `Will replace` when the selected month already has an explicit allocation.
- Select all and clear actions.
- Reset and apply actions at the footer using the existing themed button pattern.

Default selection: all source-month categories are selected. Applying copies only selected categories into the selected month. Unselected categories in the selected month stay unchanged.

If the selected source month has no explicit category budgets, the sheet shows an empty state and disables Apply.

### Add/Edit/Remove Category Allocation

The existing set-budget sheet remains the editing surface, but it writes to the currently selected month instead of always writing to the real current month.

- Add mode shows only expense categories without an explicit allocation in the selected month.
- Edit mode updates the selected category allocation for the selected month.
- Remove writes a tombstone for the selected month, preserving older months through the existing effective-dated model.
- The 50/30/20 budget group picker remains inside the sheet because it already powers the existing lens.

### Dashboard Budget Card

The dashboard gets a compact Budget summary card alongside Transactions and Commitments.

The card shows the current calendar month only:

- Title: `Budget`.
- Month label.
- Budgeted, Spent, and Left.
- Progress bar using the existing budget band colors.
- A small count of budgeted categories.

Tapping the card opens the Budget tab.

## Data And Architecture

### Existing Data Model

No migration is required. The existing `budgets` table already supports month-specific values through `effective_from` and `limit_amount`.

Rules:

- Exact row with `effective_from === selectedMonth` controls that category's monthly limit.
- Older months do not carry forward automatically; users copy selected categories into the new month when desired.
- `limit_amount = null` is a removal tombstone.
- Same category and same month are upserted through the existing unique key.

### Repository Changes

Budget writes become month-aware:

- `setLimit(categoryId, limit, yearMonth)`
- `removeBudget(categoryId, yearMonth)`
- `copyBudgetsToMonth(sourceMonth, targetMonth, categoryIds)`

Current-month convenience behavior is not removed; callers must pass the selected month when the action comes from the Budget screen.

### Store Changes

Budget store keeps data loading centralized and remains the source for rows, spend, expected income, and loaded state.

Changes:

- Load spend for a window that includes the selected month and its previous month.
- Add month-aware write actions.
- Add copy action that writes selected category rows to the selected month then reloads.

Budget UI state moves `selectedMonth` into `budget.state.ts` so the screen hook does not use local `useState` for screen state.

### Hook And Component Boundaries

The Budget screen stays presentational. Logic belongs in:

- `budget.hook.ts`: derives view models and exposes flat actions.
- `budget.state.ts`: selected month, lens tab, sheet visibility, copy sheet visibility.
- `set_budget_sheet.state.ts`: sheet-local UI state, including any group selection touched by this work.
- `budget.helpers.ts`: pure monthly summary/copy helper calculations.

The implementation must remove or avoid `useState` in Budget UI components touched by Phase 1. If a component needs UI state, use the adjacent `.state.ts` pattern already established in the module.

## Loading, Empty, And Error States

- First load uses skeletons sized to the final summary, rail, and row layout.
- Refresh keeps the same layout footprint; it should not collapse into a spinner or cause card jumps.
- Empty monthly budget state shows the existing Budget empty state with the Category tool available.
- Copy sheet has its own empty state when the selected source month has nothing to copy.
- Repository errors follow existing store behavior: log the error, keep the screen stable, and show safe empty values where needed.

## Financial Rules

- Budgeted = sum of explicit selected-month category limits.
- Spent = selected-month expenses for those budgeted categories only.
- Left = Budgeted - Spent.
- Progress = Spent / Budgeted, or 0 when Budgeted is 0.
- Dashboard Budget card always uses the current calendar month, not a filter or selected month from the Budget tab.
- Copying a source month copies limits only. It does not copy spending, category groups, or transactions.

## Testing Plan

- Unit tests for month-aware repository/store write delegation.
- Unit tests for selected-month state actions.
- Helper tests for copy checklist view models:
  - New category.
  - Existing target category.
  - Empty source month.
  - Unselected categories remain untouched.
- Hook tests proving add/edit/remove writes use the selected month.
- Dashboard hook/component tests for current-month Budget summary loading and display.
- Existing Budget, Dashboard, Transactions, and Commitments tests must keep passing.

## Acceptance Criteria

- Budget tab opens on the current month with no loading layout shift.
- Changing the month updates summary, rows, addable categories, and copy source month.
- Adding/editing/removing a budget affects the selected month, not always the real current month.
- Copy source month lets the user choose the source month, select categories, and apply only selected limits.
- Existing 50/30/20 tab remains usable.
- Dashboard shows a compact Budget card for the current month and navigates to Budget on press.
- No new dependencies, migrations, or native-code changes.
- App code follows the module anatomy: screen UI stays presentational, logic/state stays in hook/store/state files.
