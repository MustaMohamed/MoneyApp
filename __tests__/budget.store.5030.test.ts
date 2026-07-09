import { createBudgetStore } from '@/modules/budget/store/budget.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

// Mock the budget repository so async load/setLimit/removeBudget don't hit the DB
jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: {
    getRows: jest.fn().mockResolvedValue([]),
    getSpendByMonth: jest.fn().mockResolvedValue({}),
    getSpendingPlansForMonth: jest.fn().mockResolvedValue({ plans: [], spendByPlanId: {} }),
    setLimit: jest.fn().mockResolvedValue(undefined),
    removeBudget: jest.fn().mockResolvedValue(undefined),
    copyLimitsToMonth: jest.fn().mockResolvedValue(undefined),
  },
  currentYearMonth: jest.fn().mockReturnValue('2026-05'),
  lastMonths: jest.fn().mockReturnValue(['2026-05']),
}));

function makeRepo(seed: Record<string, string> = {}): IAppSettingsRepository {
  const db: Record<string, string> = { ...seed };
  return {
    get: jest.fn(async (key: string) => db[key] ?? null),
    set: jest.fn(async (key: string, value: string) => {
      db[key] = value;
    }),
  };
}

describe('useBudgetStore — 50/30/20 extensions', () => {
  it('initialises expectedIncome as null', () => {
    const store = createBudgetStore(makeRepo());
    expect(store.getState().expectedIncome).toBeNull();
  });

  it('setExpectedIncomeLocal updates state without persisting', () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);
    store.getState().setExpectedIncomeLocal(15000);
    expect(store.getState().expectedIncome).toBe(15000);
    expect(repo.set).not.toHaveBeenCalled();
  });

  it('reset clears expectedIncome back to null', () => {
    const store = createBudgetStore(makeRepo());
    store.getState().setExpectedIncomeLocal(15000);
    store.getState().reset();
    expect(store.getState().expectedIncome).toBeNull();
  });

  it('reset also resets loaded to false and clears rows/spendByMonth', () => {
    const store = createBudgetStore(makeRepo());
    store.getState().setData([], {}, 5000);
    store.getState().reset();
    const s = store.getState();
    expect(s.loaded).toBe(false);
    expect(s.rows).toEqual([]);
    expect(s.spendByMonth).toEqual({});
    expect(s.expectedIncome).toBeNull();
  });

  it('load reads expectedIncome from repo and stores it', async () => {
    const repo = makeRepo({ expected_monthly_income: '25000' });
    const store = createBudgetStore(repo);
    await store.getState().load();
    expect(store.getState().expectedIncome).toBe(25000);
    expect(store.getState().loaded).toBe(true);
  });

  it('load stores null expectedIncome when key absent from repo', async () => {
    const repo = makeRepo({});
    const store = createBudgetStore(repo);
    await store.getState().load();
    expect(store.getState().expectedIncome).toBeNull();
  });

  it('setExpectedIncome persists to repo then reloads', async () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);
    await store.getState().setExpectedIncome(30000);
    expect(repo.set).toHaveBeenCalledWith('expected_monthly_income', '30000');
    // After reload, state should reflect the new income
    expect(store.getState().expectedIncome).toBe(30000);
  });

  it('setLimit delegates to budgetRepository then reloads', async () => {
    const { budgetRepository } = jest.requireMock(
      '@/modules/budget/repositories/budget.repository',
    ) as {
      budgetRepository: { setLimit: jest.Mock };
    };
    const store = createBudgetStore(makeRepo());
    await store.getState().setLimit('cat-1', 5000);
    expect(budgetRepository.setLimit).toHaveBeenCalledWith('cat-1', 5000);
  });

  it('setLimit delegates the selected month to budgetRepository then reloads that month', async () => {
    const { budgetRepository, lastMonths } = jest.requireMock(
      '@/modules/budget/repositories/budget.repository',
    ) as {
      budgetRepository: { setLimit: jest.Mock; getSpendByMonth: jest.Mock };
      lastMonths: jest.Mock;
    };
    const store = createBudgetStore(makeRepo());
    await store.getState().setLimit('cat-1', 5000, '2026-07');
    expect(budgetRepository.setLimit).toHaveBeenCalledWith('cat-1', 5000, '2026-07');
    expect(lastMonths).toHaveBeenCalledWith('2026-07', 12);
    expect(budgetRepository.getSpendByMonth).toHaveBeenCalledWith(['2026-05']);
  });

  it('removeBudget delegates to budgetRepository then reloads', async () => {
    const { budgetRepository } = jest.requireMock(
      '@/modules/budget/repositories/budget.repository',
    ) as {
      budgetRepository: { removeBudget: jest.Mock };
    };
    const store = createBudgetStore(makeRepo());
    await store.getState().removeBudget('cat-1');
    expect(budgetRepository.removeBudget).toHaveBeenCalledWith('cat-1');
  });

  it('removeBudget delegates the selected month to budgetRepository then reloads that month', async () => {
    const { budgetRepository, lastMonths } = jest.requireMock(
      '@/modules/budget/repositories/budget.repository',
    ) as {
      budgetRepository: { removeBudget: jest.Mock };
      lastMonths: jest.Mock;
    };
    const store = createBudgetStore(makeRepo());
    await store.getState().removeBudget('cat-1', '2026-07');
    expect(budgetRepository.removeBudget).toHaveBeenCalledWith('cat-1', '2026-07');
    expect(lastMonths).toHaveBeenCalledWith('2026-07', 12);
  });

  it('copyLimitsToMonth delegates source, target, and selected categories then reloads target month', async () => {
    const { budgetRepository, lastMonths } = jest.requireMock(
      '@/modules/budget/repositories/budget.repository',
    ) as {
      budgetRepository: { copyLimitsToMonth: jest.Mock };
      lastMonths: jest.Mock;
    };
    const store = createBudgetStore(makeRepo());
    await store.getState().copyLimitsToMonth('2026-06', '2026-07', ['cat-1', 'cat-2']);
    expect(budgetRepository.copyLimitsToMonth).toHaveBeenCalledWith('2026-06', '2026-07', [
      'cat-1',
      'cat-2',
    ]);
    expect(lastMonths).toHaveBeenCalledWith('2026-07', 12);
  });
});
