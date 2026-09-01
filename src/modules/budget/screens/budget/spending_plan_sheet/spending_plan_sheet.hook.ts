import type { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import {
  SpendingPlanValidationError,
  type SetSpendingPlanInput,
} from '@/modules/budget/repositories/budget.repository';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import {
  SPENDING_PLAN_ALLOCATION_DECIMALS,
  validateAllocationText,
} from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.helpers';
import {
  type SpendingPlanDatePickerTarget,
  useSpendingPlanSheetState,
} from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.state';
import { useSpendingPlanSheetStore } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.store';
import {
  computeAllocationHelper,
  planIntersectsMonth,
} from '@/modules/budget/screens/budget/spending_plans.helpers';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import type { Category } from '@/modules/categories/entities/category.entity';
import { formatAmount } from '@/utils/format_amount';
import { toLocalDateString } from '@/utils/format_date';
import {
  formatStoredMoneyText,
  maskMoneyFieldText,
  MoneyTextMappingError,
  parseRequiredMoneyText,
} from '@/utils/money_text';
import { parsePositiveDecimal } from '@/utils/parse_decimal';
import {
  spendingPlanFormSchema,
  spendingPlanInputSchema,
  type SpendingPlanFormValues,
} from '@/utils/schemas/budget.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

export interface SpendingPlanSheetProps {
  budgetableCategories: Category[];
  editingPlan?: SpendingPlanRowVM;
  onSaved?: () => Promise<void> | void;
}

export function useSpendingPlanSheet({
  budgetableCategories,
  editingPlan,
  onSaved,
}: SpendingPlanSheetProps) {
  const { planSheetVisible, planSheetMode, selectedMonth } = useBudgetState(
    useShallow((state) => ({
      planSheetVisible: state.planSheetVisible,
      planSheetMode: state.planSheetMode,
      selectedMonth: state.selectedMonth,
    })),
  );
  const { startDate, endDate, selectedCategoryIds, allocations, allocateByCategory } =
    useSpendingPlanSheetStore(
      useShallow((state) => ({
        startDate: state.startDate,
        endDate: state.endDate,
        selectedCategoryIds: state.selectedCategoryIds,
        allocations: state.allocations,
        allocateByCategory: state.allocateByCategory,
      })),
    );
  const { pickerExpanded, datePickerTarget, submitError, saving, allocationSubmitAttempted } =
    useSpendingPlanSheetState(
      useShallow((state) => ({
        pickerExpanded: state.pickerExpanded,
        datePickerTarget: state.datePickerTarget,
        submitError: state.submitError,
        saving: state.saving,
        allocationSubmitAttempted: state.allocationSubmitAttempted,
      })),
    );
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
  // An unentered total stays `undefined`, never coerced to 0.
  const totalAmount = parsePositiveDecimal(watch('totalText'));
  // Mapped over the same ids the submit sends, so a row the save ignores cannot block it.
  const allocationFields = allocateByCategory
    ? selectedCategoryIds.map((categoryId) => {
        const validation = validateAllocationText(allocations[categoryId] ?? '');
        // Every row the validator rejects contributes 0 to the allocated total.
        return { categoryId, validation, amount: validation.ok ? validation.value : undefined };
      })
    : [];
  const allocationHelper = computeAllocationHelper(
    totalAmount,
    allocationFields.map((field) => field.amount),
  );
  // An incomplete decimal stays silent until a Save is blocked.
  const allocationErrors: Record<string, string | undefined> = Object.fromEntries(
    allocationFields.map(({ categoryId, validation }) => [
      categoryId,
      !validation.ok && (!validation.incomplete || allocationSubmitAttempted)
        ? validation.message
        : undefined,
    ]),
  );
  const allocatedByCategoryId = new Map(
    allocationFields.map((field) => [field.categoryId, field.amount]),
  );

  useEffect(() => {
    const resetDraft = useSpendingPlanSheetStore.getState().reset;
    const resetState = useSpendingPlanSheetState.getState().reset;
    if (!planSheetVisible) {
      resetDraft();
      resetState();
      return;
    }
    if (planSheetMode === 'edit' && editingPlan) {
      // Not raw `String()`: a total of 1e21 prefills as '1e+21', which `DECIMAL_PATTERN` rejects.
      resetForm({
        nameText: editingPlan.name,
        totalText: formatStoredMoneyText(editingPlan.totalAmount),
      });
      useSpendingPlanSheetStore.getState().initEditMode({
        startDate: editingPlan.startDate,
        endDate: editingPlan.endDate,
        selectedCategoryIds: editingPlan.categoryChips.map((category) => category.id),
        allocations: Object.fromEntries(
          editingPlan.allocationRows.map((row) => [
            row.categoryId,
            formatStoredMoneyText(row.allocatedAmount),
          ]),
        ),
        allocateByCategory: editingPlan.allocationRows.length > 0,
      });
      return;
    }
    resetForm({ nameText: '', totalText: '' });
    useSpendingPlanSheetStore.getState().initAddMode({
      month: selectedMonth,
      firstCategoryId: budgetableCategories[0]?.id,
    });
  }, [
    budgetableCategories,
    editingPlan,
    planSheetMode,
    planSheetVisible,
    resetForm,
    selectedMonth,
  ]);

  const submit = handleSubmit(
    async (values) => {
      if (useSpendingPlanSheetState.getState().saving) return;
      // Without this return a rejected row would save as NULL rather than blocking the save.
      if (allocationFields.some(({ validation }) => !validation.ok)) {
        const preflight = useSpendingPlanSheetState.getState();
        preflight.setAllocationSubmitAttempted(true);
        // Save sits in the fixed footer, so an off-screen row message alone reads as dead.
        preflight.setSubmitError(Strings.budgetPlanAllocationInvalid);
        return;
      }
      // Parsed before `setSaving(true)` so a failure returns with no saving flag left set.
      let totalAmount: number;
      try {
        totalAmount = parseRequiredMoneyText(values.totalText, 'totalText');
      } catch (error) {
        if (!(error instanceof MoneyTextMappingError)) throw error;
        useSpendingPlanSheetState.getState().setSubmitError(Strings.budgetPlanSaveError);
        return;
      }
      const input: SetSpendingPlanInput = {
        id: planSheetMode === 'edit' ? editingPlan?.id : undefined,
        name: values.nameText,
        startDate,
        endDate,
        totalAmount,
        categories: selectedCategoryIds.map((categoryId) => ({
          categoryId,
          allocatedAmount: allocatedByCategoryId.get(categoryId),
        })),
      };
      const validation = spendingPlanInputSchema.safeParse(input);
      if (!validation.success) {
        useSpendingPlanSheetState
          .getState()
          .setSubmitError(validation.error.issues[0]?.message ?? Strings.budgetPlanSaveError);
        return;
      }
      const visibleMonth = planIntersectsMonth(
        { start_date: startDate, end_date: endDate },
        selectedMonth,
      )
        ? selectedMonth
        : startDate.slice(0, 7);
      const state = useSpendingPlanSheetState.getState();
      state.setSubmitError(undefined);
      state.setSaving(true);
      try {
        await useBudgetStore.getState().setSpendingPlan(validation.data, visibleMonth);
        if (visibleMonth !== selectedMonth)
          useBudgetState.getState().setSelectedMonth(visibleMonth);
        await onSaved?.();
        useBudgetState.getState().closePlan();
      } catch (error) {
        state.setSubmitError(
          error instanceof SpendingPlanValidationError
            ? error.message
            : Strings.budgetPlanSaveError,
        );
      } finally {
        state.setSaving(false);
      }
    },
    () => {
      // Also set here: a Save blocked by the plan total never reaches the valid callback.
      useSpendingPlanSheetState.getState().setAllocationSubmitAttempted(true);
    },
  );

  const pickerDate =
    datePickerTarget === 'end'
      ? endDate || `${selectedMonth}-01`
      : startDate || `${selectedMonth}-01`;
  // The two clauses below are one condition; narrowing either does not narrow the other.
  const { allocated, buffer } = allocationHelper;
  const helperText =
    buffer === undefined || totalAmount === undefined
      ? undefined
      : Strings.budgetPlanAllocationHelper(
          formatAmount(allocated, SPENDING_PLAN_ALLOCATION_DECIMALS),
          formatAmount(totalAmount, SPENDING_PLAN_ALLOCATION_DECIMALS),
          // Signed, not clamped: a plan 0.40 over its total has to say so.
          formatAmount(buffer, SPENDING_PLAN_ALLOCATION_DECIMALS),
        );

  return {
    state: {
      isOpen: planSheetVisible,
      title: planSheetMode === 'edit' ? Strings.budgetPlanEditTitle : Strings.budgetPlanSetTitle,
      control,
      startDate,
      endDate,
      datePickerTarget,
      datePickerValue: new Date(`${pickerDate}T12:00:00`),
      selectedCategories,
      allocateByCategory,
      allocations,
      allocationErrors,
      allocationHelperText: helperText,
      allocationIsOver: allocationHelper.isOver,
      submitError,
      saving,
      categoryPickerOpen: planSheetVisible && pickerExpanded,
      budgetableCategories,
      selectedCategoryIds,
    },
    submit,
    onFocus,
    onBlur,
    closeSheet: () => useBudgetState.getState().closePlan(),
    openCategoryPicker: () => useSpendingPlanSheetState.getState().openPicker(),
    closeCategoryPicker: () => useSpendingPlanSheetState.getState().closePicker(),
    toggleCategory: (category: Category) =>
      useSpendingPlanSheetStore.getState().toggleCategoryId(category.id),
    setAllocateByCategory: (enabled: boolean) =>
      useSpendingPlanSheetStore.getState().setAllocateByCategory(enabled),
    setAllocationText: (categoryId: string, text: string) => {
      // The mask refuses or normalises, never truncates, so '0.005' reaches the row validator.
      const previous = useSpendingPlanSheetStore.getState().allocations[categoryId] ?? '';
      const masked = maskMoneyFieldText(previous, text);
      if (masked === undefined) return;
      // Clear after the mask guard, so a refused keystroke cannot wipe a visible error.
      useSpendingPlanSheetState.getState().setSubmitError(undefined);
      useSpendingPlanSheetStore.getState().setAllocation(categoryId, masked);
    },
    clearSubmitError: () => useSpendingPlanSheetState.getState().setSubmitError(undefined),
    openDatePicker: (target: SpendingPlanDatePickerTarget) =>
      useSpendingPlanSheetState.getState().openDatePicker(target),
    // datetimepicker 9 split `onChange` in two; both legs must close or cancel leaves it mounted.
    selectDate: (
      target: SpendingPlanDatePickerTarget,
      _event: DateTimePickerChangeEvent,
      date: Date,
    ) => {
      const next = toLocalDateString(date);
      if (target === 'start') useSpendingPlanSheetStore.getState().setStartDate(next);
      if (target === 'end') useSpendingPlanSheetStore.getState().setEndDate(next);
      useSpendingPlanSheetState.getState().closeDatePicker();
    },
    dismissDatePicker: () => useSpendingPlanSheetState.getState().closeDatePicker(),
  };
}
