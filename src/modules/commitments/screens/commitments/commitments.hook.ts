import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef } from 'react';
import type { SectionList } from 'react-native';
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
import { useLocalDayChange } from '@/utils/use_local_day_change.hook';
import { fullMonthName, shiftYearMonth } from '@/utils/year_month';

import { resolveCommitmentRowAccountId } from '../../domain/payment_state';
import type { Commitment } from '../../entities/commitment.entity';
import type { CommitmentMonthPayment } from '../../entities/commitment_payment.entity';
import {
  isPaymentInTransition,
  monthAggregateKey,
  useCommitmentStore,
} from '../../store/commitment.store';
import { useCommitmentFormHostState } from '../../store/commitment_form_host.state';
import {
  buildCommitmentSections,
  buildCommitmentsSearchTally,
  resolveCommitmentListSource,
  type CommitmentsSection,
} from './commitments.helpers';
import { buildCommitmentsPresentation } from './commitments.presentation';
import { useCommitmentsScreenState } from './commitments.state';
import { useCommitmentsScreenStore } from './commitments.store';
import {
  buildCommitmentsHeroModel,
  resolveCommitmentsHeroAccountId,
  resolveCommitmentsHeroMode,
} from './components/commitments_hero.helpers';
import { usePaySheetState } from './detail/components/pay_sheet.state';
import {
  commitmentMatchesAdvancedFilters,
  commitmentMatchesSearch,
  countActiveCommitmentFilters,
} from './filter/filter.helpers';
import { useCommitmentFilterState } from './filter/filter.state';
import { EMPTY_COMMITMENT_FILTERS, useCommitmentFilterStore } from './filter/filter.store';
import { useSkipWithUndo } from './skip_with_undo.hook';

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
      loadError: s.loadError,
      monthAggregate: s.monthAggregate,
      monthAggregateErrorKey: s.monthAggregateErrorKey,
    })),
  );
  const setSelectedMonth = useCommitmentStore.getState().setSelectedMonth;
  const loadMonthSnapshot = useCommitmentStore.getState().loadMonthSnapshot;
  const loadMonthAggregate = useCommitmentStore.getState().loadMonthAggregate;
  const ensureMonthSnapshot = useCommitmentStore.getState().ensureMonthSnapshot;
  const ensureMonthAggregate = useCommitmentStore.getState().ensureMonthAggregate;

  const accountRead = useAccountsById();
  const { accountsById } = accountRead;
  const loadAccountLookup = useAccountStore.getState().loadAccountLookup;
  const categories = useCategoryStore.useState.categories();
  const { rate, hasLoaded: rateLoaded } = useCurrencyStore(
    useShallow((s) => ({ rate: s.rate, hasLoaded: s.hasLoaded })),
  );
  const liveRate = rateLoaded ? rate : undefined;
  const { refreshing, statusFilter, searchQuery, appliedFilters, payTarget } =
    useCommitmentsScreenState(
      useShallow((s) => ({
        refreshing: s.refreshing,
        statusFilter: s.statusFilter,
        searchQuery: s.searchQuery,
        appliedFilters: s.appliedFilters,
        payTarget: s.payTarget,
      })),
    );
  const setRefreshing = useCommitmentsScreenState.getState().setRefreshing;
  const setStatusFilter = useCommitmentsScreenState.getState().setStatusFilter;
  const setSearchQuery = useCommitmentsScreenState.getState().setSearchQuery;
  const clearSearch = useCommitmentsScreenState.getState().clearSearch;
  const setAppliedFilters = useCommitmentsScreenState.getState().setAppliedFilters;
  const setPayTarget = useCommitmentsScreenState.getState().setPayTarget;
  const deferredStatusFilter = useDeferredValue(statusFilter);
  const settledSearch = useDebouncedValue(searchQuery, 300);
  // An emptied query applies at once, so a seeded filter never reads the search it cleared.
  const debouncedSearch = searchQuery.length === 0 ? '' : settledSearch;
  const openFilter = useCommitmentFilterState.getState().open;
  const setFilterDraft = useCommitmentFilterStore.getState().setDraft;
  const payOwner = useId();
  const payToday = usePaySheetState((s) => s.entries[payOwner]?.openedOn);
  const releasePaySheet = usePaySheetState.getState().release;
  const { skip } = useSkipWithUndo();

  const { rowsRead, rowsLoadErrorId } = useCommitmentsScreenStore(
    useShallow((s) => ({ rowsRead: s.rowsRead, rowsLoadErrorId: s.rowsLoadErrorId })),
  );
  const loadCommitmentRows = useCommitmentsScreenStore.getState().loadCommitmentRows;
  const resetCommitmentRows = useCommitmentsScreenStore.getState().reset;
  const listRef = useRef<SectionList<CommitmentMonthPayment, CommitmentsSection>>(null);

  const { effectiveFilters, accountChips, toggleAccountChip } = useAccountChipFilter(
    appliedFilters,
    useCommitmentsScreenState,
  );
  const { commitmentId } = effectiveFilters;

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const hasMatchingSnapshot =
    commitmentsLoaded && paymentsLoaded && loadedMonth === selectedMonth && today !== undefined;
  const activeCommitments = hasMatchingSnapshot ? commitments : EMPTY_COMMITMENTS;
  const activePayments = hasMatchingSnapshot ? payments : EMPTY_PAYMENTS;
  const source = useMemo(
    () =>
      resolveCommitmentListSource({
        commitmentId,
        month: {
          yearMonth: selectedMonth,
          ready: hasMatchingSnapshot,
          today,
          commitments: activeCommitments,
          payments: activePayments,
          loadError,
        },
        rowsRead,
        rowsLoadErrorId,
      }),
    [
      commitmentId,
      selectedMonth,
      hasMatchingSnapshot,
      today,
      activeCommitments,
      activePayments,
      loadError,
      rowsRead,
      rowsLoadErrorId,
    ],
  );

  // `payments` is the refresh trigger: every store publish re-reads the commitment's rows in place.
  useEffect(() => {
    if (commitmentId === undefined) resetCommitmentRows();
    else void loadCommitmentRows(commitmentId);
  }, [commitmentId, payments, loadCommitmentRows, resetCommitmentRows]);

  // A seed writes a fresh filter, so a See all on the held commitment opens at the top as well.
  const listTopTrigger = commitmentId === undefined ? undefined : appliedFilters;
  useEffect(() => {
    listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
  }, [listTopTrigger]);

  const commitmentsById = useMemo(
    () => new Map(source.commitments.map((c: Commitment) => [c.id, c])),
    [source.commitments],
  );

  const rowAccountIds = useMemo(
    () =>
      source.payments.flatMap((payment) => {
        const id = resolveCommitmentRowAccountId(
          payment,
          commitmentsById.get(payment.commitment_id),
        );
        return id === undefined ? [] : [id];
      }),
    [source.payments, commitmentsById],
  );

  useEffect(() => {
    void loadAccountLookup(rowAccountIds).catch(() => {});
  }, [loadAccountLookup, rowAccountIds]);

  const { sections, tally } = useMemo((): ReturnType<typeof buildCommitmentSections> => {
    if (source.today === undefined) return { sections: [], tally: undefined };
    const filteredPayments = source.payments.filter((payment) => {
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
      yearMonth: source.yearMonth,
      today: source.today,
      liveRate,
    });
  }, [
    accountsById,
    effectiveFilters,
    categoriesById,
    commitmentsById,
    debouncedSearch,
    deferredStatusFilter,
    source.payments,
    source.today,
    source.yearMonth,
    liveRate,
  ]);

  const isEmpty = source.payments.length === 0;
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
  const tallyTotal = source.ready ? tally : undefined;
  const { commitmentName } = source;
  const searchTally = useMemo(
    () =>
      buildCommitmentsSearchTally({
        isOn: tallyIsOn,
        heroMode,
        total: tallyTotal,
        commitmentName,
      }),
    [tallyIsOn, heroMode, tallyTotal, commitmentName],
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

  useFocusEffect(
    useCallback(() => {
      const task = runAfterInteractions(
        () => {
          return ensureMonthSnapshot(selectedMonthRef.current);
        },
        {
          onError: (error) => {
            console.error('[commitments] focus load failed:', error);
          },
        },
      );
      return () => task.cancel();
    }, [ensureMonthSnapshot]),
  );

  // Expo-router reruns this on focus and on a month or hero-account change while focused.
  useFocusEffect(
    useCallback(() => {
      const task = runAfterInteractions(() => ensureMonthAggregate(selectedMonth, heroAccountId));
      return () => task.cancel();
    }, [ensureMonthAggregate, selectedMonth, heroAccountId]),
  );

  useLocalDayChange(
    useCallback(() => {
      void Promise.all([
        ensureMonthSnapshot(selectedMonth),
        ensureMonthAggregate(selectedMonth, heroAccountId),
      ]).catch((error: unknown) => {
        console.error('[commitments] day change read failed:', error);
      });
    }, [ensureMonthSnapshot, ensureMonthAggregate, selectedMonth, heroAccountId]),
  );

  const readSelectedMonth = useCallback(async () => {
    try {
      await Promise.all([
        loadMonthSnapshot(selectedMonth),
        loadMonthAggregate(selectedMonth, heroAccountId),
        commitmentId === undefined ? undefined : loadCommitmentRows(commitmentId),
      ]);
    } catch {
      // The store owns loadError; event boundaries contain the rejected operation.
    }
  }, [
    loadMonthSnapshot,
    loadMonthAggregate,
    loadCommitmentRows,
    selectedMonth,
    heroAccountId,
    commitmentId,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await readSelectedMonth();
    setRefreshing(false);
  }, [setRefreshing, readSelectedMonth]);

  // On a first-load failure the skeleton is the indicator.
  const retryLoad = useCallback(
    () => (source.ready ? onRefresh() : readSelectedMonth()),
    [source.ready, onRefresh, readSelectedMonth],
  );

  const retryAccountLookup = useCallback(async () => {
    try {
      await loadAccountLookup(rowAccountIds);
    } catch {
      // The store owns accountLookupError; event boundaries contain the rejected operation.
    }
  }, [loadAccountLookup, rowAccountIds]);

  // A set `postCloseAction` is a close still owed its toast, which a second open would reset.
  const paySheetIsOpen = useCallback(() => {
    const { entries } = usePaySheetState.getState();
    return entries[payOwner]?.visible === true || entries[payOwner]?.postCloseAction !== undefined;
  }, [payOwner]);

  const goToDetail = useCallback(
    (commitmentId: string, paymentId: string) => {
      if (paySheetIsOpen()) return;
      router.push(commitmentDetailRoute('', commitmentId, paymentId));
    },
    [paySheetIsOpen],
  );

  const goToAdd = useCallback(() => {
    useCommitmentFormHostState.getState().openAdd();
  }, []);

  useEffect(() => () => releasePaySheet(payOwner), [payOwner, releasePaySheet]);

  const payRow = useCallback(
    (payment: CommitmentMonthPayment, commitment: Commitment) => {
      if (paySheetIsOpen()) return;
      if (isPaymentInTransition(payment.id)) return;
      setPayTarget({ payment, commitment });
      // The pay sheet dates by the day it opens, not the day the list last read.
      usePaySheetState.getState().open(payOwner, toLocalDateString(new Date()));
    },
    [payOwner, paySheetIsOpen, setPayTarget],
  );

  const skipRow = useCallback(
    (payment: CommitmentMonthPayment, commitment: Commitment) => {
      if (paySheetIsOpen()) return;
      void skip(payment.id, commitment.name);
    },
    [paySheetIsOpen, skip],
  );

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
    listReady: source.ready,
    loadError: source.loadError,
    commitmentCount: source.commitments.length,
    rowCount: source.payments.length,
    matchCount: sections.length,
    filtersActive,
    showAccountLookupError,
  });

  return {
    state: {
      listRef,
      listKey: commitmentId,
      sections,
      tally: searchTally,
      liveRate,
      selectedMonth,
      emptyMonthName,
      today: source.today,
      hero,
      refreshing,
      isEmpty,
      commitmentsLoaded,
      paymentsLoaded,
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
      payOwner,
      payTarget,
      payToday,
    },
    navigateMonth,
    selectMonth,
    onRefresh,
    retryLoad,
    retryAccountLookup,
    goToDetail,
    goToAdd,
    payRow,
    skipRow,
    setStatusFilter,
    setSearchQuery,
    clearSearch,
    openFilter: handleOpenFilter,
    toggleAccountChip,
    resetFilters,
  };
}
