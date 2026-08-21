import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { type Currency, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';
import { shiftYearMonth } from '@/utils/year_month';

import type { Commitment } from '../../entities/commitment.entity';
import type { CommitmentPayment } from '../../entities/commitment_payment.entity';
import { useCommitmentStore } from '../../store/commitment.store';
import { useCommitmentsScreenState } from './commitments.state';
import {
  commitmentMatchesAdvancedFilters,
  commitmentMatchesSearch,
  countActiveCommitmentFilters,
} from './filter/filter.helpers';
import { useCommitmentFilterState } from './filter/filter.state';
import { EMPTY_COMMITMENT_FILTERS, useCommitmentFilterStore } from './filter/filter.store';

export type CommitmentsSection = {
  title: string;
  data: CommitmentPayment[];
};

export type CommitmentsPresentation = 'coldLoading' | 'coldError' | 'content' | 'contentWithError';

const EMPTY_COMMITMENTS: Commitment[] = [];
const EMPTY_PAYMENTS: CommitmentPayment[] = [];

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
    loading,
    loadError,
  } = useCommitmentStore(
    useShallow((s) => ({
      commitments: s.commitments,
      payments: s.payments,
      selectedMonth: s.selectedMonth,
      commitmentsLoaded: s.commitmentsLoaded,
      paymentsLoaded: s.paymentsLoaded,
      loadedMonth: s.loadedMonth,
      loading: s.loading,
      loadError: s.loadError,
    })),
  );
  const setSelectedMonth = useCommitmentStore.getState().setSelectedMonth;
  const loadMonthSnapshot = useCommitmentStore.getState().loadMonthSnapshot;
  const skipPayment = useCommitmentStore.getState().skipPayment;
  const deactivateCommitment = useCommitmentStore.getState().deactivateCommitment;

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore.useState.categories();
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
  const hasMatchingSnapshot = commitmentsLoaded && paymentsLoaded && loadedMonth === selectedMonth;
  const activeCommitments = hasMatchingSnapshot ? commitments : EMPTY_COMMITMENTS;
  const activePayments = hasMatchingSnapshot ? payments : EMPTY_PAYMENTS;

  const commitmentsById = useMemo(
    () => new Map(activeCommitments.map((c: Commitment) => [c.id, c])),
    [activeCommitments],
  );

  const sections: CommitmentsSection[] = useMemo(() => {
    const filter = deferredStatusFilter;
    const allPayments =
      filter === 'all'
        ? activePayments
        : activePayments.filter((payment) => payment.status === filter);
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
    const result: CommitmentsSection[] = [];
    const overdue = filteredPayments.filter((p) => p.status === CommitmentPaymentStatus.Overdue);
    const dueToday = filteredPayments.filter((p) => p.status === CommitmentPaymentStatus.Due);
    const upcoming = filteredPayments.filter((p) => p.status === CommitmentPaymentStatus.Upcoming);
    const paid = filteredPayments.filter((p) => p.status === CommitmentPaymentStatus.Paid);
    const skipped = filteredPayments.filter((p) => p.status === CommitmentPaymentStatus.Skipped);
    if (overdue.length > 0) result.push({ title: Strings.commitmentsOverdue, data: overdue });
    if (dueToday.length > 0) result.push({ title: Strings.commitmentsDueToday, data: dueToday });
    if (upcoming.length > 0) result.push({ title: Strings.commitmentsUpcoming, data: upcoming });
    if (paid.length > 0) result.push({ title: Strings.commitmentsPaid, data: paid });
    if (skipped.length > 0) result.push({ title: Strings.commitmentsSkipped, data: skipped });
    return result;
  }, [
    accountsById,
    appliedFilters,
    categoriesById,
    commitmentsById,
    debouncedSearch,
    deferredStatusFilter,
    activePayments,
  ]);

  const counts = useMemo(() => {
    let paid = 0;
    let overdue = 0;
    let due = 0;
    let upcoming = 0;
    let skipped = 0;
    for (const p of activePayments) {
      switch (p.status) {
        case CommitmentPaymentStatus.Paid:
          paid++;
          break;
        case CommitmentPaymentStatus.Overdue:
          overdue++;
          break;
        case CommitmentPaymentStatus.Due:
          due++;
          break;
        case CommitmentPaymentStatus.Upcoming:
          upcoming++;
          break;
        case CommitmentPaymentStatus.Skipped:
          skipped++;
          break;
      }
    }
    return {
      paid,
      overdue,
      due,
      upcoming,
      skipped,
      total: paid + overdue + due + upcoming, // excludes skipped
    };
  }, [activePayments]);
  const isEmpty = activePayments.length === 0;
  const activeFilterCount = useMemo(
    () => countActiveCommitmentFilters(appliedFilters),
    [appliedFilters],
  );
  const hasListFilters =
    statusFilter !== 'all' || searchQuery.trim().length > 0 || activeFilterCount > 0;

  // Group totals by currency. For paid: actual paid amount; for variable+unpaid with no
  // estimate: skipped (excluded). Skipped payments excluded entirely.
  const totalsByCurrency = useMemo(() => {
    const totals = new Map<Currency, number>();
    for (const p of activePayments) {
      if (p.status === CommitmentPaymentStatus.Skipped) continue;
      const isPaid = p.status === CommitmentPaymentStatus.Paid;
      const value = isPaid ? (p.amount_paid ?? p.amount_due) : p.amount_due;
      if (value == null) continue;
      totals.set(p.currency, (totals.get(p.currency) ?? 0) + value);
    }
    return totals;
  }, [activePayments]);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reloadSelectedMonth(selectedMonth);
    } catch {
      // The store owns loadError; event boundaries contain the rejected operation.
    } finally {
      setRefreshing(false);
    }
  }, [setRefreshing, reloadSelectedMonth, selectedMonth]);

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
      selectedMonth,
      counts,
      totalsByCurrency,
      refreshing,
      isEmpty,
      commitmentsLoaded,
      paymentsLoaded,
      loading,
      loadError,
      presentation: resolveCommitmentsPresentation({ hasMatchingSnapshot, loadError }),
      hasLoaded: hasMatchingSnapshot,
      // hasCommitments is month-independent (all commitments, any month). isEmpty is
      // per-selected-month. The list shows the full welcome empty state only when there
      // are no commitments at all; an empty *month* keeps the nav/filters mounted.
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
