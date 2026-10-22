import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useTransactionsScreenStore } from '@/modules/transactions/store/transactions.store';
import { resolveAmountRangeDraft } from '@/modules/transactions/utils/amount_range_filter';
import { formatSelectionSummary } from '@/modules/transactions/utils/filter_selection';
import { resolveAccountName } from '@/utils/account_name';

import { advancedFiltersEqual, countActiveFilters } from './filter.helpers';
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

  useEffect(() => {
    if (visible) {
      setDraft(appliedFilters);
    }
  }, [visible, appliedFilters, setDraft]);

  const amountRange = resolveAmountRangeDraft(amountMinText, amountMaxText, draft);

  const applyDraft = useCallback(() => {
    if (!amountRange.isValid) return;
    setAppliedFilters(draft);
    close();
  }, [amountRange.isValid, close, draft, setAppliedFilters]);

  const draftCount = countActiveFilters(draft);
  const canApply = amountRange.isValid && !advancedFiltersEqual(draft, appliedFilters);
  const canReset = draftCount > 0 || amountRange.hasText;
  const accountSummary = formatSelectionSummary(
    accounts
      .filter((account) => draft.accountIds.includes(account.id))
      .map((account) => resolveAccountName(account)),
    Strings.filterSummaryAccountsEmpty,
  );
  const categorySummary = formatSelectionSummary(
    categories
      .filter((category) => draft.categoryIds.includes(category.id))
      .map((category) => category.name),
    Strings.filterSummaryCategoriesEmpty,
  );
  const amountActive = amountRange.hasText;
  const amountSummary = amountRange.summary;

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
      amountMinError: amountRange.minError,
      amountMaxError: amountRange.maxError,
      amountRangeError: amountRange.rangeError,
      canReset,
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
