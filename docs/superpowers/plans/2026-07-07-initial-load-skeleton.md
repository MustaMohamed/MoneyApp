# Initial Load Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add HeroUI Native skeleton placeholders to first-load numeric summary UI so Dashboard, Transactions, and Commitments do not shift when async numbers arrive.

**Architecture:** Loading readiness is explicit in hooks/stores and passed into presentation components as booleans. Presentation components use HeroUI Native `SkeletonGroup` and `SkeletonGroup.Item` around fixed-size number/rail/count slots, keeping existing card footprints mounted while data loads. Real zero values remain displayable after loaded flags flip true.

**Tech Stack:** Expo React Native, TypeScript, Zustand, HeroUI Native `SkeletonGroup`, Jest + React Native Testing Library.

---

## File Map

- Modify `src/modules/dashboard/screens/dashboard/dashboard.store.ts`
  - Add loaded flags for async dashboard numeric sections.
  - Keep setters responsible for marking their section loaded.
- Modify `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`
  - Read loaded flags and expose `monthSpendLoading`, `transactionsLoading`, and `commitmentsLoading`.
- Modify `src/modules/dashboard/screens/dashboard/index.tsx`
  - Pass loading booleans into summary components.
- Modify `src/modules/dashboard/screens/dashboard/components/stat_cards.tsx`
  - Wrap month-spent numeric slots in `SkeletonGroup`.
- Modify `src/modules/dashboard/screens/dashboard/components/transactions_card.tsx`
  - Add `isLoading` prop and skeletonize current totals/progress/comparison slots.
- Modify `src/modules/dashboard/screens/dashboard/components/commitments_card.tsx`
  - Add `isLoading` prop and skeletonize committed total/progress/status count slots.
- Modify `src/modules/transactions/screens/transactions/components/totals_strip.tsx`
  - Add `isLoading` support and allow missing totals while loading.
- Modify `src/modules/transactions/screens/transactions/index.tsx`
  - Always render `TotalsStrip`; use skeleton state while totals are unavailable.
- Modify `src/modules/commitments/screens/commitments/components/summary_header.tsx`
  - Add `isLoading` prop and skeletonize numeric slots.
- Modify `src/modules/commitments/screens/commitments/index.tsx`
  - Pass `isLoading={!state.paymentsLoaded}` into `SummaryHeader`.
- Modify `__mocks__/heroui-native.tsx`
  - Add minimal `SkeletonGroup` mock for tests that use the global HeroUI mock.
- Modify tests:
  - `__tests__/dashboard.store.test.ts`
  - `__tests__/screens/dashboard/dashboard_hook.test.ts`
  - `__tests__/screens/dashboard/transactions_card.test.tsx`
  - `__tests__/screens/dashboard/transactions_card.test.tsx`
  - `__tests__/components/ui/filter_accordion.test.tsx` remains untouched.
  - Add `__tests__/screens/dashboard/commitments_card.test.tsx`
  - Add `__tests__/screens/dashboard/stat_cards.test.tsx`
  - Add `__tests__/screens/transactions/totals_strip_skeleton.test.tsx`
  - Add `__tests__/screens/commitments/summary_header.test.tsx`
  - Update `__tests__/screens/commitments.screen.test.tsx`
  - Update or add Transactions screen coverage only if existing screen tests expose the totals omission.

## Task 1: Dashboard Store Readiness Flags

**Files:**
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.store.ts`
- Modify: `__tests__/dashboard.store.test.ts`

- [ ] **Step 1: Write failing store tests**

Add tests that prove the dashboard store can tell unloaded data from real zero data:

```ts
it('starts async numeric dashboard sections as not loaded', () => {
  const state = useDashboardStore.getState();

  expect(state.monthSpendLoaded).toBe(false);
  expect(state.transactionTotalsLoaded).toBe(false);
  expect(state.commitmentPaymentsLoaded).toBe(false);
});

it('marks dashboard numeric sections loaded when setters receive data', () => {
  const currentSpend = { totalEgp: 0, usdNative: 0, count: 0 };
  const previousSpend = { totalEgp: 0, usdNative: 0, count: 0 };
  const currentTotals = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };
  const previousTotals = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };

  useDashboardStore.getState().setMonthSpendStats(currentSpend, previousSpend);
  useDashboardStore.getState().setTransactionTotals(currentTotals, previousTotals);
  useDashboardStore.getState().setCurrentMonthCommitmentPayments([]);

  const state = useDashboardStore.getState();
  expect(state.monthSpendLoaded).toBe(true);
  expect(state.transactionTotalsLoaded).toBe(true);
  expect(state.commitmentPaymentsLoaded).toBe(true);
});

