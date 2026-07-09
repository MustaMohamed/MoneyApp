import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import {
  type SpendingPlanDatePickerTarget,
  useSpendingPlanSheetState,
} from '@/modules/budget/screens/budget/components/spending_plan_sheet.state';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import {
  computeAllocationHelper,
  planIntersectsMonth,
} from '@/modules/budget/screens/budget/spending_plans.helpers';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import type { Category } from '@/modules/categories/entities/category.entity';
import { formatAmount } from '@/utils/format_amount';
import { toLocalDateString } from '@/utils/format_date';
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

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : Strings.budgetPlanSaveError;
}

export function useSpendingPlanSheet({
  budgetableCategories,
  editingPlan,
}: SpendingPlanSheetProps) {
  const { planSheetVisible, planSheetMode, selectedMonth } = useBudgetState(
    useShallow((s) => ({
      planSheetVisible: s.planSheetVisible,
      planSheetMode: s.planSheetMode,
      selectedMonth: s.selectedMonth,
    })),
  );
  const closePlan = useBudgetState.getState().closePlan;
  const setSelectedMonthState = useBudgetState.getState().setSelectedMonth;
  const setSpendingPlan = useBudgetStore.getState().setSpendingPlan;
  const {
    startDate,
    endDate,
    selectedCategoryIds,
    allocations,
    allocateByCategory,
    pickerExpanded,
    datePickerTarget,
    submitError,
    saving,
  } = useSpendingPlanSheetState(
    useShallow((s) => ({
      startDate: s.startDate,
      endDate: s.endDate,
      selectedCategoryIds: s.selectedCategoryIds,
      allocations: s.allocations,
      allocateByCategory: s.allocateByCategory,
      pickerExpanded: s.pickerExpanded,
      datePickerTarget: s.datePickerTarget,
      submitError: s.submitError,
      saving: s.saving,
    })),
  );
  const initAddMode = useSpendingPlanSheetState.getState().initAddMode;
  const initEditMode = useSpendingPlanSheetState.getState().initEditMode;
  const setStartDate = useSpendingPlanSheetState.getState().setStartDate;
  const setEndDate = useSpendingPlanSheetState.getState().setEndDate;
  const toggleCategoryId = useSpendingPlanSheetState.getState().toggleCategoryId;
  const setAllocation = useSpendingPlanSheetState.getState().setAllocation;
  const setAllocateByCategory = useSpendingPlanSheetState.getState().setAllocateByCategory;
  const setSubmitError = useSpendingPlanSheetState.getState().setSubmitError;
  const setSaving = useSpendingPlanSheetState.getState().setSaving;
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
  const safeTotalAmount = Number.isFinite(totalAmount) ? totalAmount : 0;
  const allocationHelper = computeAllocationHelper(
    safeTotalAmount,
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
    if (useSpendingPlanSheetState.getState().saving) return;
    setSubmitError(undefined);
    if (selectedCategoryIds.length === 0) {
      setSubmitError(Strings.budgetPlanCategoryRequired);
      return;
    }
    if (endDate < startDate) {
      setSubmitError(Strings.budgetPlanDateInvalid);
      return;
    }
    if (allocationHelper.isOver) return;

    const visibleMonth = planIntersectsMonth(
      { start_date: startDate, end_date: endDate },
      selectedMonth,
    )
      ? selectedMonth
      : startDate.slice(0, 7);

    try {
      setSaving(true);
      await setSpendingPlan(
        {
          id: planSheetMode === 'edit' ? editingPlan?.id : undefined,
          name: values.nameText,
          startDate,
          endDate,
          totalAmount: parseLimit(values.totalText),
          categories: selectedCategoryIds.map((categoryId) => ({
            categoryId,
            allocatedAmount: allocateByCategory ? allocations[categoryId] : undefined,
          })),
        },
        visibleMonth,
      );
      if (visibleMonth !== selectedMonth) setSelectedMonthState(visibleMonth);
      closePlan();
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  });

  const pickerDate =
    datePickerTarget === 'end'
      ? endDate || `${selectedMonth}-01`
      : startDate || `${selectedMonth}-01`;
  const datePickerValue = new Date(`${pickerDate}T12:00:00`);
  const handleDateChange = (
    target: SpendingPlanDatePickerTarget,
    event: DateTimePickerEvent,
    date?: Date,
  ) => {
    if (event.type === 'set' && date) {
      const next = toLocalDateString(date);
      if (target === 'start') setStartDate(next);
      if (target === 'end') setEndDate(next);
    }
    closeDatePicker();
  };

  return {
    isOpen: planSheetVisible,
    title: planSheetMode === 'edit' ? Strings.budgetPlanEditTitle : Strings.budgetPlanSetTitle,
    onSheetOpenChange: (open: boolean) => {
      if (!open) closePlan();
    },
    form: {
      control,
      onSubmit,
      onFocus,
      onBlur,
      submitError,
      saving,
    },
    dateRange: {
      startDate,
      endDate,
      datePickerTarget,
      datePickerValue,
      openDatePicker,
      onDateChange: handleDateChange,
    },
    categorySelector: {
      selectedCategories,
      onPress: openPicker,
    },
    allocations: {
      isEnabled: allocateByCategory,
      onEnabledChange: setAllocateByCategory,
      selectedCategories,
      values: allocations,
      helperText: Strings.budgetPlanAllocationHelper(
        formatAmount(allocationHelper.allocated),
        formatAmount(safeTotalAmount),
        formatAmount(Math.max(0, allocationHelper.buffer)),
      ),
      isOver: allocationHelper.isOver,
      onAllocationTextChange: (categoryId: string, text: string) =>
        setAllocation(categoryId, parseOptionalAmount(text)),
      onFocus,
      onBlur,
    },
    categoryPicker: {
      isOpen: planSheetVisible && pickerExpanded,
      title: Strings.budgetPlanPickCategories,
      categories: budgetableCategories,
      selectedIds: selectedCategoryIds,
      onSelect: (category: Category) => toggleCategoryId(category.id),
      onOpenChange: (open: boolean) => {
        if (!open) closePicker();
      },
    },
  };
}
