import { create } from 'zustand';

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

interface AddTransactionState {
  state: AddTransactionStateShape;
  open: () => void;
  requestOpen: () => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowAccountPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: AddTransactionStateShape = {
  visible: false,
  pendingOpen: false,
  saving: false,
  showAccountPicker: false,
  showToPicker: false,
  showCategoryPicker: false,
  rateOverride: false,
};

export const useAddTransactionState = create<AddTransactionState>((set) => ({
  state: INITIAL_STATE,

  open: () => set((s) => ({ state: { ...s.state, visible: true, pendingOpen: false } })),
  requestOpen: () => set((s) => ({ state: { ...s.state, pendingOpen: true } })),
  close: () => set({ state: INITIAL_STATE }),
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  setShowAccountPicker: (v) => set((s) => ({ state: { ...s.state, showAccountPicker: v } })),
  setShowToPicker: (v) => set((s) => ({ state: { ...s.state, showToPicker: v } })),
  setShowCategoryPicker: (v) => set((s) => ({ state: { ...s.state, showCategoryPicker: v } })),
  setRateOverride: (v) => set((s) => ({ state: { ...s.state, rateOverride: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
