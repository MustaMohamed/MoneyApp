import type { BudgetMonthSnapshot } from '@/modules/budget/repositories/budget.repository';
import { createBudgetStore, type BudgetStoreRepository } from '@/modules/budget/store/budget.store';
import { deferred } from '@/test_helpers/deferred';

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

function snapshot(
  loadedMonth: string,
  overrides: Partial<BudgetMonthSnapshot> = {},
): BudgetMonthSnapshot {
  return {
    loadedMonth,
    rows: [],
    spendByMonth: {},
    spendByBudgetId: {},
    expectedIncome: null,
    budgetGroupByCategoryId: {},
    spendingPlans: [],
    spendingPlanSpendById: {},
    incomeSuggestion: null,
    ...overrides,
  };
}

jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: {
    copyBudgetsToMonth: jest.fn().mockResolvedValue(undefined),
    copyLimitsToMonth: jest.fn().mockResolvedValue(undefined),
    getCopyPreview: jest.fn().mockResolvedValue([]),
    getMonthSnapshot: jest.fn(),
    removeBudget: jest.fn().mockResolvedValue(undefined),
    removeSpendingPlan: jest.fn().mockResolvedValue(undefined),
    setBudget: jest.fn().mockResolvedValue(undefined),
    setExpectedIncome: jest.fn().mockResolvedValue(undefined),
    setLimit: jest.fn().mockResolvedValue(undefined),
    setSpendingPlan: jest.fn().mockResolvedValue(undefined),
  },
  currentYearMonth: jest.fn(() => '2026-07'),
}));

const { budgetRepository } = jest.requireMock(
  '@/modules/budget/repositories/budget.repository',
) as {
  budgetRepository: jest.Mocked<BudgetStoreRepository>;
};

describe('budget store spending plans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    budgetRepository.getMonthSnapshot.mockImplementation(async (month) => snapshot(month));
  });

  it('loads plans with the selected month', async () => {
    budgetRepository.getMonthSnapshot.mockResolvedValueOnce(
      snapshot('2026-08', {
        spendingPlans: [plan('plan_trip', 'Trip')],
        spendingPlanSpendById: { plan_trip: {} },
      }),
    );
    const store = createBudgetStore(budgetRepository);

    await store.getState().load('2026-08');

    expect(budgetRepository.getMonthSnapshot).toHaveBeenCalledWith('2026-08');
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
    expect(budgetRepository.getMonthSnapshot).toHaveBeenCalledWith('2026-08');
  });

  it('removes a plan and reloads the selected month', async () => {
    const store = createBudgetStore(budgetRepository);
    await store.getState().removeSpendingPlan('plan_trip', '2026-08');

    expect(budgetRepository.removeSpendingPlan).toHaveBeenCalledWith('plan_trip');
    expect(budgetRepository.getMonthSnapshot).toHaveBeenCalledWith('2026-08');
  });

  it('does not let an older month request overwrite a newer month request', async () => {
    const july = deferred<BudgetMonthSnapshot>();
    const august = deferred<BudgetMonthSnapshot>();
    budgetRepository.getMonthSnapshot
      .mockImplementationOnce(() => july.promise)
      .mockImplementationOnce(() => august.promise);
    const store = createBudgetStore(budgetRepository);

    const julyLoad = store.getState().load('2026-07');
    const augustLoad = store.getState().load('2026-08');
    august.resolve(snapshot('2026-08', { spendingPlans: [plan('august', 'August')] }));
    await augustLoad;
    july.resolve(snapshot('2026-07', { spendingPlans: [plan('july', 'July')] }));
    await julyLoad;

    expect(store.getState().loadedMonth).toBe('2026-08');
    expect(store.getState().spendingPlans).toEqual([plan('august', 'August')]);
  });

  it('ignores an older failed request after a newer month has loaded', async () => {
    const july = deferred<BudgetMonthSnapshot>();
    budgetRepository.getMonthSnapshot
      .mockImplementationOnce(() => july.promise)
      .mockResolvedValueOnce(snapshot('2026-08', { spendingPlans: [plan('august', 'August')] }));
    const store = createBudgetStore(budgetRepository);

    const julyLoad = store.getState().load('2026-07');
    const augustLoad = store.getState().load('2026-08');
    await augustLoad;
    july.reject(new Error('stale request failed'));
    await julyLoad;

    expect(store.getState().loadedMonth).toBe('2026-08');
    expect(store.getState().loadError).toBe(false);
  });
});
