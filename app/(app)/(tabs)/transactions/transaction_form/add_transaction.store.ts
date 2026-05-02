import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface AddTransactionState {
  visible: boolean;
  type: TransactionType;
  amountStr: string;
  saving: boolean;
  showAccountPicker: boolean;
  showToPicker: boolean;
  showCategoryPicker: boolean;
  open: () => void;
  close: () => void;
  setType: (type: TransactionType) => void;
  handleNumpad: (action: NumpadAction, value?: string) => void;
  setSaving: (v: boolean) => void;
  setShowAccountPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  type: TransactionType.Expense,
  amountStr: '0',
  saving: false,
  showAccountPicker: false,
  showToPicker: false,
  showCategoryPicker: false,
};

export const useAddTransactionStore = create<AddTransactionState>((set) => ({
  visible: false,
  ...INITIAL_STATE,

  open: () => set({ visible: true }),
  close: () => set({ visible: false, ...INITIAL_STATE }),

  setType: (type) => set({ type, amountStr: '0' }),

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

  setSaving: (saving) => set({ saving }),
  setShowAccountPicker: (v) => set({ showAccountPicker: v }),
  setShowToPicker: (v) => set({ showToPicker: v }),
  setShowCategoryPicker: (v) => set({ showCategoryPicker: v }),

  reset: () => set({ ...INITIAL_STATE }),
}));
