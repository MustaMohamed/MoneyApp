import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AdjustBalanceSheetStateShape {
  /** Magnitude only; the sign lives in `isNegative` because the decimal keypad has no minus key. */
  input: string;
  isNegative: boolean;
  error: string;
}

type AdjustBalanceSheetState = AdjustBalanceSheetStateShape & {
  setInput: (v: string) => void;
  setNegative: (v: boolean) => void;
  setError: (v: string) => void;
  initialize: (currentBalance: number) => void;
  reset: () => void;
};

const INITIAL_STATE: AdjustBalanceSheetStateShape = {
  input: '',
  isNegative: false,
  error: '',
};

export const useAdjustBalanceSheetState = createMoneyAppSelectors(
  create<AdjustBalanceSheetState>((set) => ({
    ...INITIAL_STATE,
    setInput: (v) => set({ input: v }),
    setNegative: (v) => set({ isNegative: v }),
    setError: (v) => set({ error: v }),
    initialize: (currentBalance) =>
      set({
        input: String(Math.abs(currentBalance)),
        isNegative: currentBalance < 0,
        error: '',
      }),
    reset: () => set(INITIAL_STATE),
  })),
);
