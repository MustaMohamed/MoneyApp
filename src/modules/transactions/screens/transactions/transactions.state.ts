import { signal, type ReadonlySignal } from '@preact/signals-react';

type TransactionsSignalState = {
  refreshing: ReadonlySignal<boolean>;
};

class TransactionsState {
  private readonly refreshing = signal(false);

  readonly state: TransactionsSignalState = {
    refreshing: this.refreshing,
  };

  setRefreshing = (v: boolean) => {
    this.refreshing.value = v;
  };
  reset = () => {
    this.refreshing.value = false;
  };
}

const transactionsState = new TransactionsState();

export function useTransactionsState(): TransactionsState {
  return transactionsState;
}
