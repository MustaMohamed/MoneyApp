import { makeAutoObservable } from 'mobx';

const INITIAL_READY = false;

export class AppReadyStore {
  ready = INITIAL_READY;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  markReady() {
    this.ready = true;
  }

  reset() {
    this.ready = INITIAL_READY;
  }
}

const appReadyStore = new AppReadyStore();

export function useAppReadyStore(): AppReadyStore {
  return appReadyStore;
}
