import { batch, type ReadonlySignal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

type IncomeSheetStateShape = {
  isOpen: ReadonlySignal<boolean>;
  amountText: ReadonlySignal<string>;
  suggestion: ReadonlySignal<number | null>;
};

type IncomeSheetStateActions = {
  open: (suggestion: number | null, currentIncome: number | null) => void;
  close: () => void;
  setAmountText: (text: string) => void;
  reset: () => void;
};

export type IncomeSheetStateSetup = { state: IncomeSheetStateShape } & IncomeSheetStateActions;

export function useIncomeSheetState(): IncomeSheetStateSetup {
  const isOpen = useSignal(false);
  const amountText = useSignal('');
  const suggestion = useSignal<number | null>(null);

  const open = useCallback(
    (nextSuggestion: number | null, currentIncome: number | null) => {
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
    [amountText, isOpen, suggestion],
  );

  const close = useCallback(() => {
    isOpen.value = false;
  }, [isOpen]);

  const setAmountText = useCallback(
    (text: string) => {
      amountText.value = text;
    },
    [amountText],
  );

  const reset = useCallback(() => {
    batch(() => {
      isOpen.value = false;
      amountText.value = '';
      suggestion.value = null;
    });
  }, [amountText, isOpen, suggestion]);

  return {
    state: { isOpen, amountText, suggestion },
    open,
    close,
    setAmountText,
    reset,
  };
}
