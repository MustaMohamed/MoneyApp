import { create } from 'zustand';
import type { Currency } from '@/constants/enums';

interface CurrencyStore {
  selected: Currency | undefined;
  setSelected: (currency: Currency) => void;
  reset: () => void;
}

export const useCurrencyStore = create<CurrencyStore>((set) => ({
  selected: undefined,
  setSelected: (currency) => set({ selected: currency }),
  reset: () => set({ selected: undefined }),
}));
