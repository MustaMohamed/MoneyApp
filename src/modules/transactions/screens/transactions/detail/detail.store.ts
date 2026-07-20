import { create } from 'zustand';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface TxDetailStoreShape {
  tx: Transaction | null;
  txId: string | undefined;
}

type TxDetailStore = TxDetailStoreShape & {
  setTx: (id: string, tx: Transaction) => void;
  clearForId: (id: string) => void;
  reset: () => void;
};

const INITIAL_STATE: TxDetailStoreShape = {
  tx: null,
  txId: undefined,
};

export const useTxDetailStore = createMoneyAppSelectors(
  create<TxDetailStore>((set) => ({
    ...INITIAL_STATE,
    setTx: (txId, tx) => set({ tx, txId }),
    clearForId: (txId) => set({ tx: null, txId }),
    reset: () => set(INITIAL_STATE),
  })),
);
