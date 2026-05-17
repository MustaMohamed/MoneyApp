# Section 6 · Transactions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Transactions domain to HeroUI Native + Cairo Nights, introduce a month-carousel-driven IA with a tinted-cells totals strip and polarity-aware deltas, rewrite the transaction row template, polish the detail screen with a new TransferFlowCard, and fully restructure the filter drawer as an accordion-based HeroUI Sheet — retiring all four `react-native-actions-sheet` consumers in the transactions domain.

**Architecture:** v1/v2 directory split (same pattern as §2 / §5). V1 code at `screens/transactions/` stays untouched until the cleanup task. V2 code lives in `screens/transactions_v2/`. The route file `app/(app)/(tabs)/transactions/index.tsx` becomes a flag-branch component reading `FeatureFlags.newTransactions`. After local QA, a single promotion commit flips the flag; a cleanup commit deletes V1, restores the route to a one-line re-export, removes the flag, and updates CLAUDE.md.

**Tech Stack:** React Native · Expo · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · HeroUI Native v1.0 · Unistyles 3 (via Uniwind) · @gorhom/bottom-sheet v5 · react-native-reanimated v4 · MaterialCommunityIcons · Jest · React Native Testing Library

**Spec:** [`docs/superpowers/specs/2026-05-17-section-6-transactions-design.md`](../specs/2026-05-17-section-6-transactions-design.md)

---

## Parallel Execution Map

```
Group A (Shared infra)                  ─── no deps ──► start immediately
  Task 1: Pure helpers (transactions.helpers.ts)
  Task 2: Strings — add new keys
  Task 3: TypeBadge primitive
  Task 4: getPeriodTotals DB query

Group B (V2 scaffold)                   ─── depends on A ──► after Tasks 1 + 2
  Task 5: V2 state + store + anim scaffold
  Task 6: V2 filter store + filter.helpers (date-free)
  Task 7: V2 filter state

Group C (List-screen components)        ─── parallel after Group A/B
  Task 8:  DateHeader V2 (polish from V1)
  Task 9:  TransactionRow V2 (depends on Task 3 TypeBadge)
  Task 10: MonthCarousel
  Task 11: TotalsStrip
  Task 12: SearchRow
  Task 13: TypeChips
  Task 14: DateRangeSheet

Group D (Filter sheet)                  ─── parallel after Group A/B
  Task 15: AccountAccordion
  Task 16: CategoryAccordion
  Task 17: AmountAccordion
  Task 18: FilterSheet index + hook (depends on Tasks 15–17)

Group E (Detail screen)                 ─── parallel after Group A
  Task 19: TransferFlowCard
  Task 20: Detail components polish (Hero · DetailRow · DetailRowsCard · ActionRow · DeleteConfirm · NotFound)
  Task 21: Detail screen wiring (index · hook · state · store · anim)

Group F (Screen integration)            ─── depends on Groups B + C + D
  Task 22: V2 transactions hook
  Task 23: V2 screen index + smoke test

Group G (Route flag-branch + QA)        ─── depends on F + E
  Task 24: Route flag-branch (flag still false)
  Task 25: Manual QA window (no code; verification gate)

Group H (Promotion + cleanup)           ─── depends on G
  Task 26: Promotion commit — flip flag to true
  Task 27: Cleanup commit — delete V1 tree, restore one-liner, remove flag, update CLAUDE.md
```

**Parallel-safe inside Group C:** Tasks 8–14 all parallel after Tasks 1–3 land. Task 9 specifically depends on Task 3.

**Parallel-safe inside Group D:** Tasks 15, 16, 17 parallel after Task 6 lands; Task 18 sequential after 15–17.

**Parallel-safe inside Group E:** Tasks 19, 20 parallel; Task 21 sequential after both.

---

## File Map

### New files (under `screens/transactions_v2/` unless noted)

```
screens/transactions_v2/index.tsx
screens/transactions_v2/transactions.hook.ts
screens/transactions_v2/transactions.state.ts
screens/transactions_v2/transactions.store.ts
screens/transactions_v2/transactions.anim.ts
screens/transactions_v2/transactions.helpers.ts
screens/transactions_v2/components/date_header.tsx
screens/transactions_v2/components/transaction_row.tsx
screens/transactions_v2/components/transaction_row.anim.ts
screens/transactions_v2/components/month_carousel.tsx
screens/transactions_v2/components/month_carousel.anim.ts
screens/transactions_v2/components/totals_strip.tsx
screens/transactions_v2/components/search_row.tsx
screens/transactions_v2/components/type_chips.tsx
screens/transactions_v2/components/date_range_sheet.tsx
screens/transactions_v2/filter/index.tsx
screens/transactions_v2/filter/filter.hook.ts
screens/transactions_v2/filter/filter.state.ts
screens/transactions_v2/filter/filter.store.ts
screens/transactions_v2/filter/filter.helpers.ts
screens/transactions_v2/filter/components/account_accordion.tsx
screens/transactions_v2/filter/components/category_accordion.tsx
screens/transactions_v2/filter/components/amount_accordion.tsx
screens/transactions_v2/detail/index.tsx
screens/transactions_v2/detail/detail.hook.ts
screens/transactions_v2/detail/detail.state.ts
screens/transactions_v2/detail/detail.store.ts
screens/transactions_v2/detail/detail.anim.ts
screens/transactions_v2/detail/components/detail_hero.tsx
screens/transactions_v2/detail/components/detail_row.tsx
screens/transactions_v2/detail/components/detail_rows_card.tsx
screens/transactions_v2/detail/components/transfer_flow_card.tsx
screens/transactions_v2/detail/components/action_row.tsx
screens/transactions_v2/detail/components/delete_confirm_dialog.tsx
screens/transactions_v2/detail/components/not_found_state.tsx

components/ui/type_badge.tsx

__tests__/screens/transactions_v2/transactions_helpers.test.ts
__tests__/screens/transactions_v2/transactions_screen.test.tsx
__tests__/screens/transactions_v2/components/type_badge.test.tsx
__tests__/screens/transactions_v2/components/month_carousel.test.tsx
__tests__/screens/transactions_v2/components/totals_strip.test.tsx
__tests__/screens/transactions_v2/components/transaction_row.test.tsx
__tests__/screens/transactions_v2/filter/filter_sheet.test.tsx
__tests__/screens/transactions_v2/detail/transaction_detail.test.tsx
__tests__/database/transactions_get_period_totals.test.ts
```

### Modified files

```
database/transactions.ts                   (append getPeriodTotals)
constants/strings.ts                       (new keys, see Task 2)
app/(app)/(tabs)/transactions/index.tsx    (route → flag-branch, then back to one-liner in cleanup)
constants/feature_flags.ts                 (flip newTransactions in Task 26, remove in Task 27)
CLAUDE.md                                  (remove four §6 entries from legacy actions-sheet list in cleanup)
```

### Deleted files (cleanup task only)

```
screens/transactions/                      (entire V1 directory)
__tests__/screens/transactions/            (V1 tests — only if any exist)
```

After cleanup, `screens/transactions_v2/` is renamed to `screens/transactions/`.

---

## Task 1: Pure helpers (`transactions.helpers.ts`)

**Files:**
- Create: `screens/transactions_v2/transactions.helpers.ts`
- Test: `__tests__/screens/transactions_v2/transactions_helpers.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/screens/transactions_v2/transactions_helpers.test.ts`:

```typescript
import {
  currentYearMonth,
  computeCarouselPills,
  resolvePeriod,
  previousPeriod,
  computeDeltaPct,
  polarityColor,
} from '@/screens/transactions_v2/transactions.helpers';

describe('currentYearMonth', () => {
  it('returns YYYY-MM for a Date', () => {
    expect(currentYearMonth(new Date('2026-05-17T10:00:00Z'))).toBe('2026-05');
  });

  it('zero-pads single-digit months', () => {
    expect(currentYearMonth(new Date('2026-01-05T10:00:00Z'))).toBe('2026-01');
  });
});

describe('computeCarouselPills', () => {
  it('produces [All] + last 6 months + [Custom] in chronological order', () => {
    const pills = computeCarouselPills(new Date('2026-05-17T10:00:00Z'));
    expect(pills).toEqual([
      { kind: 'all' },
      { kind: 'month', yearMonth: '2025-12' },
      { kind: 'month', yearMonth: '2026-01' },
      { kind: 'month', yearMonth: '2026-02' },
      { kind: 'month', yearMonth: '2026-03' },
      { kind: 'month', yearMonth: '2026-04' },
      { kind: 'month', yearMonth: '2026-05' },
      { kind: 'custom' },
    ]);
  });

  it('handles year boundary correctly', () => {
    const pills = computeCarouselPills(new Date('2026-02-15T10:00:00Z'));
    expect(pills[1]).toEqual({ kind: 'month', yearMonth: '2025-09' });
    expect(pills[6]).toEqual({ kind: 'month', yearMonth: '2026-02' });
  });
});

describe('resolvePeriod', () => {
  it('all → undefined bounds', () => {
    expect(resolvePeriod({ type: 'all' })).toEqual({ from: undefined, to: undefined });
  });

  it('month → first and last day of that month', () => {
    expect(resolvePeriod({ type: 'month', yearMonth: '2026-05' })).toEqual({
      from: '2026-05-01',
      to: '2026-05-31',
    });
  });

  it('month — February non-leap', () => {
    expect(resolvePeriod({ type: 'month', yearMonth: '2025-02' })).toEqual({
      from: '2025-02-01',
      to: '2025-02-28',
    });
  });

  it('month — February leap year', () => {
    expect(resolvePeriod({ type: 'month', yearMonth: '2024-02' })).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    });
  });

  it('custom → passthrough', () => {
    expect(resolvePeriod({ type: 'custom', from: '2026-05-01', to: '2026-05-15' })).toEqual({
      from: '2026-05-01',
      to: '2026-05-15',
    });
  });
});

describe('previousPeriod', () => {
  it('all → null', () => {
    expect(previousPeriod({ type: 'all' })).toBeNull();
  });

  it('custom → null', () => {
    expect(previousPeriod({ type: 'custom', from: 'a', to: 'b' })).toBeNull();
  });

  it('month → prior month', () => {
    expect(previousPeriod({ type: 'month', yearMonth: '2026-05' })).toEqual({
      type: 'month',
      yearMonth: '2026-04',
    });
  });

  it('month — January → previous December', () => {
    expect(previousPeriod({ type: 'month', yearMonth: '2026-01' })).toEqual({
      type: 'month',
      yearMonth: '2025-12',
    });
  });
});

describe('computeDeltaPct', () => {
  it('both zero → null', () => {
    expect(computeDeltaPct(0, 0)).toBeNull();
  });

  it('previous zero, current non-zero → null (cannot divide)', () => {
    expect(computeDeltaPct(100, 0)).toBeNull();
  });

  it('normal positive delta', () => {
    expect(computeDeltaPct(108, 100)).toBe(8);
  });

  it('normal negative delta', () => {
    expect(computeDeltaPct(82, 100)).toBe(-18);
  });

  it('uses abs(previous) for denominator (handles negative prev)', () => {
    expect(computeDeltaPct(1500, -500)).toBe(400);
  });

  it('rounds to nearest integer', () => {
    expect(computeDeltaPct(103, 100)).toBe(3);
    expect(computeDeltaPct(102.5, 100)).toBe(3);
    expect(computeDeltaPct(102.4, 100)).toBe(2);
  });
});

describe('polarityColor', () => {
  it('income up = good', () => {
    expect(polarityColor('income', 5)).toBe('good');
  });

  it('income down = bad', () => {
    expect(polarityColor('income', -5)).toBe('bad');
  });

  it('expense up = bad', () => {
    expect(polarityColor('expense', 5)).toBe('bad');
  });

  it('expense down = good', () => {
    expect(polarityColor('expense', -5)).toBe('good');
  });

  it('net up = good', () => {
    expect(polarityColor('net', 5)).toBe('good');
  });

  it('net down = bad', () => {
    expect(polarityColor('net', -5)).toBe('bad');
  });

  it('zero delta = neutral', () => {
    expect(polarityColor('income', 0)).toBe('neutral');
    expect(polarityColor('expense', 0)).toBe('neutral');
    expect(polarityColor('net', 0)).toBe('neutral');
  });
});
```

- [ ] **Step 2: Run the new tests — must fail because the module does not exist**

Run: `npm test -- __tests__/screens/transactions_v2/transactions_helpers.test.ts`
Expected: FAIL with `Cannot find module '@/screens/transactions_v2/transactions.helpers'`.

- [ ] **Step 3: Implement the helpers**

Create `screens/transactions_v2/transactions.helpers.ts`:

```typescript
export type CarouselSelection =
  | { type: 'all' }
  | { type: 'month'; yearMonth: string }
  | { type: 'custom'; from: string; to: string };

export type CarouselPill =
  | { kind: 'all' }
  | { kind: 'month'; yearMonth: string }
  | { kind: 'custom' };

export type TotalsMetric = 'income' | 'expense' | 'net';

export type PolaritySignal = 'good' | 'bad' | 'neutral';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function currentYearMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${pad2(newM)}`;
}

export function computeCarouselPills(now: Date = new Date()): CarouselPill[] {
  const current = currentYearMonth(now);
  const pills: CarouselPill[] = [{ kind: 'all' }];
  for (let i = 5; i >= 0; i--) {
    pills.push({ kind: 'month', yearMonth: shiftMonth(current, -i) });
  }
  pills.push({ kind: 'custom' });
  return pills;
}

export function resolvePeriod(
  selection: CarouselSelection,
): { from: string | undefined; to: string | undefined } {
  switch (selection.type) {
    case 'all':
      return { from: undefined, to: undefined };
    case 'custom':
      return { from: selection.from, to: selection.to };
    case 'month': {
      const [y, m] = selection.yearMonth.split('-').map(Number);
      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);
      return {
        from: `${selection.yearMonth}-01`,
        to: `${lastDay.getFullYear()}-${pad2(lastDay.getMonth() + 1)}-${pad2(lastDay.getDate())}`,
      };
    }
  }
}

export function previousPeriod(selection: CarouselSelection): CarouselSelection | null {
  if (selection.type !== 'month') return null;
  return { type: 'month', yearMonth: shiftMonth(selection.yearMonth, -1) };
}

export function computeDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function polarityColor(metric: TotalsMetric, deltaPct: number): PolaritySignal {
  if (deltaPct === 0) return 'neutral';
  const direction = deltaPct > 0 ? 'up' : 'down';
  if (metric === 'expense') return direction === 'up' ? 'bad' : 'good';
  return direction === 'up' ? 'good' : 'bad';
}
```

- [ ] **Step 4: Run the tests — must pass**

Run: `npm test -- __tests__/screens/transactions_v2/transactions_helpers.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add screens/transactions_v2/transactions.helpers.ts \
        __tests__/screens/transactions_v2/transactions_helpers.test.ts
