import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';

import { AmountHero } from '@/components/ui/amount_hero';
import { FactRow } from '@/components/ui/fact_row';
import { FormFactCell } from '@/components/ui/form_fact_cell';
import { FormPickerRow } from '@/components/ui/form_picker_row';
import {
  AMOUNT_MESSAGE_TEXT_STYLE,
  FORM_SHEET_CONTENT_CONTAINER_STYLE,
} from '@/components/ui/form_sheet.geometry';
import { FormSheetFooter } from '@/components/ui/form_sheet_footer';
import { ListCard } from '@/components/ui/list_card';
import { NoteFactRow } from '@/components/ui/note_fact_row';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { ValidationSlot } from '@/components/ui/validation_slot';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { BudgetGroupPicker } from '@/modules/budget/screens/budget/components/budget_group_picker';
import {
  useSetBudgetSheet,
  type SetBudgetSheetOptions,
} from '@/modules/budget/screens/budget/components/set_budget_sheet.hook';
import { CategoryPickerRow } from '@/modules/categories/components/category_picker_row';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import { toIconName } from '@/utils/icon_name_guard';

export type SetBudgetSheetProps = SetBudgetSheetOptions;

export function SetBudgetSheet(props: SetBudgetSheetProps) {
  const {
    state,
    control,
    submit,
    setLimitText,
    selectCategory,
    selectGroup,
    openGroupPicker,
    onGroupPickerOpenChange,
    togglePicker,
    collapsePicker,
    clearError,
    onOpenChange,
    handleCloseComplete,
  } = useSetBudgetSheet(props);
  const { faults } = state;

  return (
    <>
      <Sheet
        isOpen={state.sheetVisible}
        isDismissable={!state.saving}
        onOpenChange={onOpenChange}
        onCloseComplete={handleCloseComplete}
        title={state.title}
        size="lg"
        scrollable
        liftsAboveKeyboard
        footer={
          <FormSheetFooter
            statusTestID="set-budget-status"
            showsStatusTrack
            message={state.footerMessage}
            label={Strings.budgetSaveCta}
            isLoading={state.saving}
            isDisabled={state.saving}
            onPress={() => void submit()}
          />
        }
      >
        <BottomSheetScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Controller
            control={control}
            name="limitText"
            render={({ field: { value } }) => (
              <AmountHero
                value={value}
                onChange={setLimitText}
                tone="foreground"
                currency={Currency.EGP}
                invalid={faults.limit !== undefined}
                accessibilityLabel={Strings.budgetMonthlyLimitLabel}
              />
            )}
          />
          <Text
            testID="set-budget-month-line"
            className="font-inter text-muted px-4"
            numberOfLines={1}
            style={AMOUNT_MESSAGE_TEXT_STYLE}
          >
            {state.monthLine}
          </Text>
          <ValidationSlot
            testID="limit-error-slot"
            liveTestID="limit-error-live"
            message={faults.limit}
          />

          <View style={FORM_SHEET_CONTENT_CONTAINER_STYLE}>
            <ListCard testID="set-budget-fact-group">
              <FormFactCell fault={faults.category} ringTestID="category-ring">
                {state.isEdit ? (
                  <FactRow
                    testID="category-row"
                    label={Strings.budgetCategoryLabel}
                    value={state.rowCategoryName}
                    leading={
                      <MaterialCommunityIcons
                        name={
                          state.editGlyph ? toIconName(state.editGlyph.icon, 'tag') : 'tag-outline'
                        }
                        size={Size.filterSegmentIcon}
                        color={state.editGlyph?.color ?? CoreTokens.text1}
                      />
                    }
                    inset={false}
                    showDivider={false}
                  />
                ) : (
                  <CategoryPickerRow
                    testID="category-row"
                    label={Strings.budgetCategoryLabel}
                    category={state.rowCategory}
                    onPress={togglePicker}
                    accessibilityHint={faults.category}
                  />
                )}
              </FormFactCell>
              <FormFactCell fault={state.nameFault} ringTestID="name-ring">
                <Controller
                  control={control}
                  name="nameText"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <NoteFactRow
                      testID="name-row"
                      inset={false}
                      label={Strings.budgetNameLabel}
                      placeholder={Strings.budgetNamePlaceholder}
                      accessibilityHint={faults.name}
                      value={value}
                      onChangeText={(text) => {
                        clearError();
                        onChange(text);
                      }}
                      onBlur={onBlur}
                    />
                  )}
                />
              </FormFactCell>
              <FormFactCell divider={false}>
                <FormPickerRow
                  testID="group-row"
                  label={Strings.budgetGroupLabel}
                  value={state.groupRowValue}
                  onPress={openGroupPicker}
                  divider={false}
                  suffix={
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={Size.iconSm}
                      color={CoreTokens.text2}
                    />
                  }
                />
              </FormFactCell>
            </ListCard>
          </View>
        </BottomSheetScrollView>
      </Sheet>

      {!state.isEdit ? (
        <CategoryPickerSheet
          isOpen={state.sheetVisible && state.pickerExpanded}
          title={Strings.budgetPickCategory}
          categories={props.budgetableCategories}
          selectedId={state.selectedCategoryId}
          onSelect={selectCategory}
          onOpenChange={collapsePicker}
        />
      ) : null}
      <BudgetGroupPicker
        isOpen={state.sheetVisible && state.groupPickerOpen}
        value={state.groupValue}
        onSelect={selectGroup}
        onOpenChange={onGroupPickerOpenChange}
      />
    </>
  );
}
