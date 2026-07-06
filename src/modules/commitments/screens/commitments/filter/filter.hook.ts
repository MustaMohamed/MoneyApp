import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AmountType, Currency, RecurrencePreset } from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

import { useCommitmentsScreenState } from '../commitments.state';
import { commitmentFiltersEqual, countActiveCommitmentFilters } from './filter.helpers';
import { useCommitmentFilterState } from './filter.state';
import { useCommitmentFilterStore } from './filter.store';

export function useCommitmentFilterSheet() {
  const { visible, openSection } = useCommitmentFilterState(
    useShallow((state) => ({
      visible: state.visible,
      openSection: state.openSection,
    })),
  );
  const close = useCommitmentFilterState.getState().close;
  const toggleSection = useCommitmentFilterState.getState().toggleSection;
  const draft = useCommitmentFilterStore.useState.draft();
  const setDraft = useCommitmentFilterStore.getState().setDraft;
  const resetDraft = useCommitmentFilterStore.getState().resetDraft;
  const toggleAccountId = useCommitmentFilterStore.getState().toggleAccountId;
  const toggleCategoryId = useCommitmentFilterStore.getState().toggleCategoryId;
  const toggleAmountType = useCommitmentFilterStore.getState().toggleAmountType;
  const toggleRecurrencePreset = useCommitmentFilterStore.getState().toggleRecurrencePreset;
  const setAmountMin = useCommitmentFilterStore.getState().setAmountMin;
  const setAmountMax = useCommitmentFilterStore.getState().setAmountMax;
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

  return {
    state: {
      visible,
      openSection,
      draft,
      draftCount,
      canApply,
      accounts,
      categories,
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
    setAmountCurrency: (currency: Currency) => setAmountCurrency(currency),
    applyDraft,
  };
}
