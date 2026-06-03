import { useCallback, useEffect } from 'react';

import { Currency } from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

import { useTransactionsScreenStore } from '../transactions.store';
import { countActiveFilters } from './filter.helpers';
import { useFilterState } from './filter.state';
import { useFilterStore } from './filter.store';

export function useFilterSheet() {
  const filterState = useFilterState();
  const visible = filterState.state.visible.value;
  const openSection = filterState.state.openSection.value;
  const { close, toggleSection } = filterState;

  const filterStore = useFilterStore();
  const draft = filterStore.state.draft.value;
  const {
    setDraft,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    setAmountMin,
    setAmountMax,
    setAmountCurrency,
  } = filterStore;

  const accountStore = useAccountStore();
  const accounts = accountStore.accounts;
  const categoryStore = useCategoryStore();
  const categories = categoryStore.categories;

  const transactionsScreenStore = useTransactionsScreenStore();
  const appliedFilters = transactionsScreenStore.state.appliedFilters.value;
  const setAppliedFilters = transactionsScreenStore.setAppliedFilters;

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
