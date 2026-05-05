import { useEffect, useMemo } from 'react';
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
  } = useTransactionStore(
    useShallow((s) => ({ state: s.state, setQuery: s.setQuery, loadMore: s.loadMore })),
  );

  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));

  const { setDraft } = useFilterDrawerStore(useShallow((s) => ({ setDraft: s.setDraft })));
  const { open: openDrawer } = useFilterDrawerState(useShallow((s) => ({ open: s.open })));

  const debouncedSearch = useDebouncedValue(txScreenState.searchQuery, 300);

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

  return {
    state: {
      sections,
      hasMore: txState.hasMore,
      loading: txState.loading,
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
    openFilter,
  };
}
