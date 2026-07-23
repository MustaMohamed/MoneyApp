import { create } from 'zustand';

import type { Budget, BudgetMonthGroupMap } from '@/modules/budget/entities/budget.entity';
import {
  budgetRepository,
  currentYearMonth,
  type BudgetMonthSnapshot,
  type IBudgetRepository,
  type SetBudgetInput,
  type SetSpendingPlanInput,
  type SpendingPlansForMonthResult,
} from '@/modules/budget/repositories/budget.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type BudgetStoreRepository = Pick<
  IBudgetRepository,
  | 'copyBudgetsToMonth'
  | 'copyLimitsToMonth'
  | 'getCopyPreview'
  | 'getMonthSnapshot'
  | 'removeBudget'
  | 'removeSpendingPlan'
  | 'setBudget'
  | 'setExpectedIncome'
  | 'setLimit'
  | 'setSpendingPlan'
>;

interface BudgetStoreShape {
  rows: Budget[];
  spendByMonth: Record<string, Record<string, number>>;
  spendByBudgetId: Record<string, number>;
  spendingPlans: SpendingPlansForMonthResult['plans'];
  spendingPlanSpendById: SpendingPlansForMonthResult['spendByPlanId'];
  loadedMonth: string | undefined;
  loaded: boolean;
  loading: boolean;
  loadError: boolean;
  expectedIncome: number | null;
  budgetGroupByCategoryId: BudgetMonthGroupMap;
  incomeSuggestion: number | null;
  generation: number;
  copyPreviewRows: Budget[];
  copyPreviewSourceMonth: string | undefined;
  copyPreviewTargetMonth: string | undefined;
  copyPreviewLoaded: boolean;
  copyPreviewLoading: boolean;
  copyPreviewError: boolean;
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
    incomeSuggestion?: number | null,
  ) => void;
  load: (anchorMonth?: string) => Promise<void>;
  loadCopyPreview: (sourceMonth: string, targetMonth: string) => Promise<void>;
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
  loading: false,
  loadError: false,
  expectedIncome: null,
  budgetGroupByCategoryId: {},
  incomeSuggestion: null,
  generation: 0,
  copyPreviewRows: [],
  copyPreviewSourceMonth: undefined,
  copyPreviewTargetMonth: undefined,
  copyPreviewLoaded: false,
  copyPreviewLoading: false,
  copyPreviewError: false,
};

function publishSnapshot(snapshot: BudgetMonthSnapshot): Partial<BudgetStoreShape> {
  return {
    ...snapshot,
    loaded: true,
    loading: false,
    loadError: false,
  };
}

