# Filter Rail Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace separate month and chip controls on Transactions and Commitments with one shared compact month + scrollable segmented filter rail.

**Architecture:** Keep `MonthFilter` and `SegmentFilter<T>` standalone. Put MonthFilter picker UI state in `month_filter.state.ts`, component logic in hooks, and keep `FilterRail<T>` as the compact surface that composes both pieces. Transactions and Commitments pass dynamic `filters` arrays and controlled month/filter props. Remove old screen-specific chip components after integration.

**Tech Stack:** Expo React Native, TypeScript, HeroUI Native, existing `Sheet`, existing `SegmentedTabs`, Jest + React Native Testing Library.

---

## File Map

- Create: `src/components/ui/filter_rail.tsx` — composed rail wrapper and exported `FilterRailOption<T>` type.
- Create: `src/components/ui/month_filter.tsx` — standalone month filter shell.
- Create: `src/components/ui/month_filter.state.ts` — month picker visibility/year state.
- Create: `src/components/ui/month_filter.hook.ts` — month picker state and date logic.
- Create: `src/components/ui/segment_filter.tsx` — standalone segmented filter shell.
- Create: `src/components/ui/segment_filter.hook.ts` — segment mapping logic.
- Create: `__tests__/components/ui/filter_rail.test.tsx` — composed behavior tests.
- Create: `__tests__/components/ui/month_filter.test.tsx` — standalone month behavior tests.
- Create: `__tests__/components/ui/segment_filter.test.tsx` — dynamic segment behavior tests.
- Modify: `src/modules/transactions/screens/transactions/index.tsx` — use `FilterRail`.
- Modify: `src/modules/commitments/screens/commitments/index.tsx` — use `FilterRail`.
- Modify: `__tests__/screens/commitments.screen.test.tsx` — update shared rail mock.
- Create: `__tests__/screens/filter_rail_usage.test.ts` — static screen contract for full option lists.
- Delete: `src/modules/transactions/screens/transactions/components/type_chips.tsx`.
- Delete: `src/modules/commitments/screens/commitments/components/status_filter_chips.tsx`.
- Keep: `src/components/ui/month_filter.tsx` as a standalone component composed
  by `FilterRail`.

## Task 1: Shared FilterRail Tests

**Files:**
- Create: `__tests__/components/ui/filter_rail.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { FilterRail } from '@/components/ui/filter_rail';
import { Strings } from '@/constants/strings';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: ReactNode }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    if (!isOpen) return null;
    return (
      <View>
        <Text>{title}</Text>
        {children}
      </View>
    );
  },
}));

const filters = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
] as const;

describe('FilterRail', () => {
  it('renders the selected month and every dynamic filter', () => {
    const { getByText } = render(
      <FilterRail
        selectedMonth="2026-08"
        onSelectedMonthChange={jest.fn()}
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    expect(getByText('August 2026')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('Expense')).toBeTruthy();
  });

  it('changes to the previous and next month from the step buttons', () => {
    const onSelectedMonthChange = jest.fn();
    const { getByLabelText, rerender } = render(
      <FilterRail
        selectedMonth="2026-01"
        onSelectedMonthChange={onSelectedMonthChange}
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    fireEvent.press(getByLabelText(Strings.monthFilterPreviousA11y));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2025-12');

    rerender(
      <FilterRail
        selectedMonth="2026-12"
        onSelectedMonthChange={onSelectedMonthChange}
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    fireEvent.press(getByLabelText(Strings.monthFilterNextA11y));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2027-01');
  });

  it('opens the picker and changes to the selected month', () => {
    const onSelectedMonthChange = jest.fn();
    const { getByLabelText, getByText } = render(
      <FilterRail
        selectedMonth="2026-08"
        onSelectedMonthChange={onSelectedMonthChange}
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    fireEvent.press(getByLabelText(Strings.monthFilterOpenA11y('August 2026')));
    expect(getByText(Strings.monthPickerTitle)).toBeTruthy();

    fireEvent.press(getByLabelText('Nov 2026'));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2026-11');
  });

  it('selects a dynamic filter by value', () => {
    const onSelectedFilterChange = jest.fn();
    const { getByText } = render(
      <FilterRail
        selectedMonth="2026-08"
        onSelectedMonthChange={jest.fn()}
        selectedFilter="all"
        onSelectedFilterChange={onSelectedFilterChange}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    fireEvent.press(getByText('Expense'));
    expect(onSelectedFilterChange).toHaveBeenCalledWith('expense');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runTestsByPath __tests__/components/ui/filter_rail.test.tsx`

Expected: FAIL because `@/components/ui/filter_rail` does not exist.

## Task 2: Implement Standalone Filters And FilterRail

**Files:**
- Create: `src/components/ui/filter_rail.tsx`

- [ ] **Step 1: Add the shared component**

Implement standalone `MonthFilter`, standalone `SegmentFilter`, and compose them
inside `FilterRail`. Keep UI state in `.state.ts` and derived/actions in hooks.

Implement the exported rail option API exactly:

```ts
export interface FilterRailOption<T extends string = string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}
```

Behavior:

- Render selected month using `formatMonthYear(selectedMonth)`.
- Shift month with `shiftYearMonth(selectedMonth, -1 | 1)`.
- Open the same month picker sheet and use `toYearMonth(pickerYear, monthNumber)`.
- Render filters through `SegmentFilter` with `SegmentedTabs` using `layout="scrollable"`,
  `variant="solid-gold"`, and `scrollAlign="start"`.
- Use prop names from the spec:
  `selectedMonth`, `onSelectedMonthChange`, `selectedFilter`,
  `onSelectedFilterChange`, `filters`, `filterAccessibilityLabel`.

