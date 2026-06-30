import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AdjustBalanceSheetStateShape {
  input: string;
  error: string;
}

type AdjustBalanceSheetState = AdjustBalanceSheetStateShape & {
  setInput: (v: string) => void;
  setError: (v: string) => void;
  initialize: (currentBalance: number) => void;
  reset: () => void;
};

const INITIAL_STATE: AdjustBalanceSheetStateShape = {
  input: '',
  error: '',
};

export const useAdjustBalanceSheetState = createMoneyAppSelectors(
  create<AdjustBalanceSheetState>((set) => ({
    ...INITIAL_STATE,
    setInput: (v) => set({ input: v }),
    setError: (v) => set({ error: v }),
    initialize: (currentBalance) => set({ input: String(currentBalance), error: '' }),
    reset: () => set(INITIAL_STATE),
  })),
);
