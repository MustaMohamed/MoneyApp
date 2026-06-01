import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
// oxlint-disable typescript/no-unsafe-type-assertion typescript/unbound-method -- Jest repository mocks are asserted through call history in this store test.
import { createBudgetStore } from '@/modules/budget/store/budget.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

// Mock the budget repository so async load/setLimit/removeBudget don't hit the DB
jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: {
    getRows: jest.fn().mockResolvedValue([]),
    getSpendByMonth: jest.fn().mockResolvedValue({}),
    setLimit: jest.fn().mockResolvedValue(undefined),
    removeBudget: jest.fn().mockResolvedValue(undefined),
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
    expect(store.state.expectedIncome.value).toBeNull();
  });

  it('setExpectedIncomeLocal updates state without persisting', () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);
    store.setExpectedIncomeLocal(15000);
    expect(store.state.expectedIncome.value).toBe(15000);
    expect(repo.set).not.toHaveBeenCalled();
  });

  it('reset clears expectedIncome back to null', () => {
    const store = createBudgetStore(makeRepo());
    store.setExpectedIncomeLocal(15000);
    store.reset();
    expect(store.state.expectedIncome.value).toBeNull();
  });

  it('reset also resets loaded to false and clears rows/spendByMonth', () => {
    const store = createBudgetStore(makeRepo());
    store.setData([], {}, 5000);
    store.reset();
    const s = store.state;
    expect(s.loaded.value).toBe(false);
    expect(s.rows.value).toEqual([]);
    expect(s.spendByMonth.value).toEqual({});
    expect(s.expectedIncome.value).toBeNull();
  });

  it('load reads expectedIncome from repo and stores it', async () => {
    const repo = makeRepo({ expected_monthly_income: '25000' });
    const store = createBudgetStore(repo);
    await store.load();
    expect(store.state.expectedIncome.value).toBe(25000);
    expect(store.state.loaded.value).toBe(true);
  });

  it('load stores null expectedIncome when key absent from repo', async () => {
    const repo = makeRepo({});
    const store = createBudgetStore(repo);
    await store.load();
    expect(store.state.expectedIncome.value).toBeNull();
  });

  it('setExpectedIncome persists to repo then reloads', async () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);
    await store.setExpectedIncome(30000);
    expect(repo.set).toHaveBeenCalledWith('expected_monthly_income', '30000');
    // After reload, state should reflect the new income
    expect(store.state.expectedIncome.value).toBe(30000);
  });

  it('setLimit delegates to budgetRepository then reloads', async () => {
    const store = createBudgetStore(makeRepo());
    await store.setLimit('cat-1', 5000);
    expect(budgetRepository.setLimit).toHaveBeenCalledWith('cat-1', 5000);
  });

  it('removeBudget delegates to budgetRepository then reloads', async () => {
    const store = createBudgetStore(makeRepo());
    await store.removeBudget('cat-1');
    expect(budgetRepository.removeBudget).toHaveBeenCalledWith('cat-1');
  });
});
