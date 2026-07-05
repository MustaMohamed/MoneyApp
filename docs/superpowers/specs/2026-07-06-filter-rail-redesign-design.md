# Filter Rail Redesign Design

## Goal

Unify the Transactions and Commitments month/filter controls into one shared
HeroUI-backed rail. The rail keeps the month selector at the top of each screen
and places all screen filters in one horizontally scrollable segmented row.

## Approved UI

- Use one compact rail surface below the screen header.
- Keep the month controls in the first row: previous month, selected month,
  next month.
- Keep the existing month picker sheet when the selected month is pressed.
- Use one scrollable segmented filter row under the month controls.
- Show every filter in the segmented row. Do not use a secondary chip row.
- Use a subtle right-edge fade or equivalent spacing cue only if it works with
  HeroUI/React Native without custom heavy rendering.

## Component API

Create standalone `MonthFilter` and `SegmentFilter<T extends string>`
components, then compose them in a shared `FilterRail<T extends string>`
component in `src/components/ui/filter_rail.tsx`.

```tsx
<FilterRail
  selectedMonth={state.selectedMonth}
  onSelectedMonthChange={setSelectedMonth}
  selectedFilter={state.activeFilter}
  onSelectedFilterChange={setActiveFilter}
  filters={transactionFilters}
  filterAccessibilityLabel="Transaction type filter"
/>
```

Use explicit controlled prop names because the component owns two independent
controlled values.

```ts
export interface FilterRailOption<T extends string = string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}
```

## Screen Usage

Transactions passes:

- All
- Income
- Expense
- Transfer
- CC Payment

Commitments passes:

- All
- Overdue
- Due
- Upcoming
- Paid
- Skipped

Both screens use the same component shape and spacing. Transactions still keeps
its search and advanced filter sheet below the rail. Commitments keeps its
summary/list state below the rail.

## Architecture

`FilterRail` composes existing app/HeroUI primitives:

- `Surface` or a bordered layout view for the rail container.
- standalone `MonthFilter` for month stepping and picker behavior.
- standalone `SegmentFilter` for the filter options row.
- existing `SegmentedTabs` with `layout="scrollable"` and `variant="solid-gold"`
  for the filter row.

MonthFilter and SegmentFilter keep their state/mapping logic in component hook
files. The old transaction and commitment chip components should be removed
once no callers remain.

## Testing

Add focused logic/UI tests for:

- selected month label renders.
- previous/next month callbacks emit the shifted `YYYY-MM`.
- month picker still opens and selects a month.
- every dynamic filter option renders.
- selecting a filter calls `onSelectedFilterChange` with the option value.
- Transactions and Commitments both use `FilterRail` and pass their complete
  filter option lists.

## Out Of Scope

- Changing transaction/commitment filtering logic.
- Changing summary/totals calculations.
- Adding a new dependency.
- Moving filters into a bottom sheet or overflow menu.
- Full visual/e2e testing.
