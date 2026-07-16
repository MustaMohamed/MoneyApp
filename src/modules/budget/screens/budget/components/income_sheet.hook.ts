import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';

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
  const setAmountText = useIncomeSheetState.getState().setAmountText;
  const setSaving = useIncomeSheetState.getState().setSaving;
  const setErrorMessage = useIncomeSheetState.getState().setErrorMessage;
  const setExpectedIncome = useBudgetStore.getState().setExpectedIncome;

  async function save() {
    const { amountText, saving, yearMonth } = useIncomeSheetState.getState();
    const amount = Number.parseFloat(amountText);
    if (!Number.isFinite(amount) || amount <= 0 || saving || yearMonth === undefined) return;
    setErrorMessage(undefined);
    setSaving(true);
    try {
      await setExpectedIncome(yearMonth, amount);
      setSaving(false);
      close();
    } catch {
      setErrorMessage(Strings.incomeSheetSaveError);
      setSaving(false);
    }
  }

  return {
    state,
    close,
    setAmountText,
    save,
  };
}