git commit -m "feat(§6): pure helpers for carousel pills, period resolution, polarity-aware delta"
```

---

## Task 2: Strings — add new keys

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1: Open `constants/strings.ts` and locate the Transactions block**

Read `constants/strings.ts` end-to-end. Find the existing `transactions*`, `filter*`, `detail*` clusters.

- [ ] **Step 2: Append new keys**

Add the following keys at appropriate clusters in `constants/strings.ts`. Keep ordering alphabetical inside each cluster where the file already does so; otherwise append to the cluster's tail.

```typescript
// Carousel
carouselAllLabel: 'All',
carouselCustomLabel: 'Custom',
carouselCustomActiveLabel: (from: string, to: string) => `${from} → ${to}`,
carouselMonthShort: (yearMonth: string) => {
  const [y, m] = yearMonth.split('-').map(Number);
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${labels[m - 1]} ${y}`;
},

// Totals strip
totalsIncome: 'Income',
totalsExpense: 'Expense',
totalsNet: 'Net',
totalsVsPrev: (prevLabel: string) => `vs ${prevLabel}`,

// Type badges
typeBadgeCommitment: 'Commitment',
typeBadgeGoal: 'Goal',
typeBadgeBill: 'Bill',

// Filter sheet (additions)
filterSummaryAccountsEmpty: 'All accounts',
filterSummaryCategoriesEmpty: 'All categories',
filterSummaryAmountEmpty: 'Any amount',
filterAmountMinLabel: 'Min',
filterAmountMaxLabel: 'Max',

// Date range picker sheet (carousel Custom pill)
dateRangePickerTitle: 'Custom range',
dateRangePickerFromLabel: 'From',
dateRangePickerToLabel: 'To',
dateRangePickerConfirm: 'Apply',
dateRangePickerCancel: 'Cancel',

// Detail (new for transfer flow card)
detailFlowFromLabel: 'From',
detailFlowToLabel: 'To',
detailFlowCategoryLabel: 'Category',
detailFlowSourceLabel: 'Source',
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors. If a key is duplicated, remove the dup from the V1 cluster (keep the new placement only).

- [ ] **Step 4: Commit**

```bash
git add constants/strings.ts
git commit -m "feat(§6): add Strings keys for carousel, totals, type badges, filter summaries"
```

---

## Task 3: TypeBadge primitive

**Files:**
- Create: `components/ui/type_badge.tsx`
- Test: `__tests__/screens/transactions_v2/components/type_badge.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions_v2/components/type_badge.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';

import { TypeBadge } from '@/components/ui/type_badge';

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
    View,
    Text,
  };
});

