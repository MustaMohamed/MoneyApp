# M2e Part 1 — Foundation (types, helpers, stores)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-02-m2e-advanced-filter-drawer-design.md` §§ 4, 6, 7

**Goal:** Land the foundation — enum, strings, `AdvancedFilters` type, pure helpers (TDD), the drawer draft store (TDD), and the extension to `transactions.store.ts` for applied filters (TDD). After this part, all data shapes are defined and pure logic is fully tested.

**Tech Stack:** TypeScript strict, Zustand v5, Jest.

---

## File Structure (this part)

| File | Purpose | Created/Modified |
|---|---|---|
| `constants/enums.ts` | Add `DatePreset` enum | Modified |
| `constants/strings.ts` | Add filter-related copy | Modified |
| `app/(app)/(tabs)/transactions/filter/filter.store.ts` | `AdvancedFilters` type, `EMPTY_FILTERS` constant, drawer draft Zustand store | Created |
| `app/(app)/(tabs)/transactions/filter/filter.helpers.ts` | Pure helpers: `resolveDateRange`, `countActiveFilters`, `toQueryFilters`, `parseAmountInput`, `formatSelectionSummary` | Created |
| `app/(app)/(tabs)/transactions/transactions.store.ts` | Extend with `appliedFilters`, `setAppliedFilters`, `reset()` includes new field | Modified |
| `__tests__/filter_helpers.test.ts` | Unit tests for helpers | Created |
| `__tests__/filter_store.test.ts` | Unit tests for filter draft store | Created |
| `__tests__/transactions_screen.store.test.ts` | Extended with applied-filters tests | Modified |

---

## Task 1: Add `DatePreset` enum to constants

**Files:**
- Modify: `constants/enums.ts`

- [ ] **Step 1: Append the new enum**

Add at the end of `constants/enums.ts`:

```typescript
export enum DatePreset {
  Today      = 'today',
  ThisWeek   = 'this_week',
  ThisMonth  = 'this_month',
  LastMonth  = 'last_month',
  Last30Days = 'last_30_days',
  ThisYear   = 'this_year',
  AllTime    = 'all_time',
  Custom     = 'custom',
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS — no errors.

- [ ] **Step 3: Commit**

```bash
git add constants/enums.ts
git commit -m "feat(m2e): add DatePreset enum for filter drawer"
```

---

## Task 2: Add filter-related strings

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1: Append the new strings to the `Strings` object**

Add inside the `Strings` const, just before the closing `} as const;`:

```typescript
  // U31 Advanced Filter Drawer
  filterTitle:               'Filters',
  filterReset:               'Reset',
  filterApply:               'Apply',
  filterApplyWithCount:      (n: number) => `Apply (${n})`,

  filterSectionAccounts:     'Accounts',
  filterSectionCategories:   'Categories',
  filterSectionDate:         'Date',
  filterSectionAmount:       'Amount',

  filterAllAccounts:         'All accounts',
  filterAllCategories:       'All categories',
  filterAccountsCount:       (n: number) => `${n} selected`,
  filterCategoriesCount:     (n: number) => `${n} selected`,

  datePresetToday:           'Today',
  datePresetThisWeek:        'This week',
  datePresetThisMonth:       'This month',
  datePresetLastMonth:       'Last month',
  datePresetLast30Days:      'Last 30 days',
  datePresetThisYear:        'This year',
  datePresetAllTime:         'All time',
  datePresetCustom:          'Custom...',
  filterCustomDateRangeTitle:'Custom date range',
  filterCustomFromLabel:     'From',
  filterCustomToLabel:       'To',

  filterPickAccountsTitle:   'Select Accounts',
  filterPickCategoriesTitle: 'Select Categories',
  filterPickerDone:          'Done',

  filterAmountFromPlaceholder: 'Min',
  filterAmountToPlaceholder:   'Max',

  filterCategoryTypeExpense:   'Expense',
  filterCategoryTypeIncome:    'Income',
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add constants/strings.ts
git commit -m "feat(m2e): add filter drawer strings"
```

---

## Task 3: Create `filter.store.ts` (types + constants only)

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/filter.store.ts`

