import { create } from 'zustand';

interface CurrencyScreenStateShape {
  isManualPanelOpen: boolean;
  isFetching: boolean;
  isSaving: boolean;
  fetchError: string;
}

interface CurrencyScreenState {
  state: CurrencyScreenStateShape;
  setManualPanelOpen: (v: boolean) => void;
  setFetching: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setFetchError: (msg: string) => void;
  reset: () => void;
}

const INITIAL_STATE: CurrencyScreenStateShape = {
  isManualPanelOpen: false,
  isFetching: false,
  isSaving: false,
  fetchError: '',
};

export function createCurrencyScreenState() {
  return create<CurrencyScreenState>((set) => ({
    state: INITIAL_STATE,
    setManualPanelOpen: (v) => set((s) => ({ state: { ...s.state, isManualPanelOpen: v } })),
    setFetching: (v) => set((s) => ({ state: { ...s.state, isFetching: v } })),
    setSaving: (v) => set((s) => ({ state: { ...s.state, isSaving: v } })),
    setFetchError: (msg) => set((s) => ({ state: { ...s.state, fetchError: msg } })),
    reset: () => set({ state: INITIAL_STATE }),
  }));
}

export const useCurrencyScreenState = createCurrencyScreenState();
