import { create } from 'zustand';

interface AddTransactionStateShape {
  visible: boolean;
  saving: boolean;
  showAccountPicker: boolean;
  showToPicker: boolean;
  showCategoryPicker: boolean;
  rateOverride: boolean;
}

interface AddTransactionState {
  state: AddTransactionStateShape;
  open: () => void;
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
  saving: false,
  showAccountPicker: false,
  showToPicker: false,
  showCategoryPicker: false,
  rateOverride: false,
};

export const useAddTransactionState = create<AddTransactionState>((set) => ({
  state: INITIAL_STATE,

  open: () => set((s) => ({ state: { ...s.state, visible: true } })),
  close: () => set({ state: INITIAL_STATE }),
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  setShowAccountPicker: (v) => set((s) => ({ state: { ...s.state, showAccountPicker: v } })),
  setShowToPicker: (v) => set((s) => ({ state: { ...s.state, showToPicker: v } })),
  setShowCategoryPicker: (v) => set((s) => ({ state: { ...s.state, showCategoryPicker: v } })),
  setRateOverride: (v) => set((s) => ({ state: { ...s.state, rateOverride: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
