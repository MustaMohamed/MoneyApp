import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useToast } from '@/components/ui/toast';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { BudgetMonthGroupMap } from '@/modules/budget/entities/budget.entity';
import { BudgetNameTakenError } from '@/modules/budget/repositories/budget.repository';
import type { BudgetEditTargetVM } from '@/modules/budget/screens/budget/budget.hook';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import type { Category } from '@/modules/categories/entities/category.entity';
import { formatMonthYear } from '@/utils/format_date';
import { formatStoredMoneyText, parseRequiredMoneyText } from '@/utils/money_text';
import { budgetFormSchema, type BudgetFormValues } from '@/utils/schemas/budget.schema';
import { setTypedDecimal, useZodForm } from '@/utils/use_zod_form.hook';
import { fullMonthName } from '@/utils/year_month';

import { resolveSetBudgetFooterMessage, type SetBudgetFaults } from './set_budget_sheet.helpers';
import { useSetBudgetSheetState } from './set_budget_sheet.state';

export function useSetBudgetSheetSave() {
  const runSave = useCallback(
    async (
      operation: () => Promise<void>,
      refusalMessage?: (error: unknown) => string | undefined,
    ): Promise<boolean> => {
      const state = useSetBudgetSheetState.getState();
      if (state.saving) return false;

      state.setSaving(true);
      state.setErrorMessage(undefined);
      try {
        await operation();
        return true;
      } catch (error) {
        const refused = refusalMessage?.(error);
        useSetBudgetSheetState
          .getState()
          .setErrorMessage(refused ?? Strings.budgetSaveError, refused !== undefined);
        return false;
      } finally {
        useSetBudgetSheetState.getState().setSaving(false);
      }
    },
    [],
  );

  return { runSave };
}

export interface SetBudgetSheetOptions {
  owner: string;
  budgetableCategories: Category[];
  editingRow?: BudgetEditTargetVM;
  shownGroupByCategoryId: BudgetMonthGroupMap;
}

const BUDGET_GROUP_VALUES: readonly string[] = Object.values(BudgetGroup);

function isBudgetGroup(value: string): value is BudgetGroup {
  return BUDGET_GROUP_VALUES.includes(value);
}

