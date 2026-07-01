import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { getDb } from '@/database/client';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { getPeriodTotals, type PeriodTotals } from '@/modules/transactions/database/transactions';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { formatMonthYear } from '@/utils/format_date';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';

import { countActiveFilters, toQueryFilters } from './filter/filter.helpers';
import { useFilterState } from './filter/filter.state';
import { useFilterStore } from './filter/filter.store';
import { previousPeriod, resolvePeriod } from './transactions.helpers';
import { useTransactionsState } from './transactions.state';
import { useTransactionsScreenStore } from './transactions.store';

export type EmptyVariant = 'none' | 'noData' | 'noResults';

export function useTransactions() {
  const router = useRouter();

  const { searchQuery, activeFilter, period, appliedFilters } = useTransactionsScreenStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      activeFilter: s.activeFilter,
      period: s.period,
      appliedFilters: s.appliedFilters,
    })),
  );
  const setSearchQuery = useTransactionsScreenStore.getState().setSearchQuery;
  const setActiveFilter = useTransactionsScreenStore.getState().setActiveFilter;
  const setSelectedMonth = useTransactionsScreenStore.getState().setSelectedMonth;
  const clearSearch = useTransactionsScreenStore.getState().clearSearch;
  const { transactions, hasMore, loading, hasLoaded, mutationVersion } = useTransactionStore(
    useShallow((s) => ({
      transactions: s.transactions,
      hasMore: s.hasMore,
      loading: s.loading,
      hasLoaded: s.hasLoaded,
      mutationVersion: s.mutationVersion,
    })),
  );
  const setQuery = useTransactionStore.getState().setQuery;
  const loadMore = useTransactionStore.getState().loadMore;
  const refresh = useTransactionStore.getState().refresh;

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore.useState.categories();

  const openFilter = useFilterState.getState().open;
  const setDraft = useFilterStore.getState().setDraft;

  const refreshing = useTransactionsState.useState.refreshing();
  const setRefreshing = useTransactionsState.getState().setRefreshing;

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const [totals, setTotals] = useState<{
    current: PeriodTotals;
    previous: PeriodTotals | null;
  } | null>(null);
  const transactionQuery = useMemo(() => {
    const trimmed = debouncedSearch.trim();
    const periodRange = resolvePeriod(period);
    return {
      search: trimmed || undefined,
      type: activeFilter === 'all' ? undefined : activeFilter,
      dateFrom: periodRange.from,
      dateTo: periodRange.to,
      ...toQueryFilters(appliedFilters),
    };
  }, [activeFilter, appliedFilters, debouncedSearch, period]);

  useEffect(() => {
    setQuery(transactionQuery).catch(() => {});
  }, [setQuery, transactionQuery]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const db = await getDb();
        const current = await getPeriodTotals(db, {
          from: transactionQuery.dateFrom,
          to: transactionQuery.dateTo,
        });
        const prev = previousPeriod(period);
        const r = resolvePeriod(prev);
        const previous = await getPeriodTotals(db, { from: r.from, to: r.to });
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- async cancellation guard; cancelled may be true if effect re-runs
        if (!cancelled) setTotals({ current, previous });
      } catch (err) {
        console.error('[transactions] loadTotals failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mutationVersion, transactionQuery, period]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        useTransactionsScreenStore.getState().reset();
        useTransactionsState.getState().reset();
        useFilterState.getState().reset();
        useFilterStore.getState().resetDraft();
        useTransactionStore.getState().reset();
      };
    }, []),
  );

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const sections = useMemo(() => groupTransactionsByDate(transactions), [transactions]);
  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);
  const hasAdvancedFilters = activeFilterCount > 0;

  const emptyVariant: EmptyVariant =
    loading || !hasLoaded
      ? 'none'
      : transactions.length > 0
        ? 'none'
        : debouncedSearch.trim() || activeFilter !== 'all' || hasAdvancedFilters
          ? 'noResults'
          : 'noData';

  const handleOpenFilter = useCallback(() => {
    setDraft(appliedFilters);
    openFilter();
  }, [appliedFilters, openFilter, setDraft]);

  const resetFilters = useCallback(() => {
    useTransactionsScreenStore.getState().reset();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      console.error('[transactions] onRefresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, setRefreshing]);

  const previousLabel = useMemo(() => {
    const prev = previousPeriod(period);
    return formatMonthYear(prev.yearMonth);
  }, [period]);

  const goToDetail = useCallback(
    (id: string) => router.push(`/transactions/detail/${id}`),
    [router],
  );

  const goToEdit = useCallback(
    (id: string) => {
      // Find the full tx object from the already-loaded sections data.
      // Edit is done via the shared EditTransactionSheet (same sheet used by detail screen),
      // so we open it imperatively from the list without any navigation.
      const tx = transactions.find((t) => t.id === id);
      if (!tx) {
        console.warn('[goToEdit] tx not in loaded window:', id);
        return;
      }
      useEditTransactionStore.getState().loadFromTx(tx);
      useEditTransactionState.getState().open(tx);
    },
    [transactions],
  );

  return {
    state: {
      sections,
      hasMore,
      loading,
      hasLoaded,
      refreshing,
      emptyVariant,
      searchQuery,
      activeFilter,
      period,
      selectedMonth: period.yearMonth,
      accountsById,
      categoriesById,
      activeFilterCount,
      totals,
      previousLabel,
    },
    setSearchQuery,
    setActiveFilter,
    setSelectedMonth,
    clearSearch,
    onEndReached: loadMore,
    onRefresh,
    openFilter: handleOpenFilter,
    resetFilters,
    goToDetail,
    goToEdit,
  };
}
