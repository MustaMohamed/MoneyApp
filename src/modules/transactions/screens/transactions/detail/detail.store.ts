import { create } from 'zustand';

import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface TxDetailEntry {
  tx: Transaction | null;
  txId: string | undefined;
  budget: Budget | undefined;
  loadedAtVersion: number | undefined;
}

interface TxDetailStoreShape {
  entries: Record<string, TxDetailEntry>;
}

type TxDetailStore = TxDetailStoreShape & {
  setTx: (
    owner: string,
    id: string,
    tx: Transaction,
    loadedAtVersion: number,
    budget?: Budget,
  ) => void;
  setBudget: (owner: string, id: string, budgetId: string, budget: Budget | undefined) => void;
  clearForId: (owner: string, id: string) => void;
  release: (owner: string) => void;
  reset: () => void;
};

export const INITIAL_DATA_ENTRY: TxDetailEntry = Object.freeze({
  tx: null,
  txId: undefined,
  budget: undefined,
  loadedAtVersion: undefined,
});

const initialState = (): TxDetailStoreShape => ({ entries: {} });

const withEntry = (
  state: TxDetailStoreShape,
  owner: string,
  entry: TxDetailEntry,
): TxDetailStoreShape => ({ entries: { ...state.entries, [owner]: entry } });

export const useTxDetailStore = createMoneyAppSelectors(
  create<TxDetailStore>((set) => ({
    ...initialState(),
    setTx: (owner, txId, tx, loadedAtVersion, budget) =>
      set((state) => {
        const entry = state.entries[owner] ?? INITIAL_DATA_ENTRY;
        return withEntry(state, owner, {
          tx,
          txId,
          loadedAtVersion,
          budget:
            budget ??
            (entry.txId === txId && entry.tx?.budget_id === tx.budget_id
              ? entry.budget
              : undefined),
        });
      }),
    setBudget: (owner, txId, budgetId, budget) =>
      set((state) => {
        const entry = state.entries[owner] ?? INITIAL_DATA_ENTRY;
        if (entry.txId !== txId || entry.tx?.budget_id !== budgetId) return state;
        return withEntry(state, owner, { ...entry, budget });
      }),
    clearForId: (owner, txId) =>
      set((state) =>
        withEntry(state, owner, {
          tx: null,
          txId,
          budget: undefined,
          loadedAtVersion: undefined,
        }),
      ),
    release: (owner) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        const entries = { ...state.entries };
        delete entries[owner];
        return { entries };
      }),
    reset: () => set(initialState()),
  })),
);
