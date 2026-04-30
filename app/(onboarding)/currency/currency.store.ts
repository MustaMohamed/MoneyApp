import { create } from 'zustand';
import type { Currency } from '@/store/onboarding.store';

interface CurrencyStore {
  selected: Currency | null;
  setSelected: (currency: Currency) => void;
  reset: () => void;
}

export const useCurrencyStore = create<CurrencyStore>((set) => ({
  selected: null,
  setSelected: (currency) => set({ selected: currency }),
  reset: () => set({ selected: null }),
}));
