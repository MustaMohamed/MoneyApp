import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AddTransactionStateShape {
  visible: boolean;
  /**
   * Cross-tab open request. The global FAB (mounted outside the transactions
   * tab) sets this and navigates here; the transactions screen consumes it once
   * mounted, flipping `visible` false→true so the sheet actually presents. (The
   * FAB can't set `visible` directly: the sheet would mount already-true and
   * skip the open animation while still hiding the FAB.)
   */
  pendingOpen: boolean;
  saving: boolean;
  showAccountPicker: boolean;
  showToPicker: boolean;
  showCategoryPicker: boolean;
  showBudgetPicker: boolean;
  budgetsLoading: boolean;
  budgetLookupVersion: number;
  budgetLookupError: string | undefined;
  errorMessage: string | undefined;
  rateOverride: boolean;
}

type AddTransactionState = AddTransactionStateShape & {
  open: () => void;
  requestOpen: () => void;
  requestClose: () => boolean;
  completeSave: () => void;
  completeClose: () => void;
  setSaving: (v: boolean) => void;
  setShowAccountPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setShowBudgetPicker: (v: boolean) => void;
  setBudgetsLoading: (v: boolean) => void;
  setBudgetLookupError: (message: string | undefined) => void;
  setErrorMessage: (message: string | undefined) => void;
  retryBudgetLookup: () => void;
  clearError: () => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: AddTransactionStateShape = {
  visible: false,
  pendingOpen: false,
  saving: false,
  showAccountPicker: false,
  showToPicker: false,
  showCategoryPicker: false,
  showBudgetPicker: false,
  budgetsLoading: false,
  budgetLookupVersion: 0,
  budgetLookupError: undefined,
  errorMessage: undefined,
  rateOverride: false,
};

export const useAddTransactionState = createMoneyAppSelectors(
  create<AddTransactionState>((set, get) => ({
    ...INITIAL_STATE,

    open: () => set({ visible: true, pendingOpen: false }),
    requestOpen: () => set({ pendingOpen: true }),
    requestClose: () => {
      if (get().saving) return false;
      set({
        visible: false,
        pendingOpen: false,
        showAccountPicker: false,
        showToPicker: false,
        showCategoryPicker: false,
        showBudgetPicker: false,
      });
      return true;
    },
    completeSave: () =>
      set({
        visible: false,
        pendingOpen: false,
        showAccountPicker: false,
        showToPicker: false,
        showCategoryPicker: false,
        showBudgetPicker: false,
      }),
    completeClose: () => set(INITIAL_STATE),
    setSaving: (v) => set({ saving: v }),
    setShowAccountPicker: (v) => set({ showAccountPicker: v }),
    setShowToPicker: (v) => set({ showToPicker: v }),
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
    setRateOverride: (v) => set({ rateOverride: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
