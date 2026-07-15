import { useShallow } from 'zustand/react/shallow';

import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';

export function useIncomeSheet() {
  const state = useIncomeSheetState(
    useShallow((sheet) => ({
      isOpen: sheet.isOpen,
      amountText: sheet.amountText,
      suggestion: sheet.suggestion,
      saving: sheet.saving,
    })),
  );
  const close = useIncomeSheetState.getState().close;
  const setAmountText = useIncomeSheetState.getState().setAmountText;
  const setSaving = useIncomeSheetState.getState().setSaving;
  const setExpectedIncome = useBudgetStore.getState().setExpectedIncome;

  async function save() {
    const amount = Number.parseFloat(state.amountText);
    if (!Number.isFinite(amount) || amount <= 0 || state.saving) return;
    setSaving(true);
    try {
      await setExpectedIncome(amount);
      close();
    } finally {
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
