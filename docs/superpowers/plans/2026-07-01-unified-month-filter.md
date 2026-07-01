# Unified Month Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Transactions and Commitments the same top month filter and month picker behavior.

**Architecture:** Add a shared tested `year_month` utility for month math, then build one HeroUI-backed `MonthFilter` UI primitive under `src/components/ui/`. Wire both screens to that primitive while keeping each screen's data loading inside its existing hook/store boundary.

**Tech Stack:** Expo React Native, TypeScript, Zustand v5, HeroUI Native `PressableFeedback`, existing `Sheet`, Jest.

---

## File Structure

- Create `src/utils/year_month.ts`: shared `YYYY-MM` helpers for current month, shifting months, parsing year/month, and building year-month strings.
- Create `__tests__/utils/year_month.test.ts`: focused tests for month math and boundary behavior.
- Create `src/components/ui/month_filter.tsx`: shared top month filter and month picker sheet.
- Modify `src/constants/strings.ts`: shared month filter and picker labels.
- Modify `src/modules/transactions/screens/transactions/transactions.helpers.ts`: reuse shared month helpers for transaction period bounds.
- Modify `src/modules/transactions/screens/transactions/transactions.hook.ts`: expose `selectedMonth` and `setSelectedMonth` for month-only filtering.
- Modify `src/modules/transactions/screens/transactions/index.tsx`: render `MonthFilter`; remove carousel/date-range wiring.
- Delete `src/modules/transactions/screens/transactions/components/month_carousel.tsx`: remove the old divergent filter surface.
- Modify `src/modules/commitments/screens/commitments/commitments.hook.ts`: reuse shared month shifting and expose `selectMonth`.
- Modify `src/modules/commitments/screens/commitments/index.tsx`: render `MonthFilter`.
- Delete `src/modules/commitments/screens/commitments/components/month_navigator.tsx`: remove the old divergent filter surface.
- Modify `__tests__/screens/commitments.hook.test.ts`: cover direct month selection and year-boundary navigation.

### Task 1: Shared Month Math

**Files:**

- Create: `__tests__/utils/year_month.test.ts`
- Create: `src/utils/year_month.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.helpers.ts`

- [ ] **Step 1: Write the failing utility tests**

```ts
import {
  currentYearMonth,
  monthNumberFromYearMonth,
  shiftYearMonth,
  toYearMonth,
  yearFromYearMonth,
} from '@/utils/year_month';

describe('year_month utilities', () => {
  it('formats the current month as YYYY-MM', () => {
    expect(currentYearMonth(new Date('2026-07-15T10:00:00Z'))).toBe('2026-07');
  });

  it('builds zero-padded year-month values', () => {
    expect(toYearMonth(2026, 1)).toBe('2026-01');
    expect(toYearMonth(2026, 12)).toBe('2026-12');
  });

  it('extracts year and month number', () => {
    expect(yearFromYearMonth('2026-07')).toBe(2026);
    expect(monthNumberFromYearMonth('2026-07')).toBe(7);
  });

  it('shifts months across year boundaries', () => {
    expect(shiftYearMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftYearMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftYearMonth('2026-07', 5)).toBe('2026-12');
  });
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `npm test -- __tests__/utils/year_month.test.ts --runInBand`

Expected: FAIL because `@/utils/year_month` does not exist.

- [ ] **Step 3: Implement `src/utils/year_month.ts`**

```ts
const pad2 = (n: number): string => String(n).padStart(2, '0');

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function currentYearMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export function toYearMonth(year: number, monthNumber: number): string {
  return `${year}-${pad2(monthNumber)}`;
}

export function yearFromYearMonth(yearMonth: string): number {
  return Number(yearMonth.split('-')[0]);
}

