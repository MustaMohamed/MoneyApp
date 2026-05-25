import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Button } from 'heroui-native';
import React, { useEffect, useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { CategoryBudgetRowVM } from '@/screens/budget/budget.hook';
import { useBudgetState } from '@/screens/budget/budget.state';
import { useSetBudgetSheetState } from '@/screens/budget/components/set_budget_sheet.state';
import { useBudgetStore } from '@/store/budget.store';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';
import { budgetFormSchema, parseLimit, type BudgetFormValues } from '@/utils/schemas/budget.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

export interface BudgetableCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface SetBudgetSheetProps {
  // expense categories without an active budget (add mode picker source)
  budgetableCategories: BudgetableCategory[];
  // the row currently being edited (edit mode), or undefined in add mode
  editingRow?: CategoryBudgetRowVM;
}

export function SetBudgetSheet({ budgetableCategories, editingRow }: SetBudgetSheetProps) {
  // FIX #3: wrap object selectors with useShallow
  const { sheetState, close } = useBudgetState(
    useShallow((s) => ({ sheetState: s.state, close: s.close })),
  );
  const { setLimit, removeBudget } = useBudgetStore(
    useShallow((s) => ({ setLimit: s.setLimit, removeBudget: s.removeBudget })),
  );

  const { pickerSheetState, initAddMode, setSelectedCategoryId, togglePicker, reset } =
    useSetBudgetSheetState(
      useShallow((s) => ({
        pickerSheetState: s.state,
        initAddMode: s.initAddMode,
        setSelectedCategoryId: s.setSelectedCategoryId,
        togglePicker: s.togglePicker,
        reset: s.reset,
      })),
    );

  const isEdit = sheetState.mode === 'edit';

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

  const onRemove = async () => {
    if (selectedCategoryId) await removeBudget(selectedCategoryId);
    close();
  };

  const renderCategoryItem = ({ item }: { item: BudgetableCategory }) => (
    <Pressable
      style={[
        styles.categoryItem,
        item.id === pickerSheetState.selectedCategoryId && styles.categoryItemSelected,
      ]}
      onPress={() => setSelectedCategoryId(item.id)}
      accessibilityRole="radio"
      accessibilityState={{ selected: item.id === pickerSheetState.selectedCategoryId }}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
        <MaterialCommunityIcons
          name={toIconName(item.icon, 'tag-outline')}
          size={ms(16)}
          color={Colors.dark.text1}
        />
      </View>
      <Text style={styles.categoryItemName}>{item.name}</Text>
      {item.id === pickerSheetState.selectedCategoryId && (
        <MaterialCommunityIcons name="check" size={ms(18)} color={Colors.dark.gold} />
      )}
    </Pressable>
  );

  return (
    <Sheet
      visible={sheetState.sheetVisible}
      onClose={close}
      title={isEdit ? Strings.budgetEditTitle : Strings.budgetSetTitle}
      size="sm"
      footer={
        <Button
          onPress={() => {
            void onSubmit();
          }}
        >
          <Button.Label>{Strings.budgetSaveCta}</Button.Label>
        </Button>
      }
    >
      <Sheet.Body>
        <View style={styles.body}>
          {/* category picker — tappable in add mode, locked in edit mode */}
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
                      { backgroundColor: addModeSelectedCategory.color },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={toIconName(addModeSelectedCategory.icon, 'tag-outline')}
                      size={ms(16)}
                      color={Colors.dark.text1}
                    />
                  </View>
                  <Text style={styles.pickerName}>{addModeSelectedCategory.name}</Text>
                </View>
              ) : (
                <Text style={[styles.pickerName, styles.pickerPlaceholder]}>
                  {Strings.budgetPickCategory}
                </Text>
              )}
              <Text style={styles.chev}>{pickerSheetState.pickerExpanded ? '˄' : '›'}</Text>
            </Pressable>
          )}

          {/* In-sheet expandable category list — add mode only */}
          {!isEdit && pickerSheetState.pickerExpanded && (
            <View style={styles.categoryListContainer}>
              <BottomSheetFlatList
                data={budgetableCategories}
                keyExtractor={(item) => item.id}
                renderItem={renderCategoryItem}
                style={styles.categoryList}
                contentContainerStyle={styles.categoryListContent}
              />
            </View>
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

          {isEdit && (
            <Pressable
              onPress={() => {
                void onRemove();
              }}
              style={styles.remove}
              accessibilityRole="button"
            >
              <Text style={styles.removeText}>{Strings.budgetRemoveCta}</Text>
            </Pressable>
          )}
        </View>
      </Sheet.Body>
    </Sheet>
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
  categoryListContainer: {
    maxHeight: ms(200),
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  categoryList: { flex: 1 },
  categoryListContent: { paddingVertical: Spacing.xs },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  categoryItemSelected: { backgroundColor: Colors.dark.overlayWhite7 },
  categoryItemName: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  categoryIcon: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
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
  remove: { alignSelf: 'center', marginTop: Spacing.md, paddingVertical: Spacing.xs },
  removeText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.negative,
  },
});
