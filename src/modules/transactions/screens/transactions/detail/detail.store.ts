import { create } from 'zustand';

import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface TxDetailStoreShape {
  tx: Transaction | null;
  txId: string | undefined;
  budget: Budget | undefined;
}

type TxDetailStore = TxDetailStoreShape & {
  setTx: (id: string, tx: Transaction, budget?: Budget) => void;
  setBudget: (id: string, budgetId: string, budget: Budget | undefined) => void;
  clearForId: (id: string) => void;
  reset: () => void;
};

const INITIAL_STATE: TxDetailStoreShape = {
  tx: null,
  txId: undefined,
  budget: undefined,
};

export const useTxDetailStore = createMoneyAppSelectors(
  create<TxDetailStore>((set) => ({
    ...INITIAL_STATE,
    setTx: (txId, tx, budget) =>
      set((state) => ({
        tx,
        txId,
        budget:
          budget ??
          (state.txId === txId && state.tx?.budget_id === tx.budget_id ? state.budget : undefined),
      })),
    setBudget: (txId, budgetId, budget) =>
      set((state) => (state.txId === txId && state.tx?.budget_id === budgetId ? { budget } : {})),
    clearForId: (txId) => set({ tx: null, txId, budget: undefined }),
    reset: () => set(INITIAL_STATE),
  })),
);
