import { create } from 'zustand';

import type { Budget } from '@/modules/budget/entities/budget.entity';
import {
  budgetRepository,
  currentYearMonth,
  lastMonths,
  type SetBudgetInput,
  type SetSpendingPlanInput,
  type SpendingPlansForMonthResult,
} from '@/modules/budget/repositories/budget.repository';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

const HISTORY_MONTHS = 12;
const EXPECTED_INCOME_KEY = 'expected_monthly_income';

interface BudgetStoreShape {
  rows: Budget[];
  // spend keyed { [categoryId]: { [yearMonth]: number } } over the loaded window
  spendByMonth: Record<string, Record<string, number>>;
  spendingPlans: SpendingPlansForMonthResult['plans'];
  spendingPlanSpendById: SpendingPlansForMonthResult['spendByPlanId'];
  loaded: boolean;
  /** Expected monthly income in EGP. null = not yet set by the user. */
  expectedIncome: number | null;
}

type BudgetStore = BudgetStoreShape & {
  setData: (
    rows: Budget[],
    spendByMonth: Record<string, Record<string, number>>,
    expectedIncome: number | null,
    spendingPlans: SpendingPlansForMonthResult['plans'],
    spendingPlanSpendById: SpendingPlansForMonthResult['spendByPlanId'],
  ) => void;
  load: (anchorMonth?: string) => Promise<void>;
  setBudget: (input: SetBudgetInput) => Promise<void>;
  setLimit: (categoryId: string, limit: number, yearMonth?: string) => Promise<void>;
  removeBudget: (id: string, yearMonth?: string) => Promise<void>;
  setSpendingPlan: (input: SetSpendingPlanInput) => Promise<void>;
  removeSpendingPlan: (id: string, yearMonth?: string) => Promise<void>;
  copyBudgetsToMonth: (
    sourceMonth: string,
    targetMonth: string,
    budgetIds: string[],
  ) => Promise<void>;
  copyLimitsToMonth: (
    sourceMonth: string,
    targetMonth: string,
    categoryIds: string[],
  ) => Promise<void>;
  setExpectedIncome: (amount: number) => Promise<void>;
  /** Synchronous setter for tests — does not persist. */
  setExpectedIncomeLocal: (amount: number | null) => void;
  reset: () => void;
};

const INITIAL_STATE: BudgetStoreShape = {
  rows: [],
  spendByMonth: {},
  spendingPlans: [],
  spendingPlanSpendById: {},
  loaded: false,
  expectedIncome: null,
};

export function createBudgetStore(repo: IAppSettingsRepository) {
  return createMoneyAppSelectors(
    create<BudgetStore>((set, get) => ({
      ...INITIAL_STATE,

      setData: (rows, spendByMonth, expectedIncome, spendingPlans, spendingPlanSpendById) =>
        set({
          rows,
          spendByMonth,
          expectedIncome,
          spendingPlans,
          spendingPlanSpendById,
          loaded: true,
        }),

      load: async (anchorMonth = currentYearMonth()) => {
        const months = lastMonths(anchorMonth, HISTORY_MONTHS);
        const [rows, spendByMonth, rawIncome, planResult] = await Promise.all([
          budgetRepository.getRows(),
          budgetRepository.getSpendByMonth(months),
          repo.get(EXPECTED_INCOME_KEY),
          budgetRepository.getSpendingPlansForMonth(anchorMonth),
        ]);
        const expectedIncome = rawIncome !== null ? Number(rawIncome) : null;
        get().setData(
          rows,
          spendByMonth,
          expectedIncome,
          planResult.plans,
          planResult.spendByPlanId,
        );
      },

      setBudget: async (input) => {
        const anchorMonth = input.yearMonth ?? currentYearMonth();
        await budgetRepository.setBudget(input);
        await get().load(anchorMonth);
      },

      setLimit: async (categoryId, limit, yearMonth) => {
        const anchorMonth = yearMonth ?? currentYearMonth();
        if (yearMonth) await budgetRepository.setLimit(categoryId, limit, yearMonth);
        else await budgetRepository.setLimit(categoryId, limit);
        await get().load(anchorMonth);
      },

      removeBudget: async (id, yearMonth) => {
        const anchorMonth = yearMonth ?? currentYearMonth();
        if (yearMonth) await budgetRepository.removeBudget(id, yearMonth);
        else await budgetRepository.removeBudget(id);
        await get().load(anchorMonth);
      },

      setSpendingPlan: async (input) => {
        await budgetRepository.setSpendingPlan(input);
        await get().load(input.startDate.slice(0, 7));
      },

      removeSpendingPlan: async (id, yearMonth = currentYearMonth()) => {
        await budgetRepository.removeSpendingPlan(id);
        await get().load(yearMonth);
      },

      copyBudgetsToMonth: async (sourceMonth, targetMonth, budgetIds) => {
        await budgetRepository.copyBudgetsToMonth(sourceMonth, targetMonth, budgetIds);
        await get().load(targetMonth);
      },

      copyLimitsToMonth: async (sourceMonth, targetMonth, categoryIds) => {
        await budgetRepository.copyLimitsToMonth(sourceMonth, targetMonth, categoryIds);
        await get().load(targetMonth);
      },

      setExpectedIncome: async (amount) => {
        await repo.set(EXPECTED_INCOME_KEY, String(amount));
        await get().load();
      },

      setExpectedIncomeLocal: (amount) => set({ expectedIncome: amount }),

      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useBudgetStore = createBudgetStore(new AppSettingsRepository());
