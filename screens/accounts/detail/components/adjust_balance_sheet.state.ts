import { create } from 'zustand';

interface AdjustBalanceSheetStateShape {
  input: string;
  error: string;
}

interface AdjustBalanceSheetState {
  state: AdjustBalanceSheetStateShape;
  setInput: (v: string) => void;
  setError: (v: string) => void;
  initialize: (currentBalance: number) => void;
  reset: () => void;
}

const INITIAL_STATE: AdjustBalanceSheetStateShape = {
  input: '',
  error: '',
};

export const useAdjustBalanceSheetState = create<AdjustBalanceSheetState>((set) => ({
  state: INITIAL_STATE,
  setInput: (v) => set((s) => ({ state: { ...s.state, input: v } })),
  setError: (v) => set((s) => ({ state: { ...s.state, error: v } })),
  initialize: (currentBalance) => set({ state: { input: String(currentBalance), error: '' } }),
  reset: () => set({ state: INITIAL_STATE }),
}));
