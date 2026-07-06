import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';

import { CommitmentAccountAccordion } from './components/account_accordion';
import { CommitmentAmountAccordion } from './components/amount_accordion';
import { CommitmentAmountTypeAccordion } from './components/amount_type_accordion';
import { CommitmentCategoryAccordion } from './components/category_accordion';
import { CommitmentRecurrenceAccordion } from './components/recurrence_accordion';
import { useCommitmentFilterSheet } from './filter.hook';

export const COMMITMENT_FILTER_SHEET_ACTION_STYLE = { flex: 1 } as const;

export function CommitmentFilterSheet(): React.ReactElement {
  const filter = useCommitmentFilterSheet();

  return (
    <Sheet
      isOpen={filter.state.visible}
      onOpenChange={(open) => {
        if (!open) filter.close();
      }}
      snapPoints={['45%', '92%']}
      scrollable
      title={Strings.filterTitle}
      footer={
        <Box style={{ flexDirection: 'row' }} className="gap-2">
          <Box testID="commitment-filter-reset-action" style={COMMITMENT_FILTER_SHEET_ACTION_STYLE}>
            <Button
              variant="secondary"
              label={Strings.filterReset}
              onPress={filter.resetDraft}
              isDisabled={filter.state.draftCount === 0}
            />
          </Box>
          <Box testID="commitment-filter-apply-action" style={COMMITMENT_FILTER_SHEET_ACTION_STYLE}>
            <Button
              variant="primary"
              label={
                filter.state.draftCount > 0
                  ? Strings.filterApplyWithCount(filter.state.draftCount)
                  : Strings.filterApply
              }
              onPress={filter.applyDraft}
              isDisabled={!filter.state.canApply}
            />
          </Box>
        </Box>
      }
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SHEET_FOOTER_CLEARANCE }}
      >
        <CommitmentAccountAccordion
          accounts={filter.state.accounts}
          selectedIds={filter.state.draft.accountIds}
          expanded={filter.state.openSection === 'accounts'}
          onToggleSection={() => filter.toggleSection('accounts')}
          onToggleId={filter.toggleAccountId}
        />
        <CommitmentCategoryAccordion
          categories={filter.state.categories}
          selectedIds={filter.state.draft.categoryIds}
          expanded={filter.state.openSection === 'categories'}
          onToggleSection={() => filter.toggleSection('categories')}
          onToggleId={filter.toggleCategoryId}
        />
        <CommitmentAmountAccordion
          draft={filter.state.draft}
          expanded={filter.state.openSection === 'amount'}
          onToggleSection={() => filter.toggleSection('amount')}
          onChangeCurrency={filter.setAmountCurrency}
          onChangeMin={filter.setAmountMin}
          onChangeMax={filter.setAmountMax}
        />
        <CommitmentAmountTypeAccordion
          selectedTypes={filter.state.draft.amountTypes}
          expanded={filter.state.openSection === 'amountType'}
          onToggleSection={() => filter.toggleSection('amountType')}
          onToggleType={filter.toggleAmountType}
        />
        <CommitmentRecurrenceAccordion
          selectedPresets={filter.state.draft.recurrencePresets}
          expanded={filter.state.openSection === 'recurrence'}
          onToggleSection={() => filter.toggleSection('recurrence')}
          onTogglePreset={filter.toggleRecurrencePreset}
        />
      </BottomSheetScrollView>
    </Sheet>
  );
}