export function monthNumberFromYearMonth(yearMonth: string): number {
  return Number(yearMonth.split('-')[1]);
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const year = yearFromYearMonth(yearMonth);
  const month = monthNumberFromYearMonth(yearMonth);
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return toYearMonth(nextYear, nextMonth);
}
```

- [ ] **Step 4: Reuse the shared utility in transaction helpers**

Update `transactions.helpers.ts` so `currentYearMonth` and month shifting are imported from `@/utils/year_month`.

- [ ] **Step 5: Run utility and transaction helper tests**

Run: `npm test -- __tests__/utils/year_month.test.ts __tests__/screens/transactions/transactions_helpers.test.ts --runInBand`

Expected: PASS.

### Task 2: Shared Month Filter UI

**Files:**

- Create: `src/components/ui/month_filter.tsx`
- Modify: `src/constants/strings.ts`

- [ ] **Step 1: Add shared strings**

Add:

```ts
monthFilterLabel: 'Month filter',
monthFilterPreviousA11y: 'Previous month',
monthFilterNextA11y: 'Next month',
monthFilterOpenA11y: (month: string) => `${month}, open month picker`,
monthPickerTitle: 'Select month',
monthPickerPreviousYearA11y: 'Previous year',
monthPickerNextYearA11y: 'Next year',
```

- [ ] **Step 2: Create `MonthFilter`**

Create a component that accepts:

```ts
interface MonthFilterProps {
  yearMonth: string;
  onChange: (yearMonth: string) => void;
}
```

It renders the shared top filter with previous/next arrows, a tappable month button, and a `Sheet` month picker. Use `shiftYearMonth`, `toYearMonth`, `yearFromYearMonth`, `monthNumberFromYearMonth`, `MONTHS_SHORT`, and `formatMonthYear`.

- [ ] **Step 3: Run typecheck after the component compiles**

Run: `npm run typecheck`

Expected: PASS.

### Task 3: Transactions Wiring

**Files:**

- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Delete: `src/modules/transactions/screens/transactions/components/month_carousel.tsx`

- [ ] **Step 1: Expose month-only actions from `useTransactions`**

Add `selectedMonth` to `state` and add a flat `setSelectedMonth(yearMonth)` action that writes `setPeriod({ type: 'month', yearMonth })`.

- [ ] **Step 2: Replace the carousel in `TransactionsScreen`**

Import `MonthFilter` from `@/components/ui/month_filter` and render:

```tsx
<MonthFilter yearMonth={state.selectedMonth} onChange={setSelectedMonth} />
```

Remove `MonthCarousel`, `DateRangeSheet`, `dateRangeSheetVisible`, `setDateRangeSheetVisible`, `setCustomRange`, and the custom-range hardware-back handling from this screen.

- [ ] **Step 3: Delete the old carousel component**

Delete `src/modules/transactions/screens/transactions/components/month_carousel.tsx`.

- [ ] **Step 4: Run targeted transaction tests**

Run: `npm test -- __tests__/screens/transactions/transactions_helpers.test.ts __tests__/screens/transactions/transactions_store.test.ts --runInBand`

Expected: PASS.

### Task 4: Commitments Wiring

**Files:**

- Modify: `__tests__/screens/commitments.hook.test.ts`
- Modify: `src/modules/commitments/screens/commitments/commitments.hook.ts`
- Modify: `src/modules/commitments/screens/commitments/index.tsx`
- Delete: `src/modules/commitments/screens/commitments/components/month_navigator.tsx`

- [ ] **Step 1: Write failing hook tests**

Add tests that verify `selectMonth('2026-08')` calls `setSelectedMonth('2026-08')`, `navigateMonth('prev')` maps `2026-01` to `2025-12`, and `navigateMonth('next')` maps `2026-12` to `2027-01`.

- [ ] **Step 2: Run commitments hook tests and verify RED**

Run: `npm test -- __tests__/screens/commitments.hook.test.ts --runInBand`

Expected: FAIL because `selectMonth` is not returned yet.

- [ ] **Step 3: Implement hook changes**

Import `shiftYearMonth` from `@/utils/year_month`, update `navigateMonth`, and return `selectMonth`.

- [ ] **Step 4: Replace the local navigator in `CommitmentsScreen`**

Import `MonthFilter` and render:

```tsx
<MonthFilter yearMonth={state.selectedMonth} onChange={selectMonth} />
```

Remove `MonthNavigator` usage and delete its component file.

- [ ] **Step 5: Run commitments hook tests**

Run: `npm test -- __tests__/screens/commitments.hook.test.ts --runInBand`

Expected: PASS.

### Task 5: Final Verification

**Files:**

- Verify only.

- [ ] **Step 1: Format check**

Run: `npm run format:check`

Expected: PASS.

- [ ] **Step 2: Lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Unit tests**

Run: `npm test -- --runInBand`

Expected: PASS.

## Self-Review

- Spec coverage: The tasks cover the shared component, picker behavior, month stepping, Transactions wiring, Commitments wiring, and old divergent controls.
- Placeholder scan: No task depends on a placeholder or undefined helper.
- Type consistency: The shared data contract is `YYYY-MM`; the shared prop is `yearMonth`; screen actions are named `setSelectedMonth` or `selectMonth`.
