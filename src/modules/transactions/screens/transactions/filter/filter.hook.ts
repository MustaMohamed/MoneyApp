import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

import { useTransactionsScreenStore } from '../transactions.store';
import {
  advancedFiltersEqual,
  countActiveFilters,
  formatAmountSummary,
  formatSelectionSummary,
} from './filter.helpers';
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
  const { draft, amountMinText, amountMaxText } = useFilterStore(
    useShallow((state) => ({
      draft: state.draft,
      amountMinText: state.amountMinText,
      amountMaxText: state.amountMaxText,
    })),
  );
  const setDraft = useFilterStore.getState().setDraft;
  const resetDraft = useFilterStore.getState().resetDraft;
  const toggleAccountId = useFilterStore.getState().toggleAccountId;
  const toggleCategoryId = useFilterStore.getState().toggleCategoryId;
  const setAmountMin = useFilterStore.getState().setAmountMin;
  const setAmountMax = useFilterStore.getState().setAmountMax;
  const setAmountMinText = useFilterStore.getState().setAmountMinText;
  const setAmountMaxText = useFilterStore.getState().setAmountMaxText;
  const setAmountCurrency = useFilterStore.getState().setAmountCurrency;
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore.useState.categories();
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
  const canApply = !advancedFiltersEqual(draft, appliedFilters);
  const accountSummary = formatSelectionSummary(
    accounts
      .filter((account) => draft.accountIds.includes(account.id))
      .map((account) => account.name),
    Strings.filterSummaryAccountsEmpty,
  );
  const categorySummary = formatSelectionSummary(
    categories
      .filter((category) => draft.categoryIds.includes(category.id))
      .map((category) => category.name),
    Strings.filterSummaryCategoriesEmpty,
  );
  const amountActive = draft.amountMin !== undefined || draft.amountMax !== undefined;
  const amountSummary = formatAmountSummary(draft);

  return {
    state: {
      visible,
      openSection,
      draft,
      draftCount,
      canApply,
      accounts,
      categories,
      accountSummary,
      categorySummary,
      amountActive,
      amountSummary,
      amountMinText,
      amountMaxText,
    },
    close,
    toggleSection,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    setAmountMin,
    setAmountMax,
    setAmountMinText,
    setAmountMaxText,
    setAmountCurrency: (c: Currency) => setAmountCurrency(c),
    applyDraft,
  };
}
