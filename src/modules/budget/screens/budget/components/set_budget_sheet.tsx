import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Input, PressableFeedback, RadioGroup } from 'heroui-native';
import React, { useEffect, useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { getDb } from '@/database/client';
import type { BudgetEditTargetVM } from '@/modules/budget/screens/budget/budget.hook';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { useSetBudgetSheetState } from '@/modules/budget/screens/budget/components/set_budget_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import { setCategoryGroup } from '@/modules/categories/database/categories';
import type { Category } from '@/modules/categories/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';
import { budgetFormSchema, parseLimit, type BudgetFormValues } from '@/utils/schemas/budget.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

export interface SetBudgetSheetProps {
  // expense categories without an active budget (add-mode picker source)
  budgetableCategories: Category[];
  // the row currently being edited (edit mode), or undefined in add mode
  editingRow?: BudgetEditTargetVM;
}

const GROUP_OPTIONS: { value: BudgetGroup; label: string }[] = [
  { value: BudgetGroup.Need, label: Strings.budget5030GroupNeed },
  { value: BudgetGroup.Want, label: Strings.budget5030GroupWant },
  { value: BudgetGroup.Savings, label: Strings.budget5030GroupSavings },
];

const BUDGET_GROUP_VALUES: readonly string[] = Object.values(BudgetGroup);
function isBudgetGroup(value: string): value is BudgetGroup {
  return BUDGET_GROUP_VALUES.includes(value);
}

export function SetBudgetSheet({ budgetableCategories, editingRow }: SetBudgetSheetProps) {
  const { sheetVisible, mode, selectedMonth } = useBudgetState(
    useShallow((s) => ({
      sheetVisible: s.sheetVisible,
      mode: s.mode,
      selectedMonth: s.selectedMonth,
    })),
  );
  const close = useBudgetState.getState().close;
  const setBudget = useBudgetStore.getState().setBudget;
  const { selectedCategoryId, pickerExpanded, groupValue } = useSetBudgetSheetState(
    useShallow((s) => ({
      selectedCategoryId: s.selectedCategoryId,
      pickerExpanded: s.pickerExpanded,
      groupValue: s.groupValue,
    })),
  );
  const initAddMode = useSetBudgetSheetState.getState().initAddMode;
  const setSelectedCategoryId = useSetBudgetSheetState.getState().setSelectedCategoryId;
  const setGroupValue = useSetBudgetSheetState.getState().setGroupValue;
  const togglePicker = useSetBudgetSheetState.getState().togglePicker;
  const collapsePicker = useSetBudgetSheetState.getState().collapsePicker;
  const reset = useSetBudgetSheetState.getState().reset;

  const isEdit = mode === 'edit';
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const {
    control,
    handleSubmit,
    reset: resetForm,
  } = useZodForm<BudgetFormValues>(budgetFormSchema, {
    defaultValues: { nameText: '', limitText: '' },
  });

  const addModeSelectedCategory = useMemo(
    () => budgetableCategories.find((c) => c.id === selectedCategoryId),
    [budgetableCategories, selectedCategoryId],
  );

  // Initialise / reset add-mode picker state and group whenever the sheet opens
  useEffect(() => {
    if (sheetVisible) {
      resetForm({
        nameText: isEdit && editingRow ? editingRow.name : '',
        limitText: isEdit && editingRow ? String(editingRow.limit) : '',
      });
      if (!isEdit) {
        initAddMode(budgetableCategories[0]?.id);
      }
    } else {
      reset();
    }
  }, [sheetVisible, isEdit, editingRow, resetForm, initAddMode, reset, budgetableCategories]);

  useEffect(() => {
    if (!sheetVisible) {
      setGroupValue(null);
      return;
    }
    setGroupValue(isEdit ? null : (addModeSelectedCategory?.budget_group ?? null));
  }, [sheetVisible, isEdit, addModeSelectedCategory, setGroupValue]);

  // Resolved category name for edit mode (locked display)
  const editingCategoryName = editingRow?.categoryName;

  const resolvedCategoryId = isEdit ? editingRow?.categoryId : selectedCategoryId;

  const onSubmit = handleSubmit(async (values) => {
    if (!resolvedCategoryId) return;
    await setBudget({
      id: isEdit ? editingRow?.id : undefined,
      categoryId: resolvedCategoryId,
      name: values.nameText,
      limit: parseLimit(values.limitText),
      yearMonth: selectedMonth,
    });
    if (!isEdit && groupValue !== null) {
      const db = await getDb();
      await setCategoryGroup(db, resolvedCategoryId, groupValue);
    }
    close();
  });

  return (
    <>
      <Sheet
        isOpen={sheetVisible}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={isEdit ? Strings.budgetEditTitle : Strings.budgetSetTitle}
        size="md"
        scrollable
        footer={
          <Button variant="primary" label={Strings.budgetSaveCta} onPress={() => void onSubmit()} />
        }
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bodyContent}
        >
          {/* category picker — tappable in add mode (opens the standard
                CategoryPickerSheet), locked in edit mode */}
          {isEdit ? (
            <View style={[styles.picker, styles.pickerLocked]}>
              <Text style={styles.pickerName}>
                {editingCategoryName ?? Strings.budgetPickCategory}
              </Text>
              {/* No chevron in edit mode — picker is locked */}
            </View>
          ) : (
            <PressableFeedback
              style={styles.picker}
              onPress={togglePicker}
              accessibilityRole="button"
              accessibilityLabel={Strings.budgetPickCategory}
            >
              {addModeSelectedCategory ? (
                <View style={styles.pickerContent}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: `${addModeSelectedCategory.color}22` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={toIconName(addModeSelectedCategory.icon, 'tag-outline')}
                      size={ms(13)}
                      color={addModeSelectedCategory.color}
                    />
                  </View>
                  <Text style={styles.pickerName}>{addModeSelectedCategory.name}</Text>
                </View>
              ) : (
                <Text style={[styles.pickerName, styles.pickerPlaceholder]}>
                  {Strings.budgetPickCategory}
                </Text>
              )}
              <Text style={styles.chev}>{'›'}</Text>
            </PressableFeedback>
          )}

          <Text style={styles.label}>{Strings.budgetNameLabel}</Text>
          <Controller
            control={control}
            name="nameText"
            render={({ field: { value, onChange }, fieldState }) => (
              <>
                <View style={[styles.field, fieldState.error && styles.fieldError]}>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={Strings.budgetNamePlaceholder}
                    placeholderColorClassName="text-muted"
                    className="h-7 min-h-0 flex-1 border-0 bg-transparent p-0"
                    style={styles.nameInput}
                    accessibilityLabel={Strings.budgetNameLabel}
                  />
                </View>
                {fieldState.error && (
                  <Text style={styles.errorText}>{fieldState.error.message}</Text>
                )}
              </>
            )}
          />

          <Text style={styles.label}>{Strings.budgetMonthlyLimitLabel}</Text>
          <Controller
            control={control}
            name="limitText"
            render={({ field: { value, onChange }, fieldState }) => (
              <>
                <View style={[styles.field, fieldState.error && styles.fieldError]}>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderColorClassName="text-muted"
                    className="h-7 min-h-0 flex-1 border-0 bg-transparent p-0"
                    style={styles.input}
                    accessibilityLabel={Strings.budgetMonthlyLimitLabel}
                  />
                  <Text style={styles.suffix}>EGP</Text>
                </View>
                {fieldState.error && (
                  <Text style={styles.errorText}>{fieldState.error.message}</Text>
                )}
              </>
            )}
          />

          {!isEdit && (
            <>
              <Text style={[styles.label, styles.groupLabel]}>
                {Strings.budget5030GroupPickerLabel}
              </Text>
              <RadioGroup
                value={groupValue ?? undefined}
                onValueChange={(val) => {
                  if (isBudgetGroup(val)) setGroupValue(val);
                }}
                accessibilityLabel={Strings.budget5030GroupPickerLabel}
              >
                {GROUP_OPTIONS.map((opt) => (
                  <RadioGroup.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </RadioGroup.Item>
                ))}
              </RadioGroup>
            </>
          )}
        </BottomSheetScrollView>
      </Sheet>

      {/* Standard category picker — same grid sheet used in the transaction
          form, so budget category selection matches the rest of the app.
          Stacks on top of the Set-budget sheet (depth 2). */}
      {!isEdit && (
        <CategoryPickerSheet
          isOpen={sheetVisible && pickerExpanded}
          title={Strings.budgetPickCategory}
          categories={budgetableCategories}
          selectedId={selectedCategoryId}
          onSelect={(cat) => setSelectedCategoryId(cat.id)}
          onOpenChange={collapsePicker}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: SHEET_FOOTER_CLEARANCE,
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
    marginBottom: Spacing.sm,
  },
  pickerLocked: { opacity: 0.7 },
  pickerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  pickerName: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  pickerPlaceholder: { color: Colors.dark.text2 },
  chev: { fontFamily: FontFamily.interRegular, fontSize: Type.body, color: Colors.dark.text2 },
  // matches the standard category icon (CategoryBudgetRow / detail header):
  // rounded square, tinted category-color background, icon in the category color
  categoryIcon: {
    width: ms(28),
    height: ms(28),
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginBottom: Spacing.xs,
  },
  groupLabel: { marginTop: Spacing.md },
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
  input: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text1,
    height: ms(28),
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
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
  suffix: { fontFamily: FontFamily.interSemi, fontSize: Type.caption, color: Colors.dark.text2 },
  errorText: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
    marginTop: Spacing.xs,
  },
});