describe('TypeBadge', () => {
  it('renders Commitment label', () => {
    const { getByText } = render(<TypeBadge type="commitment" />);
    expect(getByText('Commitment')).toBeTruthy();
  });

  it('renders Goal label', () => {
    const { getByText } = render(<TypeBadge type="goal" />);
    expect(getByText('Goal')).toBeTruthy();
  });

  it('renders Bill label', () => {
    const { getByText } = render(<TypeBadge type="bill" />);
    expect(getByText('Bill')).toBeTruthy();
  });

  it('accepts size prop and renders without crashing', () => {
    const { getByText } = render(<TypeBadge type="commitment" size="md" />);
    expect(getByText('Commitment')).toBeTruthy();
  });

  it('exposes accessibilityLabel matching the type', () => {
    const { getByLabelText } = render(<TypeBadge type="commitment" />);
    expect(getByLabelText('Commitment')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- __tests__/screens/transactions_v2/components/type_badge.test.tsx`
Expected: FAIL — cannot find `@/components/ui/type_badge`.

- [ ] **Step 3: Implement the component**

Create `components/ui/type_badge.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { tv } from 'tailwind-variants';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

export type TypeBadgeKind = 'commitment' | 'goal' | 'bill';
export type TypeBadgeSize = 'sm' | 'md';

interface Props {
  type: TypeBadgeKind;
  size?: TypeBadgeSize;
}

const wrap = tv({
  base: 'flex-row items-center rounded-full border',
  variants: {
    type: {
      commitment: 'bg-cairoGold/15 border-cairoGold/30',
      goal: 'bg-positive/15 border-positive/30',
      bill: 'bg-warning/15 border-warning/30',
    },
    size: {
      sm: 'px-2 py-[2px] gap-1',
      md: 'px-2.5 py-1 gap-1.5',
    },
  },
  defaultVariants: { size: 'sm' },
});

const label = tv({
  base: 'font-inter font-semibold',
  variants: {
    type: {
      commitment: 'text-cairoGold',
      goal: 'text-positive',
      bill: 'text-warning',
    },
    size: {
      sm: 'text-[9.5px]',
      md: 'text-[11px]',
    },
  },
  defaultVariants: { size: 'sm' },
});

const ICON: Record<TypeBadgeKind, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  commitment: 'clock-outline',
  goal: 'target',
  bill: 'file-document-outline',
};

const ICON_COLOR: Record<TypeBadgeKind, string> = {
  commitment: '#D4AF37',
  goal: '#6EE7B7',
  bill: '#FFAE5C',
};

const LABEL: Record<TypeBadgeKind, string> = {
  commitment: Strings.typeBadgeCommitment,
  goal: Strings.typeBadgeGoal,
  bill: Strings.typeBadgeBill,
};

export function TypeBadge({ type, size = 'sm' }: Props): React.ReactElement {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={LABEL[type]}
      className={wrap({ type, size })}
    >
      <MaterialCommunityIcons name={ICON[type]} size={size === 'sm' ? 10 : 12} color={ICON_COLOR[type]} />
      <Text className={label({ type, size })}>{LABEL[type]}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Run tests — must pass**

Run: `npm test -- __tests__/screens/transactions_v2/components/type_badge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/ui/type_badge.tsx \
        __tests__/screens/transactions_v2/components/type_badge.test.tsx
git commit -m "feat(§6): TypeBadge primitive (commitment/goal/bill variants)"
```

---

## Task 4: `getPeriodTotals` DB query

**Files:**
- Modify: `database/transactions.ts`
- Test: `__tests__/database/transactions_get_period_totals.test.ts`

- [ ] **Step 1: Read the existing `database/transactions.ts` to anchor on conventions**

Run: read `database/transactions.ts` end-to-end. Confirm the `getMonthExpenseStats` shape — that's the pattern to mirror.

- [ ] **Step 2: Write the failing test**

Create `__tests__/database/transactions_get_period_totals.test.ts`:

```typescript
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { getPeriodTotals } from '@/database/transactions';

async function setupDb(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(':memory:');
  await db.execAsync(`
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      egp_amount REAL NOT NULL,
      exchange_rate REAL,
      to_amount REAL,
      minimum_payment_snapshot REAL,
      account_id TEXT NOT NULL,
      to_account_id TEXT,
      category_id TEXT,
      note TEXT,
      transaction_date TEXT NOT NULL,
      transaction_time TEXT NOT NULL,
      commitment_payment_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

async function insertRow(db: SQLiteDatabase, row: Record<string, unknown>): Promise<void> {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => '?').join(',');
  await db.runAsync(
    `INSERT INTO transactions (${keys.join(',')}) VALUES (${placeholders})`,
    Object.values(row) as never,
  );
}

describe('getPeriodTotals', () => {
  it('sums income and expense egp_amounts within the date range', async () => {
    const db = await setupDb();
    await insertRow(db, {
      id: 't1', type: 'income', amount: 25000, currency: 'EGP', egp_amount: 25000,
      account_id: 'a1', transaction_date: '2026-05-01', transaction_time: '09:00:00',
      created_at: 'X', updated_at: 'X',
    });
    await insertRow(db, {
      id: 't2', type: 'expense', amount: 285, currency: 'EGP', egp_amount: 285,
      account_id: 'a1', transaction_date: '2026-05-15', transaction_time: '19:00:00',
      created_at: 'X', updated_at: 'X',
    });
    await insertRow(db, {
      id: 't3', type: 'expense', amount: 920, currency: 'EGP', egp_amount: 920,
      account_id: 'a1', transaction_date: '2026-05-31', transaction_time: '18:00:00',
      created_at: 'X', updated_at: 'X',
    });

    const result = await getPeriodTotals(db, { from: '2026-05-01', to: '2026-05-31' });
    expect(result).toEqual({ incomeEgp: 25000, expenseEgp: 1205, netEgp: 23795 });
  });

  it('excludes transfer and cc_payment rows', async () => {
    const db = await setupDb();
    await insertRow(db, {
      id: 't1', type: 'transfer', amount: 5000, currency: 'EGP', egp_amount: 5000,
      account_id: 'a1', to_account_id: 'a2', transaction_date: '2026-05-15', transaction_time: '12:00:00',
      created_at: 'X', updated_at: 'X',
    });
    await insertRow(db, {
      id: 't2', type: 'cc_payment', amount: 4080, currency: 'EGP', egp_amount: 4080,
      account_id: 'a1', to_account_id: 'a3', transaction_date: '2026-05-20', transaction_time: '11:00:00',
      created_at: 'X', updated_at: 'X',
    });
    const result = await getPeriodTotals(db, { from: '2026-05-01', to: '2026-05-31' });
    expect(result).toEqual({ incomeEgp: 0, expenseEgp: 0, netEgp: 0 });
  });

  it('excludes rows outside the date range', async () => {
    const db = await setupDb();
    await insertRow(db, {
      id: 't1', type: 'expense', amount: 100, currency: 'EGP', egp_amount: 100,
      account_id: 'a1', transaction_date: '2026-04-30', transaction_time: '10:00:00',
      created_at: 'X', updated_at: 'X',
    });
    await insertRow(db, {
      id: 't2', type: 'expense', amount: 200, currency: 'EGP', egp_amount: 200,
      account_id: 'a1', transaction_date: '2026-06-01', transaction_time: '10:00:00',
      created_at: 'X', updated_at: 'X',
    });
    const result = await getPeriodTotals(db, { from: '2026-05-01', to: '2026-05-31' });
    expect(result).toEqual({ incomeEgp: 0, expenseEgp: 0, netEgp: 0 });
  });

  it('returns all zeros for an empty range', async () => {
    const db = await setupDb();
    const result = await getPeriodTotals(db, { from: '2026-05-01', to: '2026-05-31' });
    expect(result).toEqual({ incomeEgp: 0, expenseEgp: 0, netEgp: 0 });
  });
});
```

- [ ] **Step 3: Run — expect failure**

Run: `npm test -- __tests__/database/transactions_get_period_totals.test.ts`
Expected: FAIL — `getPeriodTotals` not exported.

- [ ] **Step 4: Implement the query**

Append to `database/transactions.ts` (do not touch `getMonthExpenseStats` or `addTransaction`):

```typescript
export interface PeriodTotals {
  incomeEgp: number;
  expenseEgp: number;
  netEgp: number;
}

/**
 * Aggregate income and expense `egp_amount` for transactions in
 * `[from, to]` (inclusive on both ends). Excludes transfers and cc_payments
 * (they move money between user-owned accounts and do not change net worth).
 */
export async function getPeriodTotals(
  db: SQLiteDatabase,
  range: { from: string; to: string },
): Promise<PeriodTotals> {
  const row = await db.getFirstAsync<{
    income: number | null;
    expense: number | null;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income'  THEN egp_amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN egp_amount ELSE 0 END), 0) AS expense
     FROM transactions
     WHERE transaction_date >= ?
       AND transaction_date <= ?`,
    [range.from, range.to],
  );
  const incomeEgp = row?.income ?? 0;
  const expenseEgp = row?.expense ?? 0;
  return { incomeEgp, expenseEgp, netEgp: incomeEgp - expenseEgp };
}
```

- [ ] **Step 5: Run tests — must pass**

Run: `npm test -- __tests__/database/transactions_get_period_totals.test.ts`
Expected: PASS.

- [ ] **Step 6: Run full type check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add database/transactions.ts \
        __tests__/database/transactions_get_period_totals.test.ts
git commit -m "feat(§6): add getPeriodTotals(db, range) — income/expense/net for a date range"
```

---

## Task 5: V2 scaffold — state + store + anim

**Files:**
- Create: `screens/transactions_v2/transactions.state.ts`
- Create: `screens/transactions_v2/transactions.store.ts`
- Create: `screens/transactions_v2/transactions.anim.ts`

- [ ] **Step 1: Create `transactions.state.ts`**

Create `screens/transactions_v2/transactions.state.ts`:

```typescript
import { create } from 'zustand';

interface TransactionsStateShape {
  refreshing: boolean;
}

interface TransactionsState {
  state: TransactionsStateShape;
  setRefreshing: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: TransactionsStateShape = {
  refreshing: false,
};

export const useTransactionsState = create<TransactionsState>((set) => ({
  state: INITIAL_STATE,
  setRefreshing: (v) => set((s) => ({ state: { ...s.state, refreshing: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2: Create `transactions.store.ts`**

Create `screens/transactions_v2/transactions.store.ts`:

```typescript
import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';
import { EMPTY_FILTERS_V2, type AdvancedFilters } from './filter/filter.store';
import {
  currentYearMonth,
  type CarouselSelection,
} from './transactions.helpers';

export type TransactionFilter = TransactionType | 'all';

interface StateShape {
  searchQuery: string;
  activeFilter: TransactionFilter;
  period: CarouselSelection;
  appliedFilters: AdvancedFilters;
}

interface TransactionsScreenStore {
  state: StateShape;
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  setPeriod: (p: CarouselSelection) => void;
  setAppliedFilters: (f: AdvancedFilters) => void;
  clearSearch: () => void;
  reset: () => void;
}

function initialState(): StateShape {
  return {
    searchQuery: '',
    activeFilter: 'all',
    period: { type: 'month', yearMonth: currentYearMonth() },
    appliedFilters: EMPTY_FILTERS_V2,
  };
}

export const useTransactionsScreenStore = create<TransactionsScreenStore>((set) => ({
  state: initialState(),
  setSearchQuery: (q) => set((s) => ({ state: { ...s.state, searchQuery: q } })),
  setActiveFilter: (f) => set((s) => ({ state: { ...s.state, activeFilter: f } })),
  setPeriod: (p) => set((s) => ({ state: { ...s.state, period: p } })),
  setAppliedFilters: (f) => set((s) => ({ state: { ...s.state, appliedFilters: f } })),
  clearSearch: () => set((s) => ({ state: { ...s.state, searchQuery: '' } })),
  reset: () => set({ state: initialState() }),
}));
```

- [ ] **Step 3: Create `transactions.anim.ts`**

Create `screens/transactions_v2/transactions.anim.ts`:

```typescript
import { useCallback } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Row press scale animation, identical contract to V1's transactions.anim.ts.
 * Used by TransactionRow and TransferFlowCard cells.
 */
export function useRowPressScale() {
  const scale = useSharedValue(1);
  const onPressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 100 });
  }, [scale]);
  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 120 });
  }, [scale]);
  return { scale, onPressIn, onPressOut };
}
```

- [ ] **Step 4: Type-check (will fail until Task 6 lands)**

Run: `npx tsc --noEmit -p .`
Expected: error — `Cannot find module './filter/filter.store'`. This is OK; Task 6 lands the filter store. The skeleton compiles in isolation otherwise.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions_v2/transactions.state.ts \
        screens/transactions_v2/transactions.store.ts \
        screens/transactions_v2/transactions.anim.ts
git commit -m "feat(§6): V2 scaffold — state, store (with period), anim"
```

---

## Task 6: V2 filter store + filter.helpers (date-free)

**Files:**
- Create: `screens/transactions_v2/filter/filter.store.ts`
- Create: `screens/transactions_v2/filter/filter.helpers.ts`

- [ ] **Step 1: Create `filter.store.ts`**

Create `screens/transactions_v2/filter/filter.store.ts`:

```typescript
import { create } from 'zustand';

import { Currency } from '@/constants/enums';

export interface AdvancedFilters {
  accountIds: string[];
  categoryIds: string[];
  amountCurrency: Currency;
  amountMin?: number;
  amountMax?: number;
}

export const EMPTY_FILTERS_V2: AdvancedFilters = {
  accountIds: [],
  categoryIds: [],
  amountCurrency: Currency.EGP,
};

interface DraftShape {
  draft: AdvancedFilters;
}

interface FilterStore {
  state: DraftShape;
  setDraft: (next: AdvancedFilters) => void;
  resetDraft: () => void;
  toggleAccountId: (id: string) => void;
  toggleCategoryId: (id: string) => void;
  setAmountMin: (v?: number) => void;
  setAmountMax: (v?: number) => void;
  setAmountCurrency: (c: Currency) => void;
}

const INITIAL_STATE: DraftShape = { draft: EMPTY_FILTERS_V2 };

export const useFilterStore = create<FilterStore>((set) => ({
  state: INITIAL_STATE,

  setDraft: (next) => set((s) => ({ state: { ...s.state, draft: next } })),
  resetDraft: () => set((s) => ({ state: { ...s.state, draft: EMPTY_FILTERS_V2 } })),

  toggleAccountId: (id) =>
    set((s) => ({
      state: {
        ...s.state,
        draft: {
          ...s.state.draft,
          accountIds: s.state.draft.accountIds.includes(id)
            ? s.state.draft.accountIds.filter((x) => x !== id)
            : [...s.state.draft.accountIds, id],
        },
      },
    })),

  toggleCategoryId: (id) =>
    set((s) => ({
      state: {
        ...s.state,
        draft: {
          ...s.state.draft,
          categoryIds: s.state.draft.categoryIds.includes(id)
            ? s.state.draft.categoryIds.filter((x) => x !== id)
            : [...s.state.draft.categoryIds, id],
        },
      },
    })),

  setAmountMin: (v) =>
    set((s) => ({ state: { ...s.state, draft: { ...s.state.draft, amountMin: v } } })),
  setAmountMax: (v) =>
    set((s) => ({ state: { ...s.state, draft: { ...s.state.draft, amountMax: v } } })),
  setAmountCurrency: (c) =>
    set((s) => ({ state: { ...s.state, draft: { ...s.state.draft, amountCurrency: c } } })),
}));
```

- [ ] **Step 2: Create `filter.helpers.ts`**

Create `screens/transactions_v2/filter/filter.helpers.ts`:

```typescript
import { Strings } from '@/constants/strings';
import type { TransactionListFilters } from '@/store/transaction.store';
import type { AdvancedFilters } from './filter.store';

export function countActiveFilters(f: AdvancedFilters): number {
  let n = 0;
  if (f.accountIds.length > 0) n++;
  if (f.categoryIds.length > 0) n++;
  if (f.amountMin !== undefined || f.amountMax !== undefined) n++;
  return n;
}

export function toQueryFilters(applied: AdvancedFilters): Partial<TransactionListFilters> {
  const out: Partial<TransactionListFilters> = {};
  if (applied.accountIds.length > 0) out.accountIds = applied.accountIds;
  if (applied.categoryIds.length > 0) out.categoryIds = applied.categoryIds;
  if (applied.amountMin !== undefined) out.amountMin = applied.amountMin;
  if (applied.amountMax !== undefined) out.amountMax = applied.amountMax;
  if (applied.amountMin !== undefined || applied.amountMax !== undefined) {
    out.amountCurrency = applied.amountCurrency;
  }
  return out;
}

export function parseAmountInput(s: string): number | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const cleaned = trimmed.replace(/,/g, '');
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export function formatSelectionSummary(names: string[], allLabel: string): string {
  if (names.length === 0) return allLabel;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

export function formatAmountSummary(f: AdvancedFilters): string {
  if (f.amountMin === undefined && f.amountMax === undefined) return Strings.filterSummaryAmountEmpty;
  const cur = f.amountCurrency;
  if (f.amountMin !== undefined && f.amountMax !== undefined) return `${f.amountMin}–${f.amountMax} ${cur}`;
  if (f.amountMax !== undefined) return `Up to ${f.amountMax} ${cur}`;
  return `From ${f.amountMin} ${cur}`;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (Transactions store from Task 5 now resolves.)

- [ ] **Step 4: Commit**

```bash
git add screens/transactions_v2/filter/filter.store.ts \
        screens/transactions_v2/filter/filter.helpers.ts
git commit -m "feat(§6): filter store + helpers (date-free; accounts/categories/amount only)"
```

---

## Task 7: V2 filter state

**Files:**
- Create: `screens/transactions_v2/filter/filter.state.ts`

- [ ] **Step 1: Create the file**

Create `screens/transactions_v2/filter/filter.state.ts`:

```typescript
import { create } from 'zustand';

type AccordionSection = 'accounts' | 'categories' | 'amount' | null;

interface FilterStateShape {
  visible: boolean;
  openSection: AccordionSection;
  dateRangeSheetVisible: boolean;
}

interface FilterState {
  state: FilterStateShape;
  open: () => void;
  close: () => void;
  setOpenSection: (s: AccordionSection) => void;
  setDateRangeSheetVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: FilterStateShape = {
  visible: false,
  openSection: null,
  dateRangeSheetVisible: false,
};

export const useFilterState = create<FilterState>((set) => ({
  state: INITIAL_STATE,
  open: () => set((s) => ({ state: { ...s.state, visible: true } })),
  close: () => set((s) => ({ state: { ...s.state, visible: false, openSection: null } })),
  setOpenSection: (sec) => set((s) => ({ state: { ...s.state, openSection: sec } })),
  setDateRangeSheetVisible: (v) =>
    set((s) => ({ state: { ...s.state, dateRangeSheetVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

> The `dateRangeSheetVisible` flag lives here even though `DateRangeSheet` is mounted by the carousel, not the filter. Single UI-state store keeps the sheet visibility cross-component-addressable.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions_v2/filter/filter.state.ts
git commit -m "feat(§6): filter UI state — drawer visibility + accordion section + date range sheet"
```

---

## Task 8: DateHeader V2 (polish from V1)

**Files:**
- Create: `screens/transactions_v2/components/date_header.tsx`

- [ ] **Step 1: Read V1 reference**

Read `screens/transactions/components/date_header.tsx`. Note the public props (`{ label: string }`).

- [ ] **Step 2: Create the V2 component**

Create `screens/transactions_v2/components/date_header.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

interface Props {
  label: string;
}

export function DateHeader({ label }: Props): React.ReactElement {
  return (
    <View className="px-4 pt-3 pb-1.5 bg-background">
      <Text className="font-inter font-semibold text-[10px] tracking-wide uppercase text-muted">
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add screens/transactions_v2/components/date_header.tsx
git commit -m "feat(§6): DateHeader V2 — HeroUI + Cairo Nights polish"
```

---

## Task 9: TransactionRow V2

**Files:**
- Create: `screens/transactions_v2/components/transaction_row.tsx`
- Create: `screens/transactions_v2/components/transaction_row.anim.ts`
- Test: `__tests__/screens/transactions_v2/components/transaction_row.test.tsx`

This is the new row template (locked in §4.2 of the spec). Three-line left (category + TypeBadge / italic note / account context) and three-slot right (native amount / EGP equiv + rate / time).

- [ ] **Step 1: Write the failing tests**

Create `__tests__/screens/transactions_v2/components/transaction_row.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';

import { TransactionRow } from '@/screens/transactions_v2/components/transaction_row';

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    View,
    useSharedValue: () => ({ value: 1 }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: unknown) => v,
  };
});

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

function mkAccount(p: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'CIB',
    type: AccountType.Bank,
    currency: Currency.EGP,
    current_balance: 1000,
    opening_balance: 1000,
    is_archived: 0,
    created_at: 'X',
    updated_at: 'X',
    ...p,
  } as Account;
}

function mkCategory(p: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    name: 'Food',
    icon: 'silverware-fork-knife',
    color: '#ffaa66',
    type: 'expense',
    is_archived: 0,
    created_at: 'X',
    updated_at: 'X',
    ...p,
  } as Category;
}

function mkTx(p: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: TransactionType.Expense,
    amount: 285,
    currency: Currency.EGP,
    egp_amount: 285,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'a1',
    to_account_id: null,
    category_id: 'c1',
    note: null,
    transaction_date: '2026-05-17',
    transaction_time: '19:14:00',
    commitment_payment_id: null,
    created_at: 'X',
    updated_at: 'X',
    ...p,
  } as Transaction;
}

describe('TransactionRow — left column', () => {
  it('shows category name as the title for expense', () => {
    const { getByText } = render(
      <TransactionRow tx={mkTx()} account={mkAccount()} category={mkCategory()} onPress={() => {}} />,
    );
    expect(getByText('Food')).toBeTruthy();
  });

  it('falls back to "Uncategorized" when expense has no category', () => {
    const { getByText } = render(
      <TransactionRow tx={mkTx({ category_id: null })} account={mkAccount()} onPress={() => {}} />,
    );
    expect(getByText('Uncategorized')).toBeTruthy();
  });

  it('shows "Transfer" title for transfer with no category', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.Transfer, category_id: null, to_account_id: 'a2' })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a2', name: 'QNB Reserve' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('Transfer')).toBeTruthy();
  });

  it('shows "CC Payment" title for cc_payment type', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.CCPayment, category_id: null, to_account_id: 'a3' })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a3', name: 'Visa Credit' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('CC Payment')).toBeTruthy();
  });

  it('renders the italic note line when present', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ note: 'Talabat — family dinner' })}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByText('Talabat — family dinner')).toBeTruthy();
  });

  it('omits the note line when note is null', () => {
    const { queryByText } = render(
      <TransactionRow tx={mkTx()} account={mkAccount()} category={mkCategory()} onPress={() => {}} />,
    );
    // No specific text to find; just assert that a generic note placeholder is absent.
    expect(queryByText(/^"/)).toBeNull();
  });

  it('shows account name for expense/income', () => {
    const { getByText } = render(
      <TransactionRow tx={mkTx()} account={mkAccount()} category={mkCategory()} onPress={() => {}} />,
    );
    expect(getByText('CIB')).toBeTruthy();
  });

  it('shows FROM → TO for transfer', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.Transfer, category_id: null, to_account_id: 'a2' })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a2', name: 'QNB Reserve' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('CIB → QNB Reserve')).toBeTruthy();
  });

  it('renders TypeBadge when commitment_payment_id is set', () => {
    const { getByLabelText } = render(
      <TransactionRow
        tx={mkTx({ commitment_payment_id: 'cp1' })}
        account={mkAccount()}
        category={mkCategory()}
        onPress={() => {}}
      />,
    );
    expect(getByLabelText('Commitment')).toBeTruthy();
  });
});

describe('TransactionRow — right column', () => {
  it('shows signed native amount + currency code', () => {
    const { getByText } = render(
      <TransactionRow tx={mkTx()} account={mkAccount()} category={mkCategory()} onPress={() => {}} />,
    );
    expect(getByText('−285 EGP')).toBeTruthy();
  });

  it('shows + prefix for income', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.Income, amount: 25000, egp_amount: 25000 })}
        account={mkAccount()}
        category={mkCategory({ name: 'Salary' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('+25,000 EGP')).toBeTruthy();
  });

  it('omits sign prefix for transfer', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ type: TransactionType.Transfer, category_id: null, to_account_id: 'a2', amount: 5000, egp_amount: 5000 })}
        account={mkAccount()}
        toAccount={mkAccount({ id: 'a2', name: 'QNB Reserve' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('5,000 EGP')).toBeTruthy();
  });

  it('shows EGP equivalent + rate when currency is USD (expense uses ≈)', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({ currency: Currency.USD, amount: 9.99, egp_amount: 488, exchange_rate: 48.85 })}
        account={mkAccount()}
        category={mkCategory({ name: 'Subscriptions' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('−9.99 USD')).toBeTruthy();
    expect(getByText(/≈ 488 EGP/)).toBeTruthy();
    expect(getByText(/@ 48.85/)).toBeTruthy();
  });

  it('shows → prefix on EGP equivalent for cross-currency transfer', () => {
    const { getByText } = render(
      <TransactionRow
        tx={mkTx({
          type: TransactionType.Transfer, category_id: null, to_account_id: 'a2',
          currency: Currency.USD, amount: 100, egp_amount: 4885, to_amount: 4885, exchange_rate: 48.85,
        })}
        account={mkAccount({ name: 'Wise USD', currency: Currency.USD })}
        toAccount={mkAccount({ id: 'a2', name: 'CIB' })}
        onPress={() => {}}
      />,
    );
    expect(getByText('100 USD')).toBeTruthy();
    expect(getByText(/→ 4,885 EGP/)).toBeTruthy();
  });

  it('omits the EGP-equivalent line when currency is EGP', () => {
    const { queryByText } = render(
      <TransactionRow tx={mkTx()} account={mkAccount()} category={mkCategory()} onPress={() => {}} />,
    );
    expect(queryByText(/≈/)).toBeNull();
    expect(queryByText(/@ /)).toBeNull();
  });

  it('shows time in 12h format', () => {
    const { getByText } = render(
      <TransactionRow tx={mkTx()} account={mkAccount()} category={mkCategory()} onPress={() => {}} />,
    );
    expect(getByText('7:14 PM')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- __tests__/screens/transactions_v2/components/transaction_row.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the press-scale anim**

Create `screens/transactions_v2/components/transaction_row.anim.ts`:

```typescript
export { useRowPressScale } from '../transactions.anim';
```

(Lifts the helper from V2's existing `transactions.anim.ts` for component-local imports.)

- [ ] **Step 4: Implement the component**

Create `screens/transactions_v2/components/transaction_row.tsx`:

```tsx
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Text } from '@/components/ui/text';
import { TypeBadge } from '@/components/ui/type_badge';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTime12h } from '@/utils/format_time_12h';
import { useRowPressScale } from './transaction_row.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  onPress: () => void;
}

const FALLBACK_ICON: IconName = 'shape-outline';
const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

function categoryTitle(tx: Transaction, category?: Category): string {
  switch (tx.type) {
    case TransactionType.Expense:
    case TransactionType.Income:
      return category?.name ?? Strings.uncategorized;
    case TransactionType.Transfer:
      return Strings.transferTitle;
    case TransactionType.CCPayment:
      return Strings.ccPaymentTitle;
  }
}

function accountContext(tx: Transaction, account?: Account, toAccount?: Account): string {
  const fromName = account?.name ?? Strings.unknownAccount;
  switch (tx.type) {
    case TransactionType.Expense:
    case TransactionType.Income:
      return fromName;
    case TransactionType.Transfer:
    case TransactionType.CCPayment:
      return `${fromName} → ${toAccount?.name ?? Strings.unknownAccount}`;
  }
}

function signPrefix(type: TransactionType): string {
  if (type === TransactionType.Income) return '+';
  if (type === TransactionType.Expense) return '−';
  return '';
}

function amountColorClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.Income: return 'text-positive';
    case TransactionType.Transfer: return 'text-cairoGold';
    case TransactionType.CCPayment: return 'text-ccPlum';
    default: return 'text-foreground';
  }
}

function iconBgClass(type: TransactionType): string {
  switch (type) {
    case TransactionType.Transfer: return 'bg-cairoGold/15';
    case TransactionType.CCPayment: return 'bg-ccPlum/15';
    case TransactionType.Income: return 'bg-positive/15';
    default: return 'bg-default/15';
  }
}

function pickIcon(tx: Transaction, category?: Category): IconName {
  if (tx.type === TransactionType.Transfer) return 'swap-horizontal';
  if (tx.type === TransactionType.CCPayment) return 'credit-card-refund';
  return (category?.icon as IconName) ?? FALLBACK_ICON;
}

export function TransactionRow({ tx, account, toAccount, category, onPress }: Props): React.ReactElement {
  const { scale, onPressIn, onPressOut } = useRowPressScale();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const title = useMemo(() => categoryTitle(tx, category), [tx, category]);
  const note = tx.note?.trim() || null;
  const ctx = useMemo(() => accountContext(tx, account, toAccount), [tx, account, toAccount]);

  const showEquiv = tx.currency !== 'EGP';
  const equivPrefix = tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment ? '→ ' : '≈ ';
  const nativeText = `${signPrefix(tx.type)}${numberFmt.format(tx.amount)} ${tx.currency}`;
  const egpText = `${equivPrefix}${numberFmt.format(tx.egp_amount)} EGP`;
  const rateText = tx.exchange_rate != null ? `@ ${tx.exchange_rate}` : '';

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[{ flexDirection: 'row', alignItems: 'flex-start' }, animStyle]}
        className="px-4 py-3 gap-3 border-b border-separator"
      >
        <View className={`w-9 h-9 rounded-lg items-center justify-center mt-0.5 ${iconBgClass(tx.type)}`}>
          <MaterialCommunityIcons name={pickIcon(tx, category)} size={18} color={category?.color ?? '#D4AF37'} />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="font-sora font-bold text-[13px] text-foreground">{title}</Text>
            {tx.commitment_payment_id != null ? <TypeBadge type="commitment" /> : null}
          </View>
          {note != null ? (
            <Text className="font-inter italic text-[11.5px] text-muted mt-1" numberOfLines={1}>
              {note}
            </Text>
          ) : null}
          <Text className="font-inter font-medium text-[10.5px] text-foreground/55 mt-1" numberOfLines={1}>
            {ctx}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`font-sora font-bold text-[14px] ${amountColorClass(tx.type)}`}>{nativeText}</Text>
          {showEquiv ? (
            <Text className="font-inter font-medium text-[10px] text-foreground/60 mt-0.5">
              {egpText}
              {rateText ? <Text className="opacity-70"> {rateText}</Text> : null}
            </Text>
          ) : null}
          <Text className="font-inter text-[10px] text-foreground/40 mt-0.5">
            {formatTime12h(tx.transaction_time)}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
```

- [ ] **Step 5: Run tests — must pass**

Run: `npm test -- __tests__/screens/transactions_v2/components/transaction_row.test.tsx`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add screens/transactions_v2/components/transaction_row.tsx \
        screens/transactions_v2/components/transaction_row.anim.ts \
        __tests__/screens/transactions_v2/components/transaction_row.test.tsx
git commit -m "feat(§6): TransactionRow V2 — category title + TypeBadge / note / FROM→TO; native + EGP equiv + rate + time"
```

---

## Task 10: MonthCarousel

**Files:**
- Create: `screens/transactions_v2/components/month_carousel.tsx`
- Create: `screens/transactions_v2/components/month_carousel.anim.ts`
- Test: `__tests__/screens/transactions_v2/components/month_carousel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions_v2/components/month_carousel.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { MonthCarousel } from '@/screens/transactions_v2/components/month_carousel';

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

const NOW = new Date('2026-05-17T10:00:00Z');

describe('MonthCarousel', () => {
  it('renders [All] + 6 month pills + [Custom]', () => {
    const { getByText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'month', yearMonth: '2026-05' }}
        customRange={null}
        onSelect={() => {}}
        onOpenCustom={() => {}}
      />,
    );
    expect(getByText('All')).toBeTruthy();
    expect(getByText(/Dec 2025/)).toBeTruthy();
    expect(getByText(/May 2026/)).toBeTruthy();
    expect(getByText('Custom')).toBeTruthy();
  });

  it('marks the current month pill as selected by default', () => {
    const { getByLabelText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'month', yearMonth: '2026-05' }}
        customRange={null}
        onSelect={() => {}}
        onOpenCustom={() => {}}
      />,
    );
    expect(getByLabelText('May 2026, selected, period filter')).toBeTruthy();
  });

  it('fires onSelect with the correct selection when a month pill is tapped', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'month', yearMonth: '2026-05' }}
        customRange={null}
        onSelect={onSelect}
        onOpenCustom={() => {}}
      />,
    );
    fireEvent.press(getByLabelText(/Mar 2026, period filter/));
    expect(onSelect).toHaveBeenCalledWith({ type: 'month', yearMonth: '2026-03' });
  });

  it('fires onSelect with { type: "all" } when All pill is tapped', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'month', yearMonth: '2026-05' }}
        customRange={null}
        onSelect={onSelect}
        onOpenCustom={() => {}}
      />,
    );
    fireEvent.press(getByLabelText(/All, period filter/));
    expect(onSelect).toHaveBeenCalledWith({ type: 'all' });
  });

  it('fires onOpenCustom when Custom pill is tapped', () => {
    const onOpenCustom = jest.fn();
    const { getByLabelText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'month', yearMonth: '2026-05' }}
        customRange={null}
        onSelect={() => {}}
        onOpenCustom={onOpenCustom}
      />,
    );
    fireEvent.press(getByLabelText(/Custom, period filter/));
    expect(onOpenCustom).toHaveBeenCalledTimes(1);
  });

  it('shows custom range in Custom pill label when active', () => {
    const { getByText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'custom', from: '2026-05-01', to: '2026-05-15' }}
        customRange={{ from: '2026-05-01', to: '2026-05-15' }}
        onSelect={() => {}}
        onOpenCustom={() => {}}
      />,
    );
    expect(getByText('2026-05-01 → 2026-05-15')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- __tests__/screens/transactions_v2/components/month_carousel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the anim file**

Create `screens/transactions_v2/components/month_carousel.anim.ts`:

```typescript
// Reserved for future Reanimated entrance/snap animations. No exports needed yet.
export const __MONTH_CAROUSEL_ANIM_PLACEHOLDER__ = true;
```

- [ ] **Step 4: Implement the component**

Create `screens/transactions_v2/components/month_carousel.tsx`:

```tsx
import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Text } from '@/components/ui/text';
import {
  computeCarouselPills,
  type CarouselPill,
  type CarouselSelection,
} from '../transactions.helpers';

interface Props {
  now?: Date;
  selection: CarouselSelection;
  customRange: { from: string; to: string } | null;
  onSelect: (s: CarouselSelection) => void;
  onOpenCustom: () => void;
}

function pillKey(p: CarouselPill): string {
  if (p.kind === 'all') return 'all';
  if (p.kind === 'custom') return 'custom';
  return p.yearMonth;
}

function pillLabel(p: CarouselPill, customRange: { from: string; to: string } | null): string {
  if (p.kind === 'all') return Strings.carouselAllLabel;
  if (p.kind === 'custom') {
    return customRange
      ? Strings.carouselCustomActiveLabel(customRange.from, customRange.to)
      : Strings.carouselCustomLabel;
  }
  return Strings.carouselMonthShort(p.yearMonth);
}

function isSelected(p: CarouselPill, sel: CarouselSelection): boolean {
  if (p.kind === 'all') return sel.type === 'all';
  if (p.kind === 'custom') return sel.type === 'custom';
  return sel.type === 'month' && sel.yearMonth === p.yearMonth;
}

export function MonthCarousel({
  now = new Date(),
  selection,
  customRange,
  onSelect,
  onOpenCustom,
}: Props): React.ReactElement {
  const pills = useMemo(() => computeCarouselPills(now), [now]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
      decelerationRate="fast"
    >
      {pills.map((p) => {
        const selected = isSelected(p, selection);
        const label = pillLabel(p, customRange);
        const a11y = `${label}${selected ? ', selected' : ''}, period filter`;
        const handlePress = () => {
          if (p.kind === 'all') return onSelect({ type: 'all' });
          if (p.kind === 'custom') return onOpenCustom();
          return onSelect({ type: 'month', yearMonth: p.yearMonth });
        };
        return (
          <Pressable
            key={pillKey(p)}
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={a11y}
            accessibilityState={{ selected }}
            className={
              selected
                ? 'px-2.5 py-1.5 rounded-full bg-cairoGold'
                : 'px-2.5 py-1.5 rounded-full bg-default/40'
            }
          >
            <Text
              className={
                selected
                  ? 'font-inter font-bold text-[11px] text-shared-midnightBlue'
                  : 'font-inter font-medium text-[11px] text-foreground/60'
              }
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 5: Run tests — must pass**

Run: `npm test -- __tests__/screens/transactions_v2/components/month_carousel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add screens/transactions_v2/components/month_carousel.tsx \
        screens/transactions_v2/components/month_carousel.anim.ts \
        __tests__/screens/transactions_v2/components/month_carousel.test.tsx
git commit -m "feat(§6): MonthCarousel — [All] + last 6 months + [Custom] pill row"
```

---

## Task 11: TotalsStrip

**Files:**
- Create: `screens/transactions_v2/components/totals_strip.tsx`
- Test: `__tests__/screens/transactions_v2/components/totals_strip.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions_v2/components/totals_strip.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';

import { TotalsStrip } from '@/screens/transactions_v2/components/totals_strip';

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

describe('TotalsStrip', () => {
  it('renders Income / Expense / Net values', () => {
    const { getByText } = render(
      <TotalsStrip
        current={{ incomeEgp: 24713, expenseEgp: 8300, netEgp: 16413 }}
        previous={{ incomeEgp: 25500, expenseEgp: 7685, netEgp: 17815 }}
        previousLabel="April 2026"
      />,
    );
    expect(getByText(/24,713/)).toBeTruthy();
    expect(getByText(/8,300/)).toBeTruthy();
    expect(getByText(/16,413/)).toBeTruthy();
  });

  it('renders the "vs <prev>" caption', () => {
    const { getByText } = render(
      <TotalsStrip
        current={{ incomeEgp: 24713, expenseEgp: 8300, netEgp: 16413 }}
        previous={{ incomeEgp: 25500, expenseEgp: 7685, netEgp: 17815 }}
        previousLabel="April 2026"
      />,
    );
    expect(getByText('vs April 2026')).toBeTruthy();
  });

  it('omits the caption + deltas when previous is null', () => {
    const { queryByText } = render(
      <TotalsStrip
        current={{ incomeEgp: 24713, expenseEgp: 8300, netEgp: 16413 }}
        previous={null}
        previousLabel={null}
      />,
    );
    expect(queryByText(/^vs /)).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- __tests__/screens/transactions_v2/components/totals_strip.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `screens/transactions_v2/components/totals_strip.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Text } from '@/components/ui/text';
import {
  computeDeltaPct,
  polarityColor,
  type TotalsMetric,
} from '../transactions.helpers';
import type { PeriodTotals } from '@/database/transactions';

interface Props {
  current: PeriodTotals;
  previous: PeriodTotals | null;
  previousLabel: string | null;
}

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

function deltaLabel(deltaPct: number | null): string {
  if (deltaPct === null) return '';
  const arrow = deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : '·';
  return `${arrow} ${Math.abs(deltaPct)}%`;
}

function deltaColorClass(polarity: 'good' | 'bad' | 'neutral'): string {
  if (polarity === 'good') return 'text-positive';
  if (polarity === 'bad') return 'text-negative';
  return 'text-foreground/50';
}

function Cell({
  label,
  value,
  valueClass,
  cellClass,
  deltaPct,
  metric,
}: {
  label: string;
  value: string;
  valueClass: string;
  cellClass: string;
  deltaPct: number | null;
  metric: TotalsMetric;
}): React.ReactElement {
  return (
    <View className={`flex-1 rounded-xl border px-3 py-2.5 ${cellClass}`}>
      <Text className="font-inter font-semibold text-[9px] tracking-wide uppercase text-foreground/55">
        {label}
      </Text>
      <Text className={`font-sora font-bold text-[15px] mt-1 ${valueClass}`}>{value}</Text>
      {deltaPct !== null ? (
        <Text className={`font-inter text-[10px] mt-1 ${deltaColorClass(polarityColor(metric, deltaPct))}`}>
          {deltaLabel(deltaPct)}
        </Text>
      ) : null}
    </View>
  );
}

export function TotalsStrip({ current, previous, previousLabel }: Props): React.ReactElement {
  const incomeDelta = previous ? computeDeltaPct(current.incomeEgp, previous.incomeEgp) : null;
  const expenseDelta = previous ? computeDeltaPct(current.expenseEgp, previous.expenseEgp) : null;
  const netDelta = previous ? computeDeltaPct(current.netEgp, previous.netEgp) : null;

  return (
    <View className="px-4 mt-3">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Cell
          label={Strings.totalsIncome}
          value={`+${numberFmt.format(current.incomeEgp)} EGP`}
          valueClass="text-positive"
          cellClass="bg-positive/8 border-positive/20"
          deltaPct={incomeDelta}
          metric="income"
        />
        <Cell
          label={Strings.totalsExpense}
          value={`−${numberFmt.format(current.expenseEgp)} EGP`}
          valueClass="text-negative"
          cellClass="bg-negative/8 border-negative/20"
          deltaPct={expenseDelta}
          metric="expense"
        />
        <Cell
          label={Strings.totalsNet}
          value={`${current.netEgp >= 0 ? '+' : '−'}${numberFmt.format(Math.abs(current.netEgp))} EGP`}
          valueClass="text-cairoGold"
          cellClass="bg-cairoGold/8 border-cairoGold/22"
          deltaPct={netDelta}
          metric="net"
        />
      </View>
      {previousLabel ? (
        <Text className="text-center font-inter text-[9px] tracking-wide uppercase text-foreground/45 mt-2.5">
          {Strings.totalsVsPrev(previousLabel)}
        </Text>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Run tests — must pass**

Run: `npm test -- __tests__/screens/transactions_v2/components/totals_strip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add screens/transactions_v2/components/totals_strip.tsx \
        __tests__/screens/transactions_v2/components/totals_strip.test.tsx
git commit -m "feat(§6): TotalsStrip — tinted cells, polarity-aware deltas, vs-prev caption"
```

---

## Task 12: SearchRow

**Files:**
- Create: `screens/transactions_v2/components/search_row.tsx`

- [ ] **Step 1: Implement the component**

Create `screens/transactions_v2/components/search_row.tsx`:

```tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';

interface Props {
  value: string;
  onChange: (s: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

export function SearchRow({
  value,
  onChange,
  onClear,
  onOpenFilter,
  activeFilterCount,
}: Props): React.ReactElement {
  return (
    <View className="px-4 mt-3 flex-row items-center gap-2">
      <View className="flex-1">
        <Input
          value={value}
          onChangeText={onChange}
          placeholder="Search transactions"
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search transactions"
        />
        {value.length > 0 ? (
          <Pressable
            onPress={onClear}
            accessibilityLabel="Clear search"
            className="absolute right-2 top-2.5 w-7 h-7 items-center justify-center"
          >
            <MaterialCommunityIcons name="close-circle" size={16} color="#999" />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={onOpenFilter}
        accessibilityRole="button"
        accessibilityLabel={`Filter${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
        className="w-10 h-10 rounded-xl bg-default/40 items-center justify-center relative"
      >
        <MaterialCommunityIcons name="tune-variant" size={18} color="#F0EEE6" />
        {activeFilterCount > 0 ? (
          <View className="absolute -top-1 -right-1 px-1.5 rounded-full bg-cairoGold min-w-[16px] items-center">
            <Text className="font-inter font-bold text-[9px] text-shared-midnightBlue">
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions_v2/components/search_row.tsx
git commit -m "feat(§6): SearchRow — HeroUI Input + filter button with active count badge"
```

---

## Task 13: TypeChips

**Files:**
- Create: `screens/transactions_v2/components/type_chips.tsx`

- [ ] **Step 1: Implement the component**

Create `screens/transactions_v2/components/type_chips.tsx`:

```tsx
import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { TransactionType } from '@/constants/enums';
import type { TransactionFilter } from '../transactions.store';

interface Props {
  value: TransactionFilter;
  onChange: (v: TransactionFilter) => void;
}

const OPTIONS: { value: TransactionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: TransactionType.Income, label: 'Income' },
  { value: TransactionType.Expense, label: 'Expense' },
  { value: TransactionType.Transfer, label: 'Transfer' },
];

export function TypeChips({ value, onChange }: Props): React.ReactElement {
  return (
    <View className="px-4 mt-3 flex-row gap-1.5 flex-wrap">
      {OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${opt.label}, type filter`}
            className={
              selected
                ? 'px-3 py-1 rounded-full border border-cairoGold/50 bg-cairoGold/15'
                : 'px-3 py-1 rounded-full border border-transparent bg-default/40'
            }
          >
            <Text
              className={
                selected
                  ? 'font-inter font-semibold text-[11px] text-cairoGold'
                  : 'font-inter font-medium text-[11px] text-foreground/65'
              }
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions_v2/components/type_chips.tsx
git commit -m "feat(§6): TypeChips — All / Income / Expense / Transfer single-select"
```

---

## Task 14: DateRangeSheet

**Files:**
- Create: `screens/transactions_v2/components/date_range_sheet.tsx`

- [ ] **Step 1: Implement the component**

Create `screens/transactions_v2/components/date_range_sheet.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { toLocalDateString } from '@/utils/format_date';

interface Props {
  visible: boolean;
  initialFrom?: string;
  initialTo?: string;
  onClose: () => void;
  onConfirm: (from: string, to: string) => void;
}

export function DateRangeSheet({
  visible,
  initialFrom,
  initialTo,
  onClose,
  onConfirm,
}: Props): React.ReactElement {
  const [from, setFrom] = useState<Date>(() => (initialFrom ? new Date(initialFrom) : new Date()));
  const [to, setTo] = useState<Date>(() => (initialTo ? new Date(initialTo) : new Date()));

  useEffect(() => {
    if (visible) {
      setFrom(initialFrom ? new Date(initialFrom) : new Date());
      setTo(initialTo ? new Date(initialTo) : new Date());
    }
  }, [visible, initialFrom, initialTo]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={Strings.dateRangePickerTitle}
      size="md"
      footer={
        <View className="px-4 pt-3 pb-6 flex-row gap-2">
          <View className="flex-1">
            <Button variant="ghost" onPress={onClose}>
              {Strings.dateRangePickerCancel}
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="primary"
              onPress={() => onConfirm(toLocalDateString(from), toLocalDateString(to))}
            >
              {Strings.dateRangePickerConfirm}
            </Button>
          </View>
        </View>
      }
    >
      <Sheet.Body>
        <View className="px-4 py-2">
          <Text className="font-inter font-semibold text-[10px] uppercase text-foreground/60 mb-1">
            {Strings.dateRangePickerFromLabel}
          </Text>
          <DateTimePicker
            value={from}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => d && setFrom(d)}
            maximumDate={to}
          />
          <Text className="font-inter font-semibold text-[10px] uppercase text-foreground/60 mt-4 mb-1">
            {Strings.dateRangePickerToLabel}
          </Text>
          <DateTimePicker
            value={to}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => d && setTo(d)}
            minimumDate={from}
            maximumDate={new Date()}
          />
        </View>
      </Sheet.Body>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify `@react-native-community/datetimepicker` is present in package.json**

Run: `npm ls @react-native-community/datetimepicker`
Expected: prints a version. If missing, run `npm install @react-native-community/datetimepicker` and re-run `npx expo prebuild --clean`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add screens/transactions_v2/components/date_range_sheet.tsx
git commit -m "feat(§6): DateRangeSheet — HeroUI Sheet + native date picker for Custom carousel pill"
```

---

## Task 15: AccountAccordion

**Files:**
- Create: `screens/transactions_v2/filter/components/account_accordion.tsx`

- [ ] **Step 1: Implement the component**

Create `screens/transactions_v2/filter/components/account_accordion.tsx`:

```tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { formatSelectionSummary } from '../filter.helpers';

interface Props {
  accounts: Account[];
  selectedIds: string[];
  expanded: boolean;
  onToggleSection: () => void;
  onToggleId: (id: string) => void;
}

export function AccountAccordion({
  accounts,
  selectedIds,
  expanded,
  onToggleSection,
  onToggleId,
}: Props): React.ReactElement {
  const selectedNames = accounts.filter((a) => selectedIds.includes(a.id)).map((a) => a.name);
  const summary = formatSelectionSummary(selectedNames, Strings.filterSummaryAccountsEmpty);

  return (
    <View className="rounded-xl border border-separator bg-surface mb-2 p-3.5">
      <Pressable onPress={onToggleSection} accessibilityRole="button" accessibilityState={{ expanded }}>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <Text className="font-inter font-semibold text-[13px]">{Strings.filterSectionAccounts}</Text>
            {selectedIds.length > 0 ? (
              <View className="px-1.5 rounded-full bg-cairoGold/15 min-w-[18px] items-center">
                <Text className="font-inter font-bold text-[10px] text-cairoGold">
                  {selectedIds.length}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-inter text-[11px] text-foreground/60" numberOfLines={1}>
              {expanded ? '' : summary}
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#888"
            />
          </View>
        </View>
      </Pressable>
      {expanded ? (
        <View className="flex-row gap-1.5 flex-wrap mt-3">
          {accounts.map((a) => {
            const selected = selectedIds.includes(a.id);
            return (
              <Pressable
                key={a.id}
                onPress={() => onToggleId(a.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${a.name}, account filter`}
                className={
                  selected
                    ? 'px-2.5 py-1.5 rounded-full bg-cairoGold/15 border border-cairoGold/50 flex-row items-center gap-1.5'
                    : 'px-2.5 py-1.5 rounded-full bg-default/40 border border-transparent flex-row items-center gap-1.5'
                }
              >
                <View
                  style={{ backgroundColor: a.color ?? '#888' }}
                  className="w-2 h-2 rounded-full"
                />
                <Text
                  className={
                    selected
                      ? 'font-inter font-semibold text-[11.5px] text-cairoGold'
                      : 'font-inter font-medium text-[11.5px] text-foreground/70'
                  }
                >
                  {a.name}
                </Text>
                {selected ? (
                  <MaterialCommunityIcons name="check" size={12} color="#D4AF37" />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`a.color` is on Account entity already.)

- [ ] **Step 3: Commit**

```bash
git add screens/transactions_v2/filter/components/account_accordion.tsx
git commit -m "feat(§6): AccountAccordion — multi-select account chips with color swatches"
```

---

## Task 16: CategoryAccordion

**Files:**
- Create: `screens/transactions_v2/filter/components/category_accordion.tsx`

- [ ] **Step 1: Implement the component**

Create `screens/transactions_v2/filter/components/category_accordion.tsx`:

```tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { Category } from '@/database/entities/category.entity';
import { formatSelectionSummary } from '../filter.helpers';

interface Props {
  categories: Category[];
  selectedIds: string[];
  expanded: boolean;
  onToggleSection: () => void;
  onToggleId: (id: string) => void;
}

export function CategoryAccordion({
  categories,
  selectedIds,
  expanded,
  onToggleSection,
  onToggleId,
}: Props): React.ReactElement {
  const selectedNames = categories.filter((c) => selectedIds.includes(c.id)).map((c) => c.name);
  const summary = formatSelectionSummary(selectedNames, Strings.filterSummaryCategoriesEmpty);

  return (
    <View className="rounded-xl border border-separator bg-surface mb-2 p-3.5">
      <Pressable onPress={onToggleSection} accessibilityRole="button" accessibilityState={{ expanded }}>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <Text className="font-inter font-semibold text-[13px]">{Strings.filterSectionCategories}</Text>
            {selectedIds.length > 0 ? (
              <View className="px-1.5 rounded-full bg-cairoGold/15 min-w-[18px] items-center">
                <Text className="font-inter font-bold text-[10px] text-cairoGold">
                  {selectedIds.length}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-inter text-[11px] text-foreground/60" numberOfLines={1}>
              {expanded ? '' : summary}
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#888"
            />
          </View>
        </View>
      </Pressable>
      {expanded ? (
        <View className="flex-row gap-1.5 flex-wrap mt-3">
          {categories.map((c) => {
            const selected = selectedIds.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => onToggleId(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${c.name}, category filter`}
                className={
                  selected
                    ? 'px-2.5 py-1.5 rounded-full bg-cairoGold/15 border border-cairoGold/50 flex-row items-center gap-1.5'
                    : 'px-2.5 py-1.5 rounded-full bg-default/40 border border-transparent flex-row items-center gap-1.5'
                }
              >
                <View
                  style={{ backgroundColor: c.color ?? '#888' }}
                  className="w-2 h-2 rounded-full"
                />
                <Text
                  className={
                    selected
                      ? 'font-inter font-semibold text-[11.5px] text-cairoGold'
                      : 'font-inter font-medium text-[11.5px] text-foreground/70'
                  }
                >
                  {c.name}
                </Text>
                {selected ? (
                  <MaterialCommunityIcons name="check" size={12} color="#D4AF37" />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions_v2/filter/components/category_accordion.tsx
git commit -m "feat(§6): CategoryAccordion — multi-select category chips with color swatches"
```

---

## Task 17: AmountAccordion

**Files:**
- Create: `screens/transactions_v2/filter/components/amount_accordion.tsx`

- [ ] **Step 1: Implement the component**

Create `screens/transactions_v2/filter/components/amount_accordion.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Currency } from '@/constants/enums';
import { formatAmountSummary, parseAmountInput } from '../filter.helpers';
import type { AdvancedFilters } from '../filter.store';

interface Props {
  draft: AdvancedFilters;
  expanded: boolean;
  onToggleSection: () => void;
  onChangeCurrency: (c: Currency) => void;
  onChangeMin: (v?: number) => void;
  onChangeMax: (v?: number) => void;
}

export function AmountAccordion({
  draft,
  expanded,
  onToggleSection,
  onChangeCurrency,
  onChangeMin,
  onChangeMax,
}: Props): React.ReactElement {
  const [minStr, setMinStr] = useState(draft.amountMin?.toString() ?? '');
  const [maxStr, setMaxStr] = useState(draft.amountMax?.toString() ?? '');

  useEffect(() => {
    setMinStr(draft.amountMin?.toString() ?? '');
    setMaxStr(draft.amountMax?.toString() ?? '');
  }, [draft.amountMin, draft.amountMax]);

  const summary = formatAmountSummary(draft);
  const active = draft.amountMin !== undefined || draft.amountMax !== undefined;

  return (
    <View className="rounded-xl border border-separator bg-surface mb-2 p-3.5">
      <Pressable onPress={onToggleSection} accessibilityRole="button" accessibilityState={{ expanded }}>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <Text className="font-inter font-semibold text-[13px]">{Strings.filterSectionAmount}</Text>
            {active ? (
              <View className="px-1.5 rounded-full bg-cairoGold/15 items-center">
                <Text className="font-inter font-bold text-[10px] text-cairoGold">1</Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-inter text-[11px] text-foreground/60" numberOfLines={1}>
              {expanded ? '' : summary}
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#888"
            />
          </View>
        </View>
      </Pressable>
      {expanded ? (
        <View className="mt-3">
          <View className="flex-row gap-1.5 bg-background p-1 rounded-lg mb-3">
            {(['EGP', 'USD'] as const).map((c) => {
              const sel = draft.amountCurrency === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => onChangeCurrency(c as Currency)}
                  className={`flex-1 py-1.5 rounded-md items-center ${sel ? 'bg-default/40' : ''}`}
                >
                  <Text className={`font-inter font-semibold text-[11px] ${sel ? 'text-cairoGold' : 'text-foreground/60'}`}>
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="font-inter font-semibold text-[10px] uppercase text-foreground/55 mb-1">
                {Strings.filterAmountMinLabel}
              </Text>
              <Input
                value={minStr}
                onChangeText={(s) => {
                  setMinStr(s);
                  onChangeMin(parseAmountInput(s));
                }}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View className="flex-1">
              <Text className="font-inter font-semibold text-[10px] uppercase text-foreground/55 mb-1">
                {Strings.filterAmountMaxLabel}
              </Text>
              <Input
                value={maxStr}
                onChangeText={(s) => {
                  setMaxStr(s);
                  onChangeMax(parseAmountInput(s));
                }}
                keyboardType="decimal-pad"
                placeholder="∞"
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions_v2/filter/components/amount_accordion.tsx
git commit -m "feat(§6): AmountAccordion — currency toggle + min/max inputs"
```

---

## Task 18: FilterSheet (index + hook)

**Files:**
- Create: `screens/transactions_v2/filter/index.tsx`
- Create: `screens/transactions_v2/filter/filter.hook.ts`
- Test: `__tests__/screens/transactions_v2/filter/filter_sheet.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/screens/transactions_v2/filter/filter_sheet.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';

import { Currency } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionsScreenStore } from '@/screens/transactions_v2/transactions.store';
import { useFilterState } from '@/screens/transactions_v2/filter/filter.state';
import { useFilterStore } from '@/screens/transactions_v2/filter/filter.store';

import { FilterSheet } from '@/screens/transactions_v2/filter';

jest.mock('@/components/ui/sheet', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Sheet = (props: { visible: boolean; children: React.ReactNode; footer?: React.ReactNode }) =>
    props.visible ? React.createElement(View, null, props.children, props.footer ?? null) : null;
  Sheet.Body = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  return { Sheet };
});

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

beforeEach(() => {
  useFilterState.getState().reset();
  useFilterStore.getState().resetDraft();
  useTransactionsScreenStore.getState().reset();
  useAccountStore.setState({
    state: {
      accounts: [
        { id: 'a1', name: 'CIB', type: 'bank', currency: 'EGP', current_balance: 0, opening_balance: 0, is_archived: 0, color: '#D4AF37', created_at: 'X', updated_at: 'X' } as never,
      ],
    },
  } as never);
  useCategoryStore.setState({
    state: {
      categories: [
        { id: 'c1', name: 'Food', icon: 'silverware-fork-knife', color: '#FFAA66', type: 'expense', is_archived: 0, created_at: 'X', updated_at: 'X' } as never,
      ],
    },
  } as never);
});

describe('FilterSheet', () => {
  it('does not render when visible is false', () => {
    const { queryByText } = render(<FilterSheet />);
    expect(queryByText('Filter')).toBeNull();
  });

  it('renders three accordion sections when visible', () => {
    act(() => useFilterState.getState().open());
    const { getByText } = render(<FilterSheet />);
    expect(getByText('Accounts')).toBeTruthy();
    expect(getByText('Categories')).toBeTruthy();
    expect(getByText('Amount')).toBeTruthy();
  });

  it('Reset clears all draft filters', () => {
    act(() => {
      useFilterStore.getState().setDraft({
        accountIds: ['a1'],
        categoryIds: ['c1'],
        amountCurrency: Currency.EGP,
        amountMin: 10,
      });
      useFilterState.getState().open();
    });
    const { getByText } = render(<FilterSheet />);
    fireEvent.press(getByText('Reset'));
    expect(useFilterStore.getState().state.draft.accountIds).toEqual([]);
    expect(useFilterStore.getState().state.draft.categoryIds).toEqual([]);
    expect(useFilterStore.getState().state.draft.amountMin).toBeUndefined();
  });

  it('Apply commits the draft to appliedFilters and closes the sheet', () => {
    act(() => {
      useFilterStore.getState().setDraft({
        accountIds: ['a1'],
        categoryIds: [],
        amountCurrency: Currency.EGP,
      });
      useFilterState.getState().open();
    });
    const { getByText } = render(<FilterSheet />);
    fireEvent.press(getByText('Apply (1)'));
    expect(useTransactionsScreenStore.getState().state.appliedFilters.accountIds).toEqual(['a1']);
    expect(useFilterState.getState().state.visible).toBe(false);
  });

  it('Apply button label reads "Apply" when zero drafts', () => {
    act(() => useFilterState.getState().open());
    const { getByText } = render(<FilterSheet />);
    expect(getByText('Apply')).toBeTruthy();
  });

  it('does NOT render a Date section (regression guard)', () => {
    act(() => useFilterState.getState().open());
    const { queryByText } = render(<FilterSheet />);
    expect(queryByText('Date')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- __tests__/screens/transactions_v2/filter/filter_sheet.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create the hook**

Create `screens/transactions_v2/filter/filter.hook.ts`:

```typescript
import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { Currency } from '@/constants/enums';

import { useTransactionsScreenStore } from '../transactions.store';
import { countActiveFilters } from './filter.helpers';
import { useFilterState } from './filter.state';
import { useFilterStore } from './filter.store';

export function useFilterSheet() {
  const { state: filterState, close, setOpenSection } = useFilterState(
    useShallow((s) => ({
      state: s.state,
      close: s.close,
      setOpenSection: s.setOpenSection,
    })),
  );
  const {
    state: filterStoreState,
    setDraft,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    setAmountMin,
    setAmountMax,
    setAmountCurrency,
  } = useFilterStore(
    useShallow((s) => ({
      state: s.state,
      setDraft: s.setDraft,
      resetDraft: s.resetDraft,
      toggleAccountId: s.toggleAccountId,
      toggleCategoryId: s.toggleCategoryId,
      setAmountMin: s.setAmountMin,
      setAmountMax: s.setAmountMax,
      setAmountCurrency: s.setAmountCurrency,
    })),
  );

  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));

  const {
    state: txScreenState,
    setAppliedFilters,
  } = useTransactionsScreenStore(
    useShallow((s) => ({
      state: s.state,
      setAppliedFilters: s.setAppliedFilters,
    })),
  );

  // When the sheet opens, seed the draft from the currently applied filters.
  useEffect(() => {
    if (filterState.visible) {
      setDraft(txScreenState.appliedFilters);
    }
  }, [filterState.visible, txScreenState.appliedFilters, setDraft]);

  const applyDraft = useCallback(() => {
    setAppliedFilters(filterStoreState.draft);
    close();
  }, [filterStoreState.draft, setAppliedFilters, close]);

  const draftCount = countActiveFilters(filterStoreState.draft);

  return {
    state: {
      visible: filterState.visible,
      openSection: filterState.openSection,
      draft: filterStoreState.draft,
      draftCount,
      accounts: accountState.accounts,
      categories: categoryState.categories,
    },
    close,
    setOpenSection,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    setAmountMin,
    setAmountMax,
    setAmountCurrency: (c: Currency) => setAmountCurrency(c),
    applyDraft,
  };
}
```

- [ ] **Step 4: Create the sheet index**

Create `screens/transactions_v2/filter/index.tsx`:

```tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

import { AccountAccordion } from './components/account_accordion';
import { CategoryAccordion } from './components/category_accordion';
import { AmountAccordion } from './components/amount_accordion';
import { useFilterSheet } from './filter.hook';

export function FilterSheet(): React.ReactElement | null {
  const f = useFilterSheet();

  if (!f.state.visible) return null;

  return (
    <Sheet
      visible={f.state.visible}
      onClose={f.close}
      size="lg"
      title={Strings.filterTitle}
      headerRight={
        <Pressable onPress={f.resetDraft} accessibilityRole="button" accessibilityLabel="Reset filters">
          <Text className="font-inter font-semibold text-[12px] text-cairoGold">
            {Strings.filterReset}
          </Text>
        </Pressable>
      }
      footer={
        <View className="px-4 pt-3 pb-6">
          <Button variant="primary" onPress={f.applyDraft} disabled={f.state.draftCount === 0}>
            {f.state.draftCount > 0 ? Strings.filterApplyWithCount(f.state.draftCount) : Strings.filterApply}
          </Button>
        </View>
      }
    >
      <Sheet.Body>
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SHEET_FOOTER_CLEARANCE }}
        >
          <AccountAccordion
            accounts={f.state.accounts}
            selectedIds={f.state.draft.accountIds}
            expanded={f.state.openSection === 'accounts'}
            onToggleSection={() =>
              f.setOpenSection(f.state.openSection === 'accounts' ? null : 'accounts')
            }
            onToggleId={f.toggleAccountId}
          />
          <CategoryAccordion
            categories={f.state.categories}
            selectedIds={f.state.draft.categoryIds}
            expanded={f.state.openSection === 'categories'}
            onToggleSection={() =>
              f.setOpenSection(f.state.openSection === 'categories' ? null : 'categories')
            }
            onToggleId={f.toggleCategoryId}
          />
          <AmountAccordion
            draft={f.state.draft}
            expanded={f.state.openSection === 'amount'}
            onToggleSection={() =>
              f.setOpenSection(f.state.openSection === 'amount' ? null : 'amount')
            }
            onChangeCurrency={f.setAmountCurrency}
            onChangeMin={f.setAmountMin}
            onChangeMax={f.setAmountMax}
          />
        </BottomSheetScrollView>
      </Sheet.Body>
    </Sheet>
  );
}
```

> Note: `Sheet` in this project accepts a `headerRight` slot per §3 — if not, lift the Reset link into a header View inside `Sheet.Body`. Check `components/ui/sheet.tsx` for the actual API at implementation time.

- [ ] **Step 5: Run tests — must pass**

Run: `npm test -- __tests__/screens/transactions_v2/filter/filter_sheet.test.tsx`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add screens/transactions_v2/filter/index.tsx \
        screens/transactions_v2/filter/filter.hook.ts \
        __tests__/screens/transactions_v2/filter/filter_sheet.test.tsx
git commit -m "feat(§6): FilterSheet — HeroUI Sheet + Accounts/Categories/Amount accordion sections"
```

---

## Task 19: TransferFlowCard

**Files:**
- Create: `screens/transactions_v2/detail/components/transfer_flow_card.tsx`

- [ ] **Step 1: Implement the component**

Create `screens/transactions_v2/detail/components/transfer_flow_card.tsx`:

```tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Currency } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';

interface Props {
  fromAccount: Account;
  toAccount: Account;
  fromAmount: number;
  fromCurrency: Currency;
  toAmount: number;
  toCurrency: Currency;
  onPressFrom?: () => void;
  onPressTo?: () => void;
}

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

function Cell({
  label,
  account,
  amount,
  currency,
  signPrefix,
  onPress,
}: {
  label: string;
  account: Account;
  amount: number;
  currency: Currency;
  signPrefix: '+' | '−';
  onPress?: () => void;
}): React.ReactElement {
  const inner = (
    <View className="flex-1 items-center">
      <Text className="font-inter font-semibold text-[9.5px] uppercase tracking-wide text-foreground/55">
        {label}
      </Text>
      <View className="w-9 h-9 rounded-lg bg-cairoGold/15 items-center justify-center mt-1.5">
        <MaterialCommunityIcons name="bank" size={16} color="#D4AF37" />
      </View>
      <Text className="font-inter font-semibold text-[11.5px] text-foreground mt-1">
        {account.name}
      </Text>
      <Text className="font-sora font-semibold text-[11px] text-foreground/85 mt-0.5">
        {signPrefix}{numberFmt.format(amount)} {currency}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${account.name}, open account detail`}
        className="flex-1"
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export function TransferFlowCard({
  fromAccount,
  toAccount,
  fromAmount,
  fromCurrency,
  toAmount,
  toCurrency,
  onPressFrom,
  onPressTo,
}: Props): React.ReactElement {
  return (
    <View className="mt-4 mx-4 p-3.5 rounded-2xl bg-surface border border-cairoGold/18 flex-row items-center gap-2">
      <Cell
        label={Strings.detailFlowFromLabel}
        account={fromAccount}
        amount={fromAmount}
        currency={fromCurrency}
        signPrefix="−"
        onPress={onPressFrom}
      />
      <MaterialCommunityIcons name="arrow-right" size={20} color="#D4AF37" />
      <Cell
        label={Strings.detailFlowToLabel}
        account={toAccount}
        amount={toAmount}
        currency={toCurrency}
        signPrefix="+"
        onPress={onPressTo}
      />
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions_v2/detail/components/transfer_flow_card.tsx
git commit -m "feat(§6): TransferFlowCard — FROM → TO cells with tappable nav to account detail"
```

---

## Task 20: Detail components polish

**Files:**
- Create: `screens/transactions_v2/detail/components/detail_hero.tsx`
- Create: `screens/transactions_v2/detail/components/detail_row.tsx`
- Create: `screens/transactions_v2/detail/components/detail_rows_card.tsx`
- Create: `screens/transactions_v2/detail/components/action_row.tsx`
- Create: `screens/transactions_v2/detail/components/delete_confirm_dialog.tsx`
- Create: `screens/transactions_v2/detail/components/not_found_state.tsx`

All six are HeroUI / Cairo Nights re-skins of V1 components; structure preserved per spec §4.4.

- [ ] **Step 1: Read V1 references**

Read each of:
- `screens/transactions/detail/components/detail_hero.tsx`
- `screens/transactions/detail/components/detail_row.tsx`
- `screens/transactions/detail/components/detail_rows_card.tsx`
- `screens/transactions/detail/components/action_row.tsx`
- `screens/transactions/detail/components/delete_confirm_dialog.tsx`
- `screens/transactions/detail/components/not_found_state.tsx`

Note public props and call sites.

- [ ] **Step 2: Create `detail_hero.tsx`**

```tsx
import React from 'react';
import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';
import { TypeBadge } from '@/components/ui/type_badge';
import { TransactionType } from '@/constants/enums';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';

interface Props {
  tx: Transaction;
  category?: Category;
  amountText: string;
  title: string;
  dateTimeText: string;
}

function typeColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.Income: return '#6EE7B7';
    case TransactionType.Transfer: return '#D4AF37';
    case TransactionType.CCPayment: return '#D699E8';
    default: return '#F0EEE6';
  }
}

function typeLabel(type: TransactionType): string {
  switch (type) {
    case TransactionType.Income: return 'Income';
    case TransactionType.Transfer: return 'Transfer';
    case TransactionType.CCPayment: return 'CC Payment';
    default: return 'Expense';
  }
}

export function DetailHero({ tx, category, amountText, title, dateTimeText }: Props): React.ReactElement {
  return (
    <View className="px-4 pt-6 pb-4 items-center">
      <View className="flex-row gap-2 mb-3">
        <View className="px-2.5 py-0.5 rounded-full border" style={{ borderColor: `${typeColor(tx.type)}55`, backgroundColor: `${typeColor(tx.type)}1A` }}>
          <Text className="font-inter font-semibold text-[10.5px]" style={{ color: typeColor(tx.type) }}>
            {typeLabel(tx.type)}
          </Text>
        </View>
        {tx.commitment_payment_id != null ? <TypeBadge type="commitment" size="md" /> : null}
      </View>
      <Text className="font-sora font-extrabold text-[36px] leading-none" style={{ color: typeColor(tx.type), letterSpacing: -0.5 }}>
        {amountText}
      </Text>
      {category ? (
        <View className="flex-row items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full" style={{ backgroundColor: `${category.color ?? '#888'}1F`, borderWidth: 1, borderColor: `${category.color ?? '#888'}40` }}>
          <MaterialCommunityIcons name={(category.icon as never) ?? 'shape-outline'} size={14} color={category.color ?? '#888'} />
          <Text className="font-inter font-semibold text-[11px]" style={{ color: category.color ?? '#888' }}>
            {category.name}
          </Text>
        </View>
      ) : null}
      <Text className="font-inter text-[11px] text-foreground/55 mt-2">{title} · {dateTimeText}</Text>
    </View>
  );
}
```

- [ ] **Step 3: Create `detail_row.tsx`**

```tsx
import React from 'react';
import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  icon: IconName;
  label: string;
  value: string;
  badge?: string;
  sublabel?: string;
  muted?: boolean;
  showDivider?: boolean;
}

export function DetailRow({
  icon,
  label,
  value,
  badge,
  sublabel,
  muted = false,
  showDivider = true,
}: Props): React.ReactElement {
  return (
    <View className={`px-4 py-3 flex-row items-center gap-3 ${showDivider ? 'border-b border-separator' : ''}`}>
      <View className="w-7 h-7 rounded-md bg-foreground/5 items-center justify-center">
        <MaterialCommunityIcons name={icon} size={14} color="#F0EEE6" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="font-inter font-semibold text-[10.5px] uppercase tracking-wide text-foreground/55">
          {label}
        </Text>
        <Text className={`font-inter text-[13px] mt-0.5 ${muted ? 'italic text-foreground/60' : 'font-medium'}`} numberOfLines={2}>
          {value}
        </Text>
        {sublabel ? (
          <Text className="font-inter text-[10.5px] text-foreground/55 mt-0.5">{sublabel}</Text>
        ) : null}
      </View>
      {badge ? (
        <View className="px-2 py-0.5 rounded-full bg-cairoGold/15 border border-cairoGold/30">
          <Text className="font-inter font-semibold text-[9.5px] text-cairoGold">{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Create `detail_rows_card.tsx`**

```tsx
import React from 'react';
import { View } from 'react-native';

interface Props {
  children: React.ReactNode;
}

export function DetailRowsCard({ children }: Props): React.ReactElement {
  return (
    <View className="mx-4 mt-4 rounded-2xl bg-surface border border-separator overflow-hidden">
      {children}
    </View>
  );
}
```

- [ ] **Step 5: Create `action_row.tsx`**

```tsx
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
}

export function ActionRow({ onEdit, onDelete }: Props): React.ReactElement {
  return (
    <View className="flex-row gap-2.5 px-4 pt-4 pb-6">
      <View className="flex-1">
        <Button variant="ghost-destructive" onPress={onDelete}>
          {Strings.detailDeleteButton}
        </Button>
      </View>
      <View className="flex-1">
        <Button variant="primary" onPress={onEdit}>
          {Strings.detailEditButton}
        </Button>
      </View>
    </View>
  );
}
```

> If `ghost-destructive` is not a Button variant in `components/ui/button.tsx`, fall back to `variant="ghost"` and wrap the label `<Text>` in a red color class. Verify at implementation time.

- [ ] **Step 6: Create `delete_confirm_dialog.tsx`**

Copy V1's `screens/transactions/detail/components/delete_confirm_dialog.tsx` verbatim into the V2 path, then re-skin the Modal body / buttons to use HeroUI primitives (Button, Text) and Tailwind classes. Keep the same prop contract (`visible`, `busy`, `onCancel`, `onConfirm`).

- [ ] **Step 7: Create `not_found_state.tsx`**

```tsx
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

export function NotFoundState(): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="font-sora font-bold text-[16px] text-foreground/85 text-center">
        {Strings.detailNotFoundTitle}
      </Text>
      <Text className="font-inter text-[12px] text-foreground/60 text-center mt-1.5">
        {Strings.detailNotFoundBody}
      </Text>
    </View>
  );
}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add screens/transactions_v2/detail/components/
git commit -m "feat(§6): detail screen component re-skins (Hero w/ TypeBadge, Row, RowsCard, ActionRow, DeleteConfirm, NotFound)"
```

---

## Task 21: Detail screen wiring (index + hook + state + store + anim)

**Files:**
- Create: `screens/transactions_v2/detail/detail.state.ts`
- Create: `screens/transactions_v2/detail/detail.store.ts`
- Create: `screens/transactions_v2/detail/detail.anim.ts`
- Create: `screens/transactions_v2/detail/detail.hook.ts`
- Create: `screens/transactions_v2/detail/index.tsx`
- Test: `__tests__/screens/transactions_v2/detail/transaction_detail.test.tsx`

- [ ] **Step 1: Copy V1 state/store/anim/hook with v2 paths**

Copy the four files from `screens/transactions/detail/` to `screens/transactions_v2/detail/` verbatim:
- `detail.state.ts`
- `detail.store.ts`
- `detail.anim.ts`
- `detail.hook.ts`

These wire `useTransactionDetail(id)` and remain shape-compatible with V2 components since the underlying entities don't change. Update imports inside `detail.hook.ts` only where it imports the polished components from V2 paths (the hook itself imports DB / formatting utils which haven't moved).

- [ ] **Step 2: Update `detail.hook.ts` to extend `derived` with transfer-flow fields**

Re-read the hook and append the following to the `derived` object returned for Transfer / CCPayment transactions:

```typescript
isTransferLike: tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment,
transferFlow: tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment
  ? {
      fromAccount,
      toAccount,
      fromAmount: tx.amount,
      fromCurrency: tx.currency,
      toAmount: tx.to_amount ?? tx.egp_amount,
      toCurrency: toAccount?.currency ?? tx.currency,
    }
  : null,
```

- [ ] **Step 3: Create the polished `index.tsx`**

Create `screens/transactions_v2/detail/index.tsx`:

```tsx
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Screen, ScreenScroll } from '@/components/ui/screen';
import { BackButton } from '@/components/ui/back_button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

import { EditTransactionSheet } from '@/screens/transactions/transaction_form';
import { useEditTransactionState } from '@/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/screens/transactions/transaction_form/edit_transaction.store';

import { ActionRow } from './components/action_row';
import { DeleteConfirmDialog } from './components/delete_confirm_dialog';
import { DetailHero } from './components/detail_hero';
import { DetailRow } from './components/detail_row';
import { DetailRowsCard } from './components/detail_rows_card';
import { NotFoundState } from './components/not_found_state';
import { TransferFlowCard } from './components/transfer_flow_card';
import { useTransactionDetail } from './detail.hook';

export default function TransactionDetailScreenV2(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { state, openDeleteConfirm, closeDeleteConfirm, confirmDelete, reload } =
    useTransactionDetail(id);

  const { state: editTxState } = useEditTransactionState(useShallow((s) => ({ state: s.state })));
  const { state: editTxStoreState } = useEditTransactionStore(
    useShallow((s) => ({ state: s.state })),
  );

  useEffect(() => {
    return () => {
      useEditTransactionStore.getState().reset();
      useEditTransactionState.getState().close();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!useEditTransactionState.getState().state.visible) return;
      e.preventDefault();
      useEditTransactionStore.getState().reset();
      useEditTransactionState.getState().close();
    });
    return unsubscribe;
  }, [navigation]);

  function handleEdit() {
    if (state.tx) {
      useEditTransactionStore.getState().loadFromTx(state.tx);
      useEditTransactionState.getState().open(state.tx);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="h-14 flex-row items-center justify-between px-2 border-b border-separator">
        <BackButton onPress={() => router.back()} />
        <Text className="font-sora font-semibold text-[15px] text-foreground">
          {Strings.detailHeader}
        </Text>
        <View className="w-10" />
      </View>

      {state.viewState === 'loading' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#D4AF37" />
        </View>
      ) : state.viewState === 'notFound' ? (
        <NotFoundState />
      ) : state.viewState === 'ready' && state.tx && state.derived ? (
        <>
          <ScreenScroll>
            <DetailHero
              tx={state.tx}
              category={state.derived.category}
              amountText={state.derived.amountText}
              title={state.derived.title}
              dateTimeText={state.derived.dateTimeText}
            />

            {state.derived.isTransferLike && state.derived.transferFlow ? (
              <TransferFlowCard
                fromAccount={state.derived.transferFlow.fromAccount}
                toAccount={state.derived.transferFlow.toAccount}
                fromAmount={state.derived.transferFlow.fromAmount}
                fromCurrency={state.derived.transferFlow.fromCurrency}
                toAmount={state.derived.transferFlow.toAmount}
                toCurrency={state.derived.transferFlow.toCurrency}
                onPressFrom={() =>
                  state.derived?.transferFlow &&
                  router.push(`/accounts/${state.derived.transferFlow.fromAccount.id}`)
                }
                onPressTo={() =>
                  state.derived?.transferFlow &&
                  router.push(`/accounts/${state.derived.transferFlow.toAccount.id}`)
                }
              />
            ) : null}

            <DetailRowsCard>
              <DetailRow
                icon="shape"
                label={Strings.detailCategory}
                value={state.derived.categoryLabel}
                badge={state.derived.categoryBadge}
              />
              <DetailRow
                icon="card-bulleted-outline"
                label={Strings.detailAccount}
                value={state.derived.accountLabel}
                sublabel={state.derived.accountTypeLabel}
              />
              <DetailRow
                icon="calendar"
                label={Strings.detailDateTime}
                value={state.derived.dateTimeText}
              />
              {state.derived.originalAmountText ? (
                <DetailRow
                  icon="currency-usd"
                  label={Strings.detailOriginalAmount}
                  value={state.derived.originalAmountText}
                />
              ) : null}
              {state.derived.exchangeRateText ? (
                <DetailRow
                  icon="earth"
                  label={Strings.detailExchangeRate}
                  value={state.derived.exchangeRateText}
                  badge={Strings.capturedBadge}
                />
              ) : null}
              <DetailRow
                icon="text"
                label={Strings.detailNote}
                value={state.derived.noteText}
                muted={!state.tx.note}
                showDivider={false}
              />
            </DetailRowsCard>

            <ActionRow onEdit={handleEdit} onDelete={openDeleteConfirm} />
          </ScreenScroll>

          <DeleteConfirmDialog
            visible={state.confirmVisible}
            busy={state.deleting}
            onCancel={closeDeleteConfirm}
            onConfirm={confirmDelete}
          />

          <EditTransactionSheet
            visible={editTxState.visible}
            onClose={() => {
              useEditTransactionStore.getState().reset();
              useEditTransactionState.getState().close();
            }}
            onSaved={() => {
              useEditTransactionStore.getState().reset();
              useEditTransactionState.getState().close();
              reload();
            }}
            tx={editTxStoreState.editingTx}
          />
        </>
      ) : null}
    </Screen>
  );
}
```

- [ ] **Step 4: Write the smoke test**

Create `__tests__/screens/transactions_v2/detail/transaction_detail.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';

import TransactionDetailScreenV2 from '@/screens/transactions_v2/detail';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 't1' }),
  useNavigation: () => ({ addListener: () => () => {} }),
}));

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: { View }, View, useSharedValue: () => ({ value: 0 }), useAnimatedStyle: () => ({}) };
});

jest.mock('@/screens/transactions_v2/detail/detail.hook', () => ({
  useTransactionDetail: () => ({
    state: { viewState: 'loading' },
    openDeleteConfirm: jest.fn(),
    closeDeleteConfirm: jest.fn(),
    confirmDelete: jest.fn(),
    reload: jest.fn(),
  }),
}));

describe('TransactionDetailScreenV2 smoke', () => {
  it('mounts without throwing', () => {
    expect(() => render(<TransactionDetailScreenV2 />)).not.toThrow();
  });
});
```

- [ ] **Step 5: Run tests — must pass**

Run: `npm test -- __tests__/screens/transactions_v2/detail/transaction_detail.test.tsx`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add screens/transactions_v2/detail/ \
        __tests__/screens/transactions_v2/detail/transaction_detail.test.tsx
git commit -m "feat(§6): detail screen V2 wiring — Hero, TransferFlowCard (conditional), polished rows, ActionRow"
```

---

## Task 22: V2 transactions hook

**Files:**
- Create: `screens/transactions_v2/transactions.hook.ts`

- [ ] **Step 1: Implement the hook**

Create `screens/transactions_v2/transactions.hook.ts`:

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { getDb } from '@/database/client';
import { getPeriodTotals, type PeriodTotals } from '@/database/transactions';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';
import { Strings } from '@/constants/strings';

import { countActiveFilters, toQueryFilters } from './filter/filter.helpers';
import { useFilterState } from './filter/filter.state';
import { useFilterStore } from './filter/filter.store';
import {
  currentYearMonth,
  previousPeriod,
  resolvePeriod,
} from './transactions.helpers';
import { useTransactionsState } from './transactions.state';
import { useTransactionsScreenStore } from './transactions.store';

export type EmptyVariant = 'none' | 'noData' | 'noResults';

export function useTransactions() {
  const router = useRouter();

  const {
    state: txScreenState,
    setSearchQuery,
    setActiveFilter,
    setPeriod,
    clearSearch,
  } = useTransactionsScreenStore(
    useShallow((s) => ({
      state: s.state,
      setSearchQuery: s.setSearchQuery,
      setActiveFilter: s.setActiveFilter,
      setPeriod: s.setPeriod,
      clearSearch: s.clearSearch,
    })),
  );
  const {
    state: txState,
    setQuery,
    loadMore,
    refresh,
  } = useTransactionStore(
    useShallow((s) => ({
      state: s.state,
      setQuery: s.setQuery,
      loadMore: s.loadMore,
      refresh: s.refresh,
    })),
  );

  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));

  const { open: openFilter } = useFilterState(useShallow((s) => ({ open: s.open })));
  const { setDraft } = useFilterStore(useShallow((s) => ({ setDraft: s.setDraft })));

  const refreshing = useTransactionsState((s) => s.state.refreshing);
  const setRefreshing = useTransactionsState((s) => s.setRefreshing);

  const debouncedSearch = useDebouncedValue(txScreenState.searchQuery, 300);

  const [totals, setTotals] = useState<{
    current: PeriodTotals;
    previous: PeriodTotals | null;
  } | null>(null);
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    const periodRange = resolvePeriod(txScreenState.period);
    setQuery({
      search: trimmed || undefined,
      type: txScreenState.activeFilter === 'all' ? undefined : txScreenState.activeFilter,
      dateFrom: periodRange.from,
      dateTo: periodRange.to,
      ...toQueryFilters(txScreenState.appliedFilters),
    }).catch(() => {});
  }, [
    debouncedSearch,
    txScreenState.activeFilter,
    txScreenState.appliedFilters,
    txScreenState.period,
    setQuery,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const periodRange = resolvePeriod(txScreenState.period);
      if (!periodRange.from || !periodRange.to) {
        setTotals(null);
        return;
      }
      try {
        const db = await getDb();
        const current = await getPeriodTotals(db, { from: periodRange.from, to: periodRange.to });
        const prev = previousPeriod(txScreenState.period);
        const previous = prev
          ? await (async () => {
              const r = resolvePeriod(prev);
              if (!r.from || !r.to) return null;
              return getPeriodTotals(db, { from: r.from, to: r.to });
            })()
          : null;
        if (!cancelled) setTotals({ current, previous });
      } catch (err) {
        console.error('[transactions_v2] loadTotals failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [txScreenState.period]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        const fresh = currentYearMonth();
        setPeriod({ type: 'month', yearMonth: fresh });
        useTransactionsScreenStore.getState().reset();
        useTransactionsState.getState().reset();
        useFilterState.getState().reset();
        useFilterStore.getState().resetDraft();
        useTransactionStore.getState().setQuery({}).catch(() => {});
      };
    }, [setPeriod]),
  );

  const accountsById = useMemo(
    () => new Map(accountState.accounts.map((a) => [a.id, a])),
    [accountState.accounts],
  );
  const categoriesById = useMemo(
    () => new Map(categoryState.categories.map((c) => [c.id, c])),
    [categoryState.categories],
  );
  const sections = useMemo(
    () => groupTransactionsByDate(txState.transactions),
    [txState.transactions],
  );
  const activeFilterCount = useMemo(
    () => countActiveFilters(txScreenState.appliedFilters),
    [txScreenState.appliedFilters],
  );
  const hasAdvancedFilters = activeFilterCount > 0;

  const emptyVariant: EmptyVariant =
    txState.transactions.length > 0
      ? 'none'
      : debouncedSearch.trim() || txScreenState.activeFilter !== 'all' || hasAdvancedFilters
        ? 'noResults'
        : 'noData';

  function handleOpenFilter() {
    setDraft(txScreenState.appliedFilters);
    openFilter();
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      console.error('[transactions_v2] onRefresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }

  const previousLabel = useMemo(() => {
    const prev = previousPeriod(txScreenState.period);
    if (!prev || prev.type !== 'month') return null;
    return Strings.carouselMonthShort(prev.yearMonth);
  }, [txScreenState.period]);

  return {
    state: {
      sections,
      hasMore: txState.hasMore,
      loading: txState.loading,
      refreshing,
      emptyVariant,
      searchQuery: txScreenState.searchQuery,
      activeFilter: txScreenState.activeFilter,
      period: txScreenState.period,
      customRange,
      accountsById,
      categoriesById,
      activeFilterCount,
      totals,
      previousLabel,
    },
    setSearchQuery,
    setActiveFilter,
    setPeriod,
    setCustomRange,
    clearSearch,
    onEndReached: loadMore,
    onRefresh,
    openFilter: handleOpenFilter,
    goToDetail: (id: string) => router.push(`/transactions/detail/${id}`),
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions_v2/transactions.hook.ts
git commit -m "feat(§6): V2 hook — period resolution, totals loading, focus-blur reset"
```

---

## Task 23: V2 screen index + smoke test

**Files:**
- Create: `screens/transactions_v2/index.tsx`
- Test: `__tests__/screens/transactions_v2/transactions_screen.test.tsx`

- [ ] **Step 1: Write the failing smoke test**

Create `__tests__/screens/transactions_v2/transactions_screen.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';

import TransactionsScreenV2 from '@/screens/transactions_v2';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    View,
    useSharedValue: () => ({ value: 1 }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: unknown) => v,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');
  return { GestureHandlerRootView: View };
});

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

jest.mock('@/components/ui/sheet', () => {
  const { View } = jest.requireActual('react-native');
  const Sheet = (props: { visible: boolean; children: React.ReactNode }) =>
    props.visible ? React.createElement(View, null, props.children) : null;
  Sheet.Body = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  return { Sheet, SHEET_FOOTER_CLEARANCE: 0 };
});

const setSearchQuery = jest.fn();
const setActiveFilter = jest.fn();
const setPeriod = jest.fn();
const onRefresh = jest.fn();
const openFilter = jest.fn();

let mockReturn: any;

jest.mock('@/screens/transactions_v2/transactions.hook', () => ({
  useTransactions: () => mockReturn,
}));

function makeReturn(overrides: any = {}) {
  return {
    state: {
      sections: [],
      hasMore: false,
      loading: false,
      refreshing: false,
      emptyVariant: 'noData',
      searchQuery: '',
      activeFilter: 'all',
      period: { type: 'month', yearMonth: '2026-05' },
      customRange: null,
      accountsById: new Map(),
      categoriesById: new Map(),
      activeFilterCount: 0,
      totals: null,
      previousLabel: null,
      ...overrides.state,
    },
    setSearchQuery, setActiveFilter, setPeriod,
    setCustomRange: jest.fn(),
    clearSearch: jest.fn(),
    onEndReached: jest.fn(),
    onRefresh, openFilter,
    goToDetail: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  setSearchQuery.mockReset();
  setActiveFilter.mockReset();
  setPeriod.mockReset();
  onRefresh.mockReset();
  openFilter.mockReset();
});

describe('TransactionsScreenV2', () => {
  it('renders empty state when no transactions', () => {
    mockReturn = makeReturn();
    const { getByText } = render(<TransactionsScreenV2 />);
    expect(getByText('Add Transaction')).toBeTruthy();
  });

  it('renders header title', () => {
    mockReturn = makeReturn();
    const { getByText } = render(<TransactionsScreenV2 />);
    expect(getByText('Transactions')).toBeTruthy();
  });

  it('renders carousel pills', () => {
    mockReturn = makeReturn();
    const { getByText } = render(<TransactionsScreenV2 />);
    expect(getByText('Custom')).toBeTruthy();
  });

  it('renders type chips', () => {
    mockReturn = makeReturn();
    const { getByText } = render(<TransactionsScreenV2 />);
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('Expense')).toBeTruthy();
    expect(getByText('Transfer')).toBeTruthy();
  });

  it('does NOT render the TotalsStrip vs-caption when period is "all"', () => {
    mockReturn = makeReturn({ state: { period: { type: 'all' } } });
    const { queryByText } = render(<TransactionsScreenV2 />);
    expect(queryByText(/^vs /)).toBeNull();
  });

  it('renders TotalsStrip with caption when period is a month and totals loaded', () => {
    mockReturn = makeReturn({
      state: {
        period: { type: 'month', yearMonth: '2026-05' },
        previousLabel: 'Apr 2026',
        totals: {
          current: { incomeEgp: 1000, expenseEgp: 500, netEgp: 500 },
          previous: { incomeEgp: 900, expenseEgp: 600, netEgp: 300 },
        },
      },
    });
    const { getByText } = render(<TransactionsScreenV2 />);
    expect(getByText('vs Apr 2026')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- __tests__/screens/transactions_v2/transactions_screen.test.tsx`
Expected: FAIL — screen module not found.

- [ ] **Step 3: Implement the screen index**

Create `screens/transactions_v2/index.tsx`:

```tsx
import React, { useCallback } from 'react';
import { BackHandler, RefreshControl, SectionList, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { EmptyState } from '@/components/ui/empty_state';
import { Strings } from '@/constants/strings';

import { AddTransactionSheet } from '@/screens/transactions/transaction_form';
import { useAddTransactionState } from '@/screens/transactions/transaction_form/add_transaction.state';
import { useAddTransactionStore } from '@/screens/transactions/transaction_form/add_transaction.store';

import { DateHeader } from './components/date_header';
import { DateRangeSheet } from './components/date_range_sheet';
import { MonthCarousel } from './components/month_carousel';
import { SearchRow } from './components/search_row';
import { TotalsStrip } from './components/totals_strip';
import { TransactionRow } from './components/transaction_row';
import { TypeChips } from './components/type_chips';
import { FilterSheet } from './filter';
import { useFilterState } from './filter/filter.state';
import { useTransactions } from './transactions.hook';

export default function TransactionsScreenV2(): React.ReactElement {
  const t = useTransactions();
  const { state: addTxState, open: openAddTx } = useAddTransactionState(
    useShallow((s) => ({ state: s.state, open: s.open })),
  );
  const { state: filterUiState, setDateRangeSheetVisible } = useFilterState(
    useShallow((s) => ({
      state: s.state,
      setDateRangeSheetVisible: s.setDateRangeSheetVisible,
    })),
  );

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (useAddTransactionState.getState().state.visible) {
          useAddTransactionState.getState().close();
          useAddTransactionStore.getState().reset();
          return true;
        }
        if (useFilterState.getState().state.visible) {
          useFilterState.getState().close();
          return true;
        }
        if (useFilterState.getState().state.dateRangeSheetVisible) {
          useFilterState.getState().setDateRangeSheetVisible(false);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, []),
  );

  return (
    <Screen edges={['top']}>
      <View className="px-4 pt-3 pb-1">
        <Text className="font-sora font-bold text-[19px] text-foreground">
          {Strings.transactions}
        </Text>
      </View>

      <View className="mt-3">
        <MonthCarousel
          selection={t.state.period}
          customRange={t.state.customRange}
          onSelect={t.setPeriod}
          onOpenCustom={() => setDateRangeSheetVisible(true)}
        />
      </View>

      {t.state.period.type !== 'all' && t.state.totals ? (
        <TotalsStrip
          current={t.state.totals.current}
          previous={t.state.totals.previous}
          previousLabel={t.state.previousLabel}
        />
      ) : null}

      <SearchRow
        value={t.state.searchQuery}
        onChange={t.setSearchQuery}
        onClear={t.clearSearch}
        onOpenFilter={t.openFilter}
        activeFilterCount={t.state.activeFilterCount}
      />

      <TypeChips value={t.state.activeFilter} onChange={t.setActiveFilter} />

      <SectionList
        sections={t.state.sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => <DateHeader label={section.key} />}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            account={t.state.accountsById.get(item.account_id)}
            toAccount={item.to_account_id ? t.state.accountsById.get(item.to_account_id) : undefined}
            category={item.category_id ? t.state.categoriesById.get(item.category_id) : undefined}
            onPress={() => t.goToDetail(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            variant={t.state.emptyVariant === 'noData' ? 'transactions' : 'transactionsNoResults'}
            actionLabel={Strings.emptyTransactionsCta}
            onAction={openAddTx}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={t.state.refreshing}
            onRefresh={t.onRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
          />
        }
        onEndReached={t.onEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}
      />

      <AddTransactionSheet
        visible={addTxState.visible}
        onClose={() => {
          useAddTransactionState.getState().close();
          useAddTransactionStore.getState().reset();
        }}
      />
      <FilterSheet />
      <DateRangeSheet
        visible={filterUiState.dateRangeSheetVisible}
        initialFrom={t.state.customRange?.from}
        initialTo={t.state.customRange?.to}
        onClose={() => setDateRangeSheetVisible(false)}
        onConfirm={(from, to) => {
          t.setCustomRange({ from, to });
          t.setPeriod({ type: 'custom', from, to });
          setDateRangeSheetVisible(false);
        }}
      />
    </Screen>
  );
}
```

- [ ] **Step 4: Run tests — must pass**

Run: `npm test -- __tests__/screens/transactions_v2/transactions_screen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run full test suite + coverage**

Run: `npm run test:coverage`
Expected: PASS, thresholds met (80/95/100).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add screens/transactions_v2/index.tsx \
        __tests__/screens/transactions_v2/transactions_screen.test.tsx
git commit -m "feat(§6): TransactionsScreenV2 — full list screen with carousel + totals + chips + filter sheet"
```

---

## Task 24: Route flag-branch (flag still false)

**Files:**
- Modify: `app/(app)/(tabs)/transactions/index.tsx`

- [ ] **Step 1: Replace the route file with a flag-branch component**

Edit `app/(app)/(tabs)/transactions/index.tsx`. Replace the existing one-line re-export:

```tsx
import { FeatureFlags } from '@/constants/feature_flags';
import TransactionsScreenV1 from '@/screens/transactions';
import TransactionsScreenV2 from '@/screens/transactions_v2';

export default function TransactionsRoute() {
  return FeatureFlags.newTransactions ? <TransactionsScreenV2 /> : <TransactionsScreenV1 />;
}
```

Production continues to render V1 because `newTransactions === false`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the V2 test suite**

Run: `npm test -- __tests__/screens/transactions_v2/`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(tabs)/transactions/index.tsx"
git commit -m "chore(§6): route — flag-branch newTransactions (flag still false)"
```

---

## Task 25: Manual QA window (verification gate)

**No code changes.** Verification gate before promotion.

- [ ] **Step 1: Flip the flag locally (DO NOT commit)**

Edit `constants/feature_flags.ts` and set `newTransactions: true`. Keep the change uncommitted.

- [ ] **Step 2: Run on Android**

Run: `npx expo run:android`

- [ ] **Step 3: Walk the QA matrix**

1. Empty state when no transactions (fresh DB or filtered to empty).
2. Populated list — date headers sticky, rows render for each transaction type.
3. Carousel — 8 pills visible, current month selected, switching pills updates list + totals.
4. Custom pill — opens DateRangeSheet; applying a range updates list.
5. Totals strip — values match spec §5.1 worked example; deltas have correct polarity colour; hidden on "All" or earliest month.
6. Search bar — debounces, scopes within carousel.
7. Type chips — each filters correctly, single-select.
8. Filter sheet — three accordions open/close; multi-select on Accounts + Categories; Amount min/max + currency; Reset; Apply with count; Apply closes sheet.
9. Detail screen — opens from tap; renders for Expense, Income, Transfer (TransferFlowCard with tappable cells), CCPayment.
10. Cross-currency detail — Original Amount + Exchange Rate rows + "captured" badge.
11. Commitment-linked detail — TypeBadge shows in hero.
12. Tab switch + return — period resets to current month, search + filters cleared.
13. Pull-to-refresh — reloads data.
14. FAB tap — opens Add Transaction sheet.
15. Hardware back on Android — closes overlays in priority order (Add Transaction > Filter > DateRange).

- [ ] **Step 4: Smoke-test §1–§5 surfaces**

Verify Dashboard, Settings, Onboarding (if reachable), and Account detail still render. No regressions expected — no shared code is replaced.

- [ ] **Step 5: Revert the local flag**

Restore `newTransactions: false` in `constants/feature_flags.ts` so the working tree is clean.

- [ ] **Step 6: Sign-off**

If any QA item fails, fix in a follow-up task before Task 26. Otherwise this gate is closed.

---

## Task 26: Promotion commit — flip flag to true

**Files:**
- Modify: `constants/feature_flags.ts`
- Modify: `__tests__/feature_flags.test.ts`

- [ ] **Step 1: Flip the flag**

In `constants/feature_flags.ts`, change the `newTransactions` line:

```typescript
newTransactions: true, // §6 — promoted
```

- [ ] **Step 2: Update the feature flags test**

In `__tests__/feature_flags.test.ts`, find the per-section explicit assertion (§5 introduced this) and update `newTransactions` to `true`. If a generic "all flags false" assertion remains, replace it with an explicit per-section map.

- [ ] **Step 3: Run the test**

Run: `npm test -- __tests__/feature_flags.test.ts`
Expected: PASS.

- [ ] **Step 4: Run the §6 test suite**

Run: `npm test -- __tests__/screens/transactions_v2/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add constants/feature_flags.ts __tests__/feature_flags.test.ts
git commit -m "feat(§6): promote Transactions V2 — flip newTransactions flag to true"
```

- [ ] **Step 6: Push the branch and open the promotion PR**

```bash
git push -u origin feat/section-6-transactions
gh pr create --title "feat(§6): Transactions promote (flag flip)"
```

Use the GitHub UI to enter the body with `## Summary` and `## Test plan` sections (avoids nested heredoc fragility). Body content:

- Summary: flip `newTransactions` to true; TransactionsScreenV2 becomes the default.
- Test plan checklist: CI tests + type-check pass; post-merge cleanup PR (Task 27) lands within T+5 business days.

- [ ] **Step 7: Wait for the PR to merge to main**

Do not start Task 27 until promotion is on main.

---

## Task 27: Cleanup commit — delete V1, rename V2→transactions, drop flag, update CLAUDE.md

**Branch:** fresh branch off main after Task 26 merges.

```bash
git checkout main && git pull
git checkout -b cleanup/section-6-transactions
```

**Files:**
- Delete: `screens/transactions/` V1 list / detail / filter trees (keep `transaction_form/` — §7 owns it)
- Move: `screens/transactions_v2/*` → `screens/transactions/`
- Modify: `app/(app)/(tabs)/transactions/index.tsx` (restore to one-liner)
- Modify: `constants/feature_flags.ts` (remove `newTransactions`)
- Modify: `__tests__/feature_flags.test.ts` (remove `newTransactions` row)
- Modify: `CLAUDE.md` (remove four §6 entries from legacy actions-sheet list)

- [ ] **Step 1: Preserve `transaction_form/`, delete the rest of V1**

```bash
mv screens/transactions/transaction_form /tmp/__txform_keep
git rm -r screens/transactions/
mkdir -p screens/transactions
mv /tmp/__txform_keep screens/transactions/transaction_form
git add screens/transactions/transaction_form
```

- [ ] **Step 2: Move V2 tree into the restored `screens/transactions/`**

```bash
mv screens/transactions_v2/index.tsx               screens/transactions/index.tsx
mv screens/transactions_v2/transactions.hook.ts    screens/transactions/transactions.hook.ts
mv screens/transactions_v2/transactions.state.ts   screens/transactions/transactions.state.ts
mv screens/transactions_v2/transactions.store.ts   screens/transactions/transactions.store.ts
mv screens/transactions_v2/transactions.anim.ts    screens/transactions/transactions.anim.ts
mv screens/transactions_v2/transactions.helpers.ts screens/transactions/transactions.helpers.ts
mv screens/transactions_v2/components              screens/transactions/components
mv screens/transactions_v2/filter                  screens/transactions/filter
mv screens/transactions_v2/detail                  screens/transactions/detail
rmdir screens/transactions_v2
```

- [ ] **Step 3: Rewrite imports across the codebase**

Search-and-replace `transactions_v2` → `transactions`. Verify zero stragglers:

```bash
grep -rIn "transactions_v2" --include "*.ts" --include "*.tsx" . && echo "FAIL: stragglers remain" || echo "OK: no stragglers"
```

- [ ] **Step 4: Move tests from `transactions_v2/` to `transactions/`**

```bash
mkdir -p __tests__/screens/transactions
mv __tests__/screens/transactions_v2/* __tests__/screens/transactions/
rmdir __tests__/screens/transactions_v2
```

Then update test imports inside those files (search-and-replace `transactions_v2` → `transactions`).

- [ ] **Step 5: Restore the route to a one-liner**

Edit `app/(app)/(tabs)/transactions/index.tsx`:

```tsx
export { default } from '@/screens/transactions';
```

- [ ] **Step 6: Drop the flag**

Edit `constants/feature_flags.ts`. Delete the `newTransactions: true, // §6 — promoted` line.

- [ ] **Step 7: Update the feature flags test**

Edit `__tests__/feature_flags.test.ts`. Remove `newTransactions` from the per-section assertion.

- [ ] **Step 8: Update CLAUDE.md**

Edit `CLAUDE.md`. Under "## Bottom Sheets" → "Legacy consumers still in-flight" remove these four entries:

- `screens/transactions/filter/index.tsx`
- `screens/transactions/filter/components/filter_account_picker.tsx`
- `screens/transactions/filter/components/filter_category_picker.tsx`
- `screens/transactions/filter/components/filter_date_custom_picker.tsx`

Keep other (§7 / §8 / §9-owned) entries untouched.

- [ ] **Step 9: Run the full suite**

```bash
npm run test:coverage
npx tsc --noEmit
```

Expected: green. Coverage thresholds hold (80/95/100).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "cleanup(§6): remove V1 tree, rename V2→transactions, drop newTransactions flag, update CLAUDE.md"
```

- [ ] **Step 11: Push + PR (use GitHub UI for body)**

```bash
git push -u origin cleanup/section-6-transactions
gh pr create --title "cleanup(§6): finalise Transactions migration"
```

Use the UI to enter the body — see Task 26 Step 6 note. PR body covers: V1 deletion (transaction_form kept for §7), V2 → transactions rename, route restored to one-liner, flag removed, CLAUDE.md updated.

- [ ] **Step 12: Merge after CI passes**

Once merged, §6 is fully closed and the branch can be deleted.

---

## Self-Review

Post-write check against the spec. Each spec item maps to a task; any gap is listed and added.

**Spec coverage:**

| Spec § | Item | Task |
|---|---|---|
| §1.1 | Month carousel (pills, pan-snap, Custom sheet) | 10 + 14 |
| §1.2 | Totals strip (tinted cells + deltas + conditional visibility) | 11 |
| §1.3 | Type chips (single-select) | 13 |
| §1.4 | Search bar (persistent, debounced) | 12 |
| §1.5 | Filter button + drawer (accordion) | 15–18 |
| §1.6 | Transaction row rewrite | 9 |
| §1.7 | TypeBadge primitive | 3 |
| §1.8 | Detail screen polish | 20, 21 |
| §1.9 | TransferFlowCard | 19 |
| §1.10 | RNAS retirement (4 consumers) | 18 + 27 |
| §1.11 | Flag retirement | 24, 26, 27 |
| §3.1 | Screen anatomy | 22, 23 |
| §3.2 | Empty states | 23 |
| §3.3 | Carousel behaviour | 10, 22 |
| §3.4 | Totals strip behaviour | 11, 22 |
| §3.5 | Search × filter interaction | 22, 23 |
| §4.2 | Row template anatomy | 9 |
| §4.3 | TypeBadge variants + colours | 3 |
| §4.4 | Detail polish (rows + hero) | 20 |
| §4.5 | TransferFlowCard | 19 |
| §4.6 | FilterSheet accordion | 15–18 |
| §5.1 | Period totals math | 4 + 1 |
| §5.2 | computeDeltaPct + polarity | 1 |
| §5.3 | resolvePeriod | 1 |
| §5.4 | previousPeriod | 1 |
| §6.1 | File structure | File Map (above) |
| §6.2 | Store shape changes | 5, 6, 7 |
| §6.3 | Query wiring | 22 |
| §6.4 | MonthCarousel internals | 10 |
| §6.5 | DateRangeSheet | 14 |
| §6.6 | FilterSheet internals | 18 |
| §6.7 | TypeBadge | 3 |
| §6.8 | TransferFlowCard | 19 |
| §6.9 | Performance | covered in component implementations |
| §6.10 | Accessibility | 3, 10, 19, 22 |
| §7 (spec) | Migration waves | 24–27 |
| §8 (spec) | Testing strategy | 1, 3–4, 9–11, 18, 21, 23 |
| §9 (spec) | Strings additions | 2 |

**Placeholder scan:** No `TBD` / `TODO` / `FIXME` / "implement later" patterns. Two intentional fallback notes ("If `headerRight` is not a Sheet prop…", "If `ghost-destructive` is not a Button variant…") are explicit verification steps tied to one-line resolutions — not placeholders.

**Type consistency:**

- `CarouselSelection` — defined Task 1, consumed Tasks 5, 10, 22.
- `AdvancedFilters` — defined Task 6, consumed Tasks 5, 7, 15–18, 22.
- `PeriodTotals` — defined Task 4, consumed Tasks 11, 22.
- `TypeBadgeKind` — defined Task 3, consumed Task 9 (commitment branch).
- `EMPTY_FILTERS_V2` — defined Task 6, consumed Tasks 5, 18.

All references match. No orphaned types.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-17-section-6-transactions.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration. Recommended given the size (27 tasks) and the high parallelism inside Groups C, D, E.
2. **Inline Execution** — execute tasks in this session using executing-plans, batched with checkpoints.

Which approach?
