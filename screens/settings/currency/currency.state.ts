import { create } from 'zustand';

interface CurrencyScreenStateShape {
  isManualPanelOpen: boolean;
  isFetching: boolean;
  isSaving: boolean;
}

interface CurrencyScreenState {
  state: CurrencyScreenStateShape;
  setManualPanelOpen: (v: boolean) => void;
  setFetching: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: CurrencyScreenStateShape = {
  isManualPanelOpen: false,
  isFetching: false,
  isSaving: false,
};

export function createCurrencyScreenState() {
  return create<CurrencyScreenState>((set) => ({
    state: INITIAL_STATE,
    setManualPanelOpen: (v) => set((s) => ({ state: { ...s.state, isManualPanelOpen: v } })),
    setFetching: (v) => set((s) => ({ state: { ...s.state, isFetching: v } })),
    setSaving: (v) => set((s) => ({ state: { ...s.state, isSaving: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  }));
}

export const useCurrencyScreenState = createCurrencyScreenState();
