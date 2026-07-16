import { create } from 'zustand';

import type { Budget, BudgetMonthGroupMap } from '@/modules/budget/entities/budget.entity';
import {
  budgetRepository,
  currentYearMonth,
  lastMonths,
  type IBudgetRepository,
  type SetBudgetInput,
  type SetSpendingPlanInput,
  type SpendingPlansForMonthResult,
} from '@/modules/budget/repositories/budget.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

const HISTORY_MONTHS = 12;

export type BudgetStoreRepository = Pick<
  IBudgetRepository,
  | 'copyBudgetsToMonth'
  | 'copyLimitsToMonth'
  | 'getCategoryGroups'
  | 'getExpectedIncome'
  | 'getRows'
  | 'getSpendByBudget'
  | 'getSpendByMonth'
  | 'getSpendingPlansForMonth'
  | 'removeBudget'
  | 'removeSpendingPlan'
  | 'setBudget'
  | 'setExpectedIncome'
  | 'setLimit'
  | 'setSpendingPlan'
>;

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
  budgetGroupByCategoryId: BudgetMonthGroupMap;
}

interface SetExpectedIncomeAction {
  (yearMonth: string, amount: number): Promise<void>;
  (amount: number): Promise<void>;
}

type BudgetStore = BudgetStoreShape & {
  setData: (
    rows: Budget[],
    spendByMonth: Record<string, Record<string, number>>,
    spendByBudgetId: Record<string, number>,
    expectedIncome: number | null,
    budgetGroupByCategoryId: BudgetMonthGroupMap,
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
  setExpectedIncome: SetExpectedIncomeAction;
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
  budgetGroupByCategoryId: {},
};

export function createBudgetStore(repo: BudgetStoreRepository = budgetRepository) {
  let latestLoadRequest = 0;
  let latestRequestedMonth: string | undefined;
  return createMoneyAppSelectors(
    create<BudgetStore>((set, get) => ({
      ...INITIAL_STATE,

      setData: (
        rows,
        spendByMonth,
        spendByBudgetId,
        expectedIncome,
        budgetGroupByCategoryId,
        spendingPlans,
        spendingPlanSpendById,
        loadedMonth,
      ) =>
        set({
          rows,
          spendByMonth,
          spendByBudgetId,
          expectedIncome,
          budgetGroupByCategoryId,
          spendingPlans,
          spendingPlanSpendById,
          loadedMonth,
          loaded: true,
          loadError: false,
        }),

      load: async (anchorMonth = currentYearMonth()) => {
        latestRequestedMonth = anchorMonth;
        const request = ++latestLoadRequest;
        set({ loadError: false });
        const months = lastMonths(anchorMonth, HISTORY_MONTHS);
        try {
          const [
            rows,
            spendByMonth,
            spendByBudgetId,
            expectedIncome,
            budgetGroupByCategoryId,
            planResult,
          ] = await Promise.all([
            repo.getRows(),
            repo.getSpendByMonth(months),
            repo.getSpendByBudget(months),
            repo.getExpectedIncome(anchorMonth),
            repo.getCategoryGroups(anchorMonth),
            repo.getSpendingPlansForMonth(anchorMonth),
          ]);
          if (request !== latestLoadRequest) return;
          get().setData(
            rows,
            spendByMonth,
            spendByBudgetId,
            expectedIncome,
            budgetGroupByCategoryId,
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
        await repo.setBudget(input);
        await get().load(anchorMonth);
      },

      setLimit: async (categoryId, limit, yearMonth) => {
        const anchorMonth = yearMonth ?? currentYearMonth();
        if (yearMonth) await repo.setLimit(categoryId, limit, yearMonth);
        else await repo.setLimit(categoryId, limit);
        await get().load(anchorMonth);
      },

      removeBudget: async (id, yearMonth) => {
        const anchorMonth = yearMonth ?? currentYearMonth();
        if (yearMonth) await repo.removeBudget(id, yearMonth);
        else await repo.removeBudget(id);
        await get().load(anchorMonth);
      },

      setSpendingPlan: async (input, anchorMonth = input.startDate.slice(0, 7)) => {
        await repo.setSpendingPlan(input);
        await get().load(anchorMonth);
      },

      removeSpendingPlan: async (id, yearMonth = currentYearMonth()) => {
        await repo.removeSpendingPlan(id);
        await get().load(yearMonth);
      },

      copyBudgetsToMonth: async (sourceMonth, targetMonth, budgetIds) => {
        await repo.copyBudgetsToMonth(sourceMonth, targetMonth, budgetIds);
        await get().load(targetMonth);
      },

      copyLimitsToMonth: async (sourceMonth, targetMonth, categoryIds) => {
        await repo.copyLimitsToMonth(sourceMonth, targetMonth, categoryIds);
        await get().load(targetMonth);
      },

      setExpectedIncome: async (yearMonthOrAmount: string | number, amount?: number) => {
        const yearMonth =
          typeof yearMonthOrAmount === 'string'
            ? yearMonthOrAmount
            : (get().loadedMonth ?? currentYearMonth());
        const expectedIncome =
          typeof yearMonthOrAmount === 'string' ? Number(amount) : yearMonthOrAmount;
        await repo.setExpectedIncome(yearMonth, expectedIncome);
        if (latestRequestedMonth === yearMonth) await get().load(yearMonth);
      },

      setExpectedIncomeLocal: (amount) => set({ expectedIncome: amount }),

      reset: () => {
        latestLoadRequest += 1;
        latestRequestedMonth = undefined;
        set(INITIAL_STATE);
      },
    })),
  );
}

export const useBudgetStore = createBudgetStore();
