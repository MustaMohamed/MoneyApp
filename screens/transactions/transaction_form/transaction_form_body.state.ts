import { create } from 'zustand';

interface TransactionFormBodyStateShape {
  showIosDatePicker: boolean;
  showIosTimePicker: boolean;
}

interface TransactionFormBodyState {
  state: TransactionFormBodyStateShape;
  setShowIosDatePicker: (v: boolean) => void;
  setShowIosTimePicker: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: TransactionFormBodyStateShape = {
  showIosDatePicker: false,
  showIosTimePicker: false,
};

export const useTransactionFormBodyState = create<TransactionFormBodyState>((set) => ({
  state: INITIAL_STATE,
  setShowIosDatePicker: (v) => set((s) => ({ state: { ...s.state, showIosDatePicker: v } })),
  setShowIosTimePicker: (v) => set((s) => ({ state: { ...s.state, showIosTimePicker: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