it('reset clears dashboard numeric loaded flags', () => {
  useDashboardStore
    .getState()
    .setMonthSpendStats({ totalEgp: 1, usdNative: 0, count: 1 }, { totalEgp: 0, usdNative: 0, count: 0 });
  useDashboardStore
    .getState()
    .setTransactionTotals(
      { incomeEgp: 1, expenseEgp: 0, netEgp: 1 },
      { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
    );
  useDashboardStore.getState().setCurrentMonthCommitmentPayments([]);

  useDashboardStore.getState().reset();

  const state = useDashboardStore.getState();
  expect(state.monthSpendLoaded).toBe(false);
  expect(state.transactionTotalsLoaded).toBe(false);
  expect(state.commitmentPaymentsLoaded).toBe(false);
});
```

- [ ] **Step 2: Run failing store test**

Run:

```bash
npm test -- --runTestsByPath __tests__/dashboard.store.test.ts
```

Expected: FAIL because the three loaded flags do not exist.

- [ ] **Step 3: Implement store flags**

Update the store shape:

```ts
interface DashboardStoreShape {
  statsMap: Record<string, AccountStats>;
  currentMonthCommitmentPayments: CommitmentPayment[];
  currentMonthSpend: MonthSpendStats;
  previousMonthSpend: MonthSpendStats;
  currentTransactionTotals: PeriodTotals;
  previousTransactionTotals: PeriodTotals | null;
  commitmentPaymentsLoaded: boolean;
  monthSpendLoaded: boolean;
  transactionTotalsLoaded: boolean;
}
```

Update initial state:

```ts
const INITIAL_STATE: DashboardStoreShape = {
  statsMap: {},
  currentMonthCommitmentPayments: [],
  currentMonthSpend: EMPTY_SPEND,
  previousMonthSpend: EMPTY_SPEND,
  currentTransactionTotals: EMPTY_TOTALS,
  previousTransactionTotals: null,
  commitmentPaymentsLoaded: false,
  monthSpendLoaded: false,
  transactionTotalsLoaded: false,
};
```

Update setters:

```ts
setCurrentMonthCommitmentPayments: (p) =>
  set({ currentMonthCommitmentPayments: p, commitmentPaymentsLoaded: true }),
setMonthSpendStats: (current, previous) =>
  set({
    currentMonthSpend: current,
    previousMonthSpend: previous,
    monthSpendLoaded: true,
  }),
setTransactionTotals: (current, previous) =>
  set({
    currentTransactionTotals: current,
    previousTransactionTotals: previous,
    transactionTotalsLoaded: true,
  }),
```

- [ ] **Step 4: Run store test**

Run:

```bash
npm test -- --runTestsByPath __tests__/dashboard.store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/dashboard/screens/dashboard/dashboard.store.ts __tests__/dashboard.store.test.ts
git commit -m "feat: track dashboard summary readiness"
```

## Task 2: Dashboard Hook and Screen Loading Props

**Files:**
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`
- Modify: `src/modules/dashboard/screens/dashboard/index.tsx`
- Modify: `__tests__/screens/dashboard/dashboard_hook.test.ts`

- [ ] **Step 1: Write failing hook tests**

Replace the old “does not expose a store-loaded sentinel” test with a targeted readiness contract:

```ts
it('exposes dashboard summary loading flags before async sections load', () => {
  const { result } = renderHook(() => useDashboard());

  expect(result.current.state.monthSpend.loading).toBe(true);
  expect(result.current.state.transactions.loading).toBe(true);
  expect(result.current.state.commitments.loading).toBe(true);
});

it('exposes loaded dashboard summary flags from the store', () => {
  const { attachMockSelectorStore } = require('@/test_helpers/mock_zustand_selectors');
  attachMockSelectorStore(useDashboardStore as jest.Mock, () => ({
    statsMap: {},
    currentMonthCommitmentPayments: [],
    currentMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
    previousMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
    currentTransactionTotals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
    previousTransactionTotals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
    commitmentPaymentsLoaded: true,
    monthSpendLoaded: true,
    transactionTotalsLoaded: true,
    setStatsMap: jest.fn(),
    setCurrentMonthCommitmentPayments: jest.fn(),
    setMonthSpendStats: jest.fn(),
    setTransactionTotals: jest.fn(),
  }));

  const { result } = renderHook(() => useDashboard());

  expect(result.current.state.monthSpend.loading).toBe(false);
  expect(result.current.state.transactions.loading).toBe(false);
  expect(result.current.state.commitments.loading).toBe(false);
});
```

Update every dashboard store mock in the test setup to include:

```ts
commitmentPaymentsLoaded: false,
monthSpendLoaded: false,
transactionTotalsLoaded: false,
```

- [ ] **Step 2: Run failing hook test**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/dashboard/dashboard_hook.test.ts
```

Expected: FAIL because hook state does not include the loading booleans.

- [ ] **Step 3: Expose loading state in hook**

Add loaded flags to the `useDashboardStore` selector:

```ts
const {
  statsMap,
  currentMonthCommitmentPayments,
  currentMonthSpend,
  previousMonthSpend,
  currentTransactionTotals,
  previousTransactionTotals,
  commitmentPaymentsLoaded,
  monthSpendLoaded,
  transactionTotalsLoaded,
} = useDashboardStore(
  useShallow((s) => ({
    statsMap: s.statsMap,
    currentMonthCommitmentPayments: s.currentMonthCommitmentPayments,
    currentMonthSpend: s.currentMonthSpend,
    previousMonthSpend: s.previousMonthSpend,
    currentTransactionTotals: s.currentTransactionTotals,
    previousTransactionTotals: s.previousTransactionTotals,
    commitmentPaymentsLoaded: s.commitmentPaymentsLoaded,
    monthSpendLoaded: s.monthSpendLoaded,
    transactionTotalsLoaded: s.transactionTotalsLoaded,
  })),
);
```

Expose booleans in returned state:

```ts
monthSpend: {
  currentEgp: currentMonthSpend.totalEgp,
  currentUsdNative: currentMonthSpend.usdNative,
  currentCount: currentMonthSpend.count,
  previousEgp: previousMonthSpend.totalEgp,
  deltaPct: spendDeltaPct,
  yearMonth: currentYearMonth,
  loading: !monthSpendLoaded,
},
commitments: {
  counts: commitmentCounts,
  totalsByCurrency: commitmentTotalsByCurrency,
  yearMonth: currentYearMonth,
  loading: !commitmentPaymentsLoaded,
},
transactions: {
  current: currentTransactionTotals,
  previous: previousTransactionTotals,
  previousLabel: formatMonthYear(previousYearMonth),
  yearMonth: currentYearMonth,
  loading: !transactionTotalsLoaded,
},
```

- [ ] **Step 4: Pass loading props in dashboard screen**

Update component calls:

```tsx
<StatCards
  netWorthEgp={state.netWorth.netWorthEgp}
  assetsEgp={state.netWorth.assetsEgp}
  liabilitiesEgp={state.netWorth.liabilitiesEgp}
  assetsCount={state.accountCounts.assets}
  liabilitiesCount={state.accountCounts.liabilities}
  monthSpentEgp={state.monthSpend.currentEgp}
  monthSpentUsd={state.monthSpend.currentUsdNative}
  monthSpendDeltaPct={state.monthSpend.deltaPct}
  monthSpendCount={state.monthSpend.currentCount}
  spendYearMonth={state.monthSpend.yearMonth}
  monthSpendLoading={state.monthSpend.loading}
/>

<TransactionsCard
  current={state.transactions.current}
  previous={state.transactions.previous}
  previousLabel={state.transactions.previousLabel}
  yearMonth={state.transactions.yearMonth}
  isLoading={state.transactions.loading}
  onPress={goToTransactions}
/>

<CommitmentsCard
  counts={state.commitments.counts}
  totalsByCurrency={state.commitments.totalsByCurrency}
  yearMonth={state.commitments.yearMonth}
  isLoading={state.commitments.loading}
  onPress={goToCommitments}
/>
```

- [ ] **Step 5: Run hook test**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/dashboard/dashboard_hook.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/dashboard/screens/dashboard/dashboard.hook.ts src/modules/dashboard/screens/dashboard/index.tsx __tests__/screens/dashboard/dashboard_hook.test.ts
git commit -m "feat: expose dashboard skeleton readiness"
```

## Task 3: HeroUI Skeleton Test Mock

**Files:**
- Modify: `__mocks__/heroui-native.tsx`

- [ ] **Step 1: Add minimal SkeletonGroup mock**

Add this mock implementation:

```tsx
function SkeletonGroupRoot({
  children,
  isLoading = true,
  isSkeletonOnly,
  ...props
}: {
  children?: React.ReactNode;
  isLoading?: boolean;
  isSkeletonOnly?: boolean;
}) {
  if (!isLoading && isSkeletonOnly) return null;
  return (
    <View accessibilityState={{ busy: isLoading }} {...props}>
      {children}
    </View>
  );
}

function SkeletonGroupItem({
  children,
  isLoading,
  ...props
}: {
  children?: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <View testID="skeleton-item" accessibilityState={{ busy: isLoading }} {...props}>
      {isLoading ? null : children}
    </View>
  );
}

export const SkeletonGroup = Object.assign(SkeletonGroupRoot, {
  Item: SkeletonGroupItem,
});
```

- [ ] **Step 2: Run a smoke test using global mock**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/ui/sheet_snap_points.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add __mocks__/heroui-native.tsx
git commit -m "test: mock heroui skeleton group"
```

## Task 4: Dashboard Summary Component Skeletons

**Files:**
- Modify: `src/modules/dashboard/screens/dashboard/components/stat_cards.tsx`
- Modify: `src/modules/dashboard/screens/dashboard/components/transactions_card.tsx`
- Modify: `src/modules/dashboard/screens/dashboard/components/commitments_card.tsx`
- Add: `__tests__/screens/dashboard/stat_cards.test.tsx`
- Modify: `__tests__/screens/dashboard/transactions_card.test.tsx`
- Add: `__tests__/screens/dashboard/commitments_card.test.tsx`

- [ ] **Step 1: Write failing `StatCards` skeleton test**

Create `__tests__/screens/dashboard/stat_cards.test.tsx` with:

```tsx
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { StatCards } from '@/modules/dashboard/screens/dashboard/components/stat_cards';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const SkeletonGroupRoot = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, { testID: 'skeleton-group' }, children);
  const SkeletonGroupItem = ({ children, isLoading }: { children?: ReactNode; isLoading?: boolean }) =>
    React.createElement(View, { testID: 'skeleton-item' }, isLoading ? null : children);
  return {
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

const baseProps = {
  netWorthEgp: 1000,
  assetsEgp: 1200,
  liabilitiesEgp: -200,
  assetsCount: 2,
  liabilitiesCount: 1,
  monthSpentEgp: 3000,
  monthSpentUsd: 20,
  monthSpendDeltaPct: 15,
  monthSpendCount: 4,
  spendYearMonth: '2026-07',
};

describe('StatCards skeleton loading', () => {
  it('skeletonizes month-spend numbers while loading without hiding net-worth numbers', () => {
    const { queryByText, getByText, getAllByTestId } = render(
      <StatCards {...baseProps} monthSpendLoading />,
    );

    expect(getByText('1,000')).toBeTruthy();
    expect(queryByText('3,000')).toBeNull();
    expect(queryByText('20')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Write failing dashboard card tests**

Update `__tests__/screens/dashboard/transactions_card.test.tsx` local HeroUI mock with `SkeletonGroup`, then add:

```tsx
it('shows skeleton slots instead of totals while loading', () => {
  const { queryByText, getAllByTestId } = render(
    <TransactionsCard
      current={{ incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 }}
      previous={{ incomeEgp: 22800, expenseEgp: 11300, netEgp: 11500 }}
      previousLabel="June 2026"
      yearMonth="2026-07"
      isLoading
      onPress={jest.fn()}
    />,
  );

  expect(queryByText('+25,000')).toBeNull();
  expect(queryByText('-13,000')).toBeNull();
  expect(queryByText('+12,000')).toBeNull();
  expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(4);
});
```

Create `__tests__/screens/dashboard/commitments_card.test.tsx` with:

```tsx
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Strings } from '@/constants/strings';
import { CommitmentsCard } from '@/modules/dashboard/screens/dashboard/components/commitments_card';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
  const SkeletonGroupRoot = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, { testID: 'skeleton-group' }, children);
  const SkeletonGroupItem = ({ children, isLoading }: { children?: ReactNode; isLoading?: boolean }) =>
    React.createElement(View, { testID: 'skeleton-item' }, isLoading ? null : children);
  return {
    Card: ({ children, ...props }: { children?: ReactNode }) => React.createElement(View, props, children),
    PressableFeedback: ({ children, onPress, accessibilityLabel }: { children?: ReactNode; onPress: () => void; accessibilityLabel?: string }) =>
      React.createElement(Pressable, { onPress, accessibilityLabel }, children),
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('CommitmentsCard skeleton loading', () => {
  it('shows skeleton slots instead of committed totals while loading', () => {
    const { queryByText, getAllByTestId } = render(
      <CommitmentsCard
        counts={{ paid: 1, overdue: 2, due: 3, upcoming: 4, skipped: 5, total: 10 }}
        totalsByCurrency={new Map([['EGP', 5000]])}
        yearMonth="2026-07"
        isLoading
        onPress={jest.fn()}
      />,
    );

    expect(queryByText('5,000 EGP')).toBeNull();
    expect(queryByText('10%')).toBeNull();
    expect(queryByText('1')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(5);
    expect(queryByText(Strings.dashboardCommitmentsTitle)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run failing component tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/dashboard/stat_cards.test.tsx __tests__/screens/dashboard/transactions_card.test.tsx __tests__/screens/dashboard/commitments_card.test.tsx
```

Expected: FAIL because loading props and skeletons are not implemented.

- [ ] **Step 4: Implement `StatCards` skeletons**

Import `SkeletonGroup`:

```ts
import { SkeletonGroup } from 'heroui-native';
```

Add prop:

```ts
monthSpendLoading: boolean;
```

Wrap only the month-spent card body:

```tsx
<SkeletonGroup isLoading={monthSpendLoading}>
  <SkeletonGroup.Item className="h-6 w-28 rounded-md">
    <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
      {formatAmount(monthSpentEgp)} <Text className="text-muted text-xs font-medium">EGP</Text>
    </Text>
  </SkeletonGroup.Item>
  <SkeletonGroup.Item className="h-6 w-24 rounded-md">
    <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
      {formatAmount(monthSpentUsd, 0)}{' '}
      <Text className="text-muted text-xs font-medium">USD</Text>
    </Text>
  </SkeletonGroup.Item>
  <SkeletonGroup.Item className="h-5 w-full rounded-md">
    <View
      className="flex-row items-center justify-between"
      style={{ flexDirection: 'row', gap: ms(8) }}
    >
      <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(5) }}>
        <View
          className="flex-row items-center rounded-full"
          style={{
            flexDirection: 'row',
            gap: ms(3),
            paddingHorizontal: ms(8),
            paddingVertical: ms(2),
            backgroundColor: deltaColor + '22',
          }}
        >
          <MaterialCommunityIcons name={deltaIcon} size={ms(11)} color={deltaColor} />
          <Text className="text-xs font-semibold" style={{ color: deltaColor }}>
            {monthSpendDeltaPct == null ? '—' : `${Math.abs(monthSpendDeltaPct)}%`}
          </Text>
        </View>
        <Text variant="hint" className="text-muted text-xs">
          vs {prevMonthLabel}
        </Text>
      </View>
      <Text variant="hint" className="text-muted text-xs">
        {monthSpendCount} {Strings.dashMonthSpentTxsUnit}
      </Text>
    </View>
  </SkeletonGroup.Item>
</SkeletonGroup>
```

- [ ] **Step 5: Implement dashboard card skeletons**

Import `SkeletonGroup` in both card files:

```ts
import { Card, PressableFeedback, SkeletonGroup } from 'heroui-native';
```

Add `isLoading: boolean` to each props interface and function parameter.

For `TransactionsCard`, wrap the numeric portion:

```tsx
<SkeletonGroup isLoading={isLoading} style={{ gap: ms(8) }}>
  <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
    {METRICS.map((metric) => (
      <SkeletonGroup.Item
        key={metric.key}
        className="h-5 flex-1 rounded-md"
        style={{ flex: 1 }}
      >
        <MetricValue
          value={formatSignedAmount(currentValue(current, metric.key), metric.key)}
          label={metric.label}
          align={metric.align}
          className={metric.valueClass}
        />
      </SkeletonGroup.Item>
    ))}
  </View>
  <SkeletonGroup.Item className="h-[3px] w-full rounded-[2px]">
    <View
      className="overflow-hidden rounded"
      style={{ height: ms(3), backgroundColor: Colors.dark.surfaceEl }}
      accessibilityLabel={Strings.totalsExpenseShareA11y(expensePct)}
    >
      <View className="bg-danger h-full rounded-[2px]" style={{ width: `${expensePct}%` }} />
    </View>
  </SkeletonGroup.Item>
  {deltas ? (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
        {METRICS.map((metric) => (
          <SkeletonGroup.Item
            key={metric.key}
            className="h-4 flex-1 rounded-md"
            style={{ flex: 1 }}
          >
            <DeltaValue metric={metric.key} deltaPct={deltas[metric.key]} align={metric.align} />
          </SkeletonGroup.Item>
        ))}
      </View>
      {previousLabel ? (
        <SkeletonGroup.Item className="mx-auto h-3 w-24 rounded-md">
          <Text className="font-inter text-foreground/45 text-center text-[9px] font-bold tracking-wide uppercase">
            {Strings.totalsVsPrev(previousLabel)}
          </Text>
        </SkeletonGroup.Item>
      ) : null}
    </>
  ) : null}
</SkeletonGroup>
```

For `CommitmentsCard`, wrap the total/progress/count section similarly:

```tsx
<SkeletonGroup isLoading={isLoading} style={{ gap: ms(8) }}>
  <View className="flex-row items-center justify-between" style={{ flexDirection: 'row', gap: ms(8) }}>
    <View className="flex-1" style={{ flex: 1 }}>
      <Text variant="hint" className="text-muted text-xs uppercase">
        {Strings.commitmentsTotalCommitted}
      </Text>
      <SkeletonGroup.Item className="h-6 w-32 rounded-md">
        <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
          {totalsLine}
        </Text>
      </SkeletonGroup.Item>
    </View>
    <SkeletonGroup.Item className="h-7 w-14 rounded-full">
      <View className="rounded-full" style={{ paddingHorizontal: ms(12), paddingVertical: ms(3), backgroundColor: Colors.shared.cairoGold + '22' }}>
        <Text className="text-base font-bold" style={{ color: Colors.shared.cairoGold }}>
          {progressPct}%
        </Text>
      </View>
    </SkeletonGroup.Item>
  </View>
  <SkeletonGroup.Item className="h-[3px] w-full rounded-[2px]">
    <View className="overflow-hidden rounded" style={{ height: ms(3), backgroundColor: Colors.dark.surfaceEl }}>
      <LinearGradient
        colors={[Colors.shared.cairoGold, Colors.dark.gold]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: ms(3), width: `${progressPct}%`, borderRadius: ms(2) }}
      />
    </View>
  </SkeletonGroup.Item>
  <View className="flex-row items-center justify-between" style={{ flexDirection: 'row' }}>
    <SkeletonGroup.Item className="h-4 w-8 rounded-md">
      <Stat icon="check-circle" color={Colors.dark.positive} value={counts.paid} />
    </SkeletonGroup.Item>
    <SkeletonGroup.Item className="h-4 w-8 rounded-md">
      <Stat icon="alert-circle" color={Colors.dark.negative} value={counts.overdue} />
    </SkeletonGroup.Item>
    <SkeletonGroup.Item className="h-4 w-8 rounded-md">
      <Stat icon="clock-outline" color={Colors.dark.gold} value={counts.due} />
    </SkeletonGroup.Item>
    <SkeletonGroup.Item className="h-4 w-8 rounded-md">
      <Stat icon="calendar-clock" color={Colors.dark.text2} value={counts.upcoming} />
    </SkeletonGroup.Item>
    <SkeletonGroup.Item className="h-4 w-8 rounded-md">
      <Stat icon="minus-circle" color={Colors.dark.text3} value={counts.skipped} />
    </SkeletonGroup.Item>
  </View>
</SkeletonGroup>
```

- [ ] **Step 6: Run dashboard component tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/dashboard/stat_cards.test.tsx __tests__/screens/dashboard/transactions_card.test.tsx __tests__/screens/dashboard/commitments_card.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/dashboard/screens/dashboard/components/stat_cards.tsx src/modules/dashboard/screens/dashboard/components/transactions_card.tsx src/modules/dashboard/screens/dashboard/components/commitments_card.tsx __tests__/screens/dashboard/stat_cards.test.tsx __tests__/screens/dashboard/transactions_card.test.tsx __tests__/screens/dashboard/commitments_card.test.tsx
git commit -m "feat: skeletonize dashboard summary cards"
```

## Task 5: Transactions Totals Strip Skeleton

**Files:**
- Modify: `src/modules/transactions/screens/transactions/components/totals_strip.tsx`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Add: `__tests__/screens/transactions/totals_strip_skeleton.test.tsx`

- [ ] **Step 1: Write failing totals strip skeleton test**

Create `__tests__/screens/transactions/totals_strip_skeleton.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { TotalsStrip } from '@/modules/transactions/screens/transactions/components/totals_strip';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const SkeletonGroupRoot = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, { testID: 'skeleton-group' }, children);
  const SkeletonGroupItem = ({ children, isLoading }: { children?: ReactNode; isLoading?: boolean }) =>
    React.createElement(View, { testID: 'skeleton-item' }, isLoading ? null : children);
  return {
    Card: ({ children, ...props }: { children?: ReactNode }) => React.createElement(View, props, children),
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('TotalsStrip skeleton loading', () => {
  it('keeps the totals card footprint while totals are loading', () => {
    const { queryByText, getAllByTestId } = render(
      <TotalsStrip current={null} previous={null} previousLabel="June 2026" isLoading />,
    );

    expect(queryByText('+0')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/totals_strip_skeleton.test.tsx
```

Expected: FAIL because `TotalsStrip` requires non-null current totals and has no `isLoading`.

- [ ] **Step 3: Implement nullable totals and skeletons**

Change props:

```ts
interface Props {
  current: PeriodTotals | null;
  previous: PeriodTotals | null;
  previousLabel: string | null;
  isLoading?: boolean;
}
```

Add fallback totals for layout math only:

```ts
const EMPTY_TOTALS: PeriodTotals = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };
```

In `TotalsStrip`:

```ts
const displayCurrent = current ?? EMPTY_TOTALS;
const expensePct = expenseSharePct(displayCurrent);
const deltas =
  previous && current
    ? {
        income: computeDeltaPct(current.incomeEgp, previous.incomeEgp),
        expense: computeDeltaPct(current.expenseEgp, previous.expenseEgp),
        net: computeDeltaPct(current.netEgp, previous.netEgp),
      }
    : null;
```

Wrap the existing body in:

```tsx
<SkeletonGroup isLoading={isLoading}>
  <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
    {METRICS.map((metric) => (
      <SkeletonGroup.Item
        key={metric.key}
        className="h-5 flex-1 rounded-md"
        style={{ flex: 1 }}
      >
        <MetricValue
          value={formatSignedAmount(currentValue(displayCurrent, metric.key), metric.key)}
          label={metric.label}
          align={metric.align}
          className={metric.valueClass}
        />
      </SkeletonGroup.Item>
    ))}
  </View>
  <SkeletonGroup.Item className="h-[3px] w-full rounded-[2px]">
    <View
      className={TRANSACTIONS_EXPENSE_SHARE_RAIL_CLASS_NAME}
      accessibilityLabel={Strings.totalsExpenseShareA11y(expensePct)}
    >
      <View className="bg-danger h-full rounded-[2px]" style={{ width: `${expensePct}%` }} />
    </View>
  </SkeletonGroup.Item>
  {deltas ? (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
        {METRICS.map((metric) => (
          <SkeletonGroup.Item
            key={metric.key}
            className="h-4 flex-1 rounded-md"
            style={{ flex: 1 }}
          >
            <DeltaValue metric={metric.key} deltaPct={deltas[metric.key]} align={metric.align} />
          </SkeletonGroup.Item>
        ))}
      </View>
      {previousLabel ? (
        <SkeletonGroup.Item className="mx-auto h-3 w-24 rounded-md">
          <Text className="font-inter text-foreground/45 text-center text-[9px] font-bold tracking-wide uppercase">
            {Strings.totalsVsPrev(previousLabel)}
          </Text>
        </SkeletonGroup.Item>
      ) : null}
    </>
  ) : null}
</SkeletonGroup>
```

Use `displayCurrent` for `MetricValue` and `expenseSharePct`.

- [ ] **Step 4: Always render `TotalsStrip` in Transactions screen**

Replace conditional render:

```tsx
{state.totals ? (
  <TotalsStrip
    current={state.totals.current}
    previous={state.totals.previous}
    previousLabel={state.previousLabel}
  />
) : null}
```

with:

```tsx
<TotalsStrip
  current={state.totals?.current ?? null}
  previous={state.totals?.previous ?? null}
  previousLabel={state.previousLabel}
  isLoading={!state.totals}
/>
```

- [ ] **Step 5: Run transactions tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/totals_strip_skeleton.test.tsx __tests__/screens/transactions/totals_strip.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/transactions/screens/transactions/components/totals_strip.tsx src/modules/transactions/screens/transactions/index.tsx __tests__/screens/transactions/totals_strip_skeleton.test.tsx
git commit -m "feat: keep transaction totals stable while loading"
```

## Task 6: Commitments Summary Header Skeleton

**Files:**
- Modify: `src/modules/commitments/screens/commitments/components/summary_header.tsx`
- Modify: `src/modules/commitments/screens/commitments/index.tsx`
- Add: `__tests__/screens/commitments/summary_header.test.tsx`
- Modify: `__tests__/screens/commitments.screen.test.tsx`

- [ ] **Step 1: Write failing summary header test**

Create `__tests__/screens/commitments/summary_header.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SummaryHeader } from '@/modules/commitments/screens/commitments/components/summary_header';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const SkeletonGroupRoot = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, { testID: 'skeleton-group' }, children);
  const SkeletonGroupItem = ({ children, isLoading }: { children?: ReactNode; isLoading?: boolean }) =>
    React.createElement(View, { testID: 'skeleton-item' }, isLoading ? null : children);
  return {
    Card: ({ children, ...props }: { children?: ReactNode }) => React.createElement(View, props, children),
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('SummaryHeader skeleton loading', () => {
  it('does not render final-looking empty values while payments load', () => {
    const { queryByText, getAllByTestId } = render(
      <SummaryHeader
        counts={{ paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 }}
        totalsByCurrency={new Map()}
        isLoading
      />,
    );

    expect(queryByText('—')).toBeNull();
    expect(queryByText('0%')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Update commitments screen test mock**

Change the `SummaryHeader` mock in `__tests__/screens/commitments.screen.test.tsx` to capture the loading prop:

```tsx
jest.mock('@/modules/commitments/screens/commitments/components/summary_header', () => ({
  SummaryHeader: ({ isLoading }: { isLoading?: boolean }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`Summary loading:${String(isLoading)}`}</Text>;
  },
}));
```

Add a test:

```tsx
it('passes payments loading state to the summary header', () => {
  mockUseCommitments({
    hasCommitments: true,
    paymentsLoaded: false,
  });

  const { getByText } = render(<CommitmentsScreen />);

  expect(getByText('Summary loading:true')).toBeTruthy();
});
```

- [ ] **Step 3: Run failing commitments tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/commitments/summary_header.test.tsx __tests__/screens/commitments.screen.test.tsx
```

Expected: FAIL because `SummaryHeader` has no `isLoading` prop and the screen does not pass it.

- [ ] **Step 4: Implement `SummaryHeader` skeletons**

Import `SkeletonGroup`:

```ts
import { Card, SkeletonGroup } from 'heroui-native';
```

Add prop:

```ts
isLoading?: boolean;
```

Wrap number slots:

```tsx
<SkeletonGroup isLoading={isLoading}>
  <View
    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    className="gap-2"
  >
    <View style={{ flex: 1 }}>
      <Text className="font-inter text-muted text-[10px] tracking-wide uppercase">
        {Strings.commitmentsTotalCommitted}
      </Text>
      <SkeletonGroup.Item className="h-5 w-32 rounded-md">
        <Text className="font-sora text-foreground text-[16px] font-bold" numberOfLines={1}>
          {totalsLine}
        </Text>
      </SkeletonGroup.Item>
    </View>
    <SkeletonGroup.Item className="h-6 w-12 rounded-full">
      <View
        style={{ backgroundColor: `${GoldTokens[500]}22` }}
        className="rounded-full px-2 py-0.5"
      >
        <Text className="font-sora text-[13px] font-bold" style={{ color: GoldTokens[500] }}>
          {progressPct}%
        </Text>
      </View>
    </SkeletonGroup.Item>
  </View>
  <SkeletonGroup.Item className="h-[3px] w-full rounded-[2px]">
    <View className="bg-default h-[3px] overflow-hidden rounded-[2px]">
      <LinearGradient
        colors={[GoldTokens[500], Colors.dark.gold]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 3, borderRadius: 2, width: `${progressPct}%` }}
      />
    </View>
  </SkeletonGroup.Item>
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <SkeletonGroup.Item className="h-4 w-8 rounded-md">
      <Stat icon="check-circle" color={Colors.dark.positive} value={counts.paid} />
    </SkeletonGroup.Item>
    <SkeletonGroup.Item className="h-4 w-8 rounded-md">
      <Stat icon="alert-circle" color={Colors.dark.negative} value={counts.overdue} />
    </SkeletonGroup.Item>
    <SkeletonGroup.Item className="h-4 w-8 rounded-md">
      <Stat icon="clock-outline" color={Colors.dark.gold} value={counts.due} />
    </SkeletonGroup.Item>
    <SkeletonGroup.Item className="h-4 w-8 rounded-md">
      <Stat icon="calendar-clock" color={Colors.dark.text2} value={counts.upcoming} />
    </SkeletonGroup.Item>
    <SkeletonGroup.Item className="h-4 w-8 rounded-md">
      <Stat icon="minus-circle" color={Colors.dark.text3} value={counts.skipped} />
    </SkeletonGroup.Item>
  </View>
</SkeletonGroup>
```

- [ ] **Step 5: Pass loading from Commitments screen**

Update:

```tsx
<SummaryHeader
  counts={state.counts}
  totalsByCurrency={state.totalsByCurrency}
  isLoading={!state.paymentsLoaded}
/>
```

- [ ] **Step 6: Run commitments tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/commitments/summary_header.test.tsx __tests__/screens/commitments.screen.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/commitments/screens/commitments/components/summary_header.tsx src/modules/commitments/screens/commitments/index.tsx __tests__/screens/commitments/summary_header.test.tsx __tests__/screens/commitments.screen.test.tsx
git commit -m "feat: skeletonize commitments summary loading"
```

## Task 7: Final Verification

**Files:**
- All modified source and tests.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- --runTestsByPath \
  __tests__/dashboard.store.test.ts \
  __tests__/screens/dashboard/dashboard_hook.test.ts \
  __tests__/screens/dashboard/stat_cards.test.tsx \
  __tests__/screens/dashboard/transactions_card.test.tsx \
  __tests__/screens/dashboard/commitments_card.test.tsx \
  __tests__/screens/transactions/totals_strip.test.tsx \
  __tests__/screens/transactions/totals_strip_skeleton.test.tsx \
  __tests__/screens/commitments/summary_header.test.tsx \
  __tests__/screens/commitments.screen.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run static verification**

Run:

```bash
npm run format:check
npm run lint -- src/modules/dashboard/screens/dashboard src/modules/transactions/screens/transactions src/modules/commitments/screens/commitments __tests__/dashboard.store.test.ts __tests__/screens/dashboard __tests__/screens/transactions/totals_strip_skeleton.test.tsx __tests__/screens/commitments
npm run typecheck
```

Expected: all commands exit 0. Existing repo-wide lint warnings are acceptable only if the command exits 0; targeted changed files should not emit new warnings.

- [ ] **Step 3: Run full tests**

Run:

```bash
npm test -- --ci --silent
```

Expected: 149+ test suites pass with zero failures.

- [ ] **Step 4: Inspect worktree**

Run:

```bash
git status --short --branch
git log --oneline --decorate -6
```

Expected: branch is ahead of `origin/main`; worktree is clean after final commit.

## Self-Review Checklist

- Spec coverage:
  - Dashboard loaded flags and skeleton props: Tasks 1, 2, 4.
  - Transactions stable totals footprint: Task 5.
  - Commitments summary skeleton: Task 6.
  - HeroUI Native SkeletonGroup usage: Tasks 3, 4, 5, 6.
  - Real zero values after loading: Tasks 1, 4, 5, 6 component tests.
  - Refresh should not flash skeletons: Task 1 keeps loaded flags true after setters; refresh does not reset them.
- Placeholder scan: no unresolved markers, no vague implementation steps, no undefined functions.
- Type consistency:
  - Dashboard booleans use `monthSpendLoaded`, `transactionTotalsLoaded`, `commitmentPaymentsLoaded` in store and inverse `loading` props in hook.
  - Presentation props use `isLoading` except `StatCards`, which uses `monthSpendLoading` to scope loading to only one of its two cards.
