import type { Budget } from '@/modules/budget/entities/budget.entity';
import { createBudgetStore, useBudgetStore } from '@/modules/budget/store/budget.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: {
    copyBudgetsToMonth: jest.fn().mockResolvedValue(undefined),
    getRows: jest.fn().mockResolvedValue([]),
    getSpendByMonth: jest.fn().mockResolvedValue({}),
    getSpendingPlansForMonth: jest.fn().mockResolvedValue({ plans: [], spendByPlanId: {} }),
    removeBudget: jest.fn().mockResolvedValue(undefined),
    removeSpendingPlan: jest.fn().mockResolvedValue(undefined),
    setBudget: jest.fn().mockResolvedValue(undefined),
    setSpendingPlan: jest.fn().mockResolvedValue(undefined),
  },
  currentYearMonth: jest.fn(() => '2026-05'),
  lastMonths: jest.fn(() => ['2026-05']),
}));

const { budgetRepository: mockBudgetRepository } = jest.requireMock(
  '@/modules/budget/repositories/budget.repository',
) as {
  budgetRepository: {
    copyBudgetsToMonth: jest.Mock<Promise<void>, [string, string, string[]]>;
    getRows: jest.Mock<Promise<Budget[]>, []>;
    getSpendByMonth: jest.Mock<Promise<Record<string, Record<string, number>>>, [string[]]>;
    getSpendingPlansForMonth: jest.Mock<Promise<{ plans: []; spendByPlanId: {} }>, [string]>;
    removeBudget: jest.Mock<Promise<void>, [string, string?]>;
    removeSpendingPlan: jest.Mock<Promise<void>, [string]>;
    setBudget: jest.Mock<Promise<void>, [unknown]>;
    setSpendingPlan: jest.Mock<Promise<void>, [unknown]>;
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  useBudgetStore.getState().reset();
  mockBudgetRepository.getRows.mockResolvedValue([]);
  mockBudgetRepository.getSpendByMonth.mockResolvedValue({});
  mockBudgetRepository.getSpendingPlansForMonth.mockResolvedValue({ plans: [], spendByPlanId: {} });
});

const NOW = '2026-05-01T00:00:00.000Z';
const r: Budget = {
  id: 'b1',
  category_id: 'a',
  name: 'Monthly Food',
  limit_amount: 3000,
  effective_from: '2026-05',
  created_at: NOW,
  updated_at: NOW,
};

describe('useBudgetStore', () => {
  it('starts empty and not loaded', () => {
    const s = useBudgetStore.getState();
    expect(s.rows).toEqual([]);
    expect(s.spendByMonth).toEqual({});
    expect(s.loaded).toBe(false);
    expect(s.expectedIncome).toBeNull();
    expect(s.loadError).toBe(false);
  });

  it('exposes a recoverable error when the first load fails', async () => {
    const appSettingsRepo: IAppSettingsRepository = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const store = createBudgetStore(appSettingsRepo);
    mockBudgetRepository.getSpendingPlansForMonth.mockRejectedValueOnce(
      new Error('plan query failed'),
    );

    await store.getState().load('2026-05');

    expect(store.getState().loaded).toBe(false);
    expect(store.getState().loadError).toBe(true);

    await store.getState().load('2026-05');

    expect(store.getState().loaded).toBe(true);
    expect(store.getState().loadError).toBe(false);
  });

  it('setData stores rows + spend and flips loaded', () => {
    useBudgetStore.getState().setData([r], { a: { '2026-05': 2400 } }, null, [], {});
    const s = useBudgetStore.getState();
    expect(s.rows).toEqual([r]);
    expect(s.spendByMonth.a['2026-05']).toBe(2400);
    expect(s.loaded).toBe(true);
  });

  it('reset returns to initial', () => {
    useBudgetStore.getState().setData([r], { a: { '2026-05': 2400 } }, null, [], {});
    useBudgetStore.getState().reset();
    expect(useBudgetStore.getState().loaded).toBe(false);
  });

  it('removeBudget exists and is a function on the store', () => {
    const { removeBudget } = useBudgetStore.getState();
    expect(typeof removeBudget).toBe('function');
  });

  it('setBudget persists a named budget and reloads the target month', async () => {
    const appSettingsRepo: IAppSettingsRepository = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const store = createBudgetStore(appSettingsRepo);

    await store.getState().setBudget({
      categoryId: 'food',
      name: 'Alexandria Trip Food',
      limit: 1500,
      yearMonth: '2026-07',
    });

    expect(mockBudgetRepository.setBudget).toHaveBeenCalledWith({
      categoryId: 'food',
      name: 'Alexandria Trip Food',
      limit: 1500,
      yearMonth: '2026-07',
    });
    expect(mockBudgetRepository.getRows).toHaveBeenCalledTimes(1);
    expect(mockBudgetRepository.getSpendByMonth).toHaveBeenCalledWith(['2026-05']);
  });
});
