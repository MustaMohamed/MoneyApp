import React from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

import { AccountAccordion } from './components/account_accordion';
import { CategoryAccordion } from './components/category_accordion';
import { AmountAccordion } from './components/amount_accordion';
import { useFilterSheet } from './filter.hook';

export function FilterSheet(): React.ReactElement | null {
  const f = useFilterSheet();

  if (!f.state.visible) return null;

  return (
    <Sheet
      visible={f.state.visible}
      onClose={f.close}
      size="lg"
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
      <Sheet.Body>
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
            <Text className="font-inter font-semibold text-[12px] text-accent">
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
            onToggleSection={() =>
              f.setOpenSection(f.state.openSection === 'accounts' ? null : 'accounts')
            }
            onToggleId={f.toggleAccountId}
          />
          <CategoryAccordion
            categories={f.state.categories}
            selectedIds={f.state.draft.categoryIds}
            expanded={f.state.openSection === 'categories'}
            onToggleSection={() =>
              f.setOpenSection(f.state.openSection === 'categories' ? null : 'categories')
            }
            onToggleId={f.toggleCategoryId}
          />
          <AmountAccordion
            draft={f.state.draft}
            expanded={f.state.openSection === 'amount'}
            onToggleSection={() =>
              f.setOpenSection(f.state.openSection === 'amount' ? null : 'amount')
            }
            onChangeCurrency={f.setAmountCurrency}
            onChangeMin={f.setAmountMin}
            onChangeMax={f.setAmountMax}
          />
        </BottomSheetScrollView>
      </Sheet.Body>
    </Sheet>
  );
}
