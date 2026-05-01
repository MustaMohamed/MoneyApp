import { create } from 'zustand';

interface CurrencyScreenState {
  isManualPanelOpen: boolean;
  setManualPanelOpen: (v: boolean) => void;
  reset: () => void;
}

export function createCurrencyScreenStore() {
  return create<CurrencyScreenState>((set) => ({
    isManualPanelOpen: false,
    setManualPanelOpen: (v) => set({ isManualPanelOpen: v }),
    reset: () => set({ isManualPanelOpen: false }),
  }));
}

export const useCurrencyScreenStore = createCurrencyScreenStore();