- [ ] **Step 1: Create the file with type definitions and `EMPTY_FILTERS`**

```typescript
import { Currency, DatePreset } from '@/constants/enums';

export interface AdvancedFilters {
  accountIds: string[];
  categoryIds: string[];
  datePreset: DatePreset;
  customDateFrom?: string;
  customDateTo?: string;
  amountCurrency: Currency;
  amountMin?: number;
  amountMax?: number;
}

export const EMPTY_FILTERS: AdvancedFilters = {
  accountIds: [],
  categoryIds: [],
  datePreset: DatePreset.AllTime,
  amountCurrency: Currency.EGP,
};
```

The Zustand store implementation is added in Task 5 — keeping types isolated lets the helpers (Task 4) compile without depending on store internals.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/filter.store.ts
git commit -m "feat(m2e): add AdvancedFilters type and EMPTY_FILTERS constant"
```

---

## Task 4: TDD `filter.helpers.ts`

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/filter.helpers.ts`
- Create: `__tests__/filter_helpers.test.ts`

This task has multiple TDD cycles — one helper at a time.

- [ ] **Step 1: Create the test file with the first cycle (`countActiveFilters`)**

Create `__tests__/filter_helpers.test.ts`:

```typescript
import { Currency, DatePreset } from '@/constants/enums';
import { EMPTY_FILTERS, type AdvancedFilters } from '@/app/(app)/(tabs)/transactions/filter/filter.store';
import {
  countActiveFilters,
  formatSelectionSummary,
  parseAmountInput,
  resolveDateRange,
  toQueryFilters,
} from '@/app/(app)/(tabs)/transactions/filter/filter.helpers';

describe('countActiveFilters', () => {
  it('returns 0 for EMPTY_FILTERS', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  it('counts non-empty accountIds as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, accountIds: ['a'] })).toBe(1);
  });

  it('counts non-empty categoryIds as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, categoryIds: ['c'] })).toBe(1);
  });

  it('counts non-AllTime datePreset as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, datePreset: DatePreset.Today })).toBe(1);
  });

  it('counts amountMin alone as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, amountMin: 100 })).toBe(1);
  });

  it('counts amountMax alone as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, amountMax: 500 })).toBe(1);
  });

  it('counts both amountMin and amountMax as 1 (single axis)', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, amountMin: 100, amountMax: 500 })).toBe(1);
  });

  it('sums all axes when fully populated', () => {
    const f: AdvancedFilters = {
      accountIds: ['a'],
      categoryIds: ['c'],
      datePreset: DatePreset.ThisMonth,
      amountCurrency: Currency.USD,
      amountMin: 50,
      amountMax: 200,
    };
    expect(countActiveFilters(f)).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/filter_helpers.test.ts`
Expected: FAIL — module `filter.helpers` not found.

- [ ] **Step 3: Create `filter.helpers.ts` with `countActiveFilters` only**

```typescript
import { DatePreset } from '@/constants/enums';
import type { AdvancedFilters } from './filter.store';

export function countActiveFilters(f: AdvancedFilters): number {
  let n = 0;
  if (f.accountIds.length > 0) n++;
  if (f.categoryIds.length > 0) n++;
  if (f.datePreset !== DatePreset.AllTime) n++;
  if (f.amountMin !== undefined || f.amountMax !== undefined) n++;
  return n;
}
```

- [ ] **Step 4: Run countActiveFilters tests**

Run: `npx jest __tests__/filter_helpers.test.ts -t countActiveFilters`
Expected: 8 passing.

- [ ] **Step 5: Add `resolveDateRange` tests**

Append to `__tests__/filter_helpers.test.ts`:

