import { create } from 'zustand';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface TxDetailStoreShape {
  tx: Transaction | null | undefined;
}

type TxDetailStore = TxDetailStoreShape & {
  setTx: (tx: Transaction | null | undefined) => void;
  reset: () => void;
};

const INITIAL_STATE: TxDetailStoreShape = {
  tx: undefined,
};

export const useTxDetailStore = createMoneyAppSelectors(
  create<TxDetailStore>((set) => ({
    ...INITIAL_STATE,
    setTx: (tx) => set({ tx }),
    reset: () => set(INITIAL_STATE),
  })),
);
