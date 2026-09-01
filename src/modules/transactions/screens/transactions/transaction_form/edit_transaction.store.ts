import { create } from 'zustand';

import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { formatStoredMoneyText } from '@/utils/money_text';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface EditTransactionStoreShape {
  amountStr: string;
  availableBudgets: Budget[];
  budgetId: string | undefined;
}

type EditTransactionStore = EditTransactionStoreShape & {
  loadFromTx: (tx: Transaction) => void;
  setAmountStr: (value: string) => void;
  setAvailableBudgets: (budgets: Budget[]) => void;
  setBudgetId: (budgetId: string | undefined) => void;
  reset: () => void;
};

const INITIAL_STATE: EditTransactionStoreShape = {
  amountStr: '',
  availableBudgets: [],
  budgetId: undefined,
};

export const useEditTransactionStore = createMoneyAppSelectors(
  create<EditTransactionStore>((set) => ({
    ...INITIAL_STATE,

    loadFromTx: (tx) =>
      set({
        // Prefill must equal the stored amount digit for digit; `String(tx.amount)` emits '1e-7'.
        amountStr: formatStoredMoneyText(tx.amount),
        availableBudgets: [],
        budgetId: tx.budget_id ?? undefined,
      }),

    setAmountStr: (value) => set({ amountStr: value }),
    setAvailableBudgets: (budgets) => set({ availableBudgets: budgets }),
    setBudgetId: (budgetId) => set({ budgetId }),

    reset: () => set(INITIAL_STATE),
  })),
);