```typescript
describe('resolveDateRange', () => {
  // Fixed reference date: Friday, 2026-05-15
  const REF = new Date(2026, 4, 15); // month is 0-indexed → May

  it('AllTime returns no bounds', () => {
    expect(resolveDateRange(DatePreset.AllTime, undefined, undefined, REF)).toEqual({});
  });

  it('Today returns same-day bounds', () => {
    expect(resolveDateRange(DatePreset.Today, undefined, undefined, REF)).toEqual({
      from: '2026-05-15',
      to: '2026-05-15',
    });
  });

  it('ThisWeek returns Sunday→Saturday containing the ref date', () => {
    // 2026-05-15 is a Friday. Sunday of that week = 2026-05-10. Saturday = 2026-05-16.
    expect(resolveDateRange(DatePreset.ThisWeek, undefined, undefined, REF)).toEqual({
      from: '2026-05-10',
      to: '2026-05-16',
    });
  });

  it('ThisMonth returns first→last day of the ref month', () => {
    expect(resolveDateRange(DatePreset.ThisMonth, undefined, undefined, REF)).toEqual({
      from: '2026-05-01',
      to: '2026-05-31',
    });
  });

  it('LastMonth returns first→last day of previous month', () => {
    expect(resolveDateRange(DatePreset.LastMonth, undefined, undefined, REF)).toEqual({
      from: '2026-04-01',
      to: '2026-04-30',
    });
  });

  it('LastMonth correctly crosses year boundary', () => {
    const jan1 = new Date(2026, 0, 1);
    expect(resolveDateRange(DatePreset.LastMonth, undefined, undefined, jan1)).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('Last30Days returns 30-day window ending today (inclusive)', () => {
    // 30 days ending 2026-05-15 → from 2026-04-16 to 2026-05-15
    expect(resolveDateRange(DatePreset.Last30Days, undefined, undefined, REF)).toEqual({
      from: '2026-04-16',
      to: '2026-05-15',
    });
  });

  it('ThisYear returns Jan 1 → Dec 31 of ref year', () => {
    expect(resolveDateRange(DatePreset.ThisYear, undefined, undefined, REF)).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });

  it('Custom returns the provided range', () => {
    expect(
      resolveDateRange(DatePreset.Custom, '2026-03-01', '2026-03-31', REF),
    ).toEqual({ from: '2026-03-01', to: '2026-03-31' });
  });

  it('Custom returns undefined bounds when dates not provided', () => {
    expect(resolveDateRange(DatePreset.Custom, undefined, undefined, REF)).toEqual({
      from: undefined,
      to: undefined,
    });
  });
});
```

- [ ] **Step 6: Run resolveDateRange tests, verify failure**

Run: `npx jest __tests__/filter_helpers.test.ts -t resolveDateRange`
Expected: FAIL — `resolveDateRange is not a function`.

- [ ] **Step 7: Implement `resolveDateRange`**

Append to `filter.helpers.ts`:

```typescript
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function resolveDateRange(
  preset: DatePreset,
  customFrom: string | undefined,
  customTo: string | undefined,
  today: Date = new Date(),
): { from?: string; to?: string } {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  switch (preset) {
    case DatePreset.AllTime:
      return {};
    case DatePreset.Today:
      return { from: toIsoDate(t), to: toIsoDate(t) };
    case DatePreset.ThisWeek: {
      // Week starts Sunday (day === 0).
      const day = t.getDay();
      const start = new Date(t);
      start.setDate(t.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: toIsoDate(start), to: toIsoDate(end) };
    }
    case DatePreset.ThisMonth: {
      const start = new Date(t.getFullYear(), t.getMonth(), 1);
      const end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
      return { from: toIsoDate(start), to: toIsoDate(end) };
    }
    case DatePreset.LastMonth: {
      const start = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      const end = new Date(t.getFullYear(), t.getMonth(), 0);
      return { from: toIsoDate(start), to: toIsoDate(end) };
    }
    case DatePreset.Last30Days: {
      const start = new Date(t);
      start.setDate(t.getDate() - 29);
      return { from: toIsoDate(start), to: toIsoDate(t) };
    }
    case DatePreset.ThisYear: {
      const start = new Date(t.getFullYear(), 0, 1);
      const end = new Date(t.getFullYear(), 11, 31);
      return { from: toIsoDate(start), to: toIsoDate(end) };
    }
    case DatePreset.Custom:
      return { from: customFrom, to: customTo };
  }
}
```

- [ ] **Step 8: Run resolveDateRange tests**

Run: `npx jest __tests__/filter_helpers.test.ts -t resolveDateRange`
Expected: 10 passing.

- [ ] **Step 9: Add `parseAmountInput` tests**

