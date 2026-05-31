import { signal } from '@preact/signals-react';
import { useCallback } from 'react';

const INITIAL_READY = false;

const ready = signal(INITIAL_READY);

export function useAppReady() {
  const reset = useCallback(() => {
    ready.value = INITIAL_READY;
  }, []);

  const markReady = useCallback(() => {
    ready.value = true;
  }, []);

  return {
    state: {
      ready,
    },
    markReady,
    reset,
  };
}
