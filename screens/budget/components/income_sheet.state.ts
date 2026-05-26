import { create } from 'zustand';

interface IncomeSheetStateShape {
  isOpen: boolean;
  amountText: string;
  suggestion: number | null;
}

interface IncomeSheetState {
  state: IncomeSheetStateShape;
  open: (suggestion: number | null, currentIncome: number | null) => void;
  close: () => void;
  setAmountText: (text: string) => void;
  reset: () => void;
}

const INITIAL_STATE: IncomeSheetStateShape = {
  isOpen: false,
  amountText: '',
  suggestion: null,
};

export const useIncomeSheetState = create<IncomeSheetState>((set) => ({
  state: INITIAL_STATE,

  open: (suggestion, currentIncome) =>
    set((s) => ({
      state: {
        ...s.state,
        isOpen: true,
        suggestion,
        amountText:
          currentIncome !== null
            ? String(currentIncome)
            : suggestion !== null
              ? String(suggestion)
              : '',
      },
    })),

  close: () => set((s) => ({ state: { ...s.state, isOpen: false } })),

  setAmountText: (text) => set((s) => ({ state: { ...s.state, amountText: text } })),

  reset: () => set({ state: INITIAL_STATE }),
}));
