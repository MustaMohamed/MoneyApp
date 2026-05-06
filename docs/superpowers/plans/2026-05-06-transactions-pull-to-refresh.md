# Transactions Pull-to-Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pull-to-refresh to the transactions list so users can drag down to reload in all states (populated list, no-results, and no-data empty).

**Architecture:** Wire `SectionList`'s built-in `onRefresh`/`refreshing` props to the existing `refresh()` action on `useTransactionStore`. A new `refreshing` boolean managed by `useState` in the hook stays separate from `loading` so the PTR spinner and pagination footer never conflict. The `EmptyState` moves from an outer conditional branch into `ListEmptyComponent` so PTR is available regardless of data state.

**Tech Stack:** React Native `SectionList`, `useState`, `@testing-library/react-native` (`renderHook`, `act`)

---

### Task 1: Write the failing test for `refreshing` state in `useTransactions`

**Files:**
- Create: `__tests__/transactions_hook.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useTransactions } from '@/screens/transactions/transactions.hook';
import { useTransactionStore } from '@/store/transaction.store';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionsScreenStore } from '@/screens/transactions/transactions.store';
import { useFilterDrawerStore, EMPTY_FILTERS } from '@/screens/transactions/filter/filter.store';
import { useFilterDrawerState } from '@/screens/transactions/filter/filter.state';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/transaction.store', () => ({ useTransactionStore: jest.fn() }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/screens/transactions/transactions.store', () => ({
  useTransactionsScreenStore: jest.fn(),
}));
jest.mock('@/screens/transactions/filter/filter.store', () => ({
  useFilterDrawerStore: jest.fn(),
  EMPTY_FILTERS: {
    accountIds: [],
    categoryIds: [],
    datePreset: 'allTime',
    amountCurrency: 'EGP',
  },
}));
jest.mock('@/screens/transactions/filter/filter.state', () => ({
  useFilterDrawerState: jest.fn(),
}));
jest.mock('@/utils/use_debounced_value.hook', () => ({
  useDebouncedValue: (val: any) => val,
}));
jest.mock('@/screens/transactions/filter/filter.helpers', () => ({
  countActiveFilters: jest.fn(() => 0),
  toQueryFilters: jest.fn(() => ({})),
}));

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setupMocks(overrides: { refresh?: jest.Mock } = {}) {
  const mockRefresh = overrides.refresh ?? jest.fn().mockResolvedValue(undefined);
  const mockSetQuery = jest.fn().mockResolvedValue(undefined);
  const mockLoadMore = jest.fn().mockResolvedValue(undefined);

  (useTransactionStore as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { transactions: [], hasMore: false, loading: false, query: {} },
      setQuery: mockSetQuery,
      loadMore: mockLoadMore,
      refresh: mockRefresh,
    }),
  );
  (useAccountStore as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] } }),
  );
  (useCategoryStore as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories: [] } }),
  );
  (useTransactionsScreenStore as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { searchQuery: '', activeFilter: 'all', appliedFilters: EMPTY_FILTERS },
      setSearchQuery: jest.fn(),
      setActiveFilter: jest.fn(),
      clearSearch: jest.fn(),
    }),
  );
  (useFilterDrawerStore as jest.Mock).mockImplementation((sel: any) =>
    sel({ setDraft: jest.fn() }),
  );
  (useFilterDrawerState as jest.Mock).mockImplementation((sel: any) =>
    sel({ open: jest.fn() }),
  );

  return { mockRefresh, mockSetQuery, mockLoadMore };
}

describe('useTransactions — onRefresh', () => {
  it('refreshing starts as false', () => {
    setupMocks();
    const { result } = renderHook(() => useTransactions());
    expect(result.current.state.refreshing).toBe(false);
  });

  it('sets refreshing=true during the async call and false after it resolves', async () => {
    const def = deferred<void>();
    const mockRefresh = jest.fn(() => def.promise);
    setupMocks({ refresh: mockRefresh });

    const { result } = renderHook(() => useTransactions());

    act(() => {
      result.current.onRefresh();
    });
    expect(result.current.state.refreshing).toBe(true);

    await act(async () => {
      def.resolve();
    });
    expect(result.current.state.refreshing).toBe(false);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('sets refreshing=false even when refresh() rejects', async () => {
    const def = deferred<void>();
    const mockRefresh = jest.fn(() => def.promise);
    setupMocks({ refresh: mockRefresh });

    const { result } = renderHook(() => useTransactions());

    act(() => {
      result.current.onRefresh();
    });
    expect(result.current.state.refreshing).toBe(true);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      def.reject(new Error('db down'));
    });
    consoleSpy.mockRestore();

    expect(result.current.state.refreshing).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/user/MoneyApp && npx jest __tests__/transactions_hook.test.ts --no-coverage
```

