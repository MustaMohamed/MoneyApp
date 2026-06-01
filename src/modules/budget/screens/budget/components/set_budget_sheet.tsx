import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Input, PressableFeedback, RadioGroup } from 'heroui-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { getDb } from '@/database/client';
import type { CategoryBudgetRowVM } from '@/modules/budget/screens/budget/budget.hook';
import type { BudgetStateSetup } from '@/modules/budget/screens/budget/budget.state';
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
  budgetState: BudgetStateSetup;
  // expense categories without an active budget (add-mode picker source)
  budgetableCategories: Category[];
  // the row currently being edited (edit mode), or undefined in add mode
  editingRow?: CategoryBudgetRowVM;
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

export function SetBudgetSheet({
  budgetState,
  budgetableCategories,
  editingRow,
}: SetBudgetSheetProps) {
  const sheetVisible = budgetState.state.sheetVisible.value;
  const mode = budgetState.state.mode.value;
  const targetCategoryId = budgetState.state.targetCategoryId.value;
  const { close } = budgetState;
  const { setLimit } = useBudgetStore();
  const {
    state: setBudgetSheetState,
    initAddMode,
    setSelectedCategoryId,
    togglePicker,
    collapsePicker,
    reset,
  } = useSetBudgetSheetState();
  const selectedCategoryId = setBudgetSheetState.selectedCategoryId.value;
  const pickerExpanded = setBudgetSheetState.pickerExpanded.value;

  const isEdit = mode === 'edit';
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const {
    control,
    handleSubmit,
    reset: resetForm,
  } = useZodForm<BudgetFormValues>(budgetFormSchema, { defaultValues: { limitText: '' } });

  const [groupValue, setGroupValue] = useState<BudgetGroup | null>(null);

  const addModeSelectedCategory = useMemo(
    () => budgetableCategories.find((c) => c.id === selectedCategoryId),
    [budgetableCategories, selectedCategoryId],
  );

  // Initialise / reset add-mode picker state and group whenever the sheet opens
  useEffect(() => {
    if (sheetVisible) {
      resetForm({ limitText: isEdit && editingRow ? String(editingRow.limit) : '' });
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
  }, [sheetVisible, isEdit, addModeSelectedCategory]);

  // Resolved category name for edit mode (locked display)
  const editingCategoryName = editingRow?.name;

  const resolvedCategoryId = isEdit ? targetCategoryId : selectedCategoryId;

  const onSubmit = handleSubmit(async (values) => {
    if (!resolvedCategoryId) return;
    await setLimit(resolvedCategoryId, parseLimit(values.limitText));
    if (groupValue !== null) {
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
            </PressableFeedback>
          )}

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
                    placeholderColorClassName="text-[#888]"
                    className="flex-1 border-0 bg-transparent p-0"
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
  groupLabel: { marginTop: Spacing.md },
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
