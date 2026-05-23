import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

import { AccountAccordion } from './components/account_accordion';
import { AmountAccordion } from './components/amount_accordion';
import { CategoryAccordion } from './components/category_accordion';
import { useFilterSheet } from './filter.hook';

/**
 * Must remain mounted at all times — never wrap in `{condition && <FilterSheet />}`.
 *
 * Sheet drives BottomSheetLib's open/close imperatively via the ref. Unmounting
 * the wrapper drops the ref; on the next mount, `snapToIndex(0)` fires before
 * BottomSheetLib finishes initializing and silently no-ops, so the sheet
 * never reopens. See the body comment for the full trace.
 */
export function FilterSheet(): React.ReactElement {
  const f = useFilterSheet();

  // Sheet must stay mounted between opens. Unmounting drops the BottomSheetLib
  // ref, and the next mount fires snapToIndex(0) before the library has
  // initialized — the open silently no-ops. Sheet handles visibility itself.
  return (
    <Sheet
      visible={f.state.visible}
      onClose={f.close}
      snapPoints={['45%', '92%']}
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
      </Sheet.Body>
    </Sheet>
  );
}
