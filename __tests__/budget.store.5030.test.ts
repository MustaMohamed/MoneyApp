import type { Budget } from '@/modules/budget/entities/budget.entity';
import { BudgetStore } from '@/modules/budget/store/budget.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

type TestAppSettingsRepository = IAppSettingsRepository & {
  get: jest.Mock<Promise<string | null>, [string]>;
  set: jest.Mock<Promise<void>, [string, string]>;
};

// Mock the budget repository so async load/setLimit/removeBudget don't hit the DB
jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: {
    getRows: jest.fn(),
    getSpendByMonth: jest.fn(),
    setLimit: jest.fn(),
    removeBudget: jest.fn(),
  },
  currentYearMonth: jest.fn(),
  lastMonths: jest.fn(),
}));

function makeRepo(seed: Record<string, string> = {}): TestAppSettingsRepository {
  const db: Record<string, string> = { ...seed };
  return {
    get: jest.fn(async (key: string) => db[key] ?? null),
    set: jest.fn(async (key: string, value: string) => {
      db[key] = value;
    }),
  };
}

const NOW = '2026-05-01T00:00:00.000Z';
const row: Budget = {
  id: 'b1',
  category_id: 'cat-1',
  limit_amount: 5000,
  effective_from: '2026-05',
  created_at: NOW,
  updated_at: NOW,
};

function budgetRepositoryMock() {
  return jest.requireMock('@/modules/budget/repositories/budget.repository') as {
    budgetRepository: {
      getRows: jest.Mock<Promise<Budget[]>, []>;
      getSpendByMonth: jest.Mock<Promise<Record<string, Record<string, number>>>, [string[]]>;
      setLimit: jest.Mock<Promise<void>, [string, number]>;
      removeBudget: jest.Mock<Promise<void>, [string]>;
    };
    currentYearMonth: jest.Mock<string, []>;
    lastMonths: jest.Mock<string[], [string, number]>;
  };
}

beforeEach(() => {
  const { budgetRepository, currentYearMonth, lastMonths } = budgetRepositoryMock();
  budgetRepository.getRows.mockReset().mockResolvedValue([]);
  budgetRepository.getSpendByMonth.mockReset().mockResolvedValue({});
  budgetRepository.setLimit.mockReset().mockResolvedValue(undefined);
  budgetRepository.removeBudget.mockReset().mockResolvedValue(undefined);
  currentYearMonth.mockReset().mockReturnValue('2026-05');
  lastMonths
    .mockReset()
    .mockReturnValue([
      '2025-06',
      '2025-07',
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
    ]);
});

describe('BudgetStore — 50/30/20 extensions', () => {
  it('initialises expectedIncome as null', () => {
    const store = new BudgetStore(makeRepo());

    expect(store.expectedIncome).toBeNull();
  });

  it('setExpectedIncomeLocal updates state without persisting', () => {
    const repo = makeRepo();
    const store = new BudgetStore(repo);

    store.setExpectedIncomeLocal(15000);

    expect(store.expectedIncome).toBe(15000);
    expect(repo.set).not.toHaveBeenCalled();
  });

  it('reset clears expectedIncome back to null', () => {
    const store = new BudgetStore(makeRepo());

    store.setExpectedIncomeLocal(15000);
    store.reset();

    expect(store.expectedIncome).toBeNull();
  });

  it('reset also resets loaded to false and clears rows/spendByMonth', () => {
    const store = new BudgetStore(makeRepo());

    store.setData([row], { 'cat-1': { '2026-05': 4200 } }, 5000);
    store.reset();

    expect(store.loaded).toBe(false);
    expect(store.rows).toEqual([]);
    expect(store.spendByMonth).toEqual({});
    expect(store.expectedIncome).toBeNull();
  });

  it('load reads a 12 month window, rows, spend, and expectedIncome', async () => {
    const { budgetRepository, lastMonths } = budgetRepositoryMock();
    const months = [
      '2025-06',
      '2025-07',
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
    ];
    const spendByMonth = { 'cat-1': { '2026-05': 3200 } };
    budgetRepository.getRows.mockResolvedValue([row]);
    budgetRepository.getSpendByMonth.mockResolvedValue(spendByMonth);
    const repo = makeRepo({ expected_monthly_income: '25000' });
    const store = new BudgetStore(repo);

    await store.load();

    expect(lastMonths).toHaveBeenCalledWith('2026-05', 12);
    expect(budgetRepository.getSpendByMonth).toHaveBeenCalledWith(months);
    expect(store.rows).toEqual([row]);
    expect(store.spendByMonth).toEqual(spendByMonth);
    expect(store.expectedIncome).toBe(25000);
    expect(store.loaded).toBe(true);
  });

  it('load stores null expectedIncome when key absent from repo', async () => {
    const repo = makeRepo({});
    const store = new BudgetStore(repo);

    await store.load();

    expect(store.expectedIncome).toBeNull();
  });

  it('setExpectedIncome persists to repo then reloads', async () => {
    const repo = makeRepo();
    const store = new BudgetStore(repo);

    await store.setExpectedIncome(30000);

    expect(repo.set).toHaveBeenCalledWith('expected_monthly_income', '30000');
    expect(repo.set.mock.invocationCallOrder[0]).toBeLessThan(repo.get.mock.invocationCallOrder[0]);
    expect(store.expectedIncome).toBe(30000);
  });

  it('setLimit delegates to budgetRepository then reloads', async () => {
    const { budgetRepository } = budgetRepositoryMock();
    const store = new BudgetStore(makeRepo());

    await store.setLimit('cat-1', 5000);

    expect(budgetRepository.setLimit).toHaveBeenCalledWith('cat-1', 5000);
    expect(budgetRepository.setLimit.mock.invocationCallOrder[0]).toBeLessThan(
      budgetRepository.getRows.mock.invocationCallOrder[0],
    );
  });

  it('removeBudget delegates to budgetRepository then reloads', async () => {
    const { budgetRepository } = budgetRepositoryMock();
    const store = new BudgetStore(makeRepo());

    await store.removeBudget('cat-1');

    expect(budgetRepository.removeBudget).toHaveBeenCalledWith('cat-1');
    expect(budgetRepository.removeBudget.mock.invocationCallOrder[0]).toBeLessThan(
      budgetRepository.getRows.mock.invocationCallOrder[0],
    );
  });
});
