import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface AddTransactionStoreShape {
  type: TransactionType;
  amountStr: string;
  availableBudgets: Budget[];
  budgetId: string | undefined;
}

type AddTransactionStore = AddTransactionStoreShape & {
  setType: (type: TransactionType) => void;
  /**
   * Direct amount setter for the editable AmountHero TextInput (system
   * decimal-pad keyboard). Replaces the custom numpad UI; `handleNumpad`
   * stays for legacy hook tests but is no longer wired to any component.
   */
  setAmountStr: (value: string) => void;
  setAvailableBudgets: (budgets: Budget[]) => void;
  setBudgetId: (budgetId: string | undefined) => void;
  handleNumpad: (action: NumpadAction, value?: string) => void;
  reset: () => void;
};

const INITIAL_STATE: AddTransactionStoreShape = {
  type: TransactionType.Expense,
  amountStr: '0',
  availableBudgets: [],
  budgetId: undefined,
};

export const useAddTransactionStore = createMoneyAppSelectors(
  create<AddTransactionStore>((set) => ({
    ...INITIAL_STATE,

    setType: (type) => set({ type, amountStr: '0', availableBudgets: [], budgetId: undefined }),

    setAmountStr: (value) => set({ amountStr: value }),
    setAvailableBudgets: (budgets) => set({ availableBudgets: budgets }),
    setBudgetId: (budgetId) => set({ budgetId }),

    handleNumpad: (action, value) =>
      set((s) => {
        const prev = s.amountStr;
        if (action === 'backspace') {
          return { amountStr: prev.length <= 1 ? '0' : prev.slice(0, -1) };
        }
        if (action === 'decimal') {
          return { amountStr: prev.includes('.') ? prev : prev + '.' };
        }
        const digit = value ?? '';
        if (prev === '0') {
          return { amountStr: digit === '0' ? '0' : digit };
        }
        if (prev.includes('.')) {
          const parts = prev.split('.');
          if (parts[1].length >= 2) return {};
        }
        return { amountStr: prev + digit };
      }),

    reset: () => set(INITIAL_STATE),
  })),
);
