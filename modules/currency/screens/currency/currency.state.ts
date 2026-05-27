import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CurrencyScreenStateShape {
  isFetching: boolean;
  isSaving: boolean;
  fetchError: string;
}

type CurrencyScreenState = CurrencyScreenStateShape & {
  setFetching: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setFetchError: (msg: string) => void;
  reset: () => void;
};

const INITIAL_STATE: CurrencyScreenStateShape = {
  isFetching: false,
  isSaving: false,
  fetchError: '',
};

export function createCurrencyScreenState() {
  return createMoneyAppSelectors(
    create<CurrencyScreenState>((set) => ({
      ...INITIAL_STATE,
      setFetching: (v) => set((s) => ({ ...s, isFetching: v })),
      setSaving: (v) => set((s) => ({ ...s, isSaving: v })),
      setFetchError: (msg) => set((s) => ({ ...s, fetchError: msg })),
      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useCurrencyScreenState = createCurrencyScreenState();
