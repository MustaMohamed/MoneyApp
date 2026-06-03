import { batch, type Signal, signal } from '@preact/signals-react';

interface IncomeSheetStateShape {
  isOpen: Signal<boolean>;
  amountText: Signal<string>;
  suggestion: Signal<number | null>;
}

type IncomeSheetStateActions = {
  open: (suggestion: number | null, currentIncome: number | null) => void;
  close: () => void;
  setAmountText: (text: string) => void;
  reset: () => void;
};

type IncomeSheetStateController = { state: IncomeSheetStateShape } & IncomeSheetStateActions;

const isOpen = signal(false);
const amountText = signal('');
const suggestion = signal<number | null>(null);

const incomeSheetState: IncomeSheetStateController = {
  state: {
    isOpen,
    amountText,
    suggestion,
  },
  open: (nextSuggestion, currentIncome) => {
    batch(() => {
      isOpen.value = true;
      suggestion.value = nextSuggestion;
      amountText.value =
        currentIncome !== null
          ? String(currentIncome)
          : nextSuggestion !== null
            ? String(nextSuggestion)
            : '';
    });
  },
  close: () => {
    isOpen.value = false;
  },
  setAmountText: (text) => {
    amountText.value = text;
  },
  reset: () => {
    batch(() => {
      isOpen.value = false;
      amountText.value = '';
      suggestion.value = null;
    });
  },
};

export function useIncomeSheetState(): IncomeSheetStateController {
  return incomeSheetState;
}
