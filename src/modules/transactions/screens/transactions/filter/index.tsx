// modules/transactions/screens/transactions/filter/index.tsx
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';

import { AccountAccordion } from './components/account_accordion';
import { AmountAccordion } from './components/amount_accordion';
import { CategoryAccordion } from './components/category_accordion';
import { useFilterSheet } from './filter.hook';

export const FILTER_SHEET_ACTION_STYLE = { flex: 1 } as const;

export function FilterSheet(): React.ReactElement {
  const f = useFilterSheet();

  return (
    <Sheet
      isOpen={f.state.visible}
      onOpenChange={(open) => {
        if (!open) f.close();
      }}
      snapPoints={['45%', '92%']}
      scrollable
      title={Strings.filterTitle}
      footer={
        <Box style={{ flexDirection: 'row' }} className="gap-2">
          <Box testID="filter-reset-action" style={FILTER_SHEET_ACTION_STYLE}>
            <Button
              variant="secondary"
              label={Strings.filterReset}
              onPress={f.resetDraft}
              isDisabled={f.state.draftCount === 0}
            />
          </Box>
          <Box testID="filter-apply-action" style={FILTER_SHEET_ACTION_STYLE}>
            <Button
              variant="primary"
              label={
                f.state.draftCount > 0
                  ? Strings.filterApplyWithCount(f.state.draftCount)
                  : Strings.filterApply
              }
              onPress={f.applyDraft}
              isDisabled={!f.state.canApply}
            />
          </Box>
        </Box>
      }
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SHEET_FOOTER_CLEARANCE }}
      >
        <AccountAccordion
          accounts={f.state.accounts}
          selectedIds={f.state.draft.accountIds}
          selectedCount={f.state.draft.accountIds.length}
          summary={f.state.accountSummary}
          expanded={f.state.openSection === 'accounts'}
          onToggleSection={() => f.toggleSection('accounts')}
          onToggleId={f.toggleAccountId}
        />
        <CategoryAccordion
          categories={f.state.categories}
          selectedIds={f.state.draft.categoryIds}
          selectedCount={f.state.draft.categoryIds.length}
          summary={f.state.categorySummary}
          expanded={f.state.openSection === 'categories'}
          onToggleSection={() => f.toggleSection('categories')}
          onToggleId={f.toggleCategoryId}
        />
        <AmountAccordion
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
        />
      </BottomSheetScrollView>
    </Sheet>
  );
}