Expected: FAIL — `result.current.state.refreshing` and `result.current.onRefresh` are `undefined` since neither exists yet.

---

### Task 2: Update `transactions.hook.ts` — add `refreshing` state and `onRefresh` handler

**Files:**
- Modify: `screens/transactions/transactions.hook.ts`

- [ ] **Step 1: Replace the file content**

```ts
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';

import { countActiveFilters, toQueryFilters } from './filter/filter.helpers';
import { useFilterDrawerState } from './filter/filter.state';
import { useFilterDrawerStore } from './filter/filter.store';
import { useTransactionsScreenStore } from './transactions.store';

export type EmptyVariant = 'none' | 'noData' | 'noResults';

export function useTransactions() {
  const {
    state: txScreenState,
    setSearchQuery,
    setActiveFilter,
    clearSearch,
  } = useTransactionsScreenStore(
    useShallow((s) => ({
      state: s.state,
      setSearchQuery: s.setSearchQuery,
      setActiveFilter: s.setActiveFilter,
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

  const { setDraft } = useFilterDrawerStore(useShallow((s) => ({ setDraft: s.setDraft })));
  const { open: openDrawer } = useFilterDrawerState(useShallow((s) => ({ open: s.open })));

  const debouncedSearch = useDebouncedValue(txScreenState.searchQuery, 300);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    setQuery({
      search: trimmed || undefined,
      type: txScreenState.activeFilter === 'all' ? undefined : txScreenState.activeFilter,
      ...toQueryFilters(txScreenState.appliedFilters),
    }).catch(() => {});
  }, [debouncedSearch, txScreenState.activeFilter, txScreenState.appliedFilters, setQuery]);

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

  function openFilter() {
    setDraft(txScreenState.appliedFilters);
    openDrawer();
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      console.error('[useTransactions] onRefresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }

  return {
    state: {
      sections,
      hasMore: txState.hasMore,
      loading: txState.loading,
      refreshing,
      emptyVariant,
      searchQuery: txScreenState.searchQuery,
      activeFilter: txScreenState.activeFilter,
      accountsById,
      categoriesById,
      activeFilterCount,
    },
    setSearchQuery,
    setActiveFilter,
    clearSearch,
    onEndReached: loadMore,
    onRefresh,
    openFilter,
  };
}
```

- [ ] **Step 2: Run the tests to verify they pass**

```bash
cd /home/user/MoneyApp && npx jest __tests__/transactions_hook.test.ts --no-coverage
```

Expected: PASS — all 3 tests green.

- [ ] **Step 3: Commit**

```bash
git -C /home/user/MoneyApp add __tests__/transactions_hook.test.ts screens/transactions/transactions.hook.ts
git -C /home/user/MoneyApp commit -m "feat: add onRefresh and refreshing flag to useTransactions hook"
```

---

### Task 3: Update `TransactionsScreen` — wire PTR and move empty state into `ListEmptyComponent`

**Files:**
- Modify: `screens/transactions/index.tsx`

No new tests — this is UI wiring; the refreshing logic is covered by Task 1–2.

- [ ] **Step 1: Replace the file content**

