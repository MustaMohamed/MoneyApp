import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface IncomeSheetStateShape {
  isOpen: boolean;
  amountText: string;
  suggestion: number | null;
  saving: boolean;
  errorMessage: string | undefined;
}

type IncomeSheetState = IncomeSheetStateShape & {
  open: (suggestion: number | null, currentIncome: number | null) => void;
  close: () => void;
  setAmountText: (text: string) => void;
  setSaving: (saving: boolean) => void;
  setErrorMessage: (message: string | undefined) => void;
  reset: () => void;
};

const INITIAL_STATE: IncomeSheetStateShape = {
  isOpen: false,
  amountText: '',
  suggestion: null,
  saving: false,
  errorMessage: undefined,
};

export const useIncomeSheetState = createMoneyAppSelectors(
  create<IncomeSheetState>((set) => ({
    ...INITIAL_STATE,

    open: (suggestion, currentIncome) =>
      set({
        isOpen: true,
        suggestion,
        amountText:
          currentIncome !== null
            ? String(currentIncome)
            : suggestion !== null
              ? String(suggestion)
              : '',
      }),

    close: () => set({ isOpen: false, saving: false, errorMessage: undefined }),

    setAmountText: (text) => set({ amountText: text, errorMessage: undefined }),
    setSaving: (saving) => set({ saving }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),

    reset: () => set(INITIAL_STATE),
  })),
);
