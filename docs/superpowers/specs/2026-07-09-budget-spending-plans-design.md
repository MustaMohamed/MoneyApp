# Budget Phase 2: Spending Plans Design

## Summary

Phase 2 adds **Spending Plans** to the Budget screen for temporary budgets such as travel, a week, an event, or a short project. Monthly category budgets remain the primary monthly planning tool. Spending Plans are date-ranged, category-based budgets that can cross month boundaries and appear in the Plans tab for every month their date range intersects.

The approved model mixes two earlier directions:

- A plan always has one total limit.
- The user selects one or more expense categories included in the plan.
- Category allocations are optional detail inside the plan total.
- Category allocation totals may be less than or equal to the plan total.
- Category allocation totals must never exceed the plan total.
- A selected category cannot overlap another spending plan during the same date range.

## Goals

- Support temporary category-based budgets with custom start and end dates.
- Keep the default plan creation flow compact: name, dates, total, categories.
- Allow optional category allocations when the user wants tighter control.
- Prevent double-counting by blocking overlapping plans for the same category/date range.
- Reuse the current Budget screen structure, theme, HeroUI Native primitives, and module anatomy.

## Non-Goals

- No account-based spending plan filters in Phase 2.
- No transaction-to-specific-plan assignment UI.
- No repeating plan rules; copying remains the repeat mechanism for monthly category budgets.
- No dashboard redesign for plans in this phase.
- No changes to the 50/30/20 tab beyond preserving its current placeholder/state.
- No change to monthly category budget semantics.

## Product Model

### Plan Identity

A Spending Plan has:

- `name`: user-visible name, required.
- `startDate`: inclusive date, required.
- `endDate`: inclusive date, required and not before `startDate`.
- `totalAmount`: positive plan limit.
- `categories`: one or more selected expense categories.
- `categoryAllocations`: optional per-category limit values inside the plan total.

### Date Behavior

The Budget month selector acts as a timeline window on the Plans tab:

- A plan is visible when its date range intersects the selected month.
- A cross-month plan is the same plan in every intersecting month, not a copied monthly budget.
- Plan cards and the Plans summary show full-plan totals for the visible plans, not a prorated monthly slice.
- Spend is calculated across the full plan date range.

### Spending Calculation

Plan spending includes expense transactions only:

- Transaction date must be between `startDate` and `endDate`, inclusive.
- Transaction category must be one of the plan categories.
- Income, transfer, and non-expense movement types do not count toward plan spend.

For plans without allocations:

- All selected category spending counts toward the plan total.
- The card shows category chips, total spent, total left, and a progress bar.

For plans with allocations:

- Overall spent is still the sum of all selected category spending.
- Each allocated category row shows category spent vs allocated amount.
- If a category exceeds its allocation, that row can show an over state while the plan can still have total budget left.
- Unallocated buffer is `totalAmount - sum(categoryAllocations)`.
- Unallocated buffer is allowed and should be shown in the edit sheet when greater than zero.

## Validation Rules

### Amounts

- Plan `totalAmount` must be greater than zero.
- Each category allocation must be zero or greater.
- Sum of category allocations must be less than or equal to `totalAmount`.
- Save is blocked when allocations exceed the plan total.
- The allocation error copy should be inline near the allocation total: "Allocations exceed the plan total."

### Categories

- At least one expense category is required.
- Only expense categories are selectable.
- A selected category can appear only once in the plan.

### Overlap Prevention

The app must prevent overlapping plans for the same category/date range:

- When creating or editing a plan, compare each selected category against existing plans.
- Existing plan being edited is excluded from the conflict check.
- Date ranges overlap when `newStart <= existingEnd` and `newEnd >= existingStart`.
- If any selected category conflicts, save is blocked.
- Conflict feedback identifies the category and existing plan name where possible.

This keeps a single expense transaction from matching two spending plans.

## UI Design

### Budget Tabs

The Budget screen keeps three tabs:

- Categories
- Plans
- 50/30/20

The Plans tab becomes enabled and functional in Phase 2. The Categories tab remains the existing monthly category budget experience. The 50/30/20 tab remains unchanged for this phase.

### Plans Summary Card

The Plans tab shows a compact summary card using the same Budget screen visual language:

