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
import { parseDecimalText, parsePositiveDecimal } from '@/utils/parse_decimal';
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

function parseOptionalAmount(text: string): number | undefined {
  if (text.trim().length === 0) return undefined;
  return parseDecimalText(text);
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
  const { pickerExpanded, datePickerTarget, submitError, saving } = useSpendingPlanSheetState(
    useShallow((state) => ({
      pickerExpanded: state.pickerExpanded,
      datePickerTarget: state.datePickerTarget,
      submitError: state.submitError,
      saving: state.saving,
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
  // preview only. An unentered total stays `undefined` rather than being
  // coerced to 0, which is what made an allocated plan read as over-allocated
  // before a total was typed.
  const totalAmount = parsePositiveDecimal(watch('totalText'));
  const allocationHelper = computeAllocationHelper(
    totalAmount,
    // Mapped over the selected categories — the same expression the submit
    // builds `categories` from — so an allocation left on a category the user
    // has since deselected cannot count against the total.
    allocateByCategory ? selectedCategoryIds.map((id) => allocations[id]) : [],
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
      resetForm({ nameText: editingPlan.name, totalText: String(editingPlan.totalAmount) });
      useSpendingPlanSheetStore.getState().initEditMode({
        startDate: editingPlan.startDate,
        endDate: editingPlan.endDate,
        selectedCategoryIds: editingPlan.categoryChips.map((category) => category.id),
        allocations: Object.fromEntries(
          editingPlan.allocationRows.map((row) => [row.categoryId, row.allocatedAmount]),
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

  const submit = handleSubmit(async (values) => {
    if (useSpendingPlanSheetState.getState().saving) return;
    const input: SetSpendingPlanInput = {
      id: planSheetMode === 'edit' ? editingPlan?.id : undefined,
      name: values.nameText,
      startDate,
      endDate,
      totalAmount: parsePositiveDecimal(values.totalText) ?? Number.NaN,
      categories: selectedCategoryIds.map((categoryId) => ({
        categoryId,
        allocatedAmount: allocateByCategory ? allocations[categoryId] : undefined,
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
      if (visibleMonth !== selectedMonth) useBudgetState.getState().setSelectedMonth(visibleMonth);
      await onSaved?.();
      useBudgetState.getState().closePlan();
    } catch (error) {
      state.setSubmitError(
        error instanceof SpendingPlanValidationError ? error.message : Strings.budgetPlanSaveError,
      );
    } finally {
      state.setSaving(false);
    }
  });

  const pickerDate =
    datePickerTarget === 'end'
      ? endDate || `${selectedMonth}-01`
      : startDate || `${selectedMonth}-01`;
  // Hidden, not zeroed: the line is `undefined` exactly when
  // `parsePositiveDecimal(totalText)` is, and `sumAllocations` returns
  // `buffer: undefined` for exactly that input. The two clauses are one
  // condition; narrowing either does not narrow the other.
  const { allocated, buffer } = allocationHelper;
  const helperText =
    buffer === undefined || totalAmount === undefined
      ? undefined
      : Strings.budgetPlanAllocationHelper(
          formatAmount(allocated),
          formatAmount(totalAmount),
          formatAmount(Math.max(0, buffer)),
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
    setAllocationText: (categoryId: string, text: string) =>
      useSpendingPlanSheetStore.getState().setAllocation(categoryId, parseOptionalAmount(text)),
    openDatePicker: (target: SpendingPlanDatePickerTarget) =>
      useSpendingPlanSheetState.getState().openDatePicker(target),
    // datetimepicker 9 split the old single `onChange` in two. Closing the picker
    // was unconditional under `onChange` — it ran outside the `event.type === 'set'`
    // check — so both halves must still close it, or cancelling leaves the picker
    // mounted with no way back out.
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