Key changes from the original:
- Remove the `emptyVariant !== 'none'` conditional block and the `styles.body` rule.
- Always render `SectionList`.
- Add `ListEmptyComponent`, `onRefresh`, and `refreshing` to `SectionList`.
- `styles.listContent` gains `flexGrow: 1` so `EmptyState` (which has `flex: 1` internally) fills and centres on screen.

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty_states';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { useTransactionStore } from '@/store/transaction.store';
import { AddTransactionSheet } from './transaction_form';
import { useAddTransactionState } from './transaction_form/add_transaction.state';
import { useAddTransactionStore } from './transaction_form/add_transaction.store';
import { DateHeader } from './components/date_header';
import { FilterButton } from './components/filter_button';
import { FilterChips } from './components/filter_chips';
import { LoadingFooter } from './components/loading_footer';
import { SearchBar } from './components/search_bar';
import { TransactionRow } from './components/transaction_row';
import { FilterDrawer } from './filter';
import { useFilterDrawerState } from './filter/filter.state';
import { useShallow } from 'zustand/react/shallow';

import { useTransactions } from './transactions.hook';
import { useTransactionsScreenStore } from './transactions.store';

export default function TransactionsScreen() {
  const t = useTransactions();
  const { state: addTxState, open } = useAddTransactionState(
    useShallow((s) => ({ state: s.state, open: s.open })),
  );

  const handleClose = useCallback(() => {
    useAddTransactionState.getState().close();
    useAddTransactionStore.getState().reset();
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        useTransactionsScreenStore.getState().reset();
        useFilterDrawerState.getState().close();
        useAddTransactionState.getState().close();
        useAddTransactionStore.getState().reset();
        useTransactionStore
          .getState()
          .setQuery({})
          .catch(() => {});
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.transactions}</Text>
      </View>

      <View style={styles.searchRow}>
        <SearchBar
          style={styles.searchBar}
          value={t.state.searchQuery}
          onChange={t.setSearchQuery}
          onClear={t.clearSearch}
        />
        <FilterButton count={t.state.activeFilterCount} onPress={t.openFilter} />
      </View>

      <FilterChips active={t.state.activeFilter} onChange={t.setActiveFilter} />

      <SectionList
        sections={t.state.sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => <DateHeader label={section.key} />}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            account={t.state.accountsById.get(item.account_id)}
            toAccount={
              item.to_account_id ? t.state.accountsById.get(item.to_account_id) : undefined
            }
            category={item.category_id ? t.state.categoriesById.get(item.category_id) : undefined}
            onPress={() => router.push(`/transactions/detail/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            variant={t.state.emptyVariant === 'noData' ? 'transactions' : 'transactionsNoResults'}
          />
        }
        onRefresh={t.onRefresh}
        refreshing={t.state.refreshing}
        onEndReached={t.onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={t.state.loading && t.state.hasMore ? <LoadingFooter /> : null}
        contentContainerStyle={styles.listContent}
      />

      <Pressable style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]} onPress={open}>
        <MaterialCommunityIcons name="plus" size={ms(28)} color={Colors.shared.midnightBlue} />
      </Pressable>

      <AddTransactionSheet visible={addTxState.visible} onClose={handleClose} />
      <FilterDrawer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  searchBar: { flex: 1 },
  listContent: { flexGrow: 1, paddingBottom: Spacing.xxl + ms(56) },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.md,
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    backgroundColor: Colors.shared.cairoGold,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabPressed: { opacity: 0.85 },
});
```

- [ ] **Step 2: Run the full test suite**

```bash
cd /home/user/MoneyApp && npm run test:coverage
```

Expected: All tests pass. Coverage thresholds met (80% lines / 95% functions / 100% branches).

- [ ] **Step 3: Commit**

```bash
git -C /home/user/MoneyApp add screens/transactions/index.tsx
git -C /home/user/MoneyApp commit -m "feat: wire pull-to-refresh on transactions SectionList"
```

- [ ] **Step 4: Push**

```bash
git -C /home/user/MoneyApp push -u origin claude/add-transactions-refresh-fr63x
```
