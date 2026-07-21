import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { TransactionFormDataStatus } from './add_transaction.state';

export type EditTransactionPicker = 'category' | 'budget';

interface EditTransactionStateShape {
  dataStatus: TransactionFormDataStatus;
  dataLoadVersion: number;
  saving: boolean;
  showCategoryPicker: boolean;
  showBudgetPicker: boolean;
  closingPicker: EditTransactionPicker | undefined;
  budgetsLoading: boolean;
  budgetLookupVersion: number;
  budgetLookupError: string | undefined;
  errorMessage: string | undefined;
  preserveBudgetNull: boolean;
  rateOverride: boolean;
}

type EditTransactionState = EditTransactionStateShape & {
  setDataStatus: (status: TransactionFormDataStatus) => void;
  retryFormData: () => void;
  setSaving: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setShowBudgetPicker: (v: boolean) => void;
  completePickerClose: (picker: EditTransactionPicker) => void;
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
  dataStatus: 'loading',
  dataLoadVersion: 0,
  saving: false,
  showCategoryPicker: false,
  showBudgetPicker: false,
  closingPicker: undefined,
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
    setDataStatus: (dataStatus) => set({ dataStatus }),
    retryFormData: () =>
      set((state) => ({ dataLoadVersion: state.dataLoadVersion + 1, dataStatus: 'loading' })),
    setSaving: (v) => set({ saving: v }),
    setShowCategoryPicker: (v) =>
      set((state) => ({
        showCategoryPicker: v,
        closingPicker: v ? undefined : state.showCategoryPicker ? 'category' : state.closingPicker,
      })),
    setShowBudgetPicker: (v) =>
      set((state) => ({
        showBudgetPicker: v,
        closingPicker: v ? undefined : state.showBudgetPicker ? 'budget' : state.closingPicker,
      })),
    completePickerClose: (picker) =>
      set((state) => (state.closingPicker === picker ? { closingPicker: undefined } : {})),
    setBudgetsLoading: (v) => set({ budgetsLoading: v }),
    setBudgetLookupError: (budgetLookupError) => set({ budgetLookupError }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    retryBudgetLookup: () =>
      set((state) => ({
        budgetLookupVersion: state.budgetLookupVersion + 1,
        budgetLookupError: undefined,
      })),
    clearError: () =>
      set((state) => (state.errorMessage === undefined ? state : { errorMessage: undefined })),
    setPreserveBudgetNull: (v) => set({ preserveBudgetNull: v }),
    setRateOverride: (v) => set({ rateOverride: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
