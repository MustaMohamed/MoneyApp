import { Button } from 'heroui-native';
import React, { useEffect, useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { CategoryBudgetRowVM } from '@/screens/budget/budget.hook';
import { useBudgetState } from '@/screens/budget/budget.state';
import { useBudgetStore } from '@/store/budget.store';
import { ms } from '@/utils/responsive';
import { budgetFormSchema, parseLimit, type BudgetFormValues } from '@/utils/schemas/budget.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

export interface SetBudgetSheetProps {
  // expense categories without an active budget (add mode picker source)
  budgetableCategories: { id: string; name: string }[];
  // the row currently being edited (edit mode), or undefined in add mode
  editingRow?: CategoryBudgetRowVM;
}

export function SetBudgetSheet({ budgetableCategories, editingRow }: SetBudgetSheetProps) {
  const { sheetState, close } = useBudgetState((s) => ({ sheetState: s.state, close: s.close }));
  const { setLimit, removeBudget } = useBudgetStore((s) => ({
    setLimit: s.setLimit,
    removeBudget: s.removeBudget,
  }));

  const isEdit = sheetState.mode === 'edit';
  const { control, handleSubmit, reset } = useZodForm<BudgetFormValues>(budgetFormSchema, {
    defaultValues: { limitText: '' },
  });

  // pick category: in edit mode it's locked to the editing row; in add mode default to first budgetable
  const selectedCategoryId = isEdit ? sheetState.targetCategoryId : budgetableCategories[0]?.id;
  const selectedCategory = useMemo(() => {
    if (isEdit)
      return editingRow ? { id: editingRow.categoryId, name: editingRow.name } : undefined;
    return budgetableCategories[0];
  }, [isEdit, editingRow, budgetableCategories]);

  useEffect(() => {
    if (sheetState.sheetVisible) {
      reset({ limitText: isEdit && editingRow ? String(editingRow.limit) : '' });
    }
  }, [sheetState.sheetVisible, isEdit, editingRow, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedCategoryId) return;
    await setLimit(selectedCategoryId, parseLimit(values.limitText));
    close();
  });

  const onRemove = async () => {
    if (selectedCategoryId) await removeBudget(selectedCategoryId);
    close();
  };

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
          {/* category picker — locked in edit */}
          <View style={[styles.picker, isEdit && styles.pickerLocked]}>
            <Text style={styles.pickerName}>
              {selectedCategory?.name ?? Strings.budgetPickCategory}
            </Text>
            {!isEdit && <Text style={styles.chev}>›</Text>}
          </View>

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
  pickerName: { fontFamily: FontFamily.interSemi, fontSize: Type.body, color: Colors.dark.text1 },
  chev: { fontFamily: FontFamily.interRegular, fontSize: Type.title, color: Colors.dark.text2 },
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
