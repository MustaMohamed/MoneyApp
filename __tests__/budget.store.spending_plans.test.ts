import type { SpendingPlansForMonthResult } from '@/modules/budget/repositories/budget.repository';
import { createBudgetStore, type BudgetStoreRepository } from '@/modules/budget/store/budget.store';

const NOW = '2026-07-01T00:00:00.000Z';

function plan(id: string, name: string) {
  return {
    id,
    name,
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    total_amount: 8000,
    created_at: NOW,
    updated_at: NOW,
    categories: [],
  };
}

jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: {
    copyBudgetsToMonth: jest.fn().mockResolvedValue(undefined),
    copyLimitsToMonth: jest.fn().mockResolvedValue(undefined),
    getCategoryGroups: jest.fn().mockResolvedValue({}),
    getExpectedIncome: jest.fn().mockResolvedValue(null),
    getRows: jest.fn().mockResolvedValue([]),
    getSpendByBudget: jest.fn().mockResolvedValue({}),
    getSpendByMonth: jest.fn().mockResolvedValue({}),
    getSpendingPlansForMonth: jest.fn().mockResolvedValue({ plans: [], spendByPlanId: {} }),
    removeBudget: jest.fn().mockResolvedValue(undefined),
    removeSpendingPlan: jest.fn().mockResolvedValue(undefined),
    setBudget: jest.fn().mockResolvedValue(undefined),
    setExpectedIncome: jest.fn().mockResolvedValue(undefined),
    setLimit: jest.fn().mockResolvedValue(undefined),
    setSpendingPlan: jest.fn().mockResolvedValue(undefined),
  },
  currentYearMonth: jest.fn(() => '2026-07'),
  lastMonths: jest.fn(() => ['2026-07']),
}));

const { budgetRepository } = jest.requireMock(
  '@/modules/budget/repositories/budget.repository',
) as {
  budgetRepository: jest.Mocked<BudgetStoreRepository>;
};

describe('budget store spending plans', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads plans with the selected month', async () => {
    budgetRepository.getSpendingPlansForMonth.mockResolvedValueOnce({
      plans: [plan('plan_trip', 'Trip')],
      spendByPlanId: { plan_trip: {} },
    });
    const store = createBudgetStore(budgetRepository);

    await store.getState().load('2026-08');

    expect(budgetRepository.getSpendingPlansForMonth).toHaveBeenCalledWith('2026-08');
    expect(store.getState().spendingPlans).toEqual([plan('plan_trip', 'Trip')]);
    expect(store.getState().spendingPlanSpendById).toEqual({ plan_trip: {} });
  });

  it('saves a plan and reloads the requested visible month', async () => {
    const store = createBudgetStore(budgetRepository);
    await store.getState().setSpendingPlan(
      {
        name: 'Trip',
        startDate: '2026-07-10',
        endDate: '2026-07-13',
        totalAmount: 8000,
        categories: [{ categoryId: 'cat_food' }],
      },
      '2026-08',
    );

    expect(budgetRepository.setSpendingPlan).toHaveBeenCalledWith({
      name: 'Trip',
      startDate: '2026-07-10',
      endDate: '2026-07-13',
      totalAmount: 8000,
      categories: [{ categoryId: 'cat_food' }],
    });
    expect(budgetRepository.getSpendingPlansForMonth).toHaveBeenCalledWith('2026-08');
  });

  it('removes a plan and reloads the selected month', async () => {
    const store = createBudgetStore(budgetRepository);
    await store.getState().removeSpendingPlan('plan_trip', '2026-08');

    expect(budgetRepository.removeSpendingPlan).toHaveBeenCalledWith('plan_trip');
    expect(budgetRepository.getSpendingPlansForMonth).toHaveBeenCalledWith('2026-08');
  });

  it('does not let an older month request overwrite a newer month request', async () => {
    let resolveJuly: ((value: SpendingPlansForMonthResult) => void) | undefined;
    let resolveAugust: ((value: SpendingPlansForMonthResult) => void) | undefined;
    budgetRepository.getSpendingPlansForMonth
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveJuly = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveAugust = resolve;
          }),
      );
    const store = createBudgetStore(budgetRepository);

    const julyLoad = store.getState().load('2026-07');
    const augustLoad = store.getState().load('2026-08');
    resolveAugust?.({ plans: [plan('august', 'August')], spendByPlanId: {} });
    await augustLoad;
    resolveJuly?.({ plans: [plan('july', 'July')], spendByPlanId: {} });
    await julyLoad;

    expect(store.getState().loadedMonth).toBe('2026-08');
    expect(store.getState().spendingPlans).toEqual([plan('august', 'August')]);
  });

  it('ignores an older failed request after a newer month has loaded', async () => {
    let rejectJuly: ((error: Error) => void) | undefined;
    budgetRepository.getSpendingPlansForMonth
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectJuly = reject;
          }),
      )
      .mockResolvedValueOnce({ plans: [plan('august', 'August')], spendByPlanId: {} });
    const store = createBudgetStore(budgetRepository);

    const julyLoad = store.getState().load('2026-07');
    const augustLoad = store.getState().load('2026-08');
    await augustLoad;
    rejectJuly?.(new Error('stale request failed'));
    await julyLoad;

    expect(store.getState().loadedMonth).toBe('2026-08');
    expect(store.getState().loadError).toBe(false);
  });
});
