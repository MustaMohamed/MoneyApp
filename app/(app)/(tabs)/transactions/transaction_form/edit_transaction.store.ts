import { create } from 'zustand';

import type { Transaction } from '@/database/entities/transaction.entity';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface EditTransactionState {
  visible: boolean;
  editingTx: Transaction | null;
  amountStr: string;
  saving: boolean;
  showCategoryPicker: boolean;
  open: (tx: Transaction) => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  handleNumpad: (action: NumpadAction, value?: string) => void;
  setShowCategoryPicker: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  editingTx: null as Transaction | null,
  amountStr: '0',
  saving: false,
  showCategoryPicker: false,
};

export const useEditTransactionStore = create<EditTransactionState>((set) => ({
  visible: false,
  ...INITIAL_STATE,

  open: (tx: Transaction) =>
    set({
      visible: true,
      editingTx: tx,
      // Format amount: remove trailing ".0" for integers so numpad starts clean
      amountStr: tx.amount % 1 === 0 ? String(Math.floor(tx.amount)) : String(tx.amount),
    }),

  close: () => set({ visible: false, ...INITIAL_STATE }),

  setSaving: (saving) => set({ saving }),

  handleNumpad: (action, value) =>
    set((s) => {
      const prev = s.amountStr;
      if (action === 'backspace') return { amountStr: prev.length <= 1 ? '0' : prev.slice(0, -1) };
      if (action === 'decimal') return { amountStr: prev.includes('.') ? prev : prev + '.' };
      const digit = value ?? '';
      if (prev === '0') return { amountStr: digit === '0' ? '0' : digit };
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 2) return {};
      }
      return { amountStr: prev + digit };
    }),

  setShowCategoryPicker: (v) => set({ showCategoryPicker: v }),

  reset: () => set({ ...INITIAL_STATE }),
}));