Append to the test file:

```typescript
describe('parseAmountInput', () => {
  it('returns undefined for empty', () => {
    expect(parseAmountInput('')).toBeUndefined();
  });

  it('returns undefined for whitespace only', () => {
    expect(parseAmountInput('   ')).toBeUndefined();
  });

  it('parses a plain integer', () => {
    expect(parseAmountInput('100')).toBe(100);
  });

  it('parses a decimal', () => {
    expect(parseAmountInput('12.50')).toBe(12.5);
  });

  it('strips commas', () => {
    expect(parseAmountInput('1,234.56')).toBe(1234.56);
  });

  it('returns undefined for non-numeric', () => {
    expect(parseAmountInput('abc')).toBeUndefined();
  });

  it('returns undefined for negative', () => {
    expect(parseAmountInput('-10')).toBeUndefined();
  });
});
```

- [ ] **Step 10: Implement `parseAmountInput`**

Append to `filter.helpers.ts`:

```typescript
export function parseAmountInput(s: string): number | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const cleaned = trimmed.replace(/,/g, '');
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}
```

- [ ] **Step 11: Run parseAmountInput tests**

Run: `npx jest __tests__/filter_helpers.test.ts -t parseAmountInput`
Expected: 7 passing.

- [ ] **Step 12: Add `formatSelectionSummary` tests**

Append:

```typescript
describe('formatSelectionSummary', () => {
  it('returns the all-label when empty', () => {
    expect(formatSelectionSummary([], 'All accounts')).toBe('All accounts');
  });

  it('returns the single name when one item', () => {
    expect(formatSelectionSummary(['Bank A'], 'All')).toBe('Bank A');
  });

  it('joins two names with comma', () => {
    expect(formatSelectionSummary(['Bank A', 'Cash'], 'All')).toBe('Bank A, Cash');
  });

  it('shows first two names + remainder count for 3+', () => {
    expect(formatSelectionSummary(['A', 'B', 'C'], 'All')).toBe('A, B +1');
    expect(formatSelectionSummary(['A', 'B', 'C', 'D'], 'All')).toBe('A, B +2');
  });
});
```

- [ ] **Step 13: Implement `formatSelectionSummary`**

Append to `filter.helpers.ts`:

```typescript
export function formatSelectionSummary(names: string[], allLabel: string): string {
  if (names.length === 0) return allLabel;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}
```

- [ ] **Step 14: Run formatSelectionSummary tests**

Run: `npx jest __tests__/filter_helpers.test.ts -t formatSelectionSummary`
Expected: 4 passing.

- [ ] **Step 15: Add `toQueryFilters` tests**

Append:

```typescript
describe('toQueryFilters', () => {
  // Fix the date so resolveDateRange is deterministic — but toQueryFilters
  // calls resolveDateRange with no `today` override, so we only assert on
  // axes that are NOT date when EMPTY/AllTime.
  it('returns empty object for EMPTY_FILTERS', () => {
    expect(toQueryFilters(EMPTY_FILTERS)).toEqual({});
  });

  it('omits empty arrays', () => {
    const out = toQueryFilters({ ...EMPTY_FILTERS, amountMin: 50 });
    expect(out.accountIds).toBeUndefined();
    expect(out.categoryIds).toBeUndefined();
  });

  it('passes through non-empty accountIds', () => {
    const out = toQueryFilters({ ...EMPTY_FILTERS, accountIds: ['a', 'b'] });
    expect(out.accountIds).toEqual(['a', 'b']);
  });

  it('passes through non-empty categoryIds', () => {
    const out = toQueryFilters({ ...EMPTY_FILTERS, categoryIds: ['c'] });
    expect(out.categoryIds).toEqual(['c']);
  });

  it('emits amountCurrency only when amountMin or amountMax is set', () => {
    expect(toQueryFilters({ ...EMPTY_FILTERS }).amountCurrency).toBeUndefined();
    expect(
      toQueryFilters({ ...EMPTY_FILTERS, amountMin: 100 }).amountCurrency,
    ).toBe(Currency.EGP);
    expect(
      toQueryFilters({ ...EMPTY_FILTERS, amountMax: 500, amountCurrency: Currency.USD })
        .amountCurrency,
    ).toBe(Currency.USD);
  });

  it('emits amountMin / amountMax independently', () => {
    expect(toQueryFilters({ ...EMPTY_FILTERS, amountMin: 10 })).toMatchObject({
      amountMin: 10,
      amountCurrency: Currency.EGP,
    });
    expect(toQueryFilters({ ...EMPTY_FILTERS, amountMax: 20 })).toMatchObject({
      amountMax: 20,
      amountCurrency: Currency.EGP,
    });
  });

  it('emits dateFrom and dateTo for non-AllTime presets', () => {
    const out = toQueryFilters({ ...EMPTY_FILTERS, datePreset: DatePreset.Today });
    expect(out.dateFrom).toBeDefined();
    expect(out.dateTo).toBeDefined();
  });

  it('emits dateFrom/dateTo from custom range', () => {
    const out = toQueryFilters({
      ...EMPTY_FILTERS,
      datePreset: DatePreset.Custom,
      customDateFrom: '2026-01-01',
      customDateTo: '2026-01-31',
    });
    expect(out.dateFrom).toBe('2026-01-01');
    expect(out.dateTo).toBe('2026-01-31');
  });
});
```

