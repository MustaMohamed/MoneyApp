import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface AddTransactionStoreShape {
  type: TransactionType;
  amountStr: string;
}

type AddTransactionStore = AddTransactionStoreShape & {
  setType: (type: TransactionType) => void;
  /**
   * Direct amount setter for the editable AmountHero TextInput (system
   * decimal-pad keyboard). Replaces the custom numpad UI; `handleNumpad`
   * stays for legacy hook tests but is no longer wired to any component.
   */
  setAmountStr: (value: string) => void;
  handleNumpad: (action: NumpadAction, value?: string) => void;
  reset: () => void;
};

const INITIAL_STATE: AddTransactionStoreShape = {
  type: TransactionType.Expense,
  amountStr: '0',
};

export const useAddTransactionStore = createMoneyAppSelectors(
  create<AddTransactionStore>((set) => ({
    ...INITIAL_STATE,

    setType: (type) => set((s) => ({ ...s, type, amountStr: '0' })),

    setAmountStr: (value) => set((s) => ({ ...s, amountStr: value })),

    handleNumpad: (action, value) =>
      set((s) => {
        const prev = s.amountStr;
        if (action === 'backspace') {
          return { ...s, amountStr: prev.length <= 1 ? '0' : prev.slice(0, -1) };
        }
        if (action === 'decimal') {
          return { ...s, amountStr: prev.includes('.') ? prev : prev + '.' };
        }
        const digit = value ?? '';
        if (prev === '0') {
          return { ...s, amountStr: digit === '0' ? '0' : digit };
        }
        if (prev.includes('.')) {
          const parts = prev.split('.');
          if (parts[1].length >= 2) return {};
        }
        return { ...s, amountStr: prev + digit };
      }),

    reset: () => set(INITIAL_STATE),
  })),
);
