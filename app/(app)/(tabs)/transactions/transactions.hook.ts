import { useEffect, useMemo } from 'react';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';

import { useTransactionsScreenStore } from './transactions.store';

export type EmptyVariant = 'none' | 'noData' | 'noResults';

export function useTransactions() {
  // screen-local
  const searchQuery = useTransactionsScreenStore((s) => s.searchQuery);
  const activeFilter = useTransactionsScreenStore((s) => s.activeFilter);
  const setSearchQuery = useTransactionsScreenStore((s) => s.setSearchQuery);
  const setActiveFilter = useTransactionsScreenStore((s) => s.setActiveFilter);
  const clearSearch = useTransactionsScreenStore((s) => s.clearSearch);

  // global
  const transactions = useTransactionStore((s) => s.transactions);
  const hasMore = useTransactionStore((s) => s.hasMore);
  const loading = useTransactionStore((s) => s.loading);
  const setQuery = useTransactionStore((s) => s.setQuery);
  const loadMore = useTransactionStore((s) => s.loadMore);

  // joined
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    setQuery({
      search: trimmed || undefined,
      type: activeFilter === 'all' ? undefined : activeFilter,
    }).catch(() => {});
  }, [debouncedSearch, activeFilter, setQuery]);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const sections = useMemo(() => groupTransactionsByDate(transactions), [transactions]);

  const emptyVariant: EmptyVariant =
    transactions.length > 0
      ? 'none'
      : debouncedSearch.trim() || activeFilter !== 'all'
        ? 'noResults'
        : 'noData';

  return {
    sections,
    hasMore,
    loading,
    emptyVariant,
    searchQuery,
    activeFilter,
    accountsById,
    categoriesById,
    setSearchQuery,
    setActiveFilter,
    clearSearch,
    onEndReached: loadMore,
  };
}
