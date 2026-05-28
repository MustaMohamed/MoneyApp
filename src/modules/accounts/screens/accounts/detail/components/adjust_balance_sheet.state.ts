import { batch, type Signal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

type AdjustBalanceSheetState = {
  input: Signal<string>;
  error: Signal<string>;
};

type AdjustBalanceSheetActions = {
  setInput: (v: string) => void;
  setError: (v: string) => void;
  initialize: (currentBalance: number) => void;
  reset: () => void;
};

export function useAdjustBalanceSheetState(): {
  state: AdjustBalanceSheetState;
} & AdjustBalanceSheetActions {
  const input = useSignal('');
  const error = useSignal('');

  const setInput = useCallback(
    (v: string) => {
      input.value = v;
    },
    [input],
  );
  const setError = useCallback(
    (v: string) => {
      error.value = v;
    },
    [error],
  );
  const initialize = useCallback(
    (currentBalance: number) => {
      batch(() => {
        input.value = String(currentBalance);
        error.value = '';
      });
    },
    [error, input],
  );
  const reset = useCallback(() => {
    batch(() => {
      input.value = '';
      error.value = '';
    });
  }, [error, input]);

  return {
    state: { input, error },
    setInput,
    setError,
    initialize,
    reset,
  };
}
