import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { countFunnelFilters } from '@/components/ui/account_chips.helpers';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { lookupLeavesUnresolved } from '@/modules/accounts/store/account_lookup.helpers';
import { useAccountChipFilter } from '@/modules/accounts/store/use_account_chip_filter.hook';
import { useAccountsById } from '@/modules/accounts/store/use_accounts_by_id.hook';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { commitmentDetailRoute } from '@/modules/navigation/domain/stacked_route';
import { resolveAccountName } from '@/utils/account_name';
import { toLocalDateString } from '@/utils/format_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';
import { fullMonthName, shiftYearMonth } from '@/utils/year_month';

import { resolveCommitmentRowAccountId } from '../../domain/payment_state';
import type { Commitment } from '../../entities/commitment.entity';
import type { CommitmentMonthPayment } from '../../entities/commitment_payment.entity';
import { monthAggregateKey, useCommitmentStore } from '../../store/commitment.store';
import { useCommitmentFormHostState } from '../../store/commitment_form_host.state';
import { buildCommitmentSections, buildCommitmentsSearchTally } from './commitments.helpers';
import { buildCommitmentsPresentation } from './commitments.presentation';
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

const EMPTY_COMMITMENTS: Commitment[] = [];
const EMPTY_PAYMENTS: CommitmentMonthPayment[] = [];

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

  const accountRead = useAccountsById();
  const { accountsById } = accountRead;
  const loadAccountLookup = useAccountStore.getState().loadAccountLookup;
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

  const { effectiveFilters, accountChips, toggleAccountChip } = useAccountChipFilter(
    appliedFilters,
    useCommitmentsScreenState,
  );

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const hasMatchingSnapshot =
    commitmentsLoaded && paymentsLoaded && loadedMonth === selectedMonth && today !== undefined;
  const activeCommitments = hasMatchingSnapshot ? commitments : EMPTY_COMMITMENTS;
  const activePayments = hasMatchingSnapshot ? payments : EMPTY_PAYMENTS;

  const commitmentsById = useMemo(
    () => new Map(activeCommitments.map((c: Commitment) => [c.id, c])),
    [activeCommitments],
  );

  const rowAccountIds = useMemo(
    () =>
      activePayments.flatMap((payment) => {
        const id = resolveCommitmentRowAccountId(
          payment,
          commitmentsById.get(payment.commitment_id),
        );
        return id === undefined ? [] : [id];
      }),
    [activePayments, commitmentsById],
  );

  useEffect(() => {
    void loadAccountLookup(rowAccountIds).catch(() => {});
  }, [loadAccountLookup, rowAccountIds]);

  const { sections, tally } = useMemo((): ReturnType<typeof buildCommitmentSections> => {
    if (today === undefined) return { sections: [], tally: undefined };
    const filteredPayments = activePayments.filter((payment) => {
      const commitment = commitmentsById.get(payment.commitment_id);
      const accountId = resolveCommitmentRowAccountId(payment, commitment);
      const candidate = {
        payment,
        commitment,
        accountName: accountId ? accountsById.get(accountId)?.name : undefined,
        categoryName: commitment ? categoriesById.get(commitment.category_id)?.name : undefined,
      };
      return (
        commitmentMatchesSearch(candidate, debouncedSearch) &&
        commitmentMatchesAdvancedFilters(candidate, effectiveFilters)
      );
    });
    return buildCommitmentSections({
      rows: filteredPayments,
      statusFilter: deferredStatusFilter,
      commitmentsById,
      yearMonth: selectedMonth,
      today,
      liveRate,
    });
  }, [
    accountsById,
    effectiveFilters,
    categoriesById,
    commitmentsById,
    debouncedSearch,
    deferredStatusFilter,
    activePayments,
    liveRate,
    selectedMonth,
    today,
  ]);

  const isEmpty = activePayments.length === 0;
  const emptyMonthName = useMemo(() => fullMonthName(selectedMonth), [selectedMonth]);
  const advancedFilterCount = useMemo(
    () => countActiveCommitmentFilters(effectiveFilters),
    [effectiveFilters],
  );
  const activeFilterCount = countFunnelFilters(advancedFilterCount, effectiveFilters.accountIds);
  const filtersActive =
    statusFilter !== 'all' || debouncedSearch.trim().length > 0 || advancedFilterCount > 0;

  const heroAccountId = resolveCommitmentsHeroAccountId(effectiveFilters.accountIds);
  const heroKeyOnScreen = monthAggregateKey(selectedMonth, heroAccountId);
  const heroMode = resolveCommitmentsHeroMode({
    heldKey: monthAggregate?.key,
    errorKey: monthAggregateErrorKey,
    keyOnScreen: heroKeyOnScreen,
    rateLoaded,
  });
  const heroToday = toLocalDateString(new Date());
  const heroAccount = heroAccountId === undefined ? undefined : accountsById.get(heroAccountId);
  const heroAccountLabel = heroAccount === undefined ? undefined : resolveAccountName(heroAccount);
  const hero = useMemo(
    () =>
      buildCommitmentsHeroModel({
        mode: heroMode,
        aggregate: monthAggregate?.aggregate,
        rate,
        yearMonth: selectedMonth,
        today: heroToday,
        accountLabel: heroAccountLabel,
      }),
    [heroMode, monthAggregate, rate, selectedMonth, heroToday, heroAccountLabel],
  );
  const tallyIsOn = debouncedSearch.trim().length > 0 || advancedFilterCount > 0;
  const tallyTotal = hasMatchingSnapshot ? tally : undefined;
  const searchTally = useMemo(
    () => buildCommitmentsSearchTally({ isOn: tallyIsOn, heroMode, total: tallyTotal }),
    [tallyIsOn, heroMode, tallyTotal],
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

  const readSelectedMonth = useCallback(async () => {
    try {
      await Promise.all([
        reloadSelectedMonth(selectedMonth),
        loadMonthAggregate(selectedMonth, heroAccountId),
      ]);
    } catch {
      // The store owns loadError; event boundaries contain the rejected operation.
    }
  }, [reloadSelectedMonth, loadMonthAggregate, selectedMonth, heroAccountId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await readSelectedMonth();
    setRefreshing(false);
  }, [setRefreshing, readSelectedMonth]);

  // On a first-load failure the skeleton is the indicator.
  const retryLoad = useCallback(
    () => (hasMatchingSnapshot ? onRefresh() : readSelectedMonth()),
    [hasMatchingSnapshot, onRefresh, readSelectedMonth],
  );

  const retryAccountLookup = useCallback(async () => {
    try {
      await loadAccountLookup(rowAccountIds);
    } catch {
      // The store owns accountLookupError; event boundaries contain the rejected operation.
    }
  }, [loadAccountLookup, rowAccountIds]);

  const goToDetail = useCallback((commitmentId: string, paymentId: string) => {
    router.push(commitmentDetailRoute('', commitmentId, paymentId));
  }, []);

  const goToAdd = useCallback(() => {
    useCommitmentFormHostState.getState().openAdd();
  }, []);

  const goToEdit = useCallback((commitmentId: string | undefined) => {
    if (!commitmentId) {
      console.warn('[goToEdit] commitment id is undefined — skipping the edit sheet');
      return;
    }
    useCommitmentFormHostState.getState().openEdit(commitmentId);
  }, []);

  const handleOpenFilter = useCallback(() => {
    setFilterDraft(effectiveFilters);
    openFilter();
  }, [effectiveFilters, openFilter, setFilterDraft]);

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    clearSearch();
    setAppliedFilters(EMPTY_COMMITMENT_FILTERS);
  }, [clearSearch, setAppliedFilters, setStatusFilter]);

  const showAccountLookupError = lookupLeavesUnresolved(accountRead, rowAccountIds);
  const presentation = buildCommitmentsPresentation({
    hasMatchingSnapshot,
    loadError,
    commitmentCount: activeCommitments.length,
    rowCount: activePayments.length,
    matchCount: sections.length,
    filtersActive,
    showAccountLookupError,
  });

  return {
    state: {
      sections,
      tally: searchTally,
      liveRate,
      selectedMonth,
      emptyMonthName,
      today,
      hero,
      refreshing,
      isEmpty,
      commitmentsLoaded,
      paymentsLoaded,
      loading,
      loadError,
      presentation: presentation.status,
      emptyVariant: presentation.emptyVariant,
      floatingAlert: presentation.floatingAlert,
      statusFilter,
      searchQuery,
      activeFilterCount,
      accountChips,
      accountsById,
      categoriesById,
      commitmentsById,
    },
    navigateMonth,
    selectMonth,
    onRefresh,
    retryLoad,
    retryAccountLookup,
    goToDetail,
    goToAdd,
    goToEdit,
    skipPayment,
    deactivateCommitment,
    setStatusFilter,
    setSearchQuery,
    clearSearch,
    openFilter: handleOpenFilter,
    toggleAccountChip,
    resetFilters,
  };
}
