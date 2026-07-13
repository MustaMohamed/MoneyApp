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

The Plans tab shows a compact, data-rich summary card using the same Budget screen visual language. The approved visual reference is `.superpowers/brainstorm/28310-1783638695/content/spending-plans-full-redesign.html`.

The summary hierarchy is:

- Eyebrow: visible plan count for the selected month, for example `4 plans in July`.
- Primary value: total amount left across visible plans.
- Attention badge: count of visible plans in `watch` or `over` state.
- Money line: total spent of total planned, plus overall percentage used.
- One overall progress bar: total spent divided by total planned.
- Compact metrics: active plan count, upcoming plan count, and itemized amount/percentage.
- Full-width status breakdown row with four evenly distributed items:
  - green check-circle icon and on-track count;
  - gold alert-circle icon and watch count;
  - red alert-octagon icon and over-budget count;
  - blue clock icon and upcoming count.

Summary calculations use full-plan values for visible plans:

- `planned = sum(totalAmount)`.
- `spent = sum(full-range plan spending)`.
- `left = planned - spent`.
- `pct = planned > 0 ? spent / planned : 0`.
- `itemizedAmount = sum(category allocations)`.
- `itemizedPct = planned > 0 ? itemizedAmount / planned : 0`.
- `needsAttention = watchCount + overCount`.

Itemized percentage is neutral context, not a health score. Category allocations are optional, so less than 100% itemized is valid. The overall card must not show one aggregate time-elapsed marker because visible plans can have different date ranges; pace belongs to each individual plan.

If a visible plan is over budget, its overage contributes to the summary spent/left numbers. If no plans are visible for the selected month, the summary displays zero values without layout shift.

### Plan Health States

Each plan derives one compact state from dates, total spend, pace, and category pressure:

- `upcoming`: today is before `startDate`.
- `over`: spent exceeds the plan total. This takes precedence over pace and category warnings.
- `watch`: the plan is active and either:
  - budget-used percentage is at least 10 percentage points ahead of elapsed-time percentage; or
  - an allocated category is at or above the existing 80% warning threshold.
- `onTrack`: every other started plan, including a completed plan that finished within its total.

For an inclusive plan date range:

- `totalDays = daysBetween(startDate, endDate) + 1`.
- `elapsedDays = clamp(daysBetween(startDate, today) + 1, 0, totalDays)`.
- `elapsedPct = totalDays > 0 ? elapsedDays / totalDays : 0`.
- `paceDelta = spentPct - elapsedPct`.

The UI expresses pace as percentage points, for example `20 pts ahead of pace`. Pace is not shown for upcoming plans. Completed over-budget plans show their final overage instead of a pace comparison.

### Plan Card

Each visible plan row/card shows:

- Plan name.
- Compact status label beside the plan name.
- Date range and lifecycle copy such as `5 days left`, `starts in 13 days`, or `ended yesterday`.
- Remaining or over-budget amount as the right-aligned primary value.
- Total spent of total planned and percentage used.
- One progress bar with a blue elapsed-time marker for active plans.
- One pace or final-state insight beneath the progress bar.
- Up to three compact category chips, followed by `+N` when more categories are hidden.
- Assigned and flexible amounts in the footer when allocations exist.

Plan cards stay compact and do not expand full category rows inline. Category chips remove the visible category name and keep:

- A category-colored icon inside a circular progress ring.
- `spent / allocated`.
- Percentage used.
- An accessible label containing the category name and complete values.

For a selected category without an individual allocation, the chip shows the icon and category spend without inventing a percentage or category limit. Full category names return in the plan detail sheet where identification matters.

### Plan Detail Sheet

Tapping a plan opens a compact, scrollable detail sheet. Its hierarchy is:

1. Header with plan name and an edit icon action.
2. Summary with amount left/over, date range, lifecycle copy, spent of total, percentage used, progress bar, and elapsed-time marker when active.
3. Four compact metrics: budget used, time elapsed, assigned amount, and flexible amount.
4. At most two actionable insights:
   - plan pace or final overage;
   - highest-pressure allocated category when one is in warning/over state.
5. Category rows with category name, circular icon progress, spent/allocated, remaining/over amount, and concise state copy.
6. A flexible-plan-amount row when the plan has unallocated buffer.
7. One themed `Edit plan` footer action.

For categories without individual allocations, the detail row shows total category spend and `Included · no category limit`; it must not show a fabricated percentage, remaining amount, or progress ring.

The plan detail summary and category rows use the same derived view model as the overview card. Components remain presentational and do not recalculate dates, pace, status, or financial values.

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

- First load and refresh should use skeletons that match the redesigned summary, plan card, and detail-summary geometry without vertical shift.
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
- Inclusive elapsed-day and elapsed-percentage calculations.
- Upcoming, on-track, watch, and over state precedence.
- Watch state from pace and from category pressure.
- Overall status counts, attention count, itemized amount, and itemized percentage.
- Unallocated categories never receive fabricated limit percentages.

UI/hook-level tests should cover:

- Plans tab empty state.
- Allocation helper state: allocated, total, buffer, and error.
- Sheet state reset after close/save.
- Loading skeleton state for Plans summary and plan rows.
- Overall status row uses the approved icon and color mapping.
- Plan cards receive derived state, pace, lifecycle, and compact chip view models.
- Plan detail receives derived summary metrics, insights, and category rows.

## Rollout Notes

- This phase should be implemented behind the existing Budget screen only.
- Existing monthly budget data must not be migrated or rewritten.
- Existing category budget copy behavior remains unchanged.
- Device QA must include a cross-month plan and an overlap conflict check.
