import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { formatStoredMoneyText, maskFieldText } from '@/utils/money_text';
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
  const { control, formState, getValues, handleSubmit, reset, setValue, watch } =
    useZodForm<IncomeFormValues>(incomeFormSchema, {
      defaultValues: { amountText: useIncomeSheetState.getState().amountText },
    });
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
      // Classified before both writes, so a refused keystroke leaves the draft
      // store and the RHF field agreeing on the old text rather than drifting
      // apart, and an accepted one writes the same masked string to both. A
      // typed comma arrives here as a decimal point; a comma in a paste-shaped
      // delta arrives as `undefined` and writes nothing.
      //
      // The prior held text comes from `getValues`, not the watched value:
      // closing over `amountText` would put it in this callback's dependency
      // array and churn the callback's identity on every keystroke. It must be
      // the RHF value and not the draft store, for the reason recorded above --
      // the Controller's value is what is on screen.
      const masked = maskFieldText('amount', getValues('amountText'), text);
      if (masked === undefined) return;
      setDraftAmountText(masked);
      setValue('amountText', masked, { shouldDirty: true, shouldValidate: formState.isSubmitted });
    },
    [formState.isSubmitted, getValues, setDraftAmountText, setValue],
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
