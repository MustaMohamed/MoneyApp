import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Currency } from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

import { useTransactionsScreenStore } from '../transactions.store';
import { countActiveFilters } from './filter.helpers';
import { useFilterState } from './filter.state';
import { useFilterStore } from './filter.store';

export function useFilterSheet() {
  const { visible, openSection } = useFilterState(
    useShallow((s) => ({
      visible: s.visible,
      openSection: s.openSection,
    })),
  );
  const close = useFilterState.getState().close;
  const toggleSection = useFilterState.getState().toggleSection;
  const draft = useFilterStore.useState.draft();
  const setDraft = useFilterStore.getState().setDraft;
  const resetDraft = useFilterStore.getState().resetDraft;
  const toggleAccountId = useFilterStore.getState().toggleAccountId;
  const toggleCategoryId = useFilterStore.getState().toggleCategoryId;
  const setAmountMin = useFilterStore.getState().setAmountMin;
  const setAmountMax = useFilterStore.getState().setAmountMax;
  const setAmountCurrency = useFilterStore.getState().setAmountCurrency;
  const {
    state: { accounts: accountsSignal },
  } = useAccountStore();
  const accounts = accountsSignal.value;
  const categories = useCategoryStore().state.categories.value;
  const appliedFilters = useTransactionsScreenStore.useState.appliedFilters();
  const setAppliedFilters = useTransactionsScreenStore.getState().setAppliedFilters;

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
