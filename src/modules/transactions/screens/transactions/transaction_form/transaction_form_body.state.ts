import { create } from 'zustand';

interface TransactionFormBodyStateShape {
  keyboardVisible: boolean;
  showIosDatePicker: boolean;
  showAndroidDatePicker: boolean;
}

type TransactionFormBodyState = TransactionFormBodyStateShape & {
  setKeyboardVisible: (v: boolean) => void;
  setShowIosDatePicker: (v: boolean) => void;
  setShowAndroidDatePicker: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: TransactionFormBodyStateShape = {
  keyboardVisible: false,
  showIosDatePicker: false,
  showAndroidDatePicker: false,
};

export const useTransactionFormBodyState = create<TransactionFormBodyState>((set) => ({
  ...INITIAL_STATE,

  setKeyboardVisible: (v) => set((s) => ({ ...s, keyboardVisible: v })),
  setShowIosDatePicker: (v) => set((s) => ({ ...s, showIosDatePicker: v })),
  setShowAndroidDatePicker: (v) => set((s) => ({ ...s, showAndroidDatePicker: v })),

  reset: () => set(INITIAL_STATE),
}));
