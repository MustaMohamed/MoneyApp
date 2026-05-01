import { create } from 'zustand';

interface CurrencyScreenState {
  isManualPanelOpen: boolean;
  setManualPanelOpen: (v: boolean) => void;
  reset: () => void;
}

export const useCurrencyScreenStore = create<CurrencyScreenState>((set) => ({
  isManualPanelOpen: false,
  setManualPanelOpen: (v) => set({ isManualPanelOpen: v }),
  reset: () => set({ isManualPanelOpen: false }),
}));
