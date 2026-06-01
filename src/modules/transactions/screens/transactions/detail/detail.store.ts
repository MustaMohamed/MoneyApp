import { signal, type ReadonlySignal } from '@preact/signals-react';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

type TxDetailSignalState = {
  tx: ReadonlySignal<Transaction | null | undefined>;
};

class TxDetailStore {
  private readonly tx = signal<Transaction | null | undefined>(undefined);

  readonly state: TxDetailSignalState = {
    tx: this.tx,
  };

  setTx = (tx: Transaction | null | undefined) => {
    this.tx.value = tx;
  };
  reset = () => {
    this.tx.value = undefined;
  };
}

const txDetailStore = new TxDetailStore();

export function useTxDetailStore(): TxDetailStore {
  return txDetailStore;
}
