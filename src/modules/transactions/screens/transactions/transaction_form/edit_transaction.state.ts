import { create } from 'zustand';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditTransactionStateShape {
  visible: boolean;
  saving: boolean;
  showCategoryPicker: boolean;
  showBudgetPicker: boolean;
  budgetsLoading: boolean;
  budgetLookupVersion: number;
  budgetLookupError: string | undefined;
  errorMessage: string | undefined;
  preserveBudgetNull: boolean;
  rateOverride: boolean;
}

type EditTransactionState = EditTransactionStateShape & {
  open: (tx: Transaction) => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setShowBudgetPicker: (v: boolean) => void;
  setBudgetsLoading: (v: boolean) => void;
  setBudgetLookupError: (message: string | undefined) => void;
  setErrorMessage: (message: string | undefined) => void;
  retryBudgetLookup: () => void;
  clearError: () => void;
  setPreserveBudgetNull: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: EditTransactionStateShape = {
  visible: false,
  saving: false,
  showCategoryPicker: false,
  showBudgetPicker: false,
  budgetsLoading: false,
  budgetLookupVersion: 0,
  budgetLookupError: undefined,
  errorMessage: undefined,
  preserveBudgetNull: false,
  rateOverride: false,
};

export const useEditTransactionState = createMoneyAppSelectors(
  create<EditTransactionState>((set) => ({
    ...INITIAL_STATE,

    open: () => set({ visible: true }),
    close: () => set(INITIAL_STATE),
    setSaving: (v) => set({ saving: v }),
    setShowCategoryPicker: (v) => set({ showCategoryPicker: v }),
    setShowBudgetPicker: (v) => set({ showBudgetPicker: v }),
    setBudgetsLoading: (v) => set({ budgetsLoading: v }),
    setBudgetLookupError: (budgetLookupError) => set({ budgetLookupError }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    retryBudgetLookup: () =>
      set((state) => ({
        budgetLookupVersion: state.budgetLookupVersion + 1,
        budgetLookupError: undefined,
      })),
    clearError: () => set({ errorMessage: undefined }),
    setPreserveBudgetNull: (v) => set({ preserveBudgetNull: v }),
    setRateOverride: (v) => set({ rateOverride: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
