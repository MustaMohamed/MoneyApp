import { BudgetGroup } from '@/constants/enums';
import type { BudgetMonthGroupMap } from '@/modules/budget/entities/budget.entity';
import type { BudgetMonthSnapshot } from '@/modules/budget/repositories/budget.repository';
import { createBudgetStore, type BudgetStoreRepository } from '@/modules/budget/store/budget.store';

jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: {},
  currentYearMonth: jest.fn().mockReturnValue('2026-05'),
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
  const monthSnapshot = (yearMonth: string): BudgetMonthSnapshot => ({
    loadedMonth: yearMonth,
    rows: [],
    spendByMonth: {},
    spendByBudgetId: {},
    expectedIncome: incomeByMonth[yearMonth] ?? null,
    budgetGroupByCategoryId: groupsByMonth[yearMonth] ?? {},
    spendingPlans: [],
    spendingPlanSpendById: {},
    incomeSuggestion: null,
  });

  return {
    copyBudgetsToMonth: jest.fn().mockResolvedValue(undefined),
    copyLimitsToMonth: jest.fn().mockResolvedValue(undefined),
    getCopyPreview: jest.fn().mockResolvedValue([]),
    getMonthSnapshot: jest.fn(async (yearMonth) => monthSnapshot(yearMonth)),
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

    expect(repo.getMonthSnapshot).toHaveBeenCalledWith('2026-06');
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
    await store.getState().load('2026-09');

    await store.getState().setExpectedIncome('2026-09', 30_000);

    expect(repo.setExpectedIncome).toHaveBeenCalledWith('2026-09', 30_000);
    expect(repo.getMonthSnapshot).toHaveBeenLastCalledWith('2026-09');
    expect(store.getState()).toMatchObject({ expectedIncome: 30_000, loadedMonth: '2026-09' });
  });

  it('keeps the current income-sheet call compatible with the loaded month', async () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);
    await store.getState().load('2026-08');

    await store.getState().setExpectedIncome(28_000);

    expect(repo.setExpectedIncome).toHaveBeenCalledWith('2026-08', 28_000);
    expect(repo.getMonthSnapshot).toHaveBeenLastCalledWith('2026-08');
  });

  it('persists without loading when no month has been requested', async () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);

    await store.getState().setExpectedIncome(22_000);

    expect(repo.setExpectedIncome).toHaveBeenCalledWith('2026-05', 22_000);
    expect(repo.getMonthSnapshot).not.toHaveBeenCalled();
    expect(store.getState().loaded).toBe(false);
  });

  it('does not reload a saved month after a newer month is requested', async () => {
    const write = deferred<void>();
    const repo = makeRepo(
      { '2026-07': 20_000, '2026-08': 30_000 },
      { '2026-07': { food: BudgetGroup.Need }, '2026-08': { food: BudgetGroup.Want } },
    );
    const store = createBudgetStore(repo);
    await store.getState().load('2026-07');
    repo.setExpectedIncome.mockReturnValueOnce(write.promise);

    const julySave = store.getState().setExpectedIncome('2026-07', 25_000);
    await store.getState().load('2026-08');
    write.resolve(undefined);
    await julySave;

    expect(repo.getMonthSnapshot).toHaveBeenCalledTimes(2);
    expect(repo.getMonthSnapshot).toHaveBeenLastCalledWith('2026-08');
    expect(store.getState()).toMatchObject({
      expectedIncome: 30_000,
      budgetGroupByCategoryId: { food: BudgetGroup.Want },
      loadedMonth: '2026-08',
    });
  });

  it('suppresses a stale month load after a newer month resolves', async () => {
    const juneSnapshot = deferred<BudgetMonthSnapshot>();
    const repo = makeRepo({ '2026-07': 27_000 }, { '2026-07': { food: BudgetGroup.Want } });
    repo.getMonthSnapshot.mockImplementation((yearMonth) =>
      yearMonth === '2026-06'
        ? juneSnapshot.promise
        : Promise.resolve({
            loadedMonth: '2026-07',
            rows: [],
            spendByMonth: {},
            spendByBudgetId: {},
            expectedIncome: 27_000,
            budgetGroupByCategoryId: { food: BudgetGroup.Want },
            spendingPlans: [],
            spendingPlanSpendById: {},
            incomeSuggestion: null,
          }),
    );
    const store = createBudgetStore(repo);

    const juneLoad = store.getState().load('2026-06');
    await store.getState().load('2026-07');
    juneSnapshot.resolve({
      loadedMonth: '2026-06',
      rows: [],
      spendByMonth: {},
      spendByBudgetId: {},
      expectedIncome: 18_000,
      budgetGroupByCategoryId: {},
      spendingPlans: [],
      spendingPlanSpendById: {},
      incomeSuggestion: null,
    });
    await juneLoad;

    expect(store.getState()).toMatchObject({
      expectedIncome: 27_000,
      budgetGroupByCategoryId: { food: BudgetGroup.Want },
      loadedMonth: '2026-07',
    });
  });

  it('reset clears month profile state and invalidates an in-flight load', async () => {
    const pendingSnapshot = deferred<BudgetMonthSnapshot>();
    const repo = makeRepo({}, { '2026-06': { food: BudgetGroup.Need } });
    repo.getMonthSnapshot.mockReturnValueOnce(pendingSnapshot.promise);
    const store = createBudgetStore(repo);

    const load = store.getState().load('2026-06');
    store.getState().reset();
    pendingSnapshot.resolve({
      loadedMonth: '2026-06',
      rows: [],
      spendByMonth: {},
      spendByBudgetId: {},
      expectedIncome: 20_000,
      budgetGroupByCategoryId: { food: BudgetGroup.Need },
      spendingPlans: [],
      spendingPlanSpendById: {},
      incomeSuggestion: null,
    });
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
    expect(repo.getMonthSnapshot).toHaveBeenLastCalledWith('2026-07');
  });
});
