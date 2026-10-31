import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AmountType, Currency, RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { resolveAmountRangeDraft } from '@/modules/transactions/utils/amount_range_filter';
import { formatSelectionSummary } from '@/modules/transactions/utils/filter_selection';
import { resolveAccountName } from '@/utils/account_name';

import { useCommitmentStore } from '../../../store/commitment.store';
import { useCommitmentsScreenState } from '../commitments.state';
import { useCommitmentsScreenStore } from '../commitments.store';
import {
  commitmentFiltersEqual,
  countActiveCommitmentFilters,
  resolveCommitmentFilterOptions,
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
  const toggleCommitmentId = useCommitmentFilterStore.getState().toggleCommitmentId;
  const setAmountMin = useCommitmentFilterStore.getState().setAmountMin;
  const setAmountMax = useCommitmentFilterStore.getState().setAmountMax;
  const setAmountMinText = useCommitmentFilterStore.getState().setAmountMinText;
  const setAmountMaxText = useCommitmentFilterStore.getState().setAmountMaxText;
  const setAmountCurrency = useCommitmentFilterStore.getState().setAmountCurrency;
  const accounts = useAccountStore((state) => state.accounts);
  const categories = useCategoryStore.useState.categories();
  const commitments = useCommitmentStore((state) => state.commitments);
  const rowsRead = useCommitmentsScreenStore.useState.rowsRead();
  const appliedFilters = useCommitmentsScreenState.useState.appliedFilters();
  const setAppliedFilters = useCommitmentsScreenState.getState().setAppliedFilters;

  useEffect(() => {
    if (visible) setDraft(appliedFilters);
  }, [appliedFilters, setDraft, visible]);

  const amountRange = resolveAmountRangeDraft(amountMinText, amountMaxText, draft);

  const applyDraft = useCallback(() => {
    if (!amountRange.isValid) return;
    setAppliedFilters(draft);
    close();
  }, [amountRange.isValid, close, draft, setAppliedFilters]);

  const draftCount = countActiveCommitmentFilters(draft);
  const canApply = amountRange.isValid && !commitmentFiltersEqual(draft, appliedFilters);
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
  const amountTypeSummary = formatSelectionSummary(
    COMMITMENT_AMOUNT_TYPE_OPTIONS.filter((option) => draft.amountTypes.includes(option.value)).map(
      (option) => option.label,
    ),
    Strings.filterAllAmountTypes,
  );
  const recurrenceSummary = formatSelectionSummary(
    COMMITMENT_RECURRENCE_OPTIONS.filter((option) =>
      draft.recurrencePresets.includes(option.value),
    ).map((option) => option.label),
    Strings.filterAllRepeats,
  );
  const commitmentOptions = resolveCommitmentFilterOptions(
    commitments.filter((commitment) => commitment.is_active === 1),
    rowsRead?.commitmentId === appliedFilters.commitmentId ? rowsRead?.commitment : undefined,
  );
  const commitmentSummary =
    commitmentOptions.find((option) => option.id === draft.commitmentId)?.name ??
    Strings.filterAllCommitments;

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
      amountTypeSummary,
      recurrenceSummary,
      commitmentOptions,
      commitmentSummary,
      canReset,
    },
    close,
    toggleSection,
    resetDraft,
    toggleAccountId,
    toggleCategoryId,
    toggleAmountType: (type: AmountType) => toggleAmountType(type),
    toggleRecurrencePreset: (preset: RecurrencePreset) => toggleRecurrencePreset(preset),
    toggleCommitmentId,
    setAmountMin,
    setAmountMax,
    setAmountMinText,
    setAmountMaxText,
    setAmountCurrency: (currency: Currency) => setAmountCurrency(currency),
    applyDraft,
  };
}
