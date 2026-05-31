import { signal } from '@preact/signals-react';

const INITIAL_READY = false;

export class AppReadyStore {
  readonly state = {
    ready: signal(INITIAL_READY),
  };

  markReady = () => {
    this.state.ready.value = true;
  };

  reset = () => {
    this.state.ready.value = INITIAL_READY;
  };
}

const appReadyStore = new AppReadyStore();

export function useAppReady(): AppReadyStore {
  return appReadyStore;
}
