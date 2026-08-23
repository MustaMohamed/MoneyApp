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
        // Not `String(...)`: the mask on `setAmountText` runs on `onChangeText`
        // and never on a prefill, so a stored value whose `String()` is
        // exponent form fills a field the mask then refuses to backspace.
        // Reachable at the low end -- `expected_income`'s CHECK is only
        // `> 0 AND <= 9007199254740991` (migrations/016:6-10), and 016's own
        // backfill inserts `CAST(TRIM(value) AS REAL)` from a legacy
        // `app_settings` string under GLOB guards that admit '0.0000001',
        // where the form's 0.01 floor (`parsePositiveDecimal`) never runs.
        // `String(1e-7)` is '1e-7'. `formatStoredMoneyText(null)` is '', which
        // is why the nested ternary collapses to one `??`.
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
