import { create } from 'zustand';

import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditTransactionStoreShape {
  editingTx: Transaction | null;
  amountStr: string;
  availableBudgets: Budget[];
  budgetId: string | undefined;
}

type EditTransactionStore = EditTransactionStoreShape & {
  loadFromTx: (tx: Transaction) => void;
  /**
   * Direct amount setter for the editable AmountHero TextInput (system
   * decimal-pad keyboard). Replaces the custom numpad UI; `handleNumpad`
   * stays for legacy hook tests but is no longer wired to any component.
   */
  setAmountStr: (value: string) => void;
  setAvailableBudgets: (budgets: Budget[]) => void;
  setBudgetId: (budgetId: string | undefined) => void;
  handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
  reset: () => void;
};

const INITIAL_STATE: EditTransactionStoreShape = {
  editingTx: null,
  amountStr: '0',
  availableBudgets: [],
  budgetId: undefined,
};

export const useEditTransactionStore = createMoneyAppSelectors(
  create<EditTransactionStore>((set) => ({
    ...INITIAL_STATE,

    loadFromTx: (tx) =>
      set({
        editingTx: tx,
        amountStr: String(tx.amount),
        availableBudgets: [],
        budgetId: tx.budget_id ?? undefined,
      }),

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
