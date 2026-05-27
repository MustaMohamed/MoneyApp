import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { getDb } from '@/database/client';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { getPeriodTotals, type PeriodTotals } from '@/modules/transactions/database/transactions';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
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
    transactions,
    hasMore,
    loading,
    hasLoaded,
    mutationVersion,
    setQuery,
    loadMore,
    refresh,
  } = useTransactionStore(
    useShallow((s) => ({
      transactions: s.state.transactions,
      hasMore: s.state.hasMore,
      loading: s.state.loading,
      hasLoaded: s.state.hasLoaded,
      mutationVersion: s.state.mutationVersion,
      setQuery: s.setQuery,
      loadMore: s.loadMore,
      refresh: s.refresh,
    })),
  );

  const { accounts } = useAccountStore(useShallow((s) => ({ accounts: s.state.accounts })));
  const { categories } = useCategoryStore(useShallow((s) => ({ categories: s.state.categories })));

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

  const transactionQuery = useMemo(() => {
    const trimmed = debouncedSearch.trim();
    const periodRange = resolvePeriod(txScreenState.period);
    return {
      search: trimmed || undefined,
      type: txScreenState.activeFilter === 'all' ? undefined : txScreenState.activeFilter,
      dateFrom: periodRange.from,
      dateTo: periodRange.to,
      ...toQueryFilters(txScreenState.appliedFilters),
    };
  }, [
    debouncedSearch,
    txScreenState.activeFilter,
    txScreenState.appliedFilters,
    txScreenState.period,
  ]);

  useEffect(() => {
    setQuery(transactionQuery).catch(() => {});
  }, [setQuery, transactionQuery]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!transactionQuery.dateFrom || !transactionQuery.dateTo) {
        setTotals(null);
        return;
      }
      try {
        const db = await getDb();
        const current = await getPeriodTotals(db, {
          from: transactionQuery.dateFrom,
          to: transactionQuery.dateTo,
        });
        const prev = previousPeriod(txScreenState.period);
        const previous = prev
          ? await (async () => {
              const r = resolvePeriod(prev);
              if (!r.from || !r.to) return null;
              return getPeriodTotals(db, { from: r.from, to: r.to });
            })()
          : null;
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- async cancellation guard; cancelled may be true if effect re-runs
        if (!cancelled) setTotals({ current, previous });
      } catch (err) {
        console.error('[transactions] loadTotals failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mutationVersion, transactionQuery, txScreenState.period]);

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
  const activeFilterCount = useMemo(
    () => countActiveFilters(txScreenState.appliedFilters),
    [txScreenState.appliedFilters],
  );
  const hasAdvancedFilters = activeFilterCount > 0;

  const emptyVariant: EmptyVariant =
    loading || !hasLoaded
      ? 'none'
      : transactions.length > 0
        ? 'none'
        : debouncedSearch.trim() || txScreenState.activeFilter !== 'all' || hasAdvancedFilters
          ? 'noResults'
          : 'noData';

  const handleOpenFilter = useCallback(() => {
    setDraft(txScreenState.appliedFilters);
    openFilter();
  }, [openFilter, setDraft, txScreenState.appliedFilters]);

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
    const prev = previousPeriod(txScreenState.period);
    if (prev?.type !== 'month') return null;
    return Strings.carouselMonthShort(prev.yearMonth);
  }, [txScreenState.period]);

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
    resetFilters,
    goToDetail,
    goToEdit,
  };
}
