import { useCallback } from 'react';

import { Strings } from '@/constants/strings';

import { useSetBudgetSheetState } from './set_budget_sheet.state';

export function useSetBudgetSheetSave() {
  const runSave = useCallback(async (operation: () => Promise<void>): Promise<boolean> => {
    const state = useSetBudgetSheetState.getState();
    if (state.saving) return false;

    state.setSaving(true);
    state.setErrorMessage(undefined);
    try {
      await operation();
      return true;
    } catch {
      useSetBudgetSheetState.getState().setErrorMessage(Strings.budgetSaveError);
      return false;
    } finally {
      useSetBudgetSheetState.getState().setSaving(false);
    }
  }, []);

  return { runSave };
}
