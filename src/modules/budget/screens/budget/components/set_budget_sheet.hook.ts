import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { BudgetEditTargetVM } from '@/modules/budget/screens/budget/budget.hook';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import type { Category } from '@/modules/categories/entities/category.entity';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { formatStoredMoneyText, parseRequiredMoneyText } from '@/utils/money_text';
import { budgetFormSchema, type BudgetFormValues } from '@/utils/schemas/budget.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useSetBudgetSheetState } from './set_budget_sheet.state';

export function useSetBudgetSheetSave() {
  const runSave = useCallback(async (operation: () => Promise<void>): Promise<boolean> => {
    const state = useSetBudgetSheetState.getState();
    if (state.saving) return false;

    state.setSaving(true);
    state.setErrorMessage(undefined);
    try {
      await operation();
      return true;
    } catch {
      useSetBudgetSheetState.getState().setErrorMessage(Strings.budgetSaveError);
      return false;
    } finally {
      useSetBudgetSheetState.getState().setSaving(false);
    }
  }, []);

  return { runSave };
}

export interface SetBudgetSheetOptions {
  budgetableCategories: Category[];
  editingRow?: BudgetEditTargetVM;
}

const BUDGET_GROUP_VALUES: readonly string[] = Object.values(BudgetGroup);

function isBudgetGroup(value: string): value is BudgetGroup {
  return BUDGET_GROUP_VALUES.includes(value);
}

export function useSetBudgetSheet({ budgetableCategories, editingRow }: SetBudgetSheetOptions) {
  const { sheetVisible, mode, selectedMonth, addCategoryId, addBudgetGroup } = useBudgetState(
    useShallow((state) => ({
      sheetVisible: state.sheetVisible,
      mode: state.mode,
      selectedMonth: state.selectedMonth,
      addCategoryId: state.addCategoryId,
      addBudgetGroup: state.addBudgetGroup,
    })),
  );
  const { selectedCategoryId, pickerExpanded, groupValue, saving, errorMessage } =
    useSetBudgetSheetState(
      useShallow((state) => ({
        selectedCategoryId: state.selectedCategoryId,
        pickerExpanded: state.pickerExpanded,
        groupValue: state.groupValue,
        saving: state.saving,
        errorMessage: state.errorMessage,
      })),
    );
  const close = useBudgetState.getState().close;
  const setBudget = useBudgetStore.getState().setBudget;
  const loadCategories = useCategoryStore.getState().loadCategories;
  const initAddMode = useSetBudgetSheetState.getState().initAddMode;
  const initEditMode = useSetBudgetSheetState.getState().initEditMode;
  const setSelectedCategoryId = useSetBudgetSheetState.getState().setSelectedCategoryId;
  const setGroupValue = useSetBudgetSheetState.getState().setGroupValue;
  const togglePicker = useSetBudgetSheetState.getState().togglePicker;
  const collapsePicker = useSetBudgetSheetState.getState().collapsePicker;
  const clearError = useSetBudgetSheetState.getState().clearError;
  const resetState = useSetBudgetSheetState.getState().reset;
  const { runSave } = useSetBudgetSheetSave();
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const isEdit = mode === 'edit';

  const {
    control,
    handleSubmit,
    reset: resetForm,
  } = useZodForm<BudgetFormValues>(budgetFormSchema, {
    defaultValues: { nameText: '', limitText: '' },
  });

  const selectedCategory = useMemo(
    () => budgetableCategories.find((category) => category.id === selectedCategoryId),
    [budgetableCategories, selectedCategoryId],
  );
  const sessionKey = `${mode}:${editingRow?.id ?? addCategoryId ?? 'new'}:${addBudgetGroup ?? 'ungrouped'}:${selectedMonth}`;

  useEffect(() => {
    if (!sheetVisible) {
      resetState();
      return;
    }

    let initialized: boolean;
    if (isEdit) {
      initialized = initEditMode(editingRow?.categoryGroup ?? null, sessionKey);
    } else {
      const contextualCategory = budgetableCategories.find(
        (category) => category.id === addCategoryId,
      );
      const initialCategory =
        contextualCategory ?? (addBudgetGroup === undefined ? budgetableCategories[0] : undefined);
      initialized = initAddMode(
        initialCategory?.id,
        addBudgetGroup ?? initialCategory?.budget_group ?? null,
        sessionKey,
      );
    }

    if (!initialized) return;
    resetForm({
      nameText: isEdit && editingRow ? editingRow.name : '',
      // Not `String(editingRow.limit)`: a limit whose `String()` is exponent
      // form fills the field with text `DECIMAL_PATTERN` rejects, so the sheet
      // opens on a value it will not let the user save back.
      // `budgets.limit_amount` is a bare `REAL NOT NULL` with no CHECK at all
      // (migrations/013:8), so unlike the plan tables nothing in the schema
      // bounds it -- only the form's own `parsePositiveDecimal`, which every
      // non-form writer bypasses. The name field above keeps `editingRow.name`
      // raw: it is not a money field and needs no expansion.
      limitText: isEdit && editingRow ? formatStoredMoneyText(editingRow.limit) : '',
    });
  }, [
    addBudgetGroup,
    addCategoryId,
    budgetableCategories,
    editingRow,
    initAddMode,
    initEditMode,
    isEdit,
    resetForm,
    resetState,
    sessionKey,
    sheetVisible,
  ]);

  const resolvedCategoryId = isEdit ? editingRow?.categoryId : selectedCategoryId;
  const submit = handleSubmit(async (values) => {
    if (!resolvedCategoryId) return;
    const saved = await runSave(async () => {
      await setBudget({
        id: isEdit ? editingRow?.id : undefined,
        categoryId: resolvedCategoryId,
        name: values.nameText,
        limit: parseRequiredMoneyText(values.limitText, 'limitText'),
        yearMonth: selectedMonth,
        categoryGroup: groupValue ?? undefined,
      });
      await loadCategories().catch(() => undefined);
    });
    if (saved) close();
  });

  const selectCategory = useCallback(
    (category: Category) => {
      setSelectedCategoryId(category.id);
      if (addBudgetGroup === undefined) setGroupValue(category.budget_group ?? null);
    },
    [addBudgetGroup, setGroupValue, setSelectedCategoryId],
  );

  const selectGroup = useCallback(
    (value: string) => {
      if (isBudgetGroup(value)) setGroupValue(value);
    },
    [setGroupValue],
  );

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !saving) close();
    },
    [close, saving],
  );

  return {
    state: {
      sheetVisible,
      isEdit,
      selectedCategory,
      selectedCategoryId,
      pickerExpanded,
      groupValue,
      saving,
      errorMessage,
      editingCategoryName: editingRow?.categoryName,
    },
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
  };
}
