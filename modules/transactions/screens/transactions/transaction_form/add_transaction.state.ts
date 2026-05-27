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
  rateOverride: boolean;
}

type AddTransactionState = AddTransactionStateShape & {
  open: () => void;
  requestOpen: () => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowAccountPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
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
  rateOverride: false,
};

export const useAddTransactionState = createMoneyAppSelectors(
  create<AddTransactionState>((set) => ({
    ...INITIAL_STATE,

    open: () => set((s) => ({ ...s, visible: true, pendingOpen: false })),
    requestOpen: () => set((s) => ({ ...s, pendingOpen: true })),
    close: () => set(INITIAL_STATE),
    setSaving: (v) => set((s) => ({ ...s, saving: v })),
    setShowAccountPicker: (v) => set((s) => ({ ...s, showAccountPicker: v })),
    setShowToPicker: (v) => set((s) => ({ ...s, showToPicker: v })),
    setShowCategoryPicker: (v) => set((s) => ({ ...s, showCategoryPicker: v })),
    setRateOverride: (v) => set((s) => ({ ...s, rateOverride: v })),
    reset: () => set(INITIAL_STATE),
  })),
);
