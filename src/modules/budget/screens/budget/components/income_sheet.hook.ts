import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { incomeFormSchema, parseLimit, type IncomeFormValues } from '@/utils/schemas/budget.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

export function useIncomeSheet() {
  const state = useIncomeSheetState(
    useShallow((sheet) => ({
      isOpen: sheet.isOpen,
      amountText: sheet.amountText,
      suggestion: sheet.suggestion,
      yearMonth: sheet.yearMonth,
      monthLabel: sheet.monthLabel,
      saving: sheet.saving,
      errorMessage: sheet.errorMessage,
    })),
  );
  const close = useIncomeSheetState.getState().close;
  const setDraftAmountText = useIncomeSheetState.getState().setAmountText;
  const setSaving = useIncomeSheetState.getState().setSaving;
  const setErrorMessage = useIncomeSheetState.getState().setErrorMessage;
  const setExpectedIncome = useBudgetStore.getState().setExpectedIncome;
  const { control, formState, handleSubmit, reset, setValue, watch } = useZodForm<IncomeFormValues>(
    incomeFormSchema,
    {
      defaultValues: { amountText: useIncomeSheetState.getState().amountText },
    },
  );
  const amountText = watch('amountText');

  useEffect(() => {
    if (!state.isOpen) return;
    reset({ amountText: useIncomeSheetState.getState().amountText });
  }, [reset, state.isOpen, state.yearMonth]);

  const setAmountText = useCallback(
    (text: string) => {
      setDraftAmountText(text);
      setValue('amountText', text, { shouldDirty: true, shouldValidate: formState.isSubmitted });
    },
    [formState.isSubmitted, setDraftAmountText, setValue],
  );

  const submitValidAmount = handleSubmit(
    async ({ amountText: validAmountText }) => {
      const { yearMonth } = useIncomeSheetState.getState();
      if (yearMonth === undefined) {
        setSaving(false);
        return;
      }
      try {
        await setExpectedIncome(yearMonth, parseLimit(validAmountText));
        setSaving(false);
        close();
      } catch {
        setErrorMessage(Strings.incomeSheetSaveError);
        setSaving(false);
      }
    },
    () => setSaving(false),
  );

  async function save() {
    const { saving, yearMonth } = useIncomeSheetState.getState();
    if (saving || yearMonth === undefined) return;
    setErrorMessage(undefined);
    setSaving(true);
    await submitValidAmount();
  }

  return {
    state: {
      ...state,
      amountText,
      validationMessage: formState.errors.amountText?.message,
    },
    control,
    close,
    setAmountText,
    save,
  };
}
