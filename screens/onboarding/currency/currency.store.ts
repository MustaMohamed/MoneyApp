import { create } from 'zustand';
import type { Currency } from '@/constants/enums';

const INITIAL_STATE = { selected: undefined as Currency | undefined };

interface CurrencyStore {
  state: typeof INITIAL_STATE;
  setSelected: (currency: Currency) => void;
  reset: () => void;
}

export const useCurrencyStore = create<CurrencyStore>((set) => ({
  state: INITIAL_STATE,
  setSelected: (currency) => set((s) => ({ state: { ...s.state, selected: currency } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
