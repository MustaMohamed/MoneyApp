import { BudgetGroup } from '@/constants/enums';
import type { BudgetMonthGroupMap } from '@/modules/budget/entities/budget.entity';
import { createBudgetStore, type BudgetStoreRepository } from '@/modules/budget/store/budget.store';

jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: {},
  currentYearMonth: jest.fn().mockReturnValue('2026-05'),
  lastMonths: jest.fn((anchorMonth: string) => [anchorMonth]),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function makeRepo(
  incomeByMonth: Record<string, number | null> = {},
  groupsByMonth: Record<string, BudgetMonthGroupMap> = {},
): jest.Mocked<BudgetStoreRepository> {
  return {
    copyBudgetsToMonth: jest.fn().mockResolvedValue(undefined),
    copyLimitsToMonth: jest.fn().mockResolvedValue(undefined),
    getCategoryGroups: jest.fn(async (yearMonth) => groupsByMonth[yearMonth] ?? {}),
    getExpectedIncome: jest.fn(async (yearMonth) => incomeByMonth[yearMonth] ?? null),
    getRows: jest.fn().mockResolvedValue([]),
    getSpendByBudget: jest.fn().mockResolvedValue({}),
    getSpendByMonth: jest.fn().mockResolvedValue({}),
    getSpendingPlansForMonth: jest.fn().mockResolvedValue({ plans: [], spendByPlanId: {} }),
    removeBudget: jest.fn().mockResolvedValue(undefined),
    removeSpendingPlan: jest.fn().mockResolvedValue(undefined),
    setBudget: jest.fn().mockResolvedValue(undefined),
    setExpectedIncome: jest.fn(async (yearMonth, amount) => {
      incomeByMonth[yearMonth] = amount;
    }),
    setLimit: jest.fn().mockResolvedValue(undefined),
    setSpendingPlan: jest.fn().mockResolvedValue(undefined),
  };
}

describe('useBudgetStore — month-specific 50/30/20 profiles', () => {
  it('initialises income and category groups empty', () => {
    const store = createBudgetStore(makeRepo());

    expect(store.getState().expectedIncome).toBeNull();
    expect(store.getState().budgetGroupByCategoryId).toEqual({});
  });

  it('loads income and category groups for the exact anchor month', async () => {
    const groups = { food: BudgetGroup.Need, dining: BudgetGroup.Want };
    const repo = makeRepo({ '2026-06': 25_000 }, { '2026-06': groups });
    const store = createBudgetStore(repo);

    await store.getState().load('2026-06');

    expect(repo.getExpectedIncome).toHaveBeenCalledWith('2026-06');
    expect(repo.getCategoryGroups).toHaveBeenCalledWith('2026-06');
    expect(store.getState()).toMatchObject({
      expectedIncome: 25_000,
      budgetGroupByCategoryId: groups,
      loadedMonth: '2026-06',
      loaded: true,
    });
  });

  it('stores absent exact-month income as null', async () => {
    const store = createBudgetStore(makeRepo());

    await store.getState().load('2026-07');

    expect(store.getState().expectedIncome).toBeNull();
  });

  it('persists income and reloads the exact supplied month', async () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);

    await store.getState().setExpectedIncome('2026-09', 30_000);

    expect(repo.setExpectedIncome).toHaveBeenCalledWith('2026-09', 30_000);
    expect(repo.getExpectedIncome).toHaveBeenLastCalledWith('2026-09');
    expect(repo.getCategoryGroups).toHaveBeenLastCalledWith('2026-09');
    expect(store.getState()).toMatchObject({ expectedIncome: 30_000, loadedMonth: '2026-09' });
  });

  it('keeps the current income-sheet call compatible with the loaded month', async () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);
    await store.getState().load('2026-08');

    await store.getState().setExpectedIncome(28_000);

    expect(repo.setExpectedIncome).toHaveBeenCalledWith('2026-08', 28_000);
    expect(repo.getExpectedIncome).toHaveBeenLastCalledWith('2026-08');
  });

  it('uses the current month for the compatible income call before a month is loaded', async () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);

    await store.getState().setExpectedIncome(22_000);

    expect(repo.setExpectedIncome).toHaveBeenCalledWith('2026-05', 22_000);
    expect(repo.getExpectedIncome).toHaveBeenLastCalledWith('2026-05');
  });

  it('suppresses a stale month load after a newer month resolves', async () => {
    const juneIncome = deferred<number | null>();
    const repo = makeRepo({ '2026-07': 27_000 }, { '2026-07': { food: BudgetGroup.Want } });
    repo.getExpectedIncome.mockImplementation((yearMonth) =>
      yearMonth === '2026-06' ? juneIncome.promise : Promise.resolve(27_000),
    );
    const store = createBudgetStore(repo);

    const juneLoad = store.getState().load('2026-06');
    await store.getState().load('2026-07');
    juneIncome.resolve(18_000);
    await juneLoad;

    expect(store.getState()).toMatchObject({
      expectedIncome: 27_000,
      budgetGroupByCategoryId: { food: BudgetGroup.Want },
      loadedMonth: '2026-07',
    });
  });

  it('reset clears month profile state and invalidates an in-flight load', async () => {
    const pendingIncome = deferred<number | null>();
    const repo = makeRepo({}, { '2026-06': { food: BudgetGroup.Need } });
    repo.getExpectedIncome.mockReturnValueOnce(pendingIncome.promise);
    const store = createBudgetStore(repo);

    const load = store.getState().load('2026-06');
    store.getState().reset();
    pendingIncome.resolve(20_000);
    await load;

    expect(store.getState()).toMatchObject({
      rows: [],
      spendByMonth: {},
      spendByBudgetId: {},
      expectedIncome: null,
      budgetGroupByCategoryId: {},
      loadedMonth: undefined,
      loaded: false,
      loadError: false,
    });
  });

  it('reloads the target month after copying budgets', async () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);

    await store.getState().copyBudgetsToMonth('2026-06', '2026-07', ['budget-food', 'budget-rent']);

    expect(repo.copyBudgetsToMonth).toHaveBeenCalledWith('2026-06', '2026-07', [
      'budget-food',
      'budget-rent',
    ]);
    expect(repo.getExpectedIncome).toHaveBeenLastCalledWith('2026-07');
    expect(repo.getCategoryGroups).toHaveBeenLastCalledWith('2026-07');
  });
});
