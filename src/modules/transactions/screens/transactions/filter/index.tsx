import React from 'react';

import { FilterAccountAccordion } from '@/components/ui/filter_account_accordion';
import { FilterAmountAccordion } from '@/components/ui/filter_amount_accordion';
import { FilterCategoryAccordion } from '@/components/ui/filter_category_accordion';
import { FilterSheetFrame } from '@/components/ui/filter_sheet_frame';
import { Strings } from '@/constants/strings';

import { useFilterSheet } from './filter.hook';

export function FilterSheet(): React.ReactElement {
  const f = useFilterSheet();

  return (
    <FilterSheetFrame
      isOpen={f.state.visible}
      onClose={f.close}
      testIDPrefix="filter"
      canReset={f.state.canReset}
      canApply={f.state.canApply}
      draftCount={f.state.draftCount}
      onReset={f.resetDraft}
      onApply={f.applyDraft}
    >
      <FilterAccountAccordion
        accounts={f.state.accounts}
        selectedIds={f.state.draft.accountIds}
        selectedCount={f.state.draft.accountIds.length}
        summary={f.state.accountSummary}
        expanded={f.state.openSection === 'accounts'}
        onToggleSection={() => f.toggleSection('accounts')}
        onToggleId={f.toggleAccountId}
        optionAccessibilityLabel={Strings.filterAccountAccessibility}
      />
      <FilterCategoryAccordion
        categories={f.state.categories}
        selectedIds={f.state.draft.categoryIds}
        selectedCount={f.state.draft.categoryIds.length}
        summary={f.state.categorySummary}
        expanded={f.state.openSection === 'categories'}
        onToggleSection={() => f.toggleSection('categories')}
        onToggleId={f.toggleCategoryId}
        optionAccessibilityLabel={Strings.filterCategoryAccessibility}
      />
      <FilterAmountAccordion
        amountCurrency={f.state.draft.amountCurrency}
        minValue={f.state.amountMinText}
        maxValue={f.state.amountMaxText}
        summary={f.state.amountSummary}
        active={f.state.amountActive}
        expanded={f.state.openSection === 'amount'}
        onToggleSection={() => f.toggleSection('amount')}
        onChangeCurrency={f.setAmountCurrency}
        onChangeMinText={f.setAmountMinText}
        onChangeMaxText={f.setAmountMaxText}
        currencyAccessibilityLabel={Strings.filterAmountCurrencyAccessibility}
        minError={f.state.amountMinError}
        maxError={f.state.amountMaxError}
        rangeError={f.state.amountRangeError}
      />
    </FilterSheetFrame>
  );
}
