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
  spendByBudgetId: Record<string, number>;
  spendingPlans: SpendingPlansForMonthResult['plans'];
  spendingPlanSpendById: SpendingPlansForMonthResult['spendByPlanId'];
  loadedMonth: string | undefined;
  loaded: boolean;
  loadError: boolean;
  /** Expected monthly income in EGP. null = not yet set by the user. */
  expectedIncome: number | null;
}

type BudgetStore = BudgetStoreShape & {
  setData: (
    rows: Budget[],
    spendByMonth: Record<string, Record<string, number>>,
    spendByBudgetId: Record<string, number>,
    expectedIncome: number | null,
    spendingPlans: SpendingPlansForMonthResult['plans'],
    spendingPlanSpendById: SpendingPlansForMonthResult['spendByPlanId'],
    loadedMonth?: string,
  ) => void;
  load: (anchorMonth?: string) => Promise<void>;
  setBudget: (input: SetBudgetInput) => Promise<void>;
  setLimit: (categoryId: string, limit: number, yearMonth?: string) => Promise<void>;
  removeBudget: (id: string, yearMonth?: string) => Promise<void>;
  setSpendingPlan: (input: SetSpendingPlanInput, anchorMonth?: string) => Promise<void>;
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
  spendByBudgetId: {},
  spendingPlans: [],
  spendingPlanSpendById: {},
  loadedMonth: undefined,
  loaded: false,
  loadError: false,
  expectedIncome: null,
};

export function createBudgetStore(repo: IAppSettingsRepository) {
  let latestLoadRequest = 0;
  return createMoneyAppSelectors(
    create<BudgetStore>((set, get) => ({
      ...INITIAL_STATE,

      setData: (
        rows,
        spendByMonth,
        spendByBudgetId,
        expectedIncome,
        spendingPlans,
        spendingPlanSpendById,
        loadedMonth,
      ) =>
        set({
          rows,
          spendByMonth,
          spendByBudgetId,
          expectedIncome,
          spendingPlans,
          spendingPlanSpendById,
          loadedMonth,
          loaded: true,
          loadError: false,
        }),

      load: async (anchorMonth = currentYearMonth()) => {
        const request = ++latestLoadRequest;
        set({ loadError: false });
        const months = lastMonths(anchorMonth, HISTORY_MONTHS);
        try {
          const [rows, spendByMonth, spendByBudgetId, rawIncome, planResult] = await Promise.all([
            budgetRepository.getRows(),
            budgetRepository.getSpendByMonth(months),
            budgetRepository.getSpendByBudget(months),
            repo.get(EXPECTED_INCOME_KEY),
            budgetRepository.getSpendingPlansForMonth(anchorMonth),
          ]);
          const expectedIncome = rawIncome !== null ? Number(rawIncome) : null;
          if (request !== latestLoadRequest) return;
          get().setData(
            rows,
            spendByMonth,
            spendByBudgetId,
            expectedIncome,
            planResult.plans,
            planResult.spendByPlanId,
            anchorMonth,
          );
        } catch {
          if (request === latestLoadRequest) set({ loadError: true });
        }
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

      setSpendingPlan: async (input, anchorMonth = input.startDate.slice(0, 7)) => {
        await budgetRepository.setSpendingPlan(input);
        await get().load(anchorMonth);
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

      reset: () => {
        latestLoadRequest += 1;
        set(INITIAL_STATE);
      },
    })),
  );
}

export const useBudgetStore = createBudgetStore(new AppSettingsRepository());
