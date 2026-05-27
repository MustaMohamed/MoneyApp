import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

const INITIAL_READY = false;

const ready = signal(INITIAL_READY);
const state = { ready };

function markReady() {
  ready.value = true;
}

function reset() {
  ready.value = INITIAL_READY;
}

export function useAppReady() {
  useSignals();

  return {
    state,
    markReady,
    reset,
  };
}
