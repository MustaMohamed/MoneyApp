import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface AddTransactionStoreShape {
  type: TransactionType;
  amountStr: string;
}

interface AddTransactionStore {
  state: AddTransactionStoreShape;
  setType: (type: TransactionType) => void;
  /**
   * Direct amount setter for the editable AmountHero TextInput (system
   * decimal-pad keyboard). Replaces the custom numpad UI; `handleNumpad`
   * stays for legacy hook tests but is no longer wired to any component.
   */
  setAmountStr: (value: string) => void;
  handleNumpad: (action: NumpadAction, value?: string) => void;
  reset: () => void;
}

const INITIAL_STATE: AddTransactionStoreShape = {
  type: TransactionType.Expense,
  amountStr: '0',
};

export const useAddTransactionStore = create<AddTransactionStore>((set) => ({
  state: INITIAL_STATE,

  setType: (type) => set((s) => ({ state: { ...s.state, type, amountStr: '0' } })),

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
