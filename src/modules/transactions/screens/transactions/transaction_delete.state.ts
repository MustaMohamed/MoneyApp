import { create } from 'zustand';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { type KeyedEntries, withEntry, withoutEntry } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface TransactionDeleteEntry {
  /** Kept after the close so the dialog's body outlives its fade-out. */
  transaction: Transaction;
  isOpen: boolean;
  busy: boolean;
  errorMessage: string | undefined;
}

type TransactionDeleteStateShape = KeyedEntries<TransactionDeleteEntry>;

type TransactionDeleteState = TransactionDeleteStateShape & {
  request: (owner: string, transaction: Transaction) => void;
  begin: (owner: string) => void;
  fail: (owner: string, errorMessage: string) => void;
  cancel: (owner: string) => void;
  succeed: (owner: string) => void;
  release: (owner: string) => void;
  reset: () => void;
};

const initialState = (): TransactionDeleteStateShape => ({ entries: {} });

export const useTransactionDeleteState = createMoneyAppSelectors(
  create<TransactionDeleteState>((set) => ({
    ...initialState(),
    request: (owner, transaction) =>
      set((state) =>
        owner in state.entries && state.entries[owner].busy
          ? state
          : withEntry(state, owner, {
              transaction,
              isOpen: true,
              busy: false,
              errorMessage: undefined,
            }),
      ),
    // A released owner can still hold a callback; none of these four writes its entry back.
    begin: (owner) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        const entry = state.entries[owner];
        if (!entry.isOpen || entry.busy) return state;
        return withEntry(state, owner, { ...entry, busy: true, errorMessage: undefined });
      }),
    fail: (owner, errorMessage) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        return withEntry(state, owner, { ...state.entries[owner], busy: false, errorMessage });
      }),
    cancel: (owner) =>
      set((state) => {
        if (!(owner in state.entries) || state.entries[owner].busy) return state;
        return withEntry(state, owner, {
          ...state.entries[owner],
          isOpen: false,
          errorMessage: undefined,
        });
      }),
    succeed: (owner) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        return withEntry(state, owner, {
          ...state.entries[owner],
          isOpen: false,
          busy: false,
          errorMessage: undefined,
        });
      }),
    release: (owner) => set((state) => withoutEntry(state, owner)),
    reset: () => set(initialState()),
  })),
);
