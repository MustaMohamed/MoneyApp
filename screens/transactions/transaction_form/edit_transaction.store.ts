import { create } from 'zustand';

import type { Transaction } from '@/database/entities/transaction.entity';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface EditTransactionStoreShape {
  editingTx: Transaction | null;
  amountStr: string;
}

interface EditTransactionStore {
  state: EditTransactionStoreShape;
  loadFromTx: (tx: Transaction) => void;
  handleNumpad: (action: NumpadAction, value?: string) => void;
  reset: () => void;
}

const INITIAL_STATE: EditTransactionStoreShape = {
  editingTx: null,
  amountStr: '0',
};

export const useEditTransactionStore = create<EditTransactionStore>((set) => ({
  state: INITIAL_STATE,

  loadFromTx: (tx) =>
    set((s) => ({
      state: {
        ...s.state,
        editingTx: tx,
        // Format amount: remove trailing ".0" for integers so numpad starts clean
        amountStr: tx.amount % 1 === 0 ? String(Math.floor(tx.amount)) : String(tx.amount),
      },
    })),

  handleNumpad: (action, value) =>
    set((s) => {
      const prev = s.state.amountStr;
      if (action === 'backspace') {
        return {
          state: { ...s.state, amountStr: prev.length <= 1 ? '0' : prev.slice(0, -1) },
        };
      }
      if (action === 'decimal') {
        return {
          state: { ...s.state, amountStr: prev.includes('.') ? prev : prev + '.' },
        };
      }
      const digit = value ?? '';
      if (prev === '0') {
        return { state: { ...s.state, amountStr: digit === '0' ? '0' : digit } };
      }
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 2) return {};
      }
      return { state: { ...s.state, amountStr: prev + digit } };
    }),

  reset: () => set({ state: INITIAL_STATE }),
}));
