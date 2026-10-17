import { create } from 'zustand';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export interface TransactionDeleteEntry {
  /** Kept after the close so the dialog's body outlives its fade-out. */
  transaction: Transaction;
  isOpen: boolean;
  busy: boolean;
  errorMessage: string | undefined;
}

interface TransactionDeleteStateShape {
  entries: Record<string, TransactionDeleteEntry>;
}

type TransactionDeleteState = TransactionDeleteStateShape & {
  request: (owner: string, transaction: Transaction) => void;
  begin: (owner: string) => void;
  fail: (owner: string, errorMessage: string) => void;
  cancel: (owner: string) => void;
  succeed: (owner: string) => void;
  release: (owner: string) => void;
  reset: () => void;
};

/** The owner's entry, `undefined` before its first request and after its release. */
export function deleteEntryOf(
  entries: Record<string, TransactionDeleteEntry>,
  owner: string,
): TransactionDeleteEntry | undefined {
  return entries[owner];
}

const initialState = (): TransactionDeleteStateShape => ({ entries: {} });

const withEntry = (
  state: TransactionDeleteStateShape,
  owner: string,
  entry: TransactionDeleteEntry,
): TransactionDeleteStateShape => ({ entries: { ...state.entries, [owner]: entry } });

export const useTransactionDeleteState = createMoneyAppSelectors(
  create<TransactionDeleteState>((set) => ({
    ...initialState(),
    request: (owner, transaction) =>
      set((state) =>
        deleteEntryOf(state.entries, owner)?.busy === true
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
        const entry = deleteEntryOf(state.entries, owner);
        if (entry === undefined || !entry.isOpen || entry.busy) return state;
        return withEntry(state, owner, { ...entry, busy: true, errorMessage: undefined });
      }),
    fail: (owner, errorMessage) =>
      set((state) => {
        const entry = deleteEntryOf(state.entries, owner);
        if (entry === undefined) return state;
        return withEntry(state, owner, { ...entry, busy: false, errorMessage });
      }),
    cancel: (owner) =>
      set((state) => {
        const entry = deleteEntryOf(state.entries, owner);
        if (entry === undefined || entry.busy) return state;
        return withEntry(state, owner, { ...entry, isOpen: false, errorMessage: undefined });
      }),
    succeed: (owner) =>
      set((state) => {
        const entry = deleteEntryOf(state.entries, owner);
        if (entry === undefined) return state;
        return withEntry(state, owner, {
          ...entry,
          isOpen: false,
          busy: false,
          errorMessage: undefined,
        });
      }),
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