- Planned: sum of `totalAmount` for visible plans.
- Spent: sum of full-range spending for visible plans.
- Left: `planned - spent`.
- Progress: spent divided by planned.

If a visible plan is over budget, its overage contributes to the summary spent/left numbers. If no plans are visible for the selected month, the summary displays zero values without layout shift.

### Plan Card

Each visible plan row/card shows:

- Plan name.
- Date range.
- Category count or category chips.
- Total spent/left.
- Progress bar.
- Optional allocation rows when category allocations exist.

Plan cards should stay compact. Allocation rows show only the most important information:

- Category name.
- Spent / allocated.
- Small progress track.
- Over state when spent exceeds allocation.

### Create/Edit Plan Sheet

The Plan action opens a HeroUI-backed sheet through the existing `Sheet` primitive. The sheet contains:

- Name input.
- Start and end date controls.
- Compact total amount input.
- Compact category selector.
- "Allocate by category" switch.
- Allocation inputs for selected categories when allocation mode is enabled.
- Allocation total helper showing allocated amount, plan total, and buffer.
- Save and Cancel actions using the existing themed button styles.

When allocation mode is off, the category allocation inputs are hidden and the flow stays fast.

When allocation mode is on, allocation inputs are shown for selected categories. Leaving an allocation empty is treated as zero. Allocation sum below the total is valid and leaves buffer.

### Empty, Loading, and Error States

- First load and refresh should use skeletons that match the real summary and plan card heights.
- Empty Plans tab shows an empty state with a plan-oriented message and an action to create a plan.
- Validation errors remain inline in the sheet.
- Repository errors use the existing screen error/toast pattern.

## Data Model

Add new budget module tables through append-only migrations.

### `spending_plans`

- `id` text primary key.
- `name` text not null.
- `start_date` text not null, ISO `YYYY-MM-DD`.
- `end_date` text not null, ISO `YYYY-MM-DD`.
- `total_amount` real not null.
- `created_at` text not null.
- `updated_at` text not null.

### `spending_plan_categories`

- `plan_id` text not null references `spending_plans(id)` on delete cascade.
- `category_id` text not null references categories.
- `allocated_amount` real nullable.
- Primary key: `(plan_id, category_id)`.

`allocated_amount` is nullable so a selected category can be included in the plan without an individual allocation. Application validation treats null as zero for allocation totals.

## Module Architecture

Follow the existing budget module shape:

- Database queries live under `src/modules/budget/database/`.
- Repository logic lives in `src/modules/budget/repositories/`.
- Screen state lives in `budget.state.ts`.
- Screen derivation and actions live in `budget.hook.ts`.
- UI remains in `screens/budget/index.tsx` and focused child components.

Component files remain presentational. No `useState`, `useSharedValue`, persistence logic, or transaction aggregation logic should be added directly to components.

## Data Flow

1. Budget screen initializes with the selected month.
2. `budget.hook.ts` loads monthly category budget data and spending plans that intersect the selected month.
3. Repository returns plan records with categories and optional allocations.
4. Hook derives visible plan summaries from transaction spend by date range and category.
5. UI renders the Plans tab from derived state.
6. Create/edit sheet writes through repository actions.
7. Repository validates overlap conflicts inside the save transaction before writing plan rows.
8. After save/delete, budget state refreshes the selected month window.

## Testing Plan

Unit and repository tests should cover:

- Create plan with selected categories and no allocations.
- Create plan with allocations below total, equal to total, and above total.
- Above-total allocation save is rejected.
- Cross-month plan appears when either intersecting month is selected.
- Non-overlapping same-category plans can be saved.
- Overlapping same-category plans are rejected.
- Overlapping different-category plans can be saved.
- Editing a plan does not conflict with itself.
- Plan spending includes only expense transactions in range/category.
- Plans summary totals visible plans without applying monthly category-budget filters.

UI/hook-level tests should cover:

- Plans tab empty state.
- Allocation helper state: allocated, total, buffer, and error.
- Sheet state reset after close/save.
- Loading skeleton state for Plans summary and plan rows.

## Rollout Notes

- This phase should be implemented behind the existing Budget screen only.
- Existing monthly budget data must not be migrated or rewritten.
- Existing category budget copy behavior remains unchanged.
- Device QA must include a cross-month plan and an overlap conflict check.
