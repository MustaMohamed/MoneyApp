import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CurrencyScreenStateShape {
  isFetching: boolean;
  isSaving: boolean;
  fetchError: string;
  /** Not one of the two error slots: the rate is implausible but nothing failed. */
  rateWarning: string;
  saveError: string;
}

type CurrencyScreenState = CurrencyScreenStateShape & {
  setFetching: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setFetchError: (msg: string) => void;
  setRateWarning: (msg: string) => void;
  setSaveError: (msg: string) => void;
  reset: () => void;
};

const INITIAL_STATE: CurrencyScreenStateShape = {
  isFetching: false,
  isSaving: false,
  fetchError: '',
  rateWarning: '',
  saveError: '',
};

export function createCurrencyScreenState() {
  return createMoneyAppSelectors(
    create<CurrencyScreenState>((set) => ({
      ...INITIAL_STATE,
      setFetching: (v) => set({ isFetching: v }),
      setSaving: (v) => set({ isSaving: v }),
      setFetchError: (msg) => set({ fetchError: msg }),
      setRateWarning: (msg) => set({ rateWarning: msg }),
      setSaveError: (msg) => set({ saveError: msg }),
      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useCurrencyScreenState = createCurrencyScreenState();
