import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { SectionList } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { getDb } from '@/database/client';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { getPeriodTotals } from '@/modules/transactions/database/transactions';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import type { TransactionListStatus } from '@/modules/transactions/store/transaction.store';
import { getTransactionQueryKey } from '@/modules/transactions/store/transaction_query.helpers';
import { formatMonthYear } from '@/utils/format_date';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';

import {
  countActiveFilters,
  formatAppliedFilterSummary,
  toQueryFilters,
} from './filter/filter.helpers';
import { useFilterState } from './filter/filter.state';
import { EMPTY_FILTERS_V2, useFilterStore } from './filter/filter.store';
import { previousPeriod, resolvePeriod } from './transactions.helpers';
import { useTransactionsState } from './transactions.state';
import { useTransactionsScreenStore } from './transactions.store';

export type EmptyVariant = 'none' | 'noData' | 'noResults';
export type TransactionSection = { key: string; data: Transaction[] };
export type TransactionLoadErrorVariant = 'none' | 'refresh' | 'totals';
type ScrollOffsetEvent = { nativeEvent: { contentOffset: { y: number } } };
type ScrollPosition = { queryKey: string | null; offset: number };

export function useTransactions() {
  const router = useRouter();
  const listRef = useRef<SectionList<Transaction, TransactionSection>>(null);
  const hasFocusedRef = useRef(false);
  const isFocusedRef = useRef(false);
  const scrollRestorePendingRef = useRef(false);
  const scrollRestoreFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const attemptScrollRestoreRef = useRef<() => void>(() => {});
  const currentScrollPositionRef = useRef<ScrollPosition>({ queryKey: null, offset: 0 });

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
  const { transactions, hasMore, paginationError, queryKey, snapshotKey, status, mutationVersion } =
    useTransactionStore(
      useShallow((s) => ({
        transactions: s.transactions,
        hasMore: s.hasMore,
        paginationError: s.paginationError,
        queryKey: s.queryKey,
        snapshotKey: s.snapshotKey,
        status: s.status,
        mutationVersion: s.mutationVersion,
      })),
    );
  const setQuery = useTransactionStore.getState().setQuery;
  const loadMore = useTransactionStore.getState().loadMore;
  const refresh = useTransactionStore.getState().refresh;
  const retry = useTransactionStore.getState().retry;

  const { accounts, accountLookup } = useAccountStore(
    useShallow((s) => ({ accounts: s.accounts, accountLookup: s.accountLookup })),
  );
  const loadAccountLookup = useAccountStore.getState().loadAccountLookup;
  const categories = useCategoryStore.useState.categories();

  const openFilter = useFilterState.getState().open;
  const setDraft = useFilterStore.getState().setDraft;

  const { totals, totalsYearMonth, totalsStatus } = useTransactionsState(
    useShallow((s) => ({
      totals: s.totals,
      totalsYearMonth: s.totalsYearMonth,
      totalsStatus: s.totalsStatus,
    })),
  );
  const beginTotalsLoad = useTransactionsState.getState().beginTotalsLoad;
  const resolveTotals = useTransactionsState.getState().resolveTotals;
  const failTotals = useTransactionsState.getState().failTotals;
  const activateScrollQuery = useTransactionsState.getState().activateScrollQuery;
  const setScrollOffset = useTransactionsState.getState().setScrollOffset;

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const periodRange = useMemo(() => resolvePeriod(period), [period]);
  const previousPeriodRange = useMemo(() => resolvePeriod(previousPeriod(period)), [period]);

  const loadTotals = useCallback(
    async (preserveData = false, shouldApply: () => boolean = () => true) => {
      const targetYearMonth = period.yearMonth;
      if (!shouldApply()) return;
      const requestId = beginTotalsLoad(targetYearMonth, preserveData);
      try {
        const db = await getDb();
        const current = await getPeriodTotals(db, periodRange);
        const previous = await getPeriodTotals(db, previousPeriodRange);
        if (shouldApply()) resolveTotals(targetYearMonth, requestId, { current, previous });
      } catch (err) {
        console.error('[transactions] loadTotals failed:', err);
        if (shouldApply()) failTotals(targetYearMonth, requestId);
      }
    },
    [
      beginTotalsLoad,
      failTotals,
      period.yearMonth,
      periodRange,
      previousPeriodRange,
      resolveTotals,
    ],
  );
  const loadTotalsRef = useRef(loadTotals);
  loadTotalsRef.current = loadTotals;

  const transactionQuery = useMemo(() => {
    const trimmed = debouncedSearch.trim();
    return {
      search: trimmed || undefined,
      type: activeFilter === 'all' ? undefined : activeFilter,
      dateFrom: periodRange.from,
      dateTo: periodRange.to,
      ...toQueryFilters(appliedFilters),
    };
  }, [activeFilter, appliedFilters, debouncedSearch, periodRange]);
  const activeQueryKey = useMemo(
    () => getTransactionQueryKey(transactionQuery),
    [transactionQuery],
  );
  const activeQueryKeyRef = useRef(activeQueryKey);
  activeQueryKeyRef.current = activeQueryKey;
  const hasCurrentSnapshot = snapshotKey === activeQueryKey;
  const currentTransactions = useMemo(
    () => (hasCurrentSnapshot ? transactions : []),
    [hasCurrentSnapshot, transactions],
  );
  const listStatus: TransactionListStatus = queryKey === activeQueryKey ? status : 'initialLoading';

  attemptScrollRestoreRef.current = () => {
    if (!isFocusedRef.current || !scrollRestorePendingRef.current) return;
    const transactionState = useTransactionStore.getState();
    const activeKey = activeQueryKeyRef.current;
    if (
      transactionState.queryKey !== activeKey ||
      transactionState.snapshotKey !== activeKey ||
      transactionState.transactions.length === 0
    ) {
      return;
    }

    const scrollState = useTransactionsState.getState();
    scrollRestorePendingRef.current = false;
    if (scrollState.scrollQueryKey !== activeKey || scrollState.scrollOffset <= 0) return;
    currentScrollPositionRef.current = {
      queryKey: activeKey,
      offset: scrollState.scrollOffset,
    };
    if (scrollRestoreFrameRef.current !== null) {
      cancelAnimationFrame(scrollRestoreFrameRef.current);
    }
    scrollRestoreFrameRef.current = requestAnimationFrame(() => {
      scrollRestoreFrameRef.current = null;
      listRef.current
        ?.getScrollResponder()
        ?.scrollTo({ y: scrollState.scrollOffset, animated: false });
    });
  };

  useEffect(() => {
    const scrollState = useTransactionsState.getState();
    const queryChanged = scrollState.scrollQueryKey !== activeQueryKey;
    activateScrollQuery(activeQueryKey);
    currentScrollPositionRef.current = {
      queryKey: activeQueryKey,
      offset: queryChanged ? 0 : scrollState.scrollOffset,
    };
    if (queryChanged) {
      listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
    }
  }, [activateScrollQuery, activeQueryKey]);

  useEffect(() => {
    attemptScrollRestoreRef.current();
  }, [currentTransactions.length, hasCurrentSnapshot]);

  useEffect(() => {
    setQuery(transactionQuery).catch(() => {});
  }, [setQuery, transactionQuery]);

  const transactionAccountIds = useMemo(
    () =>
      currentTransactions.flatMap((transaction) =>
        transaction.to_account_id
          ? [transaction.account_id, transaction.to_account_id]
          : [transaction.account_id],
      ),
    [currentTransactions],
  );

  useEffect(() => {
    void loadAccountLookup(transactionAccountIds).catch(() => {});
  }, [loadAccountLookup, transactionAccountIds]);

  useEffect(() => {
    let cancelled = false;
    const totalsState = useTransactionsState.getState();
    const preserveData =
      totalsState.totalsYearMonth === period.yearMonth && totalsState.totals !== null;
    void loadTotals(preserveData, () => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadTotals, mutationVersion, period.yearMonth]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      scrollRestorePendingRef.current = true;
      const isFirstFocus = !hasFocusedRef.current;
      hasFocusedRef.current = true;
      const focusQueryKey = activeQueryKeyRef.current;
      const focusTransactionState = useTransactionStore.getState();
      const focusReplacementRequestId = focusTransactionState.replacementRequestId;
      const shouldRefreshSnapshot =
        focusTransactionState.snapshotKey === focusQueryKey &&
        focusTransactionState.queryKey === focusQueryKey &&
        focusTransactionState.status !== 'refreshing';
      const focusYearMonth = useTransactionsScreenStore.getState().period.yearMonth;
      const focusTotalsState = useTransactionsState.getState();
      const focusTotalsRequestId = focusTotalsState.totalsRequestId;
      const shouldRefreshTotals =
        !isFirstFocus &&
        focusTotalsState.totalsYearMonth === focusYearMonth &&
        focusTotalsState.totalsStatus !== 'initialLoading' &&
        focusTotalsState.totalsStatus !== 'refreshing';
      attemptScrollRestoreRef.current();
      const task = runAfterInteractions(() => {
        if (activeQueryKeyRef.current !== focusQueryKey) return;
        const transactionState = useTransactionStore.getState();
        const snapshotIsUnchanged =
          shouldRefreshSnapshot &&
          transactionState.snapshotKey === activeQueryKeyRef.current &&
          transactionState.queryKey === activeQueryKeyRef.current &&
          transactionState.replacementRequestId === focusReplacementRequestId;
        if (snapshotIsUnchanged && transactionState.status !== 'refreshing') {
          void refresh().catch((error) =>
            console.error('[transactions] focus refresh failed:', error),
          );
        }
        const totalsState = useTransactionsState.getState();
        const totalsAreUnchanged =
          shouldRefreshTotals &&
          totalsState.totalsYearMonth === focusYearMonth &&
          totalsState.totalsRequestId === focusTotalsRequestId;
        if (totalsAreUnchanged) void loadTotalsRef.current(true);
      });

      return () => {
        task.cancel();
        isFocusedRef.current = false;
        scrollRestorePendingRef.current = false;
        const scrollPosition = currentScrollPositionRef.current;
        if (scrollPosition.queryKey === activeQueryKeyRef.current) {
          setScrollOffset(scrollPosition.queryKey, scrollPosition.offset);
        }
        if (scrollRestoreFrameRef.current !== null) {
          cancelAnimationFrame(scrollRestoreFrameRef.current);
          scrollRestoreFrameRef.current = null;
        }
      };
    }, [refresh, setScrollOffset]),
  );

  const accountsById = useMemo(
    () => new Map([...accounts, ...accountLookup].map((account) => [account.id, account])),
    [accountLookup, accounts],
  );
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const sections = useMemo(
    () => groupTransactionsByDate(currentTransactions),
    [currentTransactions],
  );
  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);
  const appliedFilterSummary = useMemo(
    () => formatAppliedFilterSummary(appliedFilters, accountsById, categoriesById),
    [accountsById, appliedFilters, categoriesById],
  );
  const hasAdvancedFilters = activeFilterCount > 0;
  const hasCurrentEmptySnapshot =
    hasCurrentSnapshot && currentTransactions.length === 0 && listStatus !== 'initialLoading';

  const emptyVariant: EmptyVariant =
    !hasCurrentEmptySnapshot || listStatus === 'firstLoadError'
      ? 'none'
      : debouncedSearch.trim() || activeFilter !== 'all' || hasAdvancedFilters
        ? 'noResults'
        : 'noData';

  const handleOpenFilter = useCallback(() => {
    setDraft(appliedFilters);
    openFilter();
  }, [appliedFilters, openFilter, setDraft]);

  const resetFilters = useCallback(() => {
    const screenStore = useTransactionsScreenStore.getState();
    screenStore.clearSearch();
    screenStore.setActiveFilter('all');
    screenStore.setAppliedFilters(EMPTY_FILTERS_V2);
  }, []);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      refresh().catch((err) => console.error('[transactions] refresh failed:', err)),
      loadTotals(true),
    ]);
  }, [loadTotals, refresh]);

  const previousLabel = useMemo(() => {
    const prev = previousPeriod(period);
    return formatMonthYear(prev.yearMonth);
  }, [period]);
  const displayTotals = totalsYearMonth === period.yearMonth ? totals : null;
  const displayTotalsStatus =
    totalsYearMonth === period.yearMonth ? totalsStatus : 'initialLoading';
  const showFirstLoadError = listStatus === 'firstLoadError';
  const loadErrorVariant: TransactionLoadErrorVariant = showFirstLoadError
    ? 'none'
    : listStatus === 'refreshErrorWithData' || displayTotalsStatus === 'refreshErrorWithData'
      ? 'refresh'
      : displayTotalsStatus === 'firstLoadError'
        ? 'totals'
        : 'none';

  const onListScroll = useCallback(
    (event: ScrollOffsetEvent) => {
      currentScrollPositionRef.current = {
        queryKey: activeQueryKey,
        offset: Math.max(0, event.nativeEvent.contentOffset.y),
      };
    },
    [activeQueryKey],
  );

  const onListScrollEnd = useCallback(
    (event: ScrollOffsetEvent) => {
      onListScroll(event);
      const scrollPosition = currentScrollPositionRef.current;
      if (scrollPosition.queryKey === activeQueryKeyRef.current) {
        setScrollOffset(scrollPosition.queryKey, scrollPosition.offset);
      }
    },
    [onListScroll, setScrollOffset],
  );

  const retryTotals = useCallback(
    () => loadTotals(displayTotals !== null),
    [displayTotals, loadTotals],
  );
  const retryFailedLoads = useCallback(async () => {
    await Promise.all([
      (listStatus === 'firstLoadError' || listStatus === 'refreshErrorWithData'
        ? retry()
        : Promise.resolve()
      ).catch((error) => console.error('[transactions] retry failed:', error)),
      displayTotalsStatus === 'firstLoadError' || displayTotalsStatus === 'refreshErrorWithData'
        ? retryTotals()
        : Promise.resolve(),
    ]);
  }, [displayTotalsStatus, listStatus, retry, retryTotals]);

  const goToDetail = useCallback(
    (id: string) => router.push(`/transactions/detail/${id}`),
    [router],
  );

  const goToEdit = useCallback(
    (id: string) => {
      // Find the full tx object from the already-loaded sections data.
      // Edit is done via the shared EditTransactionSheet (same sheet used by detail screen),
      // so we open it imperatively from the list without any navigation.
      const tx = currentTransactions.find((t) => t.id === id);
      if (!tx) {
        console.warn('[goToEdit] tx not in loaded window:', id);
        return;
      }
      if (tx.commitment_payment_id !== null) return;
      useEditTransactionStore.getState().loadFromTx(tx);
      useEditTransactionState.getState().open(tx);
    },
    [currentTransactions],
  );

  return {
    state: {
      sections,
      hasMore: hasCurrentSnapshot ? hasMore : false,
      listStatus,
      showInitialSkeleton:
        (listStatus === 'idle' || listStatus === 'initialLoading') && sections.length === 0,
      showFirstLoadError,
      loadErrorVariant,
      paginationError: hasCurrentSnapshot ? paginationError : false,
      refreshing: listStatus === 'refreshing',
      emptyVariant,
      searchQuery,
      activeFilter,
      period,
      selectedMonth: period.yearMonth,
      accountsById,
      categoriesById,
      activeFilterCount,
      appliedFilterSummary,
      totals: displayTotals,
      totalsStatus: displayTotalsStatus,
      previousLabel,
      listRef,
    },
    setSearchQuery,
    setActiveFilter,
    setSelectedMonth,
    clearSearch,
    onEndReached: loadMore,
    onRefresh,
    onListScroll,
    onListScrollEnd,
    retryList: retry,
    retryTotals,
    retryFailedLoads,
    openFilter: handleOpenFilter,
    resetFilters,
    goToDetail,
    goToEdit,
  };
}
