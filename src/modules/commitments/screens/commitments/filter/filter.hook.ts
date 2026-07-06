import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AmountType, Currency, RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

import { useCommitmentsScreenState } from '../commitments.state';
import {
  commitmentFiltersEqual,
  countActiveCommitmentFilters,
  formatCommitmentAmountSummary,
  formatCommitmentSelectionSummary,
} from './filter.helpers';
import { useCommitmentFilterState } from './filter.state';
import { useCommitmentFilterStore } from './filter.store';
import { COMMITMENT_AMOUNT_TYPE_OPTIONS, COMMITMENT_RECURRENCE_OPTIONS } from './filter_options';

export function useCommitmentFilterSheet() {
  const { visible, openSection } = useCommitmentFilterState(
    useShallow((state) => ({
      visible: state.visible,
      openSection: state.openSection,
    })),
  );
  const close = useCommitmentFilterState.getState().close;
  const toggleSection = useCommitmentFilterState.getState().toggleSection;
  const { draft, amountMinText, amountMaxText } = useCommitmentFilterStore(
    useShallow((state) => ({
      draft: state.draft,
      amountMinText: state.amountMinText,
      amountMaxText: state.amountMaxText,
    })),
  );
  const setDraft = useCommitmentFilterStore.getState().setDraft;
  const resetDraft = useCommitmentFilterStore.getState().resetDraft;
  const toggleAccountId = useCommitmentFilterStore.getState().toggleAccountId;
  const toggleCategoryId = useCommitmentFilterStore.getState().toggleCategoryId;
  const toggleAmountType = useCommitmentFilterStore.getState().toggleAmountType;
  const toggleRecurrencePreset = useCommitmentFilterStore.getState().toggleRecurrencePreset;
  const setAmountMin = useCommitmentFilterStore.getState().setAmountMin;
  const setAmountMax = useCommitmentFilterStore.getState().setAmountMax;
  const setAmountMinText = useCommitmentFilterStore.getState().setAmountMinText;
  const setAmountMaxText = useCommitmentFilterStore.getState().setAmountMaxText;
  const setAmountCurrency = useCommitmentFilterStore.getState().setAmountCurrency;
  const accounts = useAccountStore((state) => state.accounts);
  const categories = useCategoryStore.useState.categories();
  const appliedFilters = useCommitmentsScreenState.useState.appliedFilters();
  const setAppliedFilters = useCommitmentsScreenState.getState().setAppliedFilters;

  useEffect(() => {
    if (visible) setDraft(appliedFilters);
  }, [appliedFilters, setDraft, visible]);

  const applyDraft = useCallback(() => {
    setAppliedFilters(draft);
    close();
  }, [close, draft, setAppliedFilters]);

  const draftCount = countActiveCommitmentFilters(draft);
  const canApply = !commitmentFiltersEqual(draft, appliedFilters);
  const accountSummary = formatCommitmentSelectionSummary(
    accounts
      .filter((account) => draft.accountIds.includes(account.id))
      .map((account) => account.name),
    Strings.filterSummaryAccountsEmpty,
  );
  const categorySummary = formatCommitmentSelectionSummary(
    categories
      .filter((category) => draft.categoryIds.includes(category.id))
      .map((category) => category.name),
    Strings.filterSummaryCategoriesEmpty,
  );
  const amountActive = draft.amountMin !== undefined || draft.amountMax !== undefined;
  const amountSummary = formatCommitmentAmountSummary(draft);
  const amountTypeSummary = formatCommitmentSelectionSummary(
    COMMITMENT_AMOUNT_TYPE_OPTIONS.filter((option) => draft.amountTypes.includes(option.value)).map(
      (option) => option.label,
    ),
    Strings.filterAllAmountTypes,
  );
  const recurrenceSummary = formatCommitmentSelectionSummary(
    COMMITMENT_RECURRENCE_OPTIONS.filter((option) =>
      draft.recurrencePresets.includes(option.value),
    ).map((option) => option.label),
    Strings.filterAllRecurrences,
  );

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
      amountTypeSummary,
      recurrenceSummary,
    },
    close,
    toggleSection,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    toggleAmountType: (type: AmountType) => toggleAmountType(type),
    toggleRecurrencePreset: (preset: RecurrencePreset) => toggleRecurrencePreset(preset),
    setAmountMin,
    setAmountMax,
    setAmountMinText,
    setAmountMaxText,
    setAmountCurrency: (currency: Currency) => setAmountCurrency(currency),
    applyDraft,
  };
}
