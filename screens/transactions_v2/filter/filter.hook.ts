import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { Currency } from '@/constants/enums';

import { useTransactionsScreenStore } from '../transactions.store';
import { countActiveFilters } from './filter.helpers';
import { useFilterState } from './filter.state';
import { useFilterStore } from './filter.store';

export function useFilterSheet() {
  const { state: filterState, close, setOpenSection } = useFilterState(
    useShallow((s) => ({
      state: s.state,
      close: s.close,
      setOpenSection: s.setOpenSection,
    })),
  );
  const {
    state: filterStoreState,
    setDraft,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    setAmountMin,
    setAmountMax,
    setAmountCurrency,
  } = useFilterStore(
    useShallow((s) => ({
      state: s.state,
      setDraft: s.setDraft,
      resetDraft: s.resetDraft,
      toggleAccountId: s.toggleAccountId,
      toggleCategoryId: s.toggleCategoryId,
      setAmountMin: s.setAmountMin,
      setAmountMax: s.setAmountMax,
      setAmountCurrency: s.setAmountCurrency,
    })),
  );

  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));

  const {
    state: txScreenState,
    setAppliedFilters,
  } = useTransactionsScreenStore(
    useShallow((s) => ({
      state: s.state,
      setAppliedFilters: s.setAppliedFilters,
    })),
  );

  // When the sheet opens, seed the draft from the currently applied filters,
  // but only if the draft is currently empty (so an externally pre-set draft is preserved).
  const draftIsEmpty = countActiveFilters(filterStoreState.draft) === 0;
  useEffect(() => {
    if (filterState.visible && draftIsEmpty) {
      setDraft(txScreenState.appliedFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState.visible]);

  const applyDraft = useCallback(() => {
    setAppliedFilters(filterStoreState.draft);
    close();
  }, [filterStoreState.draft, setAppliedFilters, close]);

  const draftCount = countActiveFilters(filterStoreState.draft);

  return {
    state: {
      visible: filterState.visible,
      openSection: filterState.openSection,
      draft: filterStoreState.draft,
      draftCount,
      accounts: accountState.accounts,
      categories: categoryState.categories,
    },
    close,
    setOpenSection,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    setAmountMin,
    setAmountMax,
    setAmountCurrency: (c: Currency) => setAmountCurrency(c),
    applyDraft,
  };
}