export function createBudgetStore(repo: BudgetStoreRepository = budgetRepository) {
  let dataGeneration = 0;
  let latestLoadRequest = 0;
  let latestRequestedMonth: string | undefined;
  let latestPreviewRequest = 0;
  let latestPreviewKey: string | undefined;
  const inFlightSnapshots = new Map<string, Promise<BudgetMonthSnapshot>>();
  const inFlightPreviews = new Map<string, Promise<Budget[]>>();

  const getSnapshotRequest = (month: string, generation: number) => {
    const key = `${generation}:${month}`;
    const existing = inFlightSnapshots.get(key);
    if (existing) return existing;

    const request = repo.getMonthSnapshot(month).finally(() => {
      if (inFlightSnapshots.get(key) === request) inFlightSnapshots.delete(key);
    });
    inFlightSnapshots.set(key, request);
    return request;
  };

  const getPreviewRequest = (sourceMonth: string, targetMonth: string, generation: number) => {
    const key = `${generation}:${sourceMonth}:${targetMonth}`;
    const existing = inFlightPreviews.get(key);
    if (existing) return existing;

    const request = repo.getCopyPreview(sourceMonth, targetMonth).finally(() => {
      if (inFlightPreviews.get(key) === request) inFlightPreviews.delete(key);
    });
    inFlightPreviews.set(key, request);
    return request;
  };

  return createMoneyAppSelectors(
    create<BudgetStore>((set, get) => {
      const invalidateData = () => {
        dataGeneration += 1;
        set({ generation: dataGeneration });
      };

      return {
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
          incomeSuggestion = null,
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
            incomeSuggestion,
            loaded: true,
            loading: false,
            loadError: false,
          }),

        load: async (anchorMonth = currentYearMonth()) => {
          latestRequestedMonth = anchorMonth;
          const requestId = ++latestLoadRequest;
          const requestGeneration = dataGeneration;
          set({ loading: true, loadError: false });
          try {
            const snapshot = await getSnapshotRequest(anchorMonth, requestGeneration);
            if (
              requestId !== latestLoadRequest ||
              anchorMonth !== latestRequestedMonth ||
              requestGeneration !== dataGeneration
            ) {
              return;
            }
            set(publishSnapshot(snapshot));
          } catch {
            if (
              requestId === latestLoadRequest &&
              anchorMonth === latestRequestedMonth &&
              requestGeneration === dataGeneration
            ) {
              set({ loading: false, loadError: true });
            }
          }
        },

        loadCopyPreview: async (sourceMonth, targetMonth) => {
          const requestGeneration = dataGeneration;
          const requestKey = `${requestGeneration}:${sourceMonth}:${targetMonth}`;
          const requestId = ++latestPreviewRequest;
          latestPreviewKey = requestKey;
          set({
            copyPreviewRows: [],
            copyPreviewSourceMonth: sourceMonth,
            copyPreviewTargetMonth: targetMonth,
            copyPreviewLoaded: false,
            copyPreviewLoading: true,
            copyPreviewError: false,
          });
          try {
            const rows = await getPreviewRequest(sourceMonth, targetMonth, requestGeneration);
            if (
              requestId !== latestPreviewRequest ||
              requestKey !== latestPreviewKey ||
              requestGeneration !== dataGeneration
            ) {
              return;
            }
            set({
              copyPreviewRows: rows,
              copyPreviewLoaded: true,
              copyPreviewLoading: false,
              copyPreviewError: false,
            });
          } catch {
            if (
              requestId === latestPreviewRequest &&
              requestKey === latestPreviewKey &&
              requestGeneration === dataGeneration
            ) {
              set({
                copyPreviewRows: [],
                copyPreviewLoaded: false,
                copyPreviewLoading: false,
                copyPreviewError: true,
              });
            }
          }
        },

        setBudget: async (input) => {
          const anchorMonth = input.yearMonth ?? currentYearMonth();
          await repo.setBudget(input);
          invalidateData();
          await get().load(anchorMonth);
        },

        setLimit: async (categoryId, limit, yearMonth) => {
          const anchorMonth = yearMonth ?? currentYearMonth();
          if (yearMonth) await repo.setLimit(categoryId, limit, yearMonth);
          else await repo.setLimit(categoryId, limit);
          invalidateData();
          await get().load(anchorMonth);
        },

        removeBudget: async (id, yearMonth) => {
          const anchorMonth = yearMonth ?? currentYearMonth();
          if (yearMonth) await repo.removeBudget(id, yearMonth);
          else await repo.removeBudget(id);
          invalidateData();
          await get().load(anchorMonth);
        },

        setSpendingPlan: async (input, anchorMonth = input.startDate.slice(0, 7)) => {
          await repo.setSpendingPlan(input);
          invalidateData();
          await get().load(anchorMonth);
        },

        removeSpendingPlan: async (id, yearMonth = currentYearMonth()) => {
          await repo.removeSpendingPlan(id);
          invalidateData();
          await get().load(yearMonth);
        },

        copyBudgetsToMonth: async (sourceMonth, targetMonth, budgetIds) => {
          await repo.copyBudgetsToMonth(sourceMonth, targetMonth, budgetIds);
          invalidateData();
          await get().load(targetMonth);
        },

        copyLimitsToMonth: async (sourceMonth, targetMonth, categoryIds) => {
          await repo.copyLimitsToMonth(sourceMonth, targetMonth, categoryIds);
          invalidateData();
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
          invalidateData();
          const requestedMonth = latestRequestedMonth;
          if (
            requestedMonth !== undefined &&
            (requestedMonth === yearMonth || get().loadedMonth !== requestedMonth)
          ) {
            await get().load(requestedMonth);
          }
        },

        setExpectedIncomeLocal: (amount) => set({ expectedIncome: amount }),

        reset: () => {
          dataGeneration += 1;
          latestLoadRequest += 1;
          latestRequestedMonth = undefined;
          latestPreviewRequest += 1;
          latestPreviewKey = undefined;
          inFlightSnapshots.clear();
          inFlightPreviews.clear();
          set({ ...INITIAL_STATE, generation: dataGeneration });
        },
      };
    }),
  );
}

export const useBudgetStore = createBudgetStore();
