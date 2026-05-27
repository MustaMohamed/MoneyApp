import { create } from 'zustand';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

interface EditTransactionStoreShape {
  editingTx: Transaction | null;
  amountStr: string;
}

interface EditTransactionStore {
  state: EditTransactionStoreShape;
  loadFromTx: (tx: Transaction) => void;
  /**
   * Direct amount setter for the editable AmountHero TextInput (system
   * decimal-pad keyboard). Replaces the custom numpad UI; `handleNumpad`
   * stays for legacy hook tests but is no longer wired to any component.
   */
  setAmountStr: (value: string) => void;
  handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
  reset: () => void;
}

const INITIAL_STATE: EditTransactionStoreShape = {
  editingTx: null,
  amountStr: '0',
};

export const useEditTransactionStore = create<EditTransactionStore>((set) => ({
  state: INITIAL_STATE,

  loadFromTx: (tx) =>
    set({
      state: {
        editingTx: tx,
        amountStr: String(tx.amount),
      },
    }),

  setAmountStr: (value) => set((s) => ({ state: { ...s.state, amountStr: value } })),

  handleNumpad: (action, value) =>
    set((s) => {
      const prev = s.state.amountStr;
      if (action === 'backspace') {
        return { state: { ...s.state, amountStr: prev.length <= 1 ? '0' : prev.slice(0, -1) } };
      }
      if (action === 'decimal') {
        return { state: { ...s.state, amountStr: prev.includes('.') ? prev : prev + '.' } };
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
