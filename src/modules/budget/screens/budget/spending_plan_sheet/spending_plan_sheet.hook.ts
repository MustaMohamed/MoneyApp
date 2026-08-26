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
  // preview only. An unentered total stays `undefined` rather than being
  // coerced to 0, which is what made an allocated plan read as over-allocated
  // before a total was typed.
  const totalAmount = parsePositiveDecimal(watch('totalText'));
  // One verdict per row that the save will actually carry: mapped over the
  // selected categories — the same expression the submit builds `categories`
  // from — and empty while allocation is switched off, so a row the save
  // ignores can neither count against the total nor block the save with an
  // error attached to nothing on screen.
  const allocationFields = allocateByCategory
    ? selectedCategoryIds.map((categoryId) => {
        const validation = validateAllocationText(allocations[categoryId] ?? '');
        // @layla Q8: every row the validator rejects — blank, pattern-invalid
        // and floor-violating alike — contributes 0, decided at this one call.
        return { categoryId, validation, amount: validation.ok ? validation.value : undefined };
      })
    : [];
  const allocationHelper = computeAllocationHelper(
    totalAmount,
    allocationFields.map((field) => field.amount),
  );
  // Derived per render from the store's text, never written back: an error
  // string is not draft data. An incomplete decimal stays silent until a Save
  // is blocked (spec §5.6's display rule).
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
      // Not `String(editingPlan.totalAmount)`: the total goes through the same
      // unbounded parser an allocation does, so a plan saved at 1e21 prefills
      // as '1e+21' — text `DECIMAL_PATTERN` rejects, leaving a total the sheet
      // will not save back (spec row 25, on this field).
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
      // The pre-flight is what stops a rejected row from being written as
      // "unallocated". A row the validator rejects carries `amount: undefined`
      // (see `allocationFields`), so `allocatedByCategoryId` yields `undefined`
      // for it below and `allocated_amount` binds as NULL — which reads back as
      // absent, not as a failure. Nothing downstream objects: `allocatedAmount`
      // is `.optional()` in `spendingPlanInputSchema`, so absent is exactly what
      // that schema permits. Without this early return a typed `0.005` saves as
      // "no allocation" instead of blocking the save with its floor message.
      // The rows checked are the ones the save carries, so an orphan allocation
      // on a deselected category cannot block Save with an error attached to no
      // visible row.
      if (allocationFields.some(({ validation }) => !validation.ok)) {
        const preflight = useSpendingPlanSheetState.getState();
        preflight.setAllocationSubmitAttempted(true);
        // The row message alone is not a response to the tap. It renders in a
        // 128px column inside the scroll view; Save is in the sheet's fixed
        // footer, which does not scroll with it. With the offending row off
        // screen, unmuting it changes nothing in the viewport and the button
        // reads as dead.
        //
        // Setting it is also what clears a stale one — a repository failure
        // from the previous attempt otherwise stays on screen describing a
        // problem that is no longer what is blocking the save. One write does
        // both, so there is no separate clear to forget.
        //
        // `budgetPlanAllocationInvalid` is the sheet-level wording for exactly
        // this rule, already carried for `spendingPlanInputSchema`'s refine
        // (see its note in `strings.ts`) — the same rule failing one layer
        // earlier gets the same sentence, and no new string is introduced.
        preflight.setSubmitError(Strings.budgetPlanAllocationInvalid);
        return;
      }
      // Hoisted out of the `input` literal below rather than folded into the
      // save try/catch further down: that try also wraps `setSaving(true)`,
      // and moving the parse into it would put a state change after
      // validation could still fail this field. A schema/submit desync here
      // (unreachable today — the refine below and this call share
      // `parsePositiveDecimal`) reports through the same sheet-bottom
      // message a repository failure uses, not the schema's own NaN issue
      // text, and returns before `setSaving` runs, so there is no saving
      // flag left dirty to clean up.
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
      // `handleSubmit`'s onInvalid leg. RHF sets `isSubmitted` on any submit
      // ATTEMPT, and spec §5.6 gives this flag the same semantics: an incomplete
      // allocation row stays silent until a Save is blocked, whichever leg blocks
      // it. Set only in the valid callback, it is narrower than the sentence it
      // implements: a Save the plan total blocks never reaches that callback, so
      // the half-typed row beside it stays mute while the sheet reports an error
      // — two problems on screen and one message between them.
      useSpendingPlanSheetState.getState().setAllocationSubmitAttempted(true);
    },
  );

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
      // The prior held text is read back from the store rather than passed in:
      // the row renders `props.values[category.id] ?? ''` from this same
      // record, so this is what is on screen, and no prop is added to carry it.
      //
      // Refused or normalised, never truncated: a comma typed into the row
      // becomes a decimal point, a comma arriving in a paste-shaped delta puts
      // nothing in the field, and '0.005' survives to the row validator to
      // produce its floor message instead of being rounded into '0.00' on the
      // way in.
      const previous = useSpendingPlanSheetStore.getState().allocations[categoryId] ?? '';
      const masked = maskMoneyFieldText(previous, text);
      if (masked === undefined) return;
      // Mask, clear, write. The footer message is a pre-flight verdict on text
      // that has since changed, so an accepted edit retires it -- otherwise the
      // sheet keeps claiming a block above Save, permanently in view, after the
      // row that caused it was fixed. Clearing above the guard instead would let
      // a refused keystroke wipe an error the user still needs to read.
      useSpendingPlanSheetState.getState().setSubmitError(undefined);
      useSpendingPlanSheetStore.getState().setAllocation(categoryId, masked);
    },
    // The same clear for the plan name and total, threaded to the one shared
    // handler behind both Controllers. One footer message serves all three
    // inputs; leaving two of them able to strand it would put the sheet's
    // honesty on which field the user happened to touch.
    clearSubmitError: () => useSpendingPlanSheetState.getState().setSubmitError(undefined),
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
