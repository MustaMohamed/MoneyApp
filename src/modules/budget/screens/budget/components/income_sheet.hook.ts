import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { formatStoredMoneyText } from '@/utils/money_text';
import { parsePositiveDecimal } from '@/utils/parse_decimal';
import { incomeFormSchema, type IncomeFormValues } from '@/utils/schemas/budget.schema';
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

  // Compared against the same formatter the prefill writes, not `String()`. The
  // note is "this text came from the suggestion", so the two have to be
  // produced identically -- with `String()` here the note would silently stop
  // rendering for exactly the values the prefill fix is about (a stored 1e-7
  // prefills as '0.0000001' and would never equal '1e-7'). The `!== null` guard
  // stays: `formatStoredMoneyText(null)` is '', which an untouched empty field
  // would match.
  //
  // Derived from the RHF value the Controller renders, never from the draft
  // store: the Controller's value is what is on screen, and the note is a claim
  // about what the user is looking at.
  const isPrefilledFromSuggestion =
    state.suggestion !== null && amountText === formatStoredMoneyText(state.suggestion);

  useEffect(() => {
    if (!state.isOpen) return;
    reset({ amountText: useIncomeSheetState.getState().amountText });
  }, [reset, state.isOpen, state.yearMonth]);

  const setAmountText = useCallback(
    (text: string) => {
      // Both writes take the text as typed. The draft store and the RHF field
      // are written from the same string in the same call, so they cannot
      // disagree about what the field holds.
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
        await setExpectedIncome(yearMonth, parsePositiveDecimal(validAmountText) ?? Number.NaN);
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
      isPrefilledFromSuggestion,
      validationMessage: formState.errors.amountText?.message,
    },
    control,
    close,
    setAmountText,
    save,
  };
}
