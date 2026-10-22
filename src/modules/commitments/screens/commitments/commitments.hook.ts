import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { toLocalDateString } from '@/utils/format_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';
import { shiftYearMonth } from '@/utils/year_month';

import { resolvePaymentState } from '../../domain/payment_state';
import { emptyMonthPaymentSummary, summarizeMonthPayments } from '../../domain/payment_summary';
import type { Commitment } from '../../entities/commitment.entity';
import type { CommitmentMonthPayment } from '../../entities/commitment_payment.entity';
import { monthAggregateKey, useCommitmentStore } from '../../store/commitment.store';
import { buildCommitmentSections } from './commitments.helpers';
import { useCommitmentsScreenState } from './commitments.state';
import {
  buildCommitmentsHeroModel,
  resolveCommitmentsHeroAccountId,
  resolveCommitmentsHeroMode,
} from './components/commitments_hero.helpers';
import {
  commitmentMatchesAdvancedFilters,
  commitmentMatchesSearch,
  countActiveCommitmentFilters,
} from './filter/filter.helpers';
import { useCommitmentFilterState } from './filter/filter.state';
import { EMPTY_COMMITMENT_FILTERS, useCommitmentFilterStore } from './filter/filter.store';

export type CommitmentsPresentation = 'coldLoading' | 'coldError' | 'content' | 'contentWithError';

const EMPTY_COMMITMENTS: Commitment[] = [];
const EMPTY_PAYMENTS: CommitmentMonthPayment[] = [];

function resolveCommitmentsPresentation({
  hasMatchingSnapshot,
  loadError,
}: {
  hasMatchingSnapshot: boolean;
  loadError: boolean;
}): CommitmentsPresentation {
  if (!hasMatchingSnapshot) return loadError ? 'coldError' : 'coldLoading';
  return loadError ? 'contentWithError' : 'content';
}