- [ ] **Step 16: Implement `toQueryFilters`**

Append to `filter.helpers.ts`:

```typescript
import type { TransactionListFilters } from '@/store/transaction.store';

export function toQueryFilters(applied: AdvancedFilters): Partial<TransactionListFilters> {
  const out: Partial<TransactionListFilters> = {};

  if (applied.accountIds.length > 0) out.accountIds = applied.accountIds;
  if (applied.categoryIds.length > 0) out.categoryIds = applied.categoryIds;

  const range = resolveDateRange(applied.datePreset, applied.customDateFrom, applied.customDateTo);
  if (range.from !== undefined) out.dateFrom = range.from;
  if (range.to !== undefined) out.dateTo = range.to;

  if (applied.amountMin !== undefined) out.amountMin = applied.amountMin;
  if (applied.amountMax !== undefined) out.amountMax = applied.amountMax;
  if (applied.amountMin !== undefined || applied.amountMax !== undefined) {
    out.amountCurrency = applied.amountCurrency;
  }

  return out;
}
```

Move the `import type { TransactionListFilters }` to the top of the file with the other imports. The new fields (`accountIds`, `categoryIds`, `dateFrom`, `dateTo`, `amountMin`, `amountMax`, `amountCurrency`) on `TransactionListFilters` are added in Part 2 — typecheck will surface the missing fields when Part 2 starts. For now, declare the helpers' return type loosely:

If TypeScript complains about unknown properties on `Partial<TransactionListFilters>`, **temporarily** widen the return type to `any`:

```typescript
export function toQueryFilters(applied: AdvancedFilters): Record<string, unknown> {
  // ... same body, returning the same shape ...
}
```

Part 2 Task 6 widens `TransactionListFilters` and tightens this return type back to `Partial<TransactionListFilters>`.

- [ ] **Step 17: Run toQueryFilters tests**

Run: `npx jest __tests__/filter_helpers.test.ts -t toQueryFilters`
Expected: 8 passing.

- [ ] **Step 18: Run the full helpers test file**

Run: `npx jest __tests__/filter_helpers.test.ts`
Expected: 37 tests passing.

- [ ] **Step 19: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 20: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/filter.helpers.ts __tests__/filter_helpers.test.ts
git commit -m "feat(m2e): add filter pure helpers (resolveDateRange, countActiveFilters, toQueryFilters, parseAmountInput, formatSelectionSummary)"
```

---

## Task 5: TDD `filter.store.ts` Zustand store

**Files:**
- Modify: `app/(app)/(tabs)/transactions/filter/filter.store.ts`
- Create: `__tests__/filter_store.test.ts`

- [ ] **Step 1: Write the test file**

Create `__tests__/filter_store.test.ts`:

```typescript
import { Currency, DatePreset } from '@/constants/enums';
import {
  EMPTY_FILTERS,
  useFilterDrawerStore,
} from '@/app/(app)/(tabs)/transactions/filter/filter.store';