- [ ] **Step 2: Run component test to verify it passes**

Run: `npm test -- --runTestsByPath __tests__/components/ui/filter_rail.test.tsx`

Expected: PASS.

## Task 3: Integrate Transactions

**Files:**
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Delete: `src/modules/transactions/screens/transactions/components/type_chips.tsx`

- [ ] **Step 1: Replace imports**

Remove `MonthFilter` and `TypeChips` imports. Add:

```ts
import { FilterRail, type FilterRailOption } from '@/components/ui/filter_rail';
import { TransactionType } from '@/constants/enums';
```

- [ ] **Step 2: Add transaction filter options**

Place this constant near the `TransactionSection` type:

```ts
const TRANSACTION_FILTERS: FilterRailOption<TransactionFilter>[] = [
  { value: 'all', label: Strings.filterAll },
  { value: TransactionType.Income, label: Strings.addTxTypeIncome },
  { value: TransactionType.Expense, label: Strings.addTxTypeExpense },
  { value: TransactionType.Transfer, label: Strings.addTxTypeTransfer },
  { value: TransactionType.CCPayment, label: Strings.addTxTypeCCPayment },
];
```

- [ ] **Step 3: Replace controls**

Replace the separate month and type controls with:

```tsx
<FilterRail
  selectedMonth={state.selectedMonth}
  onSelectedMonthChange={setSelectedMonth}
  selectedFilter={state.activeFilter}
  onSelectedFilterChange={setActiveFilter}
  filters={TRANSACTION_FILTERS}
  filterAccessibilityLabel="Transaction type filter"
/>
```

- [ ] **Step 4: Delete the old component**

Delete `src/modules/transactions/screens/transactions/components/type_chips.tsx`.

## Task 4: Integrate Commitments

**Files:**
- Modify: `src/modules/commitments/screens/commitments/index.tsx`
- Modify: `__tests__/screens/commitments.screen.test.tsx`
- Delete: `src/modules/commitments/screens/commitments/components/status_filter_chips.tsx`

- [ ] **Step 1: Replace imports**

Remove `MonthFilter` and `StatusFilterChips` imports. Add:

```ts
import { FilterRail, type FilterRailOption } from '@/components/ui/filter_rail';
import { CommitmentPaymentStatus } from '@/constants/enums';
```

- [ ] **Step 2: Add commitment filter options**

Place this constant near the `CommitmentSection` type:

```ts
const COMMITMENT_FILTERS: FilterRailOption<CommitmentStatusFilter>[] = [
  { value: 'all', label: Strings.filterAll },
  { value: CommitmentPaymentStatus.Overdue, label: Strings.commitmentsStatusOverdue },
  { value: CommitmentPaymentStatus.Due, label: Strings.commitmentsStatusDue },
  { value: CommitmentPaymentStatus.Upcoming, label: Strings.commitmentsStatusUpcoming },
  { value: CommitmentPaymentStatus.Paid, label: Strings.commitmentsStatusPaid },
  { value: CommitmentPaymentStatus.Skipped, label: Strings.commitmentsStatusSkipped },
];
```

- [ ] **Step 3: Replace controls**

Render the rail above the commitments loaded/empty branching:

```tsx
<FilterRail
  selectedMonth={state.selectedMonth}
  onSelectedMonthChange={selectMonth}
  selectedFilter={state.statusFilter}
  onSelectedFilterChange={setStatusFilter}
  filters={COMMITMENT_FILTERS}
  filterAccessibilityLabel="Commitment status filter"
/>
```

Remove `StatusFilterChips` from `listHeaderComponent`; keep `SummaryHeader`.

- [ ] **Step 4: Update the screen test mock**

Mock `@/components/ui/filter_rail` instead of `@/components/ui/month_filter`.
Keep the test asserting the rail remains mounted for empty commitments.

- [ ] **Step 5: Delete the old component**

Delete `src/modules/commitments/screens/commitments/components/status_filter_chips.tsx`.

## Task 5: Screen Usage Contract

**Files:**
- Create: `__tests__/screens/filter_rail_usage.test.ts`
- Delete: `src/components/ui/month_filter.tsx`
- Delete: `__tests__/components/ui/month_filter.test.tsx`

- [ ] **Step 1: Write static usage tests**

Add a static test that reads both screen files and verifies:

- Transactions imports `FilterRail`.
- Transactions contains all five transaction labels.
- Commitments imports `FilterRail`.
- Commitments contains all six status labels.
- Neither screen imports the old chip components.

- [ ] **Step 2: Run test**

Run: `npm test -- --runTestsByPath __tests__/screens/filter_rail_usage.test.ts`

Expected: PASS after Tasks 3 and 4.

- [ ] **Step 3: Remove the old month-only component**

Delete `src/components/ui/month_filter.tsx` and
`__tests__/components/ui/month_filter.test.tsx` once `rg "MonthFilter|month_filter" src __tests__`
shows no screen or test consumer except the old component test.

## Task 6: Verification

**Files:**
- All touched files.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm test -- --runTestsByPath \
  __tests__/components/ui/filter_rail.test.tsx \
  __tests__/screens/commitments.screen.test.tsx \
  __tests__/screens/filter_rail_usage.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run CI parity before push**

Run:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android
```

Expected: every command exits 0.

## Self-Review

- Spec coverage: component API, all filters in scrollable segments, month picker,
  screen integrations, and obsolete chip removal are covered.
- Placeholder scan: no TODO/TBD placeholders remain.
- Type consistency: `FilterRailOption`, `selectedMonth`, `selectedFilter`, and
  handler names match the approved API.
