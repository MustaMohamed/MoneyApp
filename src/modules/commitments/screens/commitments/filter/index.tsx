import React from 'react';

import { FilterAccountAccordion } from '@/components/ui/filter_account_accordion';
import { FilterAmountAccordion } from '@/components/ui/filter_amount_accordion';
import { FilterCategoryAccordion } from '@/components/ui/filter_category_accordion';
import { FilterSheetFrame } from '@/components/ui/filter_sheet_frame';
import { Strings } from '@/constants/strings';

import { CommitmentAmountTypeAccordion } from './components/amount_type_accordion';
import { CommitmentAccordion } from './components/commitment_accordion';
import { CommitmentRecurrenceAccordion } from './components/recurrence_accordion';
import { useCommitmentFilterSheet } from './filter.hook';

export function CommitmentFilterSheet(): React.ReactElement {
  const filter = useCommitmentFilterSheet();

  return (
    <FilterSheetFrame
      isOpen={filter.state.visible}
      onClose={filter.close}
      testIDPrefix="commitment-filter"
      canReset={filter.state.canReset}
      canApply={filter.state.canApply}
      draftCount={filter.state.draftCount}
      onReset={filter.resetDraft}
      onApply={filter.applyDraft}
    >
      <FilterAccountAccordion
        accounts={filter.state.accounts}
        selectedIds={filter.state.draft.accountIds}
        selectedCount={filter.state.draft.accountIds.length}
        summary={filter.state.accountSummary}
        expanded={filter.state.openSection === 'accounts'}
        onToggleSection={() => filter.toggleSection('accounts')}
        onToggleId={filter.toggleAccountId}
        optionAccessibilityLabel={Strings.commitmentFilterAccountAccessibility}
      />
      <FilterCategoryAccordion
        categories={filter.state.categories}
        selectedIds={filter.state.draft.categoryIds}
        selectedCount={filter.state.draft.categoryIds.length}
        summary={filter.state.categorySummary}
        expanded={filter.state.openSection === 'categories'}
        onToggleSection={() => filter.toggleSection('categories')}
        onToggleId={filter.toggleCategoryId}
        optionAccessibilityLabel={Strings.commitmentFilterCategoryAccessibility}
      />
      <FilterAmountAccordion
        amountCurrency={filter.state.draft.amountCurrency}
        minValue={filter.state.amountMinText}
        maxValue={filter.state.amountMaxText}
        summary={filter.state.amountSummary}
        active={filter.state.amountActive}
        expanded={filter.state.openSection === 'amount'}
        onToggleSection={() => filter.toggleSection('amount')}
        onChangeCurrency={filter.setAmountCurrency}
        onChangeMinText={filter.setAmountMinText}
        onChangeMaxText={filter.setAmountMaxText}
        currencyAccessibilityLabel={Strings.commitmentFilterAmountCurrencyAccessibility}
        minError={filter.state.amountMinError}
        maxError={filter.state.amountMaxError}
        rangeError={filter.state.amountRangeError}
      />
      <CommitmentAmountTypeAccordion
        selectedTypes={filter.state.draft.amountTypes}
        selectedCount={filter.state.draft.amountTypes.length}
        summary={filter.state.amountTypeSummary}
        expanded={filter.state.openSection === 'amountType'}
        onToggleSection={() => filter.toggleSection('amountType')}
        onToggleType={filter.toggleAmountType}
      />
      <CommitmentRecurrenceAccordion
        selectedPresets={filter.state.draft.recurrencePresets}
        selectedCount={filter.state.draft.recurrencePresets.length}
        summary={filter.state.recurrenceSummary}
        expanded={filter.state.openSection === 'recurrence'}
        onToggleSection={() => filter.toggleSection('recurrence')}
        onTogglePreset={filter.toggleRecurrencePreset}
      />
      <CommitmentAccordion
        options={filter.state.commitmentOptions}
        selectedId={filter.state.draft.commitmentId}
        summary={filter.state.commitmentSummary}
        expanded={filter.state.openSection === 'commitments'}
        onToggleSection={() => filter.toggleSection('commitments')}
        onToggle={filter.toggleCommitmentId}
      />
    </FilterSheetFrame>
  );
}
