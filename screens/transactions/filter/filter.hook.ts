import { useMemo } from 'react';

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
  // UI state
  const visible = useFilterDrawerState((s) => s.state.visible);
  const accountPickerVisible = useFilterDrawerState((s) => s.state.accountPickerVisible);
  const categoryPickerVisible = useFilterDrawerState((s) => s.state.categoryPickerVisible);
  const customDatePickerVisible = useFilterDrawerState((s) => s.state.customDatePickerVisible);
  const closeUi = useFilterDrawerState((s) => s.close);
  const setAccountPickerVisible = useFilterDrawerState((s) => s.setAccountPickerVisible);
  const setCategoryPickerVisible = useFilterDrawerState((s) => s.setCategoryPickerVisible);
  const setCustomDatePickerVisible = useFilterDrawerState((s) => s.setCustomDatePickerVisible);

  // Data
  const draft = useFilterDrawerStore((s) => s.state.draft);
  const resetDraft = useFilterDrawerStore((s) => s.resetDraft);
  const toggleAccountId = useFilterDrawerStore((s) => s.toggleAccountId);
  const toggleCategoryId = useFilterDrawerStore((s) => s.toggleCategoryId);
  const setDatePreset = useFilterDrawerStore((s) => s.setDatePreset);
  const setCustomDateRange = useFilterDrawerStore((s) => s.setCustomDateRange);
  const setAmountMin = useFilterDrawerStore((s) => s.setAmountMin);
  const setAmountMax = useFilterDrawerStore((s) => s.setAmountMax);
  const setAmountCurrency = useFilterDrawerStore((s) => s.setAmountCurrency);

  // Domain data (filtered to non-archived accounts; categories shown in full)
  const allAccounts = useAccountStore((s) => s.accounts);
  const allCategories = useCategoryStore((s) => s.categories);

  const pickerAccounts = useMemo(
    () => allAccounts.filter((a) => a.is_archived === 0),
    [allAccounts],
  );
  const pickerCategories = allCategories;

  // Apply commits draft → applied
  const setAppliedFilters = useTransactionsScreenStore((s) => s.setAppliedFilters);

  function applyDraft() {
    setAppliedFilters(draft);
    closeUi();
  }

  function close() {
    closeUi();
  }

  // Derived display values
  const selectedAccountSummary = useMemo(() => {
    const names = draft.accountIds
      .map((id) => allAccounts.find((a) => a.id === id)?.name)
      .filter((n): n is string => !!n);
    return formatSelectionSummary(names, Strings.filterAllAccounts);
  }, [draft.accountIds, allAccounts]);

  const selectedCategorySummary = useMemo(() => {
    const names = draft.categoryIds
      .map((id) => allCategories.find((c) => c.id === id)?.name)
      .filter((n): n is string => !!n);
    return formatSelectionSummary(names, Strings.filterAllCategories);
  }, [draft.categoryIds, allCategories]);

  const draftActiveCount = useMemo(() => countActiveFilters(draft), [draft]);

  return {
    state: {
      visible,
      accountPickerVisible,
      categoryPickerVisible,
      customDatePickerVisible,
      draft,
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
