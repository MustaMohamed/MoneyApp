import { signal } from '@preact/signals-react';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

const tx = signal<Transaction | null | undefined>(undefined);

function setTx(next: Transaction | null | undefined): void {
  tx.value = next;
}

function reset(): void {
  tx.value = undefined;
}

export function useTxDetailStore() {
  return {
    state: {
      tx,
    },
    setTx,
    reset,
  };
}
