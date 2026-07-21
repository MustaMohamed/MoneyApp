import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type AddTransactionPicker = 'account' | 'toAccount' | 'category' | 'budget';

interface AddTransactionStateShape {
  saving: boolean;
  showAccountPicker: boolean;
  showToPicker: boolean;
  showCategoryPicker: boolean;
  showBudgetPicker: boolean;
  closingPicker: AddTransactionPicker | undefined;
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
  closingPicker: undefined,
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
        closingPicker: v ? undefined : state.showAccountPicker ? 'account' : state.closingPicker,
      })),
    setShowToPicker: (v) =>
      set((state) => ({
        showToPicker: v,
        closingPicker: v ? undefined : state.showToPicker ? 'toAccount' : state.closingPicker,
      })),
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
    setRateOverride: (v) => set({ rateOverride: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