export function useSetBudgetSheet({
  owner,
  budgetableCategories,
  editingRow,
  shownGroupByCategoryId,
}: SetBudgetSheetOptions) {
  const { sheetVisible, mode, selectedMonth, addCategoryId, addBudgetGroup } = useBudgetState(
    useShallow((state) => ({
      sheetVisible: state.sheetVisible,
      mode: state.mode,
      selectedMonth: state.selectedMonth,
      addCategoryId: state.addCategoryId,
      addBudgetGroup: state.addBudgetGroup,
    })),
  );
  const {
    openOwner,
    selectedCategoryId,
    pickerExpanded,
    groupValue,
    saving,
    errorMessage,
    nameTaken,
  } = useSetBudgetSheetState(
    useShallow((state) => ({
      openOwner: state.openOwner,
      selectedCategoryId: state.selectedCategoryId,
      pickerExpanded: state.pickerExpanded,
      groupValue: state.groupValue,
      saving: state.saving,
      errorMessage: state.errorMessage,
      nameTaken: state.nameTaken,
    })),
  );
  const open = sheetVisible && openOwner === owner;
  const close = useBudgetState.getState().close;
  const setBudget = useBudgetStore.getState().setBudget;
  const initAddMode = useSetBudgetSheetState.getState().initAddMode;
  const initEditMode = useSetBudgetSheetState.getState().initEditMode;
  const setSelectedCategoryId = useSetBudgetSheetState.getState().setSelectedCategoryId;
  const setGroupValue = useSetBudgetSheetState.getState().setGroupValue;
  const togglePicker = useSetBudgetSheetState.getState().togglePicker;
  const collapsePicker = useSetBudgetSheetState.getState().collapsePicker;
  const clearError = useSetBudgetSheetState.getState().clearError;
  const releaseState = useSetBudgetSheetState.getState().release;
  const markSaved = useSetBudgetSheetState.getState().markSaved;
  const completeClose = useSetBudgetSheetState.getState().completeClose;
  const setErrorMessage = useSetBudgetSheetState.getState().setErrorMessage;
  const { toast } = useToast();
  const { runSave } = useSetBudgetSheetSave();
  const isEdit = mode === 'edit';

  const {
    clearErrors,
    control,
    formState,
    getValues,
    handleSubmit,
    reset: resetForm,
    setValue,
    trigger,
  } = useZodForm<BudgetFormValues>(budgetFormSchema, {
    defaultValues: { nameText: '', limitText: '' },
  });
  // Read during render: `formState` is a proxy and only refreshes keys read while rendering.
  const isSubmitted = formState.isSubmitted;
  const errors = formState.errors;

  const selectedCategory = useMemo(
    () => budgetableCategories.find((category) => category.id === selectedCategoryId),
    [budgetableCategories, selectedCategoryId],
  );
  const sessionKey = `${owner}:${mode}:${editingRow?.id ?? addCategoryId ?? 'new'}:${addBudgetGroup ?? 'ungrouped'}:${selectedMonth}`;

  useEffect(() => {
    if (!open) {
      releaseState(owner);
      return;
    }

    let initialized: boolean;
    if (isEdit) {
      initialized = initEditMode(owner, editingRow?.categoryGroup ?? null, sessionKey);
    } else {
      const contextualCategory = budgetableCategories.find(
        (category) => category.id === addCategoryId,
      );
      const initialCategory =
        contextualCategory ?? (addBudgetGroup === undefined ? budgetableCategories[0] : undefined);
      initialized = initAddMode(
        owner,
        initialCategory?.id,
        addBudgetGroup ??
          (initialCategory ? shownGroupByCategoryId[initialCategory.id] : undefined) ??
          null,
        sessionKey,
      );
    }

    if (!initialized) return;
    resetForm({
      nameText: isEdit && editingRow ? editingRow.name : '',
      // Not `String(limit)`: exponent form fills the field with text `DECIMAL_PATTERN` rejects.
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
    open,
    owner,
    releaseState,
    resetForm,
    sessionKey,
    shownGroupByCategoryId,
  ]);

  const resolvedCategoryId = isEdit ? editingRow?.categoryId : selectedCategoryId;
  const resolvedCategoryName = isEdit ? editingRow?.categoryName : selectedCategory?.name;
  const onValid = async (values: BudgetFormValues) => {
    if (!resolvedCategoryId) return;
    const monthName = fullMonthName(selectedMonth);
    const nameTakenMessage = (error: unknown) =>
      error instanceof BudgetNameTakenError && resolvedCategoryName !== undefined
        ? Strings.budgetNameTaken(resolvedCategoryName, error.budgetName, monthName)
        : undefined;
    const saved = await runSave(async () => {
      await setBudget({
        id: isEdit ? editingRow?.id : undefined,
        categoryId: resolvedCategoryId,
        name: values.nameText,
        limit: parseRequiredMoneyText(values.limitText, 'limitText'),
        yearMonth: selectedMonth,
        categoryGroup: groupValue ?? undefined,
      });
    }, nameTakenMessage);
    if (!saved) return;
    markSaved(owner, isEdit ? 'updated' : 'added');
    close();
  };
  const submit = async (): Promise<void> => {
    try {
      await handleSubmit(onValid)();
    } catch {
      setErrorMessage(Strings.budgetSaveError);
    }
  };

  const handleCloseComplete = useCallback(() => {
    const outcome = completeClose(owner);
    if (outcome === undefined) return;
    toast.show({
      label: outcome === 'added' ? Strings.budgetAddedToast : Strings.budgetUpdatedToast,
      variant: 'success',
    });
  }, [completeClose, owner, toast]);

  const rowCategory = isEdit
    ? budgetableCategories.find((category) => category.id === editingRow?.categoryId)
    : selectedCategory;
  const faults: SetBudgetFaults = {
    category:
      isSubmitted && resolvedCategoryId === undefined ? Strings.budgetPickCategory : undefined,
    name: errors.nameText?.message,
    limit: errors.limitText?.message,
  };

  const selectCategory = useCallback(
    (category: Category) => {
      setSelectedCategoryId(category.id);
      if (addBudgetGroup === undefined) setGroupValue(shownGroupByCategoryId[category.id] ?? null);
    },
    [addBudgetGroup, setGroupValue, setSelectedCategoryId, shownGroupByCategoryId],
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

  const setLimitText = useCallback(
    (text: string) => {
      clearError();
      const form = { setValue, clearErrors, getValues, trigger };
      setTypedDecimal(form, 'limitText', text, true, isSubmitted);
    },
    [clearError, clearErrors, getValues, isSubmitted, setValue, trigger],
  );

  return {
    state: {
      sheetVisible: open,
      isEdit,
      title: isEdit ? Strings.budgetEditTitle : Strings.budgetSetTitle,
      monthLine: Strings.budgetMonthlyLimitLine(formatMonthYear(selectedMonth)),
      rowCategory,
      rowCategoryName: isEdit ? editingRow?.categoryName : undefined,
      faults,
      nameTaken,
      footerMessage: resolveSetBudgetFooterMessage(faults, errorMessage),
      selectedCategory,
      selectedCategoryId,
      pickerExpanded,
      groupValue,
      saving,
    },
    control,
    submit,
    setLimitText,
    selectCategory,
    selectGroup,
    togglePicker,
    collapsePicker,
    clearError,
    onOpenChange,
    handleCloseComplete,
  };
}
