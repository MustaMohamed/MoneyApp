import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { cn, Input, PressableFeedback, RadioGroup } from 'heroui-native';
import React from 'react';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Type } from '@/constants/theme';
import {
  useSetBudgetSheet,
  type SetBudgetSheetOptions,
} from '@/modules/budget/screens/budget/components/set_budget_sheet.hook';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import { toIconName } from '@/utils/icon_name_guard';
import { maskFieldText } from '@/utils/money_text';
import { ms } from '@/utils/responsive';

export type SetBudgetSheetProps = SetBudgetSheetOptions;

const GROUP_OPTIONS: { value: BudgetGroup; label: string }[] = [
  { value: BudgetGroup.Need, label: Strings.budget5030GroupNeed },
  { value: BudgetGroup.Want, label: Strings.budget5030GroupWant },
  { value: BudgetGroup.Savings, label: Strings.budget5030GroupSavings },
];

export function SetBudgetSheet(props: SetBudgetSheetProps) {
  const {
    state,
    control,
    submit,
    selectCategory,
    selectGroup,
    togglePicker,
    collapsePicker,
    clearError,
    onFocus,
    onBlur,
    onOpenChange,
  } = useSetBudgetSheet(props);

  return (
    <>
      <Sheet
        isOpen={state.sheetVisible}
        isDismissable={!state.saving}
        onOpenChange={onOpenChange}
        title={state.isEdit ? Strings.budgetEditTitle : Strings.budgetSetTitle}
        size="md"
        scrollable
        footer={
          <Button
            variant="primary"
            label={Strings.budgetSaveCta}
            isLoading={state.saving}
            isDisabled={state.saving}
            onPress={() => void submit()}
          />
        }
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-1" style={{ paddingBottom: SHEET_FOOTER_CLEARANCE }}>
            {state.isEdit ? (
              <View className="bg-default border-border mb-3 flex-row items-center justify-between rounded-lg border px-2 py-2 opacity-70">
                <Text
                  className="font-inter-semibold text-foreground"
                  style={{ fontSize: Type.caption }}
                >
                  {state.editingCategoryName ?? Strings.budgetPickCategory}
                </Text>
              </View>
            ) : (
              <PressableFeedback
                className="bg-default border-border mb-3 flex-row items-center justify-between rounded-lg border px-2 py-2"
                onPress={togglePicker}
                accessibilityRole="button"
                accessibilityLabel={Strings.budgetPickCategory}
              >
                {state.selectedCategory ? (
                  <View className="flex-row items-center gap-1">
                    <View
                      className="h-7 w-7 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${state.selectedCategory.color}22` }}
                    >
                      <MaterialCommunityIcons
                        name={toIconName(state.selectedCategory.icon, 'tag-outline')}
                        size={ms(13)}
                        color={state.selectedCategory.color}
                      />
                    </View>
                    <Text
                      className="font-inter-semibold text-foreground"
                      style={{ fontSize: Type.caption }}
                    >
                      {state.selectedCategory.name}
                    </Text>
                  </View>
                ) : (
                  <Text
                    className="font-inter-semibold text-muted"
                    style={{ fontSize: Type.caption }}
                  >
                    {Strings.budgetPickCategory}
                  </Text>
                )}
                <Text className="font-inter text-muted" style={{ fontSize: Type.body }}>
                  {'›'}
                </Text>
              </PressableFeedback>
            )}

            <Text className="font-inter-medium text-muted mb-1 text-[11px]">
              {Strings.budgetNameLabel}
            </Text>
            <Controller
              control={control}
              name="nameText"
              render={({ field: { value, onChange }, fieldState }) => (
                <>
                  <View
                    className={cn(
                      'bg-background border-accent flex-row items-center rounded-md border px-3 py-1',
                      fieldState.error && 'border-danger',
                    )}
                  >
                    <Input
                      value={value}
                      onChangeText={(text) => {
                        clearError();
                        onChange(text);
                      }}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder={Strings.budgetNamePlaceholder}
                      placeholderColorClassName="text-muted"
                      className="h-7 min-h-0 flex-1 border-0 bg-transparent p-0"
                      style={{
                        flex: 1,
                        fontFamily: FontFamily.interSemi,
                        fontSize: Type.body,
                        color: Colors.dark.text1,
                        height: ms(28),
                        padding: 0,
                        includeFontPadding: false,
                        textAlignVertical: 'center',
                      }}
                      accessibilityLabel={Strings.budgetNameLabel}
                    />
                  </View>
                  {fieldState.error ? (
                    <Text className="font-inter text-danger mt-1 text-[11px]">
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </>
              )}
            />

            <Text className="font-inter-medium text-muted mt-3 mb-1 text-[11px]">
              {Strings.budgetMonthlyLimitLabel}
            </Text>
            <Controller
              control={control}
              name="limitText"
              render={({ field: { value, onChange }, fieldState }) => (
                <>
                  <View
                    className={cn(
                      'bg-background border-accent flex-row items-center rounded-md border px-3 py-1',
                      fieldState.error && 'border-danger',
                    )}
                  >
                    <Input
                      value={value}
                      onChangeText={(text) => {
                        // Mask before `clearError`: a refused keystroke must not wipe the error.
                        const masked = maskFieldText('amount', value, text);
                        if (masked === undefined) return;
                        clearError();
                        onChange(masked);
                      }}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      keyboardType="decimal-pad"
                      placeholder={Strings.zeroAmountPlaceholder}
                      placeholderColorClassName="text-muted"
                      className="h-7 min-h-0 flex-1 border-0 bg-transparent p-0"
                      style={{
                        flex: 1,
                        fontFamily: FontFamily.soraBold,
                        fontSize: Type.bodyStrong,
                        color: Colors.dark.text1,
                        height: ms(28),
                        padding: 0,
                        includeFontPadding: false,
                        textAlignVertical: 'center',
                      }}
                      accessibilityLabel={Strings.budgetMonthlyLimitLabel}
                    />
                    <Text
                      className="font-inter-semibold text-muted"
                      style={{ fontSize: Type.caption }}
                    >
                      {Strings.currencyEgp}
                    </Text>
                  </View>
                  {fieldState.error ? (
                    <Text className="font-inter text-danger mt-1 text-[11px]">
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </>
              )}
            />

            <Text className="font-inter-medium text-muted mt-4 mb-1 text-[11px]">
              {Strings.budget5030GroupPickerLabel}
            </Text>
            <RadioGroup
              value={state.groupValue ?? undefined}
              onValueChange={selectGroup}
              accessibilityLabel={Strings.budget5030GroupPickerLabel}
            >
              {GROUP_OPTIONS.map((option) => (
                <RadioGroup.Item key={option.value} value={option.value}>
                  {option.label}
                </RadioGroup.Item>
              ))}
            </RadioGroup>
            {state.errorMessage ? (
              <Text className="font-inter-medium text-danger mt-2 text-sm">
                {state.errorMessage}
              </Text>
            ) : null}
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
    </>
  );
}
