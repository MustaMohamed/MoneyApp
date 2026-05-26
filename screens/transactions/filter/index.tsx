import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/bottom_sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

import { AccountAccordion } from './components/account_accordion';
import { AmountAccordion } from './components/amount_accordion';
import { CategoryAccordion } from './components/category_accordion';
import { useFilterSheet } from './filter.hook';

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
        <View className="px-4 pt-3 pb-6">
          <Button
            variant="primary"
            label={
              f.state.draftCount > 0
                ? Strings.filterApplyWithCount(f.state.draftCount)
                : Strings.filterApply
            }
            onPress={f.applyDraft}
            disabled={f.state.draftCount === 0}
          />
        </View>
      }
    >
      {/* Reset link row — Sheet has no headerRight slot so it lives here */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}
      >
        <Pressable
          onPress={f.resetDraft}
          accessibilityRole="button"
          accessibilityLabel="Reset filters"
        >
          <Text className="font-inter text-accent text-[12px] font-semibold">
            {Strings.filterReset}
          </Text>
        </Pressable>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SHEET_FOOTER_CLEARANCE }}
      >
        <AccountAccordion
          accounts={f.state.accounts}
          selectedIds={f.state.draft.accountIds}
          expanded={f.state.openSection === 'accounts'}
          onToggleSection={() => f.toggleSection('accounts')}
          onToggleId={f.toggleAccountId}
        />
        <CategoryAccordion
          categories={f.state.categories}
          selectedIds={f.state.draft.categoryIds}
          expanded={f.state.openSection === 'categories'}
          onToggleSection={() => f.toggleSection('categories')}
          onToggleId={f.toggleCategoryId}
        />
        <AmountAccordion
          draft={f.state.draft}
          expanded={f.state.openSection === 'amount'}
          onToggleSection={() => f.toggleSection('amount')}
          onChangeCurrency={f.setAmountCurrency}
          onChangeMin={f.setAmountMin}
          onChangeMax={f.setAmountMax}
        />
      </BottomSheetScrollView>
    </Sheet>
  );
}
