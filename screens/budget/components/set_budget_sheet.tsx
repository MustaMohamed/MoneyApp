import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CategoryPickerSheet } from '@/components/sheets/category_picker_sheet';
import { Button } from '@/components/ui/button';
import { Sheet, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { Category } from '@/database/entities/category.entity';
import type { CategoryBudgetRowVM } from '@/screens/budget/budget.hook';
import { useBudgetState } from '@/screens/budget/budget.state';
import { useSetBudgetSheetState } from '@/screens/budget/components/set_budget_sheet.state';
import { useBudgetStore } from '@/store/budget.store';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';
import { budgetFormSchema, parseLimit, type BudgetFormValues } from '@/utils/schemas/budget.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

export interface SetBudgetSheetProps {
  // expense categories without an active budget (add-mode picker source)
  budgetableCategories: Category[];
  // the row currently being edited (edit mode), or undefined in add mode
  editingRow?: CategoryBudgetRowVM;
}

export function SetBudgetSheet({ budgetableCategories, editingRow }: SetBudgetSheetProps) {
  const { sheetState, close } = useBudgetState(
    useShallow((s) => ({ sheetState: s.state, close: s.close })),
  );
  const { setLimit } = useBudgetStore(useShallow((s) => ({ setLimit: s.setLimit })));

  const {
    pickerSheetState,
    initAddMode,
    setSelectedCategoryId,
    togglePicker,
    collapsePicker,
    reset,
  } = useSetBudgetSheetState(
    useShallow((s) => ({
      pickerSheetState: s.state,
      initAddMode: s.initAddMode,
      setSelectedCategoryId: s.setSelectedCategoryId,
      togglePicker: s.togglePicker,
      collapsePicker: s.collapsePicker,
      reset: s.reset,
    })),
  );

  const isEdit = sheetState.mode === 'edit';
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const {
    control,
    handleSubmit,
    reset: resetForm,
  } = useZodForm<BudgetFormValues>(budgetFormSchema, { defaultValues: { limitText: '' } });

  // Initialise / reset add-mode picker state whenever the sheet opens
  useEffect(() => {
    if (sheetState.sheetVisible) {
      resetForm({ limitText: isEdit && editingRow ? String(editingRow.limit) : '' });
      if (!isEdit) {
        initAddMode(budgetableCategories[0]?.id);
      }
    } else {
      reset();
    }
  }, [
    sheetState.sheetVisible,
    isEdit,
    editingRow,
    resetForm,
    initAddMode,
    reset,
    budgetableCategories,
  ]);

  // Resolved category name for edit mode (locked display)
  const editingCategoryName = editingRow?.name;

  // Resolved selected category for add mode (full object with icon/color)
  const addModeSelectedCategory = useMemo(
    () => budgetableCategories.find((c) => c.id === pickerSheetState.selectedCategoryId),
    [budgetableCategories, pickerSheetState.selectedCategoryId],
  );

  const selectedCategoryId = isEdit
    ? sheetState.targetCategoryId
    : pickerSheetState.selectedCategoryId;

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedCategoryId) return;
    await setLimit(selectedCategoryId, parseLimit(values.limitText));
    close();
  });

  return (
    <>
      <Sheet
        isOpen={sheetState.sheetVisible}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={isEdit ? Strings.budgetEditTitle : Strings.budgetSetTitle}
        size="sm"
        footer={
          <Button variant="primary" label={Strings.budgetSaveCta} onPress={() => void onSubmit()} />
        }
      >
        <View style={styles.body}>
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
            <Pressable
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
                      size={ms(15)}
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
            </Pressable>
          )}

          <Text style={styles.label}>{Strings.budgetMonthlyLimitLabel}</Text>
          <Controller
            control={control}
            name="limitText"
            render={({ field: { value, onChange }, fieldState }) => (
              <>
                <View style={[styles.field, fieldState.error && styles.fieldError]}>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.dark.text3}
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
        </View>
      </Sheet>

      {/* Standard category picker — same grid sheet used in the transaction
          form, so budget category selection matches the rest of the app.
          Stacks on top of the Set-budget sheet (depth 2). */}
      {!isEdit && (
        <CategoryPickerSheet
          isOpen={sheetState.sheetVisible && pickerSheetState.pickerExpanded}
          title={Strings.budgetPickCategory}
          categories={budgetableCategories}
          selectedId={pickerSheetState.selectedCategoryId}
          onSelect={(cat) => setSelectedCategoryId(cat.id)}
          onOpenChange={collapsePicker}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pickerLocked: { opacity: 0.7 },
  pickerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  pickerName: { fontFamily: FontFamily.interSemi, fontSize: Type.body, color: Colors.dark.text1 },
  pickerPlaceholder: { color: Colors.dark.text2 },
  chev: { fontFamily: FontFamily.interRegular, fontSize: Type.title, color: Colors.dark.text2 },
  // matches the standard category icon (CategoryBudgetRow / detail header):
  // rounded square, tinted category-color background, icon in the category color
  categoryIcon: {
    width: ms(32),
    height: ms(32),
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bg,
    borderWidth: ms(1.5),
    borderColor: Colors.dark.gold,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  fieldError: { borderColor: Colors.dark.negative },
  input: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: Colors.dark.text1,
    padding: 0,
  },
  suffix: { fontFamily: FontFamily.interSemi, fontSize: Type.body, color: Colors.dark.text2 },
  errorText: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
    marginTop: Spacing.xs,
  },
});