beforeEach(() => {
  useFilterDrawerStore.setState({
    visible: false,
    draft: EMPTY_FILTERS,
    accountPickerVisible: false,
    categoryPickerVisible: false,
    customDatePickerVisible: false,
  });
});

describe('useFilterDrawerStore — lifecycle', () => {
  it('initial state is invisible with EMPTY_FILTERS draft', () => {
    const s = useFilterDrawerStore.getState();
    expect(s.visible).toBe(false);
    expect(s.draft).toEqual(EMPTY_FILTERS);
  });

  it('open(initial) snapshots initial into draft and sets visible', () => {
    const initial = { ...EMPTY_FILTERS, accountIds: ['a', 'b'] };
    useFilterDrawerStore.getState().open(initial);
    const s = useFilterDrawerStore.getState();
    expect(s.visible).toBe(true);
    expect(s.draft).toEqual(initial);
  });

  it('close flips visible to false and dismisses any open sub-pickers', () => {
    useFilterDrawerStore.setState({
      visible: true,
      accountPickerVisible: true,
      categoryPickerVisible: true,
      customDatePickerVisible: true,
    });
    useFilterDrawerStore.getState().close();
    const s = useFilterDrawerStore.getState();
    expect(s.visible).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });

  it('resetDraft clears draft to EMPTY_FILTERS without changing visible', () => {
    useFilterDrawerStore.setState({
      visible: true,
      draft: { ...EMPTY_FILTERS, accountIds: ['x'], amountMin: 100 },
    });
    useFilterDrawerStore.getState().resetDraft();
    const s = useFilterDrawerStore.getState();
    expect(s.draft).toEqual(EMPTY_FILTERS);
    expect(s.visible).toBe(true);
  });
});

describe('useFilterDrawerStore — draft setters', () => {
  it('toggleAccountId adds when missing', () => {
    useFilterDrawerStore.getState().toggleAccountId('a');
    expect(useFilterDrawerStore.getState().draft.accountIds).toEqual(['a']);
  });

  it('toggleAccountId removes when present', () => {
    useFilterDrawerStore.setState({
      draft: { ...EMPTY_FILTERS, accountIds: ['a', 'b'] },
    });
    useFilterDrawerStore.getState().toggleAccountId('a');
    expect(useFilterDrawerStore.getState().draft.accountIds).toEqual(['b']);
  });

  it('toggleCategoryId adds and removes', () => {
    useFilterDrawerStore.getState().toggleCategoryId('c');
    expect(useFilterDrawerStore.getState().draft.categoryIds).toEqual(['c']);
    useFilterDrawerStore.getState().toggleCategoryId('c');
    expect(useFilterDrawerStore.getState().draft.categoryIds).toEqual([]);
  });

  it('setDatePreset updates only the preset, preserving custom dates', () => {
    useFilterDrawerStore.setState({
      draft: {
        ...EMPTY_FILTERS,
        datePreset: DatePreset.Custom,
        customDateFrom: '2026-01-01',
        customDateTo: '2026-01-31',
      },
    });
    useFilterDrawerStore.getState().setDatePreset(DatePreset.ThisMonth);
    const d = useFilterDrawerStore.getState().draft;
    expect(d.datePreset).toBe(DatePreset.ThisMonth);
    expect(d.customDateFrom).toBe('2026-01-01');
    expect(d.customDateTo).toBe('2026-01-31');
  });

  it('setCustomDateRange writes both dates and forces preset to Custom', () => {
    useFilterDrawerStore.getState().setCustomDateRange('2026-02-01', '2026-02-28');
    const d = useFilterDrawerStore.getState().draft;
    expect(d.customDateFrom).toBe('2026-02-01');
    expect(d.customDateTo).toBe('2026-02-28');
    expect(d.datePreset).toBe(DatePreset.Custom);
  });

  it('setAmountMin and setAmountMax independently update', () => {
    useFilterDrawerStore.getState().setAmountMin(10);
    expect(useFilterDrawerStore.getState().draft.amountMin).toBe(10);
    useFilterDrawerStore.getState().setAmountMax(50);
    expect(useFilterDrawerStore.getState().draft.amountMax).toBe(50);
  });

  it('setAmountMin(undefined) clears the value', () => {
    useFilterDrawerStore.setState({ draft: { ...EMPTY_FILTERS, amountMin: 100 } });
    useFilterDrawerStore.getState().setAmountMin(undefined);
    expect(useFilterDrawerStore.getState().draft.amountMin).toBeUndefined();
  });

  it('setAmountCurrency switches the currency', () => {
    useFilterDrawerStore.getState().setAmountCurrency(Currency.USD);
    expect(useFilterDrawerStore.getState().draft.amountCurrency).toBe(Currency.USD);
  });
});

