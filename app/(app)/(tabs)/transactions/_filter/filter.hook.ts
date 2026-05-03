import { useMemo } from 'react';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionsScreenStore } from '../transactions.store';
import { countActiveFilters, formatSelectionSummary } from './filter.helpers';
import { useFilterDrawerStore } from './filter.store';

/**
 * Orchestrates the filter drawer:
 *   - exposes draft state and setters from useFilterDrawerStore
 *   - reads account / category lists for sub-pickers
 *   - exposes derived display strings (selection summaries, active count)
 *   - provides applyDraft() which commits draft → applied + closes the sheet
 */
export function useFilterDrawer() {
  // Drawer store
  const visible = useFilterDrawerStore((s) => s.visible);
  const draft = useFilterDrawerStore((s) => s.draft);
  const accountPickerVisible = useFilterDrawerStore((s) => s.accountPickerVisible);
  const categoryPickerVisible = useFilterDrawerStore((s) => s.categoryPickerVisible);
  const customDatePickerVisible = useFilterDrawerStore((s) => s.customDatePickerVisible);

  const close = useFilterDrawerStore((s) => s.close);
  const resetDraft = useFilterDrawerStore((s) => s.resetDraft);
  const toggleAccountId = useFilterDrawerStore((s) => s.toggleAccountId);
  const toggleCategoryId = useFilterDrawerStore((s) => s.toggleCategoryId);
  const setDatePreset = useFilterDrawerStore((s) => s.setDatePreset);
  const setCustomDateRange = useFilterDrawerStore((s) => s.setCustomDateRange);
  const setAmountMin = useFilterDrawerStore((s) => s.setAmountMin);
  const setAmountMax = useFilterDrawerStore((s) => s.setAmountMax);
  const setAmountCurrency = useFilterDrawerStore((s) => s.setAmountCurrency);
  const setAccountPickerVisible = useFilterDrawerStore((s) => s.setAccountPickerVisible);
  const setCategoryPickerVisible = useFilterDrawerStore((s) => s.setCategoryPickerVisible);
  const setCustomDatePickerVisible = useFilterDrawerStore((s) => s.setCustomDatePickerVisible);

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
    close();
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
    // visibility
    visible,
    accountPickerVisible,
    categoryPickerVisible,
    customDatePickerVisible,

    // draft + setters
    draft,
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

    // lifecycle
    close,
    resetDraft,
    applyDraft,

    // domain data for sub-pickers
    pickerAccounts,
    pickerCategories,

    // derived
    selectedAccountSummary,
    selectedCategorySummary,
    draftActiveCount,
  };
}
