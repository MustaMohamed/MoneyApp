import { create } from 'zustand';

import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import { formatMonthYear } from '@/utils/format_date';
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
    yearMonth?: string,
    monthLabel?: string,
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
  create<IncomeSheetState>((set) => ({
    ...INITIAL_STATE,

    open: (suggestion, currentIncome, yearMonth, monthLabel) => {
      const resolvedYearMonth = yearMonth ?? currentYearMonth();
      set({
        isOpen: true,
        suggestion,
        yearMonth: resolvedYearMonth,
        monthLabel: monthLabel ?? formatMonthYear(resolvedYearMonth),
        saving: false,
        errorMessage: undefined,
        amountText:
          currentIncome !== null
            ? String(currentIncome)
            : suggestion !== null
              ? String(suggestion)
              : '',
      });
    },

    close: () => set({ isOpen: false, saving: false, errorMessage: undefined }),

    setAmountText: (text) => set({ amountText: text, errorMessage: undefined }),
    setSaving: (saving) => set({ saving }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),

    reset: () => set(INITIAL_STATE),
  })),
);
