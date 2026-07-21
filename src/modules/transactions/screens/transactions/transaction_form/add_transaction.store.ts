import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AddTransactionStoreShape {
  type: TransactionType;
  amountStr: string;
  availableBudgets: Budget[];
  budgetId: string | undefined;
}

type AddTransactionStore = AddTransactionStoreShape & {
  setType: (type: TransactionType) => void;
  setAmountStr: (value: string) => void;
  setAvailableBudgets: (budgets: Budget[]) => void;
  setBudgetId: (budgetId: string | undefined) => void;
  reset: () => void;
};

const INITIAL_STATE: AddTransactionStoreShape = {
  type: TransactionType.Expense,
  amountStr: '',
  availableBudgets: [],
  budgetId: undefined,
};

export const useAddTransactionStore = createMoneyAppSelectors(
  create<AddTransactionStore>((set) => ({
    ...INITIAL_STATE,

    setType: (type) => set({ type, availableBudgets: [], budgetId: undefined }),

    setAmountStr: (value) => set({ amountStr: value }),
    setAvailableBudgets: (budgets) => set({ availableBudgets: budgets }),
    setBudgetId: (budgetId) => set({ budgetId }),

    reset: () => set(INITIAL_STATE),
  })),
);
