import { create } from 'zustand';

import type { Budget } from '@/database/entities/budget.entity';
import { budgetRepository, currentYearMonth, lastMonths } from '@/repositories/budget.repository';

const HISTORY_MONTHS = 12;

interface BudgetStoreShape {
  rows: Budget[];
  // spend keyed { [categoryId]: { [yearMonth]: number } } over the loaded window
  spendByMonth: Record<string, Record<string, number>>;
  loaded: boolean;
}

interface BudgetStore {
  state: BudgetStoreShape;
  setData: (rows: Budget[], spendByMonth: Record<string, Record<string, number>>) => void;
  load: () => Promise<void>;
  setLimit: (categoryId: string, limit: number) => Promise<void>;
  removeBudget: (categoryId: string) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: BudgetStoreShape = { rows: [], spendByMonth: {}, loaded: false };

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  state: INITIAL_STATE,
  setData: (rows, spendByMonth) =>
    set((s) => ({ state: { ...s.state, rows, spendByMonth, loaded: true } })),
  load: async () => {
    const months = lastMonths(currentYearMonth(), HISTORY_MONTHS);
    const [rows, spendByMonth] = await Promise.all([
      budgetRepository.getRows(),
      budgetRepository.getSpendByMonth(months),
    ]);
    get().setData(rows, spendByMonth);
  },
  setLimit: async (categoryId, limit) => {
    await budgetRepository.setLimit(categoryId, limit);
    await get().load();
  },
  removeBudget: async (categoryId) => {
    await budgetRepository.removeBudget(categoryId);
    await get().load();
  },
  reset: () => set({ state: INITIAL_STATE }),
}));
