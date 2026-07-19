import type { Budget } from '@/modules/budget/entities/budget.entity';
import {
  createBudgetStore,
  type BudgetStoreRepository,
  useBudgetStore,
} from '@/modules/budget/store/budget.store';

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
  currentYearMonth: jest.fn(() => '2026-05'),
  lastMonths: jest.fn(() => ['2026-05']),
}));

const { budgetRepository: mockBudgetRepository } = jest.requireMock(
  '@/modules/budget/repositories/budget.repository',
) as {
  budgetRepository: jest.Mocked<BudgetStoreRepository>;
};

beforeEach(() => {
  jest.clearAllMocks();
  useBudgetStore.getState().reset();
  mockBudgetRepository.getRows.mockResolvedValue([]);
  mockBudgetRepository.getExpectedIncome.mockResolvedValue(null);
  mockBudgetRepository.getCategoryGroups.mockResolvedValue({});
  mockBudgetRepository.getSpendByBudget.mockResolvedValue({});
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
    expect(s.spendByBudgetId).toEqual({});
    expect(s.budgetGroupByCategoryId).toEqual({});
    expect(s.loaded).toBe(false);
    expect(s.expectedIncome).toBeNull();
    expect(s.loadError).toBe(false);
  });

  it('exposes a recoverable error when the first load fails', async () => {
    const store = createBudgetStore(mockBudgetRepository);
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
    useBudgetStore
      .getState()
      .setData([r], { a: { '2026-05': 2400 } }, { b1: 1800 }, null, {}, [], {});
    const s = useBudgetStore.getState();
    expect(s.rows).toEqual([r]);
    expect(s.spendByMonth.a['2026-05']).toBe(2400);
    expect(s.spendByBudgetId.b1).toBe(1800);
    expect(s.loaded).toBe(true);
  });

  it('reset returns to initial', () => {
    useBudgetStore
      .getState()
      .setData([r], { a: { '2026-05': 2400 } }, { b1: 1800 }, null, {}, [], {});
    useBudgetStore.getState().reset();
    expect(useBudgetStore.getState().loaded).toBe(false);
  });

  it('removeBudget exists and is a function on the store', () => {
    const { removeBudget } = useBudgetStore.getState();
    expect(typeof removeBudget).toBe('function');
  });

  it('loads named-budget spending for the monthly history window', async () => {
    const store = createBudgetStore(mockBudgetRepository);
    mockBudgetRepository.getSpendByBudget.mockResolvedValue({ b1: 1750 });

    await store.getState().load('2026-05');

    expect(mockBudgetRepository.getSpendByBudget).toHaveBeenCalledWith(['2026-05']);
    expect(store.getState().spendByBudgetId).toEqual({ b1: 1750 });
  });

  it('setBudget persists a named budget and reloads the target month', async () => {
    const store = createBudgetStore(mockBudgetRepository);

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
