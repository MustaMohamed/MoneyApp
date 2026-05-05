import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionsScreenStore } from '../transactions.store';
import { countActiveFilters, formatSelectionSummary } from './filter.helpers';
import { useFilterDrawerState } from './filter.state';
import { useFilterDrawerStore } from './filter.store';

/**
 * Orchestrates the filter drawer. Visibility lives in `useFilterDrawerState`
 * (UI), draft data in `useFilterDrawerStore` (data). The hook composes the two.
 */
export function useFilterDrawer() {
  const {
    state: filterUiState,
    closeUi,
    setAccountPickerVisible,
    setCategoryPickerVisible,
    setCustomDatePickerVisible,
  } = useFilterDrawerState(
    useShallow((s) => ({
      state: s.state,
      closeUi: s.close,
      setAccountPickerVisible: s.setAccountPickerVisible,
      setCategoryPickerVisible: s.setCategoryPickerVisible,
      setCustomDatePickerVisible: s.setCustomDatePickerVisible,
    })),
  );

  const {
    state: filterDataState,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    setDatePreset,
    setCustomDateRange,
    setAmountMin,
    setAmountMax,
    setAmountCurrency,
  } = useFilterDrawerStore(
    useShallow((s) => ({
      state: s.state,
      resetDraft: s.resetDraft,
      toggleAccountId: s.toggleAccountId,
      toggleCategoryId: s.toggleCategoryId,
      setDatePreset: s.setDatePreset,
      setCustomDateRange: s.setCustomDateRange,
      setAmountMin: s.setAmountMin,
      setAmountMax: s.setAmountMax,
      setAmountCurrency: s.setAmountCurrency,
    })),
  );

  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));

  const pickerAccounts = useMemo(
    () => accountState.accounts.filter((a) => a.is_archived === 0),
    [accountState.accounts],
  );
  const pickerCategories = categoryState.categories;

  const setAppliedFilters = useTransactionsScreenStore((s) => s.setAppliedFilters);

  function applyDraft() {
    setAppliedFilters(filterDataState.draft);
    closeUi();
  }

  function close() {
    closeUi();
  }

  const selectedAccountSummary = useMemo(() => {
    const names = filterDataState.draft.accountIds
      .map((id) => accountState.accounts.find((a) => a.id === id)?.name)
      .filter((n): n is string => !!n);
    return formatSelectionSummary(names, Strings.filterAllAccounts);
  }, [filterDataState.draft.accountIds, accountState.accounts]);

  const selectedCategorySummary = useMemo(() => {
    const names = filterDataState.draft.categoryIds
      .map((id) => categoryState.categories.find((c) => c.id === id)?.name)
      .filter((n): n is string => !!n);
    return formatSelectionSummary(names, Strings.filterAllCategories);
  }, [filterDataState.draft.categoryIds, categoryState.categories]);

  const draftActiveCount = useMemo(
    () => countActiveFilters(filterDataState.draft),
    [filterDataState.draft],
  );

  return {
    state: {
      visible: filterUiState.visible,
      accountPickerVisible: filterUiState.accountPickerVisible,
      categoryPickerVisible: filterUiState.categoryPickerVisible,
      customDatePickerVisible: filterUiState.customDatePickerVisible,
      draft: filterDataState.draft,
      pickerAccounts,
      pickerCategories,
      selectedAccountSummary,
      selectedCategorySummary,
      draftActiveCount,
    },
    toggleAccountId,
    toggleCategoryId,
    setDatePreset,
    setCustomDateRange,
    setAmountMin,
    setAmountMax,
    setAmountCurrency,
    setAccountPickerVisible,
    setCategoryPickerVisible,
    setCustomDatePickerVisible,
    close,
    resetDraft,
    applyDraft,
  };
}
