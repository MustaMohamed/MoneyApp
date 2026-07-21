import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { completePickerClose, updateClosingPickers } from './picker_close_lifecycle.helpers';

export type AddTransactionPicker = 'account' | 'toAccount' | 'category' | 'budget';

interface AddTransactionStateShape {
  saving: boolean;
  showAccountPicker: boolean;
  showToPicker: boolean;
  showCategoryPicker: boolean;
  showBudgetPicker: boolean;
  closingPickers: AddTransactionPicker[];
  budgetsLoading: boolean;
  budgetLookupVersion: number;
  budgetLookupError: string | undefined;
  errorMessage: string | undefined;
  rateOverride: boolean;
}

type AddTransactionState = AddTransactionStateShape & {
  setSaving: (v: boolean) => void;
  setShowAccountPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setShowBudgetPicker: (v: boolean) => void;
  completePickerClose: (picker: AddTransactionPicker) => void;
  setBudgetsLoading: (v: boolean) => void;
  setBudgetLookupError: (message: string | undefined) => void;
  setErrorMessage: (message: string | undefined) => void;
  retryBudgetLookup: () => void;
  clearError: () => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: AddTransactionStateShape = {
  saving: false,
  showAccountPicker: false,
  showToPicker: false,
  showCategoryPicker: false,
  showBudgetPicker: false,
  closingPickers: [],
  budgetsLoading: false,
  budgetLookupVersion: 0,
  budgetLookupError: undefined,
  errorMessage: undefined,
  rateOverride: false,
};

export const useAddTransactionState = createMoneyAppSelectors(
  create<AddTransactionState>((set) => ({
    ...INITIAL_STATE,
    setSaving: (v) => set({ saving: v }),
    setShowAccountPicker: (v) =>
      set((state) => ({
        showAccountPicker: v,
        closingPickers: updateClosingPickers(
          state.closingPickers,
          'account',
          state.showAccountPicker,
          v,
        ),
      })),
    setShowToPicker: (v) =>
      set((state) => ({
        showToPicker: v,
        closingPickers: updateClosingPickers(
          state.closingPickers,
          'toAccount',
          state.showToPicker,
          v,
        ),
      })),
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
    setRateOverride: (v) => set({ rateOverride: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
