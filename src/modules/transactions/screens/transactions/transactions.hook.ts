import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { SectionList } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useToast } from '@/components/ui/toast';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import {
  findMissingAccountIds,
  getTransactionAccountIds,
  mergeAccountsById,
} from '@/modules/accounts/store/account_lookup.helpers';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { transactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import { resolveTransactionDeleteError } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import type { TransactionListStatus } from '@/modules/transactions/store/transaction.store';
import { getTransactionQueryKey } from '@/modules/transactions/store/transaction_query.helpers';
import { toLocalDateString } from '@/utils/format_date';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';

import { buildAccountChips } from './components/account_chips.helpers';
import { resolveTransactionDeleteBody } from './components/tx_delete_dialog.helpers';
import {
  countActiveFilters,
  countFunnelFilters,
  formatAppliedFilterSummary,
  labelAccountsById,
  pruneAccountFilter,
  toQueryFilters,
  toggleAccountFilter,
} from './filter/filter.helpers';
import { useFilterState } from './filter/filter.state';
import { EMPTY_FILTERS, useFilterStore } from './filter/filter.store';
import {
  buildDaySections,
  buildSearchTally,
  buildTransactionsHeroModel,
  fullMonthName,
  previousPeriod,
  resolvePeriod,
  resolveSearchTallyFiguresMode,
  resolveTransactionsHeroMode,
  totalsScopeKey,
  type TransactionDaySection,
} from './transactions.helpers';
import { buildTransactionsPresentation } from './transactions.presentation';
import { useTransactionsState } from './transactions.state';
import { type TransactionTotalsState, useTransactionsScreenStore } from './transactions.store';

export type TransactionSection = TransactionDaySection;
type ScrollOffsetEvent = { nativeEvent: { contentOffset: { y: number } } };
type ScrollPosition = { queryKey: string | null; offset: number };
type TotalsLoadOptions = {
  preserveData?: boolean;
  reusePrevious?: boolean;
  shouldApply?: () => boolean;
};
type HeldPreviousTotals = {
  scopeKey: string;
  mutationVersion: number;
  totals: TransactionTotalsState['previous'];
};

export function useTransactions() {
  const router = useRouter();
  const listRef = useRef<SectionList<Transaction, TransactionSection>>(null);
  const hasFocusedRef = useRef(false);
  const isFocusedRef = useRef(false);
  const scrollRestorePendingRef = useRef(false);
  const scrollRestoreFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const attemptScrollRestoreRef = useRef<() => void>(() => {});
  const currentScrollPositionRef = useRef<ScrollPosition>({ queryKey: null, offset: 0 });
  const awaitsExistenceRef = useRef(false);

  const {
    searchQuery,
    activeFilter,
    period,
    storedAppliedFilters,
    totals,
    totalsYearMonth,
    hasAnyTransaction,
    existenceVersion,
  } = useTransactionsScreenStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      activeFilter: s.activeFilter,
      period: s.period,
      storedAppliedFilters: s.appliedFilters,
      totals: s.totals,
      totalsYearMonth: s.totalsYearMonth,
      hasAnyTransaction: s.hasAnyTransaction,
      existenceVersion: s.existenceVersion,
    })),
  );
  const setSearchQuery = useTransactionsScreenStore.getState().setSearchQuery;
  const setActiveFilter = useTransactionsScreenStore.getState().setActiveFilter;
  const setSelectedMonth = useTransactionsScreenStore.getState().setSelectedMonth;
  const clearSearch = useTransactionsScreenStore.getState().clearSearch;
  const beginTotalsRequest = useTransactionsScreenStore.getState().beginTotalsRequest;
  const resolveTotals = useTransactionsScreenStore.getState().resolveTotals;
  const failTotals = useTransactionsScreenStore.getState().failTotals;
  const hasTotalsForScope = useTransactionsScreenStore.getState().hasTotalsForScope;
  const beginExistenceRequest = useTransactionsScreenStore.getState().beginExistenceRequest;
  const resolveExistence = useTransactionsScreenStore.getState().resolveExistence;
  const failExistence = useTransactionsScreenStore.getState().failExistence;
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
  const deleteTransaction = useTransactionStore.getState().deleteTransaction;
  const { toast } = useToast();
  const runDeleteTransaction = useCallback(
    async (tx: Transaction) => {
      // Resolves once the refresh after the write settles, so the toast follows the rows.
      await deleteTransaction(tx.id);
      toast.show({ label: Strings.transactionDeletedToast, variant: 'success' });
    },
    [deleteTransaction, toast],
  );
  const deleteAction = useConfirmAction(runDeleteTransaction);
  const pendingDelete = deleteAction.pendingPayload;
  const requestDeleteOf = deleteAction.request;

  const { accounts, archivedAccounts, accountLookupById, accountLookupError, accountsLoaded } =
    useAccountStore(
      useShallow((s) => ({
        accounts: s.accounts,
        archivedAccounts: s.archivedAccounts,
        accountLookupById: s.accountLookupById,
        accountLookupError: s.accountLookupError,
        accountsLoaded: s.hasLoaded,
      })),
    );
  const loadAccountLookup = useAccountStore.getState().loadAccountLookup;
  const categories = useCategoryStore.useState.categories();

  const openFilter = useFilterState.getState().open;
  const setDraft = useFilterStore.getState().setDraft;

  const totalsStatus = useTransactionsState.useState.totalsStatus();
  const failedTotalsScope = useTransactionsState.useState.failedTotalsScope();
  const userRefreshing = useTransactionsState.useState.userRefreshing();
  const existenceFailed = useTransactionsState.useState.existenceFailed();
  const deleteBodyTransaction = useTransactionsState.useState.deleteBodyTransaction();
  const setDeleteBodyTransaction = useTransactionsState.getState().setDeleteBodyTransaction;
  const beginTotalsLoad = useTransactionsState.getState().beginTotalsLoad;
  const resolveTotalsLoad = useTransactionsState.getState().resolveTotalsLoad;
  const failTotalsLoad = useTransactionsState.getState().failTotalsLoad;
  const activateScrollQuery = useTransactionsState.getState().activateScrollQuery;
  const setScrollOffset = useTransactionsState.getState().setScrollOffset;
  const setUserRefreshing = useTransactionsState.getState().setUserRefreshing;
  const setExistenceFailed = useTransactionsState.getState().setExistenceFailed;

  const effectiveFilters = useMemo(
    () =>
      accountsLoaded ? pruneAccountFilter(storedAppliedFilters, accounts) : storedAppliedFilters,
    [accounts, accountsLoaded, storedAppliedFilters],
  );
  useEffect(() => {
    if (!accountsLoaded) return;
    // Prunes the store's current filter, never this render's, so a press that landed first survives.
    const screenStore = useTransactionsScreenStore.getState();
    const pruned = pruneAccountFilter(screenStore.appliedFilters, accounts);
    if (pruned !== screenStore.appliedFilters) screenStore.setAppliedFilters(pruned);
  }, [accounts, accountsLoaded, storedAppliedFilters]);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const periodRange = useMemo(() => resolvePeriod(period), [period]);
  const previousPeriodRange = useMemo(() => resolvePeriod(previousPeriod(period)), [period]);

  const transactionQuery = useMemo(() => {
    const trimmed = debouncedSearch.trim();
    return {
      search: trimmed || undefined,
      type: activeFilter === 'all' ? undefined : activeFilter,
      dateFrom: periodRange.from,
      dateTo: periodRange.to,
      ...toQueryFilters(effectiveFilters),
    };
  }, [activeFilter, debouncedSearch, effectiveFilters, periodRange]);
  const activeQueryKey = useMemo(
    () => getTransactionQueryKey(transactionQuery),
    [transactionQuery],
  );

  const totalsInput = {
    query: transactionQuery,
    queryKey: activeQueryKey,
    yearMonth: period.yearMonth,
    previousRange: previousPeriodRange,
    mutationVersion,
  };
  const totalsInputRef = useRef(totalsInput);
  totalsInputRef.current = totalsInput;
  const heldPreviousRef = useRef<HeldPreviousTotals | null>(null);

  const loadTotals = useCallback(
    async ({
      preserveData = false,
      reusePrevious = false,
      shouldApply = () => true,
    }: TotalsLoadOptions = {}) => {
      const {
        query,
        queryKey,
        yearMonth,
        previousRange,
        mutationVersion: version,
      } = totalsInputRef.current;
      if (!shouldApply()) return;
      const hasPreservedData = preserveData && hasTotalsForScope(yearMonth, query.accountIds);
      const requestId = beginTotalsRequest(queryKey, yearMonth, query.accountIds, preserveData);
      beginTotalsLoad(hasPreservedData);
      const scopeKey = totalsScopeKey(yearMonth, query.accountIds);
      const held = heldPreviousRef.current;
      const reusable =
        reusePrevious && held?.scopeKey === scopeKey && held.mutationVersion === version
          ? held
          : undefined;
      const ownsRequest = () => {
        const totalsState = useTransactionsScreenStore.getState();
        return (
          shouldApply() &&
          totalsState.totalsQueryKey === queryKey &&
          totalsState.totalsRequestId === requestId
        );
      };
      try {
        const month = await transactionRepository.getMonthAggregate(query);
        if (!ownsRequest()) return;
        const previous = reusable
          ? reusable.totals
          : await transactionRepository.getScopedTotals({
              ...query,
              dateFrom: previousRange.from,
              dateTo: previousRange.to,
            });
        if (
          shouldApply() &&
          resolveTotals(queryKey, requestId, {
            current: month.scoped,
            previous,
            days: month.days,
            matchCount: month.matchCount,
            matchNetEgp: month.matchNetEgp,
          })
        ) {
          heldPreviousRef.current = {
            scopeKey,
            mutationVersion: version,
            totals: previous,
          };
          resolveTotalsLoad();
        }
      } catch (err) {
        console.error('[transactions] loadTotals failed:', err);
        if (shouldApply() && failTotals(queryKey, requestId)) {
          failTotalsLoad(hasTotalsForScope(yearMonth, query.accountIds), scopeKey);
        }
      }
    },
    [
      beginTotalsRequest,
      beginTotalsLoad,
      failTotals,
      failTotalsLoad,
      hasTotalsForScope,
      resolveTotals,
      resolveTotalsLoad,
    ],
  );

  const loadExistence = useCallback(async () => {
    const version = totalsInputRef.current.mutationVersion;
    const requestId = beginExistenceRequest();
    setExistenceFailed(false);
    try {
      const rows = await transactionRepository.getAll({ limit: 1 });
      resolveExistence(requestId, version, rows.length > 0);
    } catch (err) {
      console.error('[transactions] any-transaction read failed:', err);
      // A rejection nothing waits on sets no flag: the way back into the empty month reads again.
      if (failExistence(requestId) && awaitsExistenceRef.current) setExistenceFailed(true);
    }
  }, [beginExistenceRequest, failExistence, resolveExistence, setExistenceFailed]);

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
    () => currentTransactions.flatMap((transaction) => getTransactionAccountIds(transaction)),
    [currentTransactions],
  );

  useEffect(() => {
    void loadAccountLookup(transactionAccountIds).catch(() => {});
  }, [loadAccountLookup, transactionAccountIds]);

  useEffect(() => {
    let cancelled = false;
    const totalsState = useTransactionsScreenStore.getState();
    const preserveData =
      totalsState.totalsYearMonth === totalsState.period.yearMonth && totalsState.totals !== null;
    void loadTotals({ preserveData, reusePrevious: true, shouldApply: () => !cancelled });
    return () => {
      cancelled = true;
    };
  }, [activeQueryKey, loadTotals, mutationVersion]);

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
      const focusTotalsState = useTransactionsScreenStore.getState();
      const focusTotalsUiState = useTransactionsState.getState();
      const focusTotalsRequestId = focusTotalsState.totalsRequestId;
      const shouldRefreshTotals =
        !isFirstFocus &&
        focusTotalsState.totalsQueryKey === focusQueryKey &&
        focusTotalsUiState.totalsStatus !== 'initialLoading' &&
        focusTotalsUiState.totalsStatus !== 'refreshing';
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
        const totalsState = useTransactionsScreenStore.getState();
        const totalsAreUnchanged =
          shouldRefreshTotals &&
          totalsState.totalsQueryKey === focusQueryKey &&
          totalsState.totalsRequestId === focusTotalsRequestId;
        if (totalsAreUnchanged) void loadTotals({ preserveData: true });
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
    }, [loadTotals, refresh, setScrollOffset]),
  );

  const accountsById = useMemo(
    () => mergeAccountsById(accounts, archivedAccounts, accountLookupById),
    [accountLookupById, accounts, archivedAccounts],
  );
  const accountLabelsById = useMemo(() => labelAccountsById(accountsById), [accountsById]);
  const showAccountLookupError =
    accountLookupError && findMissingAccountIds(transactionAccountIds, accountsById).length > 0;
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const today = toLocalDateString(new Date());
  const currentMonth = today.slice(0, 7);
  const emptyMonthName = useMemo(() => fullMonthName(period.yearMonth), [period.yearMonth]);
  const dayGroups = useMemo(() => {
    const [year, month, day] = today.split('-').map(Number);
    return groupTransactionsByDate(currentTransactions, new Date(year, month - 1, day));
  }, [currentTransactions, today]);
  const activeFilterCount = useMemo(() => countFunnelFilters(effectiveFilters), [effectiveFilters]);
  const hasAdvancedFilters = countActiveFilters(effectiveFilters) > 0;
  const filtersActive =
    transactionQuery.search !== undefined || activeFilter !== 'all' || hasAdvancedFilters;
  const accountChips = useMemo(
    () => buildAccountChips(accounts, effectiveFilters.accountIds),
    [accounts, effectiveFilters.accountIds],
  );

  const handleOpenFilter = useCallback(() => {
    setDraft(effectiveFilters);
    openFilter();
  }, [effectiveFilters, openFilter, setDraft]);

  const toggleAccountChip = useCallback((accountId: string | undefined) => {
    const screenStore = useTransactionsScreenStore.getState();
    screenStore.setAppliedFilters(toggleAccountFilter(screenStore.appliedFilters, accountId));
  }, []);

  const resetFilters = useCallback(() => {
    const screenStore = useTransactionsScreenStore.getState();
    screenStore.clearSearch();
    screenStore.setActiveFilter('all');
    screenStore.setAppliedFilters(EMPTY_FILTERS);
  }, []);

  const onRefresh = useCallback(async () => {
    setUserRefreshing(true);
    try {
      await Promise.all([
        refresh().catch((err) => console.error('[transactions] refresh failed:', err)),
        loadTotals({ preserveData: true }),
        useTransactionsState.getState().existenceFailed ? loadExistence() : Promise.resolve(),
      ]);
    } finally {
      setUserRefreshing(false);
    }
  }, [loadExistence, loadTotals, refresh, setUserRefreshing]);

  const displayTotals = totalsYearMonth === period.yearMonth ? totals : null;
  const displayTotalsStatus =
    totalsYearMonth === period.yearMonth ? totalsStatus : 'initialLoading';
  const scopedAccountLabel =
    effectiveFilters.accountIds.length === 1
      ? accountLabelsById.get(effectiveFilters.accountIds[0])?.name
      : undefined;
  const heroMode = resolveTransactionsHeroMode(
    displayTotalsStatus,
    displayTotals !== null,
    failedTotalsScope === totalsScopeKey(period.yearMonth, transactionQuery.accountIds),
  );
  const heroCurrent = displayTotals?.current ?? null;
  const heroPrevious = displayTotals?.previous ?? null;
  const hero = useMemo(
    () =>
      buildTransactionsHeroModel({
        mode: heroMode,
        current: heroCurrent,
        previous: heroPrevious,
        yearMonth: period.yearMonth,
        today,
        accountLabel: scopedAccountLabel,
      }),
    [heroCurrent, heroMode, heroPrevious, period.yearMonth, scopedAccountLabel, today],
  );
  const tallyFilterSummary = useMemo(
    () =>
      formatAppliedFilterSummary(
        scopedAccountLabel === undefined
          ? effectiveFilters
          : { ...effectiveFilters, accountIds: [] },
        accountLabelsById,
        categoriesById,
      ) ?? undefined,
    [accountLabelsById, categoriesById, effectiveFilters, scopedAccountLabel],
  );
  const tallyIsOn = transactionQuery.search !== undefined || hasAdvancedFilters;
  const tallyFiguresMode = resolveSearchTallyFiguresMode(
    heroMode,
    displayTotalsStatus,
    displayTotals?.queryKey === activeQueryKey,
  );
  const dayAggregates = displayTotals?.days;
  const sections = useMemo(
    () =>
      buildDaySections({
        groups: dayGroups,
        days: dayAggregates,
        figuresMode: tallyFiguresMode,
        totalsStatus: displayTotalsStatus,
      }),
    [dayAggregates, dayGroups, displayTotalsStatus, tallyFiguresMode],
  );
  const tallyMatchCount = displayTotals?.matchCount;
  const tallyMatchNetEgp = displayTotals?.matchNetEgp;
  const tally = useMemo(
    () =>
      buildSearchTally({
        isOn: tallyIsOn,
        figuresMode: tallyFiguresMode,
        matchCount: tallyMatchCount,
        matchNetEgp: tallyMatchNetEgp,
        yearMonth: period.yearMonth,
        filterSummary: tallyFilterSummary,
      }),
    [
      period.yearMonth,
      tallyFiguresMode,
      tallyFilterSummary,
      tallyIsOn,
      tallyMatchCount,
      tallyMatchNetEgp,
    ],
  );
  const presentation = buildTransactionsPresentation({
    listStatus,
    totalsStatus: displayTotalsStatus,
    rowCount: currentTransactions.length,
    hasLoadedOnce: hasCurrentSnapshot,
    paginationError: hasCurrentSnapshot && paginationError,
    accountLookupError: showAccountLookupError,
    userRefreshing,
    filtersActive,
    isCurrentMonth: period.yearMonth === currentMonth,
    existence: existenceFailed
      ? 'failed'
      : existenceVersion !== mutationVersion
        ? 'unknown'
        : hasAnyTransaction
          ? 'some'
          : 'none',
  });
  const awaitsExistence = presentation.awaitsExistence;
  useEffect(() => {
    awaitsExistenceRef.current = awaitsExistence;
    if (!awaitsExistence) {
      // A failure nothing waits on would paint the alert for a frame on the way back in.
      setExistenceFailed(false);
      return;
    }
    // A failed read publishes no version, so this effect never retries its own failure.
    if (useTransactionsScreenStore.getState().existenceVersion === mutationVersion) return;
    void loadExistence();
  }, [awaitsExistence, loadExistence, mutationVersion, setExistenceFailed]);

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
    () => loadTotals({ preserveData: displayTotals !== null }),
    [displayTotals, loadTotals],
  );
  const retryFailedLoads = useCallback(async () => {
    const retriesList = listStatus === 'firstLoadError' || listStatus === 'refreshErrorWithData';
    if (retriesList) setUserRefreshing(true);
    try {
      await Promise.all([
        (retriesList ? retry() : Promise.resolve()).catch((error) =>
          console.error('[transactions] retry failed:', error),
        ),
        displayTotalsStatus === 'firstLoadError' || displayTotalsStatus === 'refreshErrorWithData'
          ? retryTotals()
          : Promise.resolve(),
        showAccountLookupError
          ? loadAccountLookup(transactionAccountIds).catch(() => {})
          : Promise.resolve(),
        useTransactionsState.getState().existenceFailed ? loadExistence() : Promise.resolve(),
      ]);
    } finally {
      if (retriesList) setUserRefreshing(false);
    }
  }, [
    displayTotalsStatus,
    listStatus,
    loadAccountLookup,
    loadExistence,
    retry,
    retryTotals,
    setUserRefreshing,
    showAccountLookupError,
    transactionAccountIds,
  ]);

  const goToDetail = useCallback(
    (id: string) => router.push(`/transactions/detail/${id}`),
    [router],
  );

  const goToEdit = useCallback(
    (id: string) => {
      // Edit uses the global transaction form host without changing routes.
      const tx = currentTransactions.find((t) => t.id === id);
      if (!tx) {
        console.warn('[goToEdit] tx not in loaded window:', id);
        return;
      }
      if (tx.commitment_payment_id !== null) return;
      useTransactionFormState.getState().openEdit(tx);
    },
    [currentTransactions],
  );

  const openAddTransaction = useCallback(() => {
    useTransactionFormState.getState().openAdd();
  }, []);

  const backToThisMonth = useCallback(
    () => setSelectedMonth(currentMonth),
    [currentMonth, setSelectedMonth],
  );

  const requestDelete = useCallback(
    (id: string) => {
      const tx = currentTransactions.find((t) => t.id === id);
      if (!tx) {
        console.warn('[requestDelete] tx not in loaded window:', id);
        return;
      }
      setDeleteBodyTransaction(tx);
      requestDeleteOf(tx);
    },
    [currentTransactions, requestDeleteOf, setDeleteBodyTransaction],
  );
  // Read from the last requested transaction, so neither its row leaving nor the close empties it.
  const deleteBody =
    deleteBodyTransaction === undefined
      ? ''
      : resolveTransactionDeleteBody(
          deleteBodyTransaction,
          accountsById.get(deleteBodyTransaction.account_id),
          deleteBodyTransaction.to_account_id === null
            ? undefined
            : accountsById.get(deleteBodyTransaction.to_account_id),
        );

  return {
    state: {
      sections,
      hasMore: hasCurrentSnapshot ? hasMore : false,
      listStatus,
      showInitialSkeleton: presentation.showInitialSkeleton,
      showFirstLoadError: presentation.showFirstLoadError,
      loadErrorVariant: presentation.loadErrorVariant,
      paginationError: presentation.showPaginationRetry,
      refreshing: presentation.showRefreshIndicator,
      emptyVariant: presentation.emptyVariant,
      emptyMonthName,
      showsBackToThisMonth: presentation.showsBackToThisMonth,
      searchQuery,
      activeFilter,
      period,
      selectedMonth: period.yearMonth,
      accountsById,
      categoriesById,
      activeFilterCount,
      accountChips,
      totals: displayTotals,
      totalsStatus: displayTotalsStatus,
      hero,
      tally,
      searchDisabled: heroMode === 'skeleton',
      listRef,
      pendingDeleteId: pendingDelete?.id ?? null,
      deleteBody,
      deleteBusy: deleteAction.busy,
      deleteErrorMessage: deleteAction.error
        ? resolveTransactionDeleteError(deleteAction.error)
        : undefined,
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
    toggleAccountChip,
    goToDetail,
    goToEdit,
    openAddTransaction,
    backToThisMonth,
    requestDelete,
    confirmDelete: deleteAction.confirm,
    cancelDelete: deleteAction.cancel,
  };
}
