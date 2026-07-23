import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CurrencyScreenStateShape {
  isFetching: boolean;
  isSaving: boolean;
  fetchError: string;
  saveError: string;
}

type CurrencyScreenState = CurrencyScreenStateShape & {
  setFetching: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setFetchError: (msg: string) => void;
  setSaveError: (msg: string) => void;
  reset: () => void;
};

const INITIAL_STATE: CurrencyScreenStateShape = {
  isFetching: false,
  isSaving: false,
  fetchError: '',
  saveError: '',
};

export function createCurrencyScreenState() {
  return createMoneyAppSelectors(
    create<CurrencyScreenState>((set) => ({
      ...INITIAL_STATE,
      setFetching: (v) => set({ isFetching: v }),
      setSaving: (v) => set({ isSaving: v }),
      setFetchError: (msg) => set({ fetchError: msg }),
      setSaveError: (msg) => set({ saveError: msg }),
      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useCurrencyScreenState = createCurrencyScreenState();
