import { create } from 'zustand';

import { formatStoredMoneyText } from '@/utils/money_text';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface IncomeSheetStateShape {
  isOpen: boolean;
  amountText: string;
  suggestion: number | null;
  yearMonth: string | undefined;
  monthLabel: string | undefined;
  saving: boolean;
  errorMessage: string | undefined;
}

type IncomeSheetState = IncomeSheetStateShape & {
  open: (
    suggestion: number | null,
    currentIncome: number | null,
    yearMonth: string,
    monthLabel: string,
  ) => void;
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
  yearMonth: undefined,
  monthLabel: undefined,
  saving: false,
  errorMessage: undefined,
};

export const useIncomeSheetState = createMoneyAppSelectors(
  create<IncomeSheetState>((set, get) => ({
    ...INITIAL_STATE,

    open: (suggestion, currentIncome, yearMonth, monthLabel) => {
      if (get().saving) return;
      set({
        isOpen: true,
        suggestion,
        yearMonth,
        monthLabel,
        saving: false,
        errorMessage: undefined,
        // Not `String(...)`: exponent form fills the field with text `DECIMAL_PATTERN` rejects.
        amountText: formatStoredMoneyText(currentIncome ?? suggestion),
      });
    },

    close: () => {
      if (get().saving) return;
      set({ isOpen: false, errorMessage: undefined });
    },

    setAmountText: (text) => set({ amountText: text, errorMessage: undefined }),
    setSaving: (saving) => set({ saving }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),

    reset: () => set(INITIAL_STATE),
  })),
);
