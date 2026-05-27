import { useCallback, useEffect } from 'react';

import { Currency } from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

import { useTransactionsScreenStore } from '../transactions.store';
import { countActiveFilters } from './filter.helpers';
import { useFilterState } from './filter.state';
import { useFilterStore } from './filter.store';

export function useFilterSheet() {
  const visible = useFilterState.useState.visible();
  const openSection = useFilterState.useState.openSection();
  const close = useFilterState.use.close();
  const toggleSection = useFilterState.use.toggleSection();
  const draft = useFilterStore.useState.draft();
  const setDraft = useFilterStore.use.setDraft();
  const resetDraft = useFilterStore.use.resetDraft();
  const toggleAccountId = useFilterStore.use.toggleAccountId();
  const toggleCategoryId = useFilterStore.use.toggleCategoryId();
  const setAmountMin = useFilterStore.use.setAmountMin();
  const setAmountMax = useFilterStore.use.setAmountMax();
  const setAmountCurrency = useFilterStore.use.setAmountCurrency();
  const accounts = useAccountStore.useState.accounts();
  const categories = useCategoryStore.useState.categories();
  const appliedFilters = useTransactionsScreenStore.useState.appliedFilters();
  const setAppliedFilters = useTransactionsScreenStore.use.setAppliedFilters();

  // When the sheet opens, seed the draft from the currently applied filters.
  useEffect(() => {
    if (visible) {
      setDraft(appliedFilters);
    }
  }, [visible, appliedFilters, setDraft]);

  const applyDraft = useCallback(() => {
    setAppliedFilters(draft);
    close();
  }, [draft, setAppliedFilters, close]);

  const draftCount = countActiveFilters(draft);

  return {
    state: {
      visible,
      openSection,
      draft,
      draftCount,
      accounts,
      categories,
    },
    close,
    toggleSection,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    setAmountMin,
    setAmountMax,
    setAmountCurrency: (c: Currency) => setAmountCurrency(c),
    applyDraft,
  };
}
