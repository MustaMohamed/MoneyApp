import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Input, PressableFeedback, Switch } from 'heroui-native';
import React, { useEffect, useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { Platform, StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { useSpendingPlanSheetState } from '@/modules/budget/screens/budget/components/spending_plan_sheet.state';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { computeAllocationHelper } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import type { Category } from '@/modules/categories/entities/category.entity';
import { formatAmount } from '@/utils/format_amount';
import { formatShortDate, toLocalDateString } from '@/utils/format_date';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';
import {
  parseLimit,
  spendingPlanFormSchema,
  type SpendingPlanFormValues,
} from '@/utils/schemas/budget.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

export interface SpendingPlanSheetProps {
  budgetableCategories: Category[];
  editingPlan?: SpendingPlanRowVM;
}

function parseOptionalAmount(text: string): number | undefined {
  if (text.trim().length === 0) return undefined;
  const parsed = parseLimit(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function SpendingPlanSheet({ budgetableCategories, editingPlan }: SpendingPlanSheetProps) {
  const { planSheetVisible, planSheetMode, selectedMonth } = useBudgetState(
    useShallow((s) => ({
      planSheetVisible: s.planSheetVisible,
      planSheetMode: s.planSheetMode,
      selectedMonth: s.selectedMonth,
    })),
  );
  const closePlan = useBudgetState.getState().closePlan;
  const setSpendingPlan = useBudgetStore.getState().setSpendingPlan;
  const {
    startDate,
    endDate,
    selectedCategoryIds,
    allocations,
    allocateByCategory,
    pickerExpanded,
    datePickerTarget,
  } = useSpendingPlanSheetState(
    useShallow((s) => ({
      startDate: s.startDate,
      endDate: s.endDate,
      selectedCategoryIds: s.selectedCategoryIds,
      allocations: s.allocations,
      allocateByCategory: s.allocateByCategory,
      pickerExpanded: s.pickerExpanded,
      datePickerTarget: s.datePickerTarget,
    })),
  );
  const initAddMode = useSpendingPlanSheetState.getState().initAddMode;
  const initEditMode = useSpendingPlanSheetState.getState().initEditMode;
  const setStartDate = useSpendingPlanSheetState.getState().setStartDate;
  const setEndDate = useSpendingPlanSheetState.getState().setEndDate;
  const toggleCategoryId = useSpendingPlanSheetState.getState().toggleCategoryId;
  const setAllocation = useSpendingPlanSheetState.getState().setAllocation;
  const setAllocateByCategory = useSpendingPlanSheetState.getState().setAllocateByCategory;
  const openPicker = useSpendingPlanSheetState.getState().openPicker;
  const closePicker = useSpendingPlanSheetState.getState().closePicker;
  const openDatePicker = useSpendingPlanSheetState.getState().openDatePicker;
  const closeDatePicker = useSpendingPlanSheetState.getState().closeDatePicker;
  const resetSheetState = useSpendingPlanSheetState.getState().reset;
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const {
    control,
    handleSubmit,
    reset: resetForm,
    watch,
  } = useZodForm<SpendingPlanFormValues>(spendingPlanFormSchema, {
    defaultValues: { nameText: '', totalText: '' },
  });

  const selectedCategories = useMemo(
    () => budgetableCategories.filter((category) => selectedCategoryIds.includes(category.id)),
    [budgetableCategories, selectedCategoryIds],
  );
  const totalText = watch('totalText');
  const totalAmount = parseLimit(totalText || '0');
  const allocationHelper = computeAllocationHelper(
    Number.isFinite(totalAmount) ? totalAmount : 0,
    allocateByCategory ? allocations : {},
  );

  useEffect(() => {
    if (!planSheetVisible) {
      resetSheetState();
      return;
    }

    if (planSheetMode === 'edit' && editingPlan) {
      resetForm({
        nameText: editingPlan.name,
        totalText: String(editingPlan.totalAmount),
      });
      initEditMode({
        startDate: editingPlan.startDate,
        endDate: editingPlan.endDate,
        categoryIds: editingPlan.categoryChips.map((category) => category.id),
        allocations: Object.fromEntries(
          editingPlan.allocationRows.map((row) => [row.categoryId, row.allocatedAmount]),
        ),
      });
      return;
    }

    resetForm({ nameText: '', totalText: '' });
    initAddMode({ month: selectedMonth, firstCategoryId: budgetableCategories[0]?.id });
  }, [
    budgetableCategories,
    editingPlan,
    initAddMode,
    initEditMode,
    planSheetMode,
    planSheetVisible,
    resetForm,
    resetSheetState,
    selectedMonth,
  ]);

  const onSubmit = handleSubmit(async (values) => {
    if (selectedCategoryIds.length === 0) return;
    if (endDate < startDate) return;
    if (allocationHelper.isOver) return;

    await setSpendingPlan({
      id: planSheetMode === 'edit' ? editingPlan?.id : undefined,
      name: values.nameText,
      startDate,
      endDate,
      totalAmount: parseLimit(values.totalText),
      categories: selectedCategoryIds.map((categoryId) => ({
        categoryId,
        allocatedAmount: allocateByCategory ? allocations[categoryId] : undefined,
      })),
    });
    closePlan();
  });

  const title = planSheetMode === 'edit' ? Strings.budgetPlanEditTitle : Strings.budgetPlanSetTitle;
  const pickerDate =
    datePickerTarget === 'end'
      ? endDate || `${selectedMonth}-01`
      : startDate || `${selectedMonth}-01`;
  const pickerValue = new Date(`${pickerDate}T12:00:00`);
  const onDateChange = (target: 'start' | 'end', event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'set' && date) {
      const next = toLocalDateString(date);
      if (target === 'start') setStartDate(next);
      if (target === 'end') setEndDate(next);
    }
    closeDatePicker();
  };

  return (
    <>
      <Sheet
        isOpen={planSheetVisible}
        onOpenChange={(open) => {
          if (!open) closePlan();
        }}
        title={title}
        size="lg"
        scrollable
        footer={
          <Button
            variant="primary"
            label={Strings.budgetPlanSave}
            onPress={() => void onSubmit()}
          />
        }
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bodyContent}
        >
          <Text style={styles.label}>{Strings.budgetPlanNameLabel}</Text>
          <Controller
            control={control}
            name="nameText"
            render={({ field: { value, onChange }, fieldState }) => (
              <>
                <View style={[styles.field, fieldState.error && styles.fieldError]}>
                  <Input
                    testID="spending-plan-name-input"
                    value={value}
                    onChangeText={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={Strings.budgetPlanNamePlaceholder}
                    placeholderColorClassName="text-muted"
                    className="h-7 min-h-0 flex-1 border-0 bg-transparent p-0"
                    style={styles.nameInput}
                    accessibilityLabel={Strings.budgetPlanNameLabel}
                  />
                </View>
                {fieldState.error && (
                  <Text style={styles.errorText}>{fieldState.error.message}</Text>
                )}
              </>
            )}
          />

          <Text style={styles.label}>{Strings.budgetPlanAmountLabel}</Text>
          <Controller
            control={control}
            name="totalText"
            render={({ field: { value, onChange }, fieldState }) => (
              <>
                <View style={[styles.field, fieldState.error && styles.fieldError]}>
                  <Input
                    testID="spending-plan-total-input"
                    value={value}
                    onChangeText={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderColorClassName="text-muted"
                    className="h-7 min-h-0 flex-1 border-0 bg-transparent p-0"
                    style={styles.amountInput}
                    accessibilityLabel={Strings.budgetPlanAmountLabel}
                  />
                  <Text style={styles.suffix}>EGP</Text>
                </View>
                {fieldState.error && (
                  <Text style={styles.errorText}>{fieldState.error.message}</Text>
                )}
              </>
            )}
          />

          <View style={styles.dateRow}>
            <PressableFeedback
              accessibilityRole="button"
              accessibilityLabel={Strings.budgetPlanStartDate}
              onPress={() => openDatePicker('start')}
              style={styles.dateBox}
            >
              <Text style={styles.dateLabel}>{Strings.budgetPlanStartDate}</Text>
              <Text style={styles.dateValue}>{startDate ? formatShortDate(startDate) : '-'}</Text>
            </PressableFeedback>
            <PressableFeedback
              accessibilityRole="button"
              accessibilityLabel={Strings.budgetPlanEndDate}
              onPress={() => openDatePicker('end')}
              style={styles.dateBox}
            >
              <Text style={styles.dateLabel}>{Strings.budgetPlanEndDate}</Text>
              <Text style={styles.dateValue}>{endDate ? formatShortDate(endDate) : '-'}</Text>
            </PressableFeedback>
          </View>

          {datePickerTarget ? (
            <DateTimePicker
              testID={`spending-plan-date-picker-${datePickerTarget}`}
              value={pickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="dark"
              onChange={(event, date) => onDateChange(datePickerTarget, event, date)}
            />
          ) : null}

          <Text style={styles.label}>{Strings.budgetPlanCategories}</Text>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={Strings.budgetPlanPickCategories}
            style={styles.picker}
            onPress={openPicker}
          >
            <View style={styles.pickerContent}>
              {selectedCategories.slice(0, 3).map((category) => (
                <View key={category.id} style={styles.categoryChip}>
                  <MaterialCommunityIcons
                    name={toIconName(category.icon, 'tag')}
                    size={ms(12)}
                    color={category.color}
                  />
                  <Text style={styles.categoryChipText}>{category.name}</Text>
                </View>
              ))}
              {selectedCategories.length === 0 ? (
                <Text style={styles.pickerPlaceholder}>{Strings.budgetPlanPickCategories}</Text>
              ) : null}
            </View>
            <Text style={styles.chev}>{'›'}</Text>
          </PressableFeedback>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{Strings.budgetPlanAllocateByCategory}</Text>
            <Switch
              isSelected={allocateByCategory}
              onSelectedChange={setAllocateByCategory}
              accessibilityLabel={Strings.budgetPlanAllocateByCategory}
            />
          </View>

          {allocateByCategory ? (
            <View style={styles.allocations}>
              <Text style={styles.helperText}>
                {Strings.budgetPlanAllocationHelper(
                  formatAmount(allocationHelper.allocated),
                  formatAmount(Number.isFinite(totalAmount) ? totalAmount : 0),
                  formatAmount(Math.max(0, allocationHelper.buffer)),
                )}
              </Text>
              {allocationHelper.isOver ? (
                <Text style={styles.errorText}>{Strings.budgetPlanAllocationOver}</Text>
              ) : null}
              {selectedCategories.map((category) => (
                <View key={category.id} style={styles.allocationRow}>
                  <Text style={styles.allocationName}>{category.name}</Text>
                  <View style={styles.allocationField}>
                    <Input
                      testID={`spending-plan-allocation-${category.id}`}
                      value={
                        allocations[category.id] === undefined
                          ? ''
                          : String(allocations[category.id])
                      }
                      onChangeText={(text) => setAllocation(category.id, parseOptionalAmount(text))}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderColorClassName="text-muted"
                      className="h-7 min-h-0 flex-1 border-0 bg-transparent p-0"
                      style={styles.allocationInput}
                      accessibilityLabel={`${Strings.budgetPlanAllocateByCategory} ${category.name}`}
                    />
                    <Text style={styles.suffix}>EGP</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </BottomSheetScrollView>
      </Sheet>

      <CategoryPickerSheet
        isOpen={planSheetVisible && pickerExpanded}
        title={Strings.budgetPlanPickCategories}
        categories={budgetableCategories}
        selectedId={selectedCategoryIds[0]}
        onSelect={(category) => toggleCategoryId(category.id)}
        onOpenChange={(open) => {
          if (!open) closePicker();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: SHEET_FOOTER_CLEARANCE,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bg,
    borderWidth: ms(1),
    borderColor: Colors.dark.gold,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  fieldError: { borderColor: Colors.dark.negative },
  nameInput: {
    flex: 1,
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    height: ms(28),
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text1,
    height: ms(28),
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  suffix: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  dateBox: {
    flex: 1,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    padding: Spacing.sm,
  },
  dateLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  dateValue: {
    marginTop: ms(4),
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  pickerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    flexWrap: 'wrap',
  },
  pickerPlaceholder: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.bg,
    paddingHorizontal: Spacing.xs,
    paddingVertical: ms(4),
  },
  categoryChipText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
  chev: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  switchLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  allocations: {
    gap: Spacing.xs,
  },
  helperText: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  allocationName: {
    flex: 1,
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  allocationField: {
    minWidth: ms(120),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bg,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  allocationInput: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.caption,
    color: Colors.dark.text1,
    height: ms(28),
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  errorText: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
    marginTop: Spacing.xs,
  },
});
