import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface IncomeSheetStateShape {
  isOpen: boolean;
  amountText: string;
  suggestion: number | null;
  saving: boolean;
}

type IncomeSheetState = IncomeSheetStateShape & {
  open: (suggestion: number | null, currentIncome: number | null) => void;
  close: () => void;
  setAmountText: (text: string) => void;
  setSaving: (saving: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: IncomeSheetStateShape = {
  isOpen: false,
  amountText: '',
  suggestion: null,
  saving: false,
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

    close: () => set({ isOpen: false, saving: false }),

    setAmountText: (text) => set({ amountText: text }),
    setSaving: (saving) => set({ saving }),

    reset: () => set(INITIAL_STATE),
  })),
);
