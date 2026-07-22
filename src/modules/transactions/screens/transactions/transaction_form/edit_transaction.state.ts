import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { completePickerClose, updateClosingPickers } from './picker_close_lifecycle.helpers';

export type EditTransactionPicker = 'category' | 'budget';

interface EditTransactionStateShape {
  saving: boolean;
  showCategoryPicker: boolean;
  showBudgetPicker: boolean;
  closingPickers: EditTransactionPicker[];
  budgetsLoading: boolean;
  budgetLookupVersion: number;
  budgetLookupError: string | undefined;
  errorMessage: string | undefined;
  preserveBudgetNull: boolean;
  rateOverride: boolean;
}

type EditTransactionState = EditTransactionStateShape & {
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
  saving: false,
  showCategoryPicker: false,
  showBudgetPicker: false,
  closingPickers: [],
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
    setSaving: (v) => set({ saving: v }),
    setShowCategoryPicker: (v) =>
      set((state) => ({
        showCategoryPicker: v,
        closingPickers: updateClosingPickers(
          state.closingPickers,
          'category',
          state.showCategoryPicker,
          v,
        ),
      })),
    setShowBudgetPicker: (v) =>
      set((state) => ({
        showBudgetPicker: v,
        closingPickers: updateClosingPickers(
          state.closingPickers,
          'budget',
          state.showBudgetPicker,
          v,
        ),
      })),
    completePickerClose: (picker) =>
      set((state) => ({
        closingPickers: completePickerClose(state.closingPickers, picker),
      })),
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
