import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface AddTransactionStoreShape {
  type: TransactionType;
  amountStr: string;
  availableBudgets: Budget[];
  budgetId: string | undefined;
  /** Set by the opener; the add hook reads it once for its `accountId` default. */
  initialAccountId: string | undefined;
}

type AddTransactionStore = AddTransactionStoreShape & {
  setType: (type: TransactionType) => void;
  setAmountStr: (value: string) => void;
  setAvailableBudgets: (budgets: Budget[]) => void;
  setBudgetId: (budgetId: string | undefined) => void;
  setInitialAccountId: (accountId: string | undefined) => void;
  reset: () => void;
};

const INITIAL_STATE: AddTransactionStoreShape = {
  type: TransactionType.Expense,
  amountStr: '',
  availableBudgets: [],
  budgetId: undefined,
  initialAccountId: undefined,
};

export const useAddTransactionStore = createMoneyAppSelectors(
  create<AddTransactionStore>((set) => ({
    ...INITIAL_STATE,

    setType: (type) => set({ type, availableBudgets: [], budgetId: undefined }),

    setAmountStr: (value) => set({ amountStr: value }),
    setAvailableBudgets: (budgets) => set({ availableBudgets: budgets }),
    setBudgetId: (budgetId) => set({ budgetId }),
    setInitialAccountId: (initialAccountId) => set({ initialAccountId }),

    reset: () => set(INITIAL_STATE),
  })),
);
