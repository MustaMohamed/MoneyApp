import { create } from 'zustand';

interface TransactionFormBodyStateShape {
  keyboardVisible: boolean;
  showIosDatePicker: boolean;
  showAndroidDatePicker: boolean;
}

interface TransactionFormBodyState {
  state: TransactionFormBodyStateShape;
  setKeyboardVisible: (v: boolean) => void;
  setShowIosDatePicker: (v: boolean) => void;
  setShowAndroidDatePicker: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: TransactionFormBodyStateShape = {
  keyboardVisible: false,
  showIosDatePicker: false,
  showAndroidDatePicker: false,
};

export const useTransactionFormBodyState = create<TransactionFormBodyState>((set) => ({
  state: INITIAL_STATE,

  setKeyboardVisible: (v) => set((s) => ({ state: { ...s.state, keyboardVisible: v } })),
  setShowIosDatePicker: (v) => set((s) => ({ state: { ...s.state, showIosDatePicker: v } })),
  setShowAndroidDatePicker: (v) =>
    set((s) => ({ state: { ...s.state, showAndroidDatePicker: v } })),

  reset: () => set({ state: INITIAL_STATE }),
}));
