import { createBudgetStore } from '@/modules/budget/store/budget.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: {
    copyBudgetsToMonth: jest.fn().mockResolvedValue(undefined),
    copyLimitsToMonth: jest.fn().mockResolvedValue(undefined),
    getRows: jest.fn().mockResolvedValue([]),
    getSpendByMonth: jest.fn().mockResolvedValue({}),
    getSpendingPlansForMonth: jest.fn().mockResolvedValue({ plans: [], spendByPlanId: {} }),
    removeBudget: jest.fn().mockResolvedValue(undefined),
    removeSpendingPlan: jest.fn().mockResolvedValue(undefined),
    setBudget: jest.fn().mockResolvedValue(undefined),
    setLimit: jest.fn().mockResolvedValue(undefined),
    setSpendingPlan: jest.fn().mockResolvedValue(undefined),
  },
  currentYearMonth: jest.fn(() => '2026-07'),
  lastMonths: jest.fn(() => ['2026-07']),
}));

const { budgetRepository } = jest.requireMock(
  '@/modules/budget/repositories/budget.repository',
) as {
  budgetRepository: {
    getSpendingPlansForMonth: jest.Mock;
    removeSpendingPlan: jest.Mock;
    setSpendingPlan: jest.Mock;
  };
};

const repo: IAppSettingsRepository = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

describe('budget store spending plans', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads plans with the selected month', async () => {
    budgetRepository.getSpendingPlansForMonth.mockResolvedValueOnce({
      plans: [{ id: 'plan_trip', name: 'Trip', categories: [] }],
      spendByPlanId: { plan_trip: {} },
    });
    const store = createBudgetStore(repo);

    await store.getState().load('2026-08');

    expect(budgetRepository.getSpendingPlansForMonth).toHaveBeenCalledWith('2026-08');
    expect(store.getState().spendingPlans).toEqual([
      { id: 'plan_trip', name: 'Trip', categories: [] },
    ]);
    expect(store.getState().spendingPlanSpendById).toEqual({ plan_trip: {} });
  });

  it('saves a plan and reloads the plan start month', async () => {
    const store = createBudgetStore(repo);
    await store.getState().setSpendingPlan({
      name: 'Trip',
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      totalAmount: 8000,
      categories: [{ categoryId: 'cat_food' }],
    });

    expect(budgetRepository.setSpendingPlan).toHaveBeenCalledWith({
      name: 'Trip',
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      totalAmount: 8000,
      categories: [{ categoryId: 'cat_food' }],
    });
    expect(budgetRepository.getSpendingPlansForMonth).toHaveBeenCalledWith('2026-08');
  });

  it('removes a plan and reloads the selected month', async () => {
    const store = createBudgetStore(repo);
    await store.getState().removeSpendingPlan('plan_trip', '2026-08');

    expect(budgetRepository.removeSpendingPlan).toHaveBeenCalledWith('plan_trip');
    expect(budgetRepository.getSpendingPlansForMonth).toHaveBeenCalledWith('2026-08');
  });
});
