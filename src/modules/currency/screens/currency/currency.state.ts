import { batch, type Signal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

type CurrencyScreenState = {
  isFetching: Signal<boolean>;
  isSaving: Signal<boolean>;
  fetchError: Signal<string>;
};

type CurrencyScreenActions = {
  setFetching: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setFetchError: (msg: string) => void;
  reset: () => void;
};

export function useCurrencyScreenState(): {
  state: CurrencyScreenState;
} & CurrencyScreenActions {
  const isFetching = useSignal(false);
  const isSaving = useSignal(false);
  const fetchError = useSignal('');

  const setFetching = useCallback(
    (v: boolean) => {
      isFetching.value = v;
    },
    [isFetching],
  );

  const setSaving = useCallback(
    (v: boolean) => {
      isSaving.value = v;
    },
    [isSaving],
  );

  const setFetchError = useCallback(
    (msg: string) => {
      fetchError.value = msg;
    },
    [fetchError],
  );

  const reset = useCallback(() => {
    batch(() => {
      isFetching.value = false;
      isSaving.value = false;
      fetchError.value = '';
    });
  }, [fetchError, isFetching, isSaving]);

  return {
    state: {
      isFetching,
      isSaving,
      fetchError,
    },
    setFetching,
    setSaving,
    setFetchError,
    reset,
  };
}
