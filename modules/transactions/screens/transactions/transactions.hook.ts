import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { getDb } from '@/database/client';
import { getPeriodTotals, type PeriodTotals } from '@/modules/transactions/database/transactions';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';

import { countActiveFilters, toQueryFilters } from './filter/filter.helpers';
import { useFilterState } from './filter/filter.state';
import { useFilterStore } from './filter/filter.store';
import { currentYearMonth, previousPeriod, resolvePeriod } from './transactions.helpers';
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
    void (async () => {
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
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- async cancellation guard; cancelled may be true if effect re-runs
        if (!cancelled) setTotals({ current, previous });
      } catch (err) {
        console.error('[transactions] loadTotals failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [txScreenState.period, txState.transactions]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        const fresh = currentYearMonth();
        useTransactionsScreenStore.getState().setPeriod({ type: 'month', yearMonth: fresh });
        useTransactionsScreenStore.getState().reset();
        useTransactionsState.getState().reset();
        useFilterState.getState().reset();
        useFilterStore.getState().resetDraft();
        useTransactionStore
          .getState()
          .setQuery({})
          .catch(() => {});
      };
    }, []),
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

  function resetFilters() {
    useTransactionsScreenStore.getState().reset();
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      console.error('[transactions] onRefresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }

  const previousLabel = useMemo(() => {
    const prev = previousPeriod(txScreenState.period);
    if (prev?.type !== 'month') return null;
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
    resetFilters,
    goToDetail: (id: string) => router.push(`/transactions/detail/${id}`),
    goToEdit: (id: string) => {
      // Find the full tx object from the already-loaded sections data.
      // Edit is done via the shared EditTransactionSheet (same sheet used by detail screen),
      // so we open it imperatively from the list without any navigation.
      const tx = txState.transactions.find((t) => t.id === id);
      if (!tx) {
        console.warn('[goToEdit] tx not in loaded window:', id);
        return;
      }
      useEditTransactionStore.getState().loadFromTx(tx);
      useEditTransactionState.getState().open(tx);
    },
  };
}
