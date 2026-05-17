import { create } from 'zustand';

import type { Transaction } from '@/database/entities/transaction.entity';

interface TxDetailStoreShape {
  tx: Transaction | null | undefined;
}

interface TxDetailStore {
  state: TxDetailStoreShape;
  setTx: (tx: Transaction | null | undefined) => void;
  reset: () => void;
}

const INITIAL_STATE: TxDetailStoreShape = {
  tx: undefined,
};

export const useTxDetailStore = create<TxDetailStore>((set) => ({
  state: INITIAL_STATE,
  setTx: (tx) => set((s) => ({ state: { ...s.state, tx } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
