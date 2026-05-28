import { signal } from '@preact/signals-react';

const INITIAL_READY = false;

const ready = signal(INITIAL_READY);
const state = { ready };

function reset() {
  ready.value = INITIAL_READY;
}

function markReady() {
  ready.value = true;
}

export function useAppReady() {
  return {
    state,
    markReady,
    reset,
  };
}