export function useCommitments() {
  const {
    commitments,
    payments,
    selectedMonth,
    commitmentsLoaded,
    paymentsLoaded,
    loadedMonth,
    today,
    loading,
    loadError,
    monthAggregate,
    monthAggregateErrorKey,
  } = useCommitmentStore(
    useShallow((s) => ({
      commitments: s.commitments,
      payments: s.payments,
      selectedMonth: s.selectedMonth,
      commitmentsLoaded: s.commitmentsLoaded,
      paymentsLoaded: s.paymentsLoaded,
      loadedMonth: s.loadedMonth,
      today: s.today,
      loading: s.loading,
      loadError: s.loadError,
      monthAggregate: s.monthAggregate,
      monthAggregateErrorKey: s.monthAggregateErrorKey,
    })),
  );
  const setSelectedMonth = useCommitmentStore.getState().setSelectedMonth;
  const loadMonthSnapshot = useCommitmentStore.getState().loadMonthSnapshot;
  const loadMonthAggregate = useCommitmentStore.getState().loadMonthAggregate;
  const skipPayment = useCommitmentStore.getState().skipPayment;
  const deactivateCommitment = useCommitmentStore.getState().deactivateCommitment;

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore.useState.categories();
  const { rate, hasLoaded: rateLoaded } = useCurrencyStore(
    useShallow((s) => ({ rate: s.rate, hasLoaded: s.hasLoaded })),
  );
  const liveRate = rateLoaded ? rate : undefined;
  const { refreshing, statusFilter, searchQuery, appliedFilters } = useCommitmentsScreenState(
    useShallow((s) => ({
      refreshing: s.refreshing,
      statusFilter: s.statusFilter,
      searchQuery: s.searchQuery,
      appliedFilters: s.appliedFilters,
    })),
  );
  const setRefreshing = useCommitmentsScreenState.getState().setRefreshing;
  const setStatusFilter = useCommitmentsScreenState.getState().setStatusFilter;
  const setSearchQuery = useCommitmentsScreenState.getState().setSearchQuery;
  const clearSearch = useCommitmentsScreenState.getState().clearSearch;
  const setAppliedFilters = useCommitmentsScreenState.getState().setAppliedFilters;
  const deferredStatusFilter = useDeferredValue(statusFilter);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const openFilter = useCommitmentFilterState.getState().open;
  const setFilterDraft = useCommitmentFilterStore.getState().setDraft;

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const hasMatchingSnapshot =
    commitmentsLoaded && paymentsLoaded && loadedMonth === selectedMonth && today !== undefined;
  const activeCommitments = hasMatchingSnapshot ? commitments : EMPTY_COMMITMENTS;
  const activePayments = hasMatchingSnapshot ? payments : EMPTY_PAYMENTS;

  const commitmentsById = useMemo(
    () => new Map(activeCommitments.map((c: Commitment) => [c.id, c])),
    [activeCommitments],
  );

  const { sections, tally } = useMemo((): ReturnType<typeof buildCommitmentSections> => {
    if (today === undefined) return { sections: [], tally: undefined };
    const filter = deferredStatusFilter;
    const allPayments =
      filter === 'all'
        ? activePayments
        : activePayments.filter((payment) => resolvePaymentState(payment, today) === filter);
    const filteredPayments = allPayments.filter((payment) => {
      const commitment = commitmentsById.get(payment.commitment_id);
      const accountId = payment.account_id ?? commitment?.account_id;
      const candidate = {
        payment,
        commitment,
        accountName: accountId ? accountsById.get(accountId)?.name : undefined,
        categoryName: commitment ? categoriesById.get(commitment.category_id)?.name : undefined,
      };
      return (
        commitmentMatchesSearch(candidate, debouncedSearch) &&
        commitmentMatchesAdvancedFilters(candidate, appliedFilters)
      );
    });
    return buildCommitmentSections({
      rows: filteredPayments,
      commitmentsById,
      yearMonth: selectedMonth,
      today,
      liveRate,
    });
  }, [
    accountsById,
    appliedFilters,
    categoriesById,
    commitmentsById,
    debouncedSearch,
    deferredStatusFilter,
    activePayments,
    liveRate,
    selectedMonth,
    today,
  ]);

  const { counts, totalsByCurrency } = useMemo(
    () =>
      today === undefined
        ? emptyMonthPaymentSummary()
        : summarizeMonthPayments(activePayments, selectedMonth, today),
    [activePayments, selectedMonth, today],
  );
  const isEmpty = activePayments.length === 0;
  const activeFilterCount = useMemo(
    () => countActiveCommitmentFilters(appliedFilters),
    [appliedFilters],
  );
  const hasListFilters =
    statusFilter !== 'all' || searchQuery.trim().length > 0 || activeFilterCount > 0;

  const heroAccountId = resolveCommitmentsHeroAccountId(appliedFilters.accountIds);
  const heroKeyOnScreen = monthAggregateKey(selectedMonth, heroAccountId);
  const heroMode = resolveCommitmentsHeroMode({
    heldKey: monthAggregate?.key,
    errorKey: monthAggregateErrorKey,
    keyOnScreen: heroKeyOnScreen,
    rateLoaded,
  });
  const heroToday = toLocalDateString(new Date());
  const hero = useMemo(
    () =>
      buildCommitmentsHeroModel({
        mode: heroMode,
        aggregate: monthAggregate?.aggregate,
        rate,
        yearMonth: selectedMonth,
        today: heroToday,
      }),
    [heroMode, monthAggregate, rate, selectedMonth, heroToday],
  );

  const selectedMonthRef = useRef(selectedMonth);
  selectedMonthRef.current = selectedMonth;

  const navigateMonth = useCallback(
    async (direction: 'prev' | 'next') => {
      try {
        await setSelectedMonth(shiftYearMonth(selectedMonth, direction === 'next' ? 1 : -1));
      } catch {
        // The store owns loadError; event boundaries contain the rejected operation.
      }
    },
    [selectedMonth, setSelectedMonth],
  );

  const selectMonth = useCallback(
    async (yearMonth: string) => {
      try {
        await setSelectedMonth(yearMonth);
      } catch {
        // The store owns loadError; event boundaries contain the rejected operation.
      }
    },
    [setSelectedMonth],
  );

  const reloadSelectedMonth = useCallback(
    (yearMonth: string) => loadMonthSnapshot(yearMonth),
    [loadMonthSnapshot],
  );

  useFocusEffect(
    useCallback(() => {
      const task = runAfterInteractions(
        () => {
          return reloadSelectedMonth(selectedMonthRef.current);
        },
        {
          onError: (error) => {
            console.error('[commitments] focus load failed:', error);
          },
        },
      );
      return () => task.cancel();
    }, [reloadSelectedMonth]),
  );

  // Expo-router reruns this on focus and on a month or hero-account change while focused.
  useFocusEffect(
    useCallback(() => {
      const task = runAfterInteractions(() => loadMonthAggregate(selectedMonth, heroAccountId));
      return () => task.cancel();
    }, [loadMonthAggregate, selectedMonth, heroAccountId]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        reloadSelectedMonth(selectedMonth),
        loadMonthAggregate(selectedMonth, heroAccountId),
      ]);
    } catch {
      // The store owns loadError; event boundaries contain the rejected operation.
    } finally {
      setRefreshing(false);
    }
  }, [setRefreshing, reloadSelectedMonth, loadMonthAggregate, selectedMonth, heroAccountId]);

  const goToDetail = useCallback((paymentId: string) => {
    router.push(`/commitments/${paymentId}`);
  }, []);

  const goToAdd = useCallback(() => {
    router.push('/commitments/add');
  }, []);

  const goToEdit = useCallback((commitmentId: string | undefined) => {
    if (!commitmentId) {
      console.warn('[goToEdit] commitment id is undefined — skipping navigation');
      return;
    }
    router.push(`/commitments/${commitmentId}/edit`);
  }, []);

  const handleOpenFilter = useCallback(() => {
    setFilterDraft(appliedFilters);
    openFilter();
  }, [appliedFilters, openFilter, setFilterDraft]);

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    clearSearch();
    setAppliedFilters(EMPTY_COMMITMENT_FILTERS);
  }, [clearSearch, setAppliedFilters, setStatusFilter]);

  return {
    state: {
      sections,
      tally,
      liveRate,
      selectedMonth,
      today,
      counts,
      totalsByCurrency,
      hero,
      refreshing,
      isEmpty,
      commitmentsLoaded,
      paymentsLoaded,
      loading,
      loadError,
      presentation: resolveCommitmentsPresentation({ hasMatchingSnapshot, loadError }),
      hasLoaded: hasMatchingSnapshot,
      // Month-independent, unlike `isEmpty`: an empty month keeps the nav and filters mounted.
      hasCommitments: activeCommitments.length > 0,
      statusFilter,
      searchQuery,
      activeFilterCount,
      hasListFilters,
      accountsById,
      categoriesById,
      commitmentsById,
    },
    navigateMonth,
    selectMonth,
    onRefresh,
    goToDetail,
    goToAdd,
    goToEdit,
    skipPayment,
    deactivateCommitment,
    setStatusFilter,
    setSearchQuery,
    clearSearch,
    openFilter: handleOpenFilter,
    resetFilters,
  };
}