describe('useFilterDrawerStore — sub-picker visibility', () => {
  it('setAccountPickerVisible toggles the account picker flag only', () => {
    useFilterDrawerStore.getState().setAccountPickerVisible(true);
    const s = useFilterDrawerStore.getState();
    expect(s.accountPickerVisible).toBe(true);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });

  it('setCategoryPickerVisible and setCustomDatePickerVisible work independently', () => {
    useFilterDrawerStore.getState().setCategoryPickerVisible(true);
    expect(useFilterDrawerStore.getState().categoryPickerVisible).toBe(true);
    useFilterDrawerStore.getState().setCustomDatePickerVisible(true);
    expect(useFilterDrawerStore.getState().customDatePickerVisible).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npx jest __tests__/filter_store.test.ts`
Expected: FAIL — `useFilterDrawerStore` not exported.

- [ ] **Step 3: Append the Zustand store to `filter.store.ts`**

Add below the existing types/constants:

```typescript
import { create } from 'zustand';

interface FilterDrawerState {
  visible: boolean;
  draft: AdvancedFilters;

  accountPickerVisible: boolean;
  categoryPickerVisible: boolean;
  customDatePickerVisible: boolean;

  open: (initial: AdvancedFilters) => void;
  close: () => void;
  resetDraft: () => void;

  toggleAccountId: (id: string) => void;
  toggleCategoryId: (id: string) => void;
  setDatePreset: (p: DatePreset) => void;
  setCustomDateRange: (from?: string, to?: string) => void;
  setAmountMin: (v?: number) => void;
  setAmountMax: (v?: number) => void;
  setAmountCurrency: (c: Currency) => void;

  setAccountPickerVisible: (v: boolean) => void;
  setCategoryPickerVisible: (v: boolean) => void;
  setCustomDatePickerVisible: (v: boolean) => void;
}

export const useFilterDrawerStore = create<FilterDrawerState>((set) => ({
  visible: false,
  draft: EMPTY_FILTERS,
  accountPickerVisible: false,
  categoryPickerVisible: false,
  customDatePickerVisible: false,

  open: (initial) => set({ visible: true, draft: initial }),

  close: () =>
    set({
      visible: false,
      accountPickerVisible: false,
      categoryPickerVisible: false,
      customDatePickerVisible: false,
    }),

  resetDraft: () => set({ draft: EMPTY_FILTERS }),

  toggleAccountId: (id) =>
    set((s) => ({
      draft: {
        ...s.draft,
        accountIds: s.draft.accountIds.includes(id)
          ? s.draft.accountIds.filter((x) => x !== id)
          : [...s.draft.accountIds, id],
      },
    })),

  toggleCategoryId: (id) =>
    set((s) => ({
      draft: {
        ...s.draft,
        categoryIds: s.draft.categoryIds.includes(id)
          ? s.draft.categoryIds.filter((x) => x !== id)
          : [...s.draft.categoryIds, id],
      },
    })),

  setDatePreset: (p) =>
    set((s) => ({ draft: { ...s.draft, datePreset: p } })),

  setCustomDateRange: (from, to) =>
    set((s) => ({
      draft: {
        ...s.draft,
        customDateFrom: from,
        customDateTo: to,
        datePreset: DatePreset.Custom,
      },
    })),

  setAmountMin: (v) => set((s) => ({ draft: { ...s.draft, amountMin: v } })),
  setAmountMax: (v) => set((s) => ({ draft: { ...s.draft, amountMax: v } })),
  setAmountCurrency: (c) => set((s) => ({ draft: { ...s.draft, amountCurrency: c } })),

  setAccountPickerVisible: (v) => set({ accountPickerVisible: v }),
  setCategoryPickerVisible: (v) => set({ categoryPickerVisible: v }),
  setCustomDatePickerVisible: (v) => set({ customDatePickerVisible: v }),
}));
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/filter_store.test.ts`
Expected: 16 passing.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/filter.store.ts __tests__/filter_store.test.ts
git commit -m "feat(m2e): add filter drawer Zustand store with draft state"
```

---

## Task 6: Extend `transactions.store.ts` with appliedFilters

**Files:**
- Modify: `app/(app)/(tabs)/transactions/transactions.store.ts`
- Modify: `__tests__/transactions_screen.store.test.ts`

- [ ] **Step 1: Add failing tests for the new fields**

Append to `__tests__/transactions_screen.store.test.ts`:

```typescript
import { DatePreset } from '@/constants/enums';
import { EMPTY_FILTERS } from '@/app/(app)/(tabs)/transactions/filter/filter.store';

describe('transactionsScreenStore — appliedFilters', () => {
  beforeEach(() => useTransactionsScreenStore.getState().reset());

  it('initial appliedFilters is EMPTY_FILTERS', () => {
    expect(useTransactionsScreenStore.getState().appliedFilters).toEqual(EMPTY_FILTERS);
  });

  it('setAppliedFilters updates the field', () => {
    const next = { ...EMPTY_FILTERS, datePreset: DatePreset.ThisMonth };
    useTransactionsScreenStore.getState().setAppliedFilters(next);
    expect(useTransactionsScreenStore.getState().appliedFilters).toEqual(next);
  });

  it('reset clears appliedFilters back to EMPTY_FILTERS', () => {
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['a'] });
    useTransactionsScreenStore.getState().reset();
    expect(useTransactionsScreenStore.getState().appliedFilters).toEqual(EMPTY_FILTERS);
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npx jest __tests__/transactions_screen.store.test.ts`
Expected: FAIL — `appliedFilters` does not exist on store state.

- [ ] **Step 3: Update `transactions.store.ts`**

Replace the existing file content with:

```typescript
import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';
import { EMPTY_FILTERS, type AdvancedFilters } from './filter/filter.store';

export type TransactionFilter = TransactionType | 'all';

interface TransactionsScreenState {
  searchQuery: string;
  activeFilter: TransactionFilter;
  appliedFilters: AdvancedFilters;
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  setAppliedFilters: (f: AdvancedFilters) => void;
  clearSearch: () => void;
  reset: () => void;
}

const INITIAL = {
  searchQuery: '',
  activeFilter: 'all' as const,
  appliedFilters: EMPTY_FILTERS,
};

export const useTransactionsScreenStore = create<TransactionsScreenState>((set) => ({
  ...INITIAL,
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveFilter: (f) => set({ activeFilter: f }),
  setAppliedFilters: (f) => set({ appliedFilters: f }),
  clearSearch: () => set({ searchQuery: '' }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/transactions_screen.store.test.ts`
Expected: All previous + 3 new tests passing.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS — no consumer of the store breaks (we only added a field with a default).

- [ ] **Step 6: Run the full suite to verify no regression**

Run: `npm test`
Expected: All existing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/transactions.store.ts __tests__/transactions_screen.store.test.ts
git commit -m "feat(m2e): extend transactions screen store with appliedFilters"
```

---

## Part 1 — Definition of Done

- ✅ `DatePreset` enum and filter strings landed.
- ✅ `AdvancedFilters` type and `EMPTY_FILTERS` constant exported from `filter.store.ts`.
- ✅ `filter.helpers.ts` fully implemented and unit-tested (37 tests, all green).
- ✅ `useFilterDrawerStore` Zustand store fully implemented and unit-tested (16 tests, all green).
- ✅ `useTransactionsScreenStore` extended with `appliedFilters` and `setAppliedFilters`; `reset()` clears it; 3 new tests passing alongside existing 5.
- ✅ `npm run typecheck` clean.
- ✅ `npm test` clean (no existing test regressed).
- ✅ Each task committed independently.

Proceed to `02-database.md`.
