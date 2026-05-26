import { create } from 'zustand';

import type { Budget } from '@/database/entities/budget.entity';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';
import { budgetRepository, currentYearMonth, lastMonths } from '@/repositories/budget.repository';

const HISTORY_MONTHS = 12;
const EXPECTED_INCOME_KEY = 'expected_monthly_income';

interface BudgetStoreShape {
  rows: Budget[];
  // spend keyed { [categoryId]: { [yearMonth]: number } } over the loaded window
  spendByMonth: Record<string, Record<string, number>>;
  loaded: boolean;
  /** Expected monthly income in EGP. null = not yet set by the user. */
  expectedIncome: number | null;
}

interface BudgetStore {
  state: BudgetStoreShape;
  setData: (
    rows: Budget[],
    spendByMonth: Record<string, Record<string, number>>,
    expectedIncome: number | null,
  ) => void;
  load: () => Promise<void>;
  setLimit: (categoryId: string, limit: number) => Promise<void>;
  removeBudget: (categoryId: string) => Promise<void>;
  setExpectedIncome: (amount: number) => Promise<void>;
  /** Synchronous setter for tests — does not persist. */
  setExpectedIncomeLocal: (amount: number | null) => void;
  reset: () => void;
}

const INITIAL_STATE: BudgetStoreShape = {
  rows: [],
  spendByMonth: {},
  loaded: false,
  expectedIncome: null,
};

export function createBudgetStore(repo: IAppSettingsRepository) {
  return create<BudgetStore>((set, get) => ({
    state: INITIAL_STATE,

    setData: (rows, spendByMonth, expectedIncome) =>
      set((s) => ({ state: { ...s.state, rows, spendByMonth, expectedIncome, loaded: true } })),

    load: async () => {
      const months = lastMonths(currentYearMonth(), HISTORY_MONTHS);
      const [rows, spendByMonth, rawIncome] = await Promise.all([
        budgetRepository.getRows(),
        budgetRepository.getSpendByMonth(months),
        repo.get(EXPECTED_INCOME_KEY),
      ]);
      const expectedIncome = rawIncome !== null ? Number(rawIncome) : null;
      get().setData(rows, spendByMonth, expectedIncome);
    },

    setLimit: async (categoryId, limit) => {
      await budgetRepository.setLimit(categoryId, limit);
      await get().load();
    },

    removeBudget: async (categoryId) => {
      await budgetRepository.removeBudget(categoryId);
      await get().load();
    },

    setExpectedIncome: async (amount) => {
      await repo.set(EXPECTED_INCOME_KEY, String(amount));
      await get().load();
    },

    setExpectedIncomeLocal: (amount) =>
      set((s) => ({ state: { ...s.state, expectedIncome: amount } })),

    reset: () => set({ state: INITIAL_STATE }),
  }));
}

export const useBudgetStore = createBudgetStore(new AppSettingsRepository());
