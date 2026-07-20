import { create } from 'zustand';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditTransactionStateShape {
  visible: boolean;
  sessionId: number;
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
  requestClose: () => boolean;
  completeSave: () => void;
  completeClose: () => void;
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
  sessionId: 0,
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
  create<EditTransactionState>((set, get) => ({
    ...INITIAL_STATE,

    open: () =>
      set((state) => ({
        ...INITIAL_STATE,
        visible: true,
        sessionId: state.sessionId + 1,
      })),
    requestClose: () => {
      if (get().saving) return false;
      set({ visible: false, showCategoryPicker: false, showBudgetPicker: false });
      return true;
    },
    completeSave: () => set({ visible: false, showCategoryPicker: false, showBudgetPicker: false }),
    completeClose: () => set(INITIAL_STATE),
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
