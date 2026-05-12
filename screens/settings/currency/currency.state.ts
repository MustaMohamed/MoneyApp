import { create } from 'zustand';

interface CurrencyScreenStateShape {
  isFetching: boolean;
  isSaving: boolean;
  fetchError: string;
}

interface CurrencyScreenState {
  state: CurrencyScreenStateShape;
  setFetching: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setFetchError: (msg: string) => void;
  reset: () => void;
}

const INITIAL_STATE: CurrencyScreenStateShape = {
  isFetching: false,
  isSaving: false,
  fetchError: '',
};

export function createCurrencyScreenState() {
  return create<CurrencyScreenState>((set) => ({
    state: INITIAL_STATE,
    setFetching: (v) => set((s) => ({ state: { ...s.state, isFetching: v } })),
    setSaving: (v) => set((s) => ({ state: { ...s.state, isSaving: v } })),
    setFetchError: (msg) => set((s) => ({ state: { ...s.state, fetchError: msg } })),
    reset: () => set({ state: INITIAL_STATE }),
  }));
}

export const useCurrencyScreenState = createCurrencyScreenState();
