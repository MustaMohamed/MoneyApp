import { signal } from '@preact/signals-react';

const refreshing = signal(false);

function setRefreshing(v: boolean): void {
  refreshing.value = v;
}

function reset(): void {
  refreshing.value = false;
}

export function useTransactionsState() {
  return {
    state: {
      refreshing,
    },
    setRefreshing,
    reset,
  };
}
