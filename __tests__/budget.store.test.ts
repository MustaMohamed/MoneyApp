import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { BudgetMonthSnapshot } from '@/modules/budget/repositories/budget.repository';
import {
  createBudgetStore,
  type BudgetStoreRepository,
  useBudgetStore,
} from '@/modules/budget/store/budget.store';

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
  currentYearMonth: jest.fn(() => '2026-05'),
  lastMonths: jest.fn((month: string) => [month]),
}));

const { budgetRepository: mockBudgetRepository } = jest.requireMock(
  '@/modules/budget/repositories/budget.repository',
) as {
  budgetRepository: jest.Mocked<BudgetStoreRepository>;
};

const NOW = '2026-05-01T00:00:00.000Z';
const row: Budget = {
  id: 'b1',
  category_id: 'food',
  name: 'Monthly Food',
  limit_amount: 3000,
  effective_from: '2026-05',
  created_at: NOW,
  updated_at: NOW,
};

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  useBudgetStore.getState().reset();
  mockBudgetRepository.getMonthSnapshot.mockImplementation(async (month) => snapshot(month));
  mockBudgetRepository.getCopyPreview.mockResolvedValue([]);
});

describe('useBudgetStore', () => {
  it('starts with no published snapshot or copy preview', () => {
    const state = createBudgetStore(mockBudgetRepository).getState();

    expect(state).toMatchObject({
      rows: [],
      spendByMonth: {},
      spendByBudgetId: {},
      budgetGroupByCategoryId: {},
      spendingPlans: [],
      spendingPlanSpendById: {},
      loadedMonth: undefined,
      loaded: false,
      loading: false,
      loadError: false,
      expectedIncome: null,
      incomeSuggestion: null,
      copyPreviewRows: [],
      copyPreviewSourceMonth: undefined,
      copyPreviewTargetMonth: undefined,
      copyPreviewLoaded: false,
      copyPreviewLoading: false,
      copyPreviewError: false,
    });
  });

  it('shares concurrent work for the same month and generation', async () => {
    const pending = deferred<BudgetMonthSnapshot>();
    mockBudgetRepository.getMonthSnapshot.mockReturnValueOnce(pending.promise);
    const store = createBudgetStore(mockBudgetRepository);

    const first = store.getState().load('2026-05');
    const second = store.getState().load('2026-05');

    expect(mockBudgetRepository.getMonthSnapshot).toHaveBeenCalledTimes(1);
    pending.resolve(snapshot('2026-05', { rows: [row] }));
    await Promise.all([first, second]);

    expect(store.getState()).toMatchObject({
      rows: [row],
      loadedMonth: '2026-05',
      loaded: true,
      loading: false,
    });
  });

  it('does not share work between different months', async () => {
    const may = deferred<BudgetMonthSnapshot>();
    const june = deferred<BudgetMonthSnapshot>();
    mockBudgetRepository.getMonthSnapshot.mockImplementation((month) =>
      month === '2026-05' ? may.promise : june.promise,
    );
    const store = createBudgetStore(mockBudgetRepository);

    const mayLoad = store.getState().load('2026-05');
    const juneLoad = store.getState().load('2026-06');

    expect(mockBudgetRepository.getMonthSnapshot).toHaveBeenCalledTimes(2);
    may.resolve(snapshot('2026-05'));
    june.resolve(snapshot('2026-06'));
    await Promise.all([mayLoad, juneLoad]);

    expect(store.getState().loadedMonth).toBe('2026-06');
  });

  it('publishes only the latest owner across A/B/A completion order', async () => {
    const may = deferred<BudgetMonthSnapshot>();
    const june = deferred<BudgetMonthSnapshot>();
    mockBudgetRepository.getMonthSnapshot.mockImplementation((month) =>
      month === '2026-05' ? may.promise : june.promise,
    );
    const store = createBudgetStore(mockBudgetRepository);

    const firstMay = store.getState().load('2026-05');
    const juneLoad = store.getState().load('2026-06');
    const latestMay = store.getState().load('2026-05');
    expect(mockBudgetRepository.getMonthSnapshot).toHaveBeenCalledTimes(2);

    june.resolve(snapshot('2026-06', { expectedIncome: 6000 }));
    await juneLoad;
    expect(store.getState().loaded).toBe(false);

    may.resolve(snapshot('2026-05', { expectedIncome: 5000 }));
    await Promise.all([firstMay, latestMay]);
    expect(store.getState()).toMatchObject({
      loadedMonth: '2026-05',
      expectedIncome: 5000,
      loaded: true,
    });
  });

  it('increments generation before a mutation reload so older work cannot publish', async () => {
    const stale = deferred<BudgetMonthSnapshot>();
    mockBudgetRepository.getMonthSnapshot
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce(snapshot('2026-05', { expectedIncome: 20_000 }));
    const store = createBudgetStore(mockBudgetRepository);

    const staleLoad = store.getState().load('2026-05');
    await store.getState().setBudget({
      categoryId: 'food',
      name: 'Monthly Food',
      limit: 5000,
      yearMonth: '2026-05',
    });

    expect(store.getState().generation).toBe(1);
    expect(mockBudgetRepository.getMonthSnapshot).toHaveBeenCalledTimes(2);
    stale.resolve(snapshot('2026-05', { expectedIncome: 10_000 }));
    await staleLoad;

    expect(store.getState().expectedIncome).toBe(20_000);
  });

  it('keeps a warm snapshot when refresh fails and recovers on retry', async () => {
    const store = createBudgetStore(mockBudgetRepository);
    mockBudgetRepository.getMonthSnapshot
      .mockResolvedValueOnce(snapshot('2026-05', { rows: [row] }))
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockResolvedValueOnce(snapshot('2026-05', { rows: [row], expectedIncome: 25_000 }));

    await store.getState().load('2026-05');
    await store.getState().load('2026-05');

    expect(store.getState()).toMatchObject({
      rows: [row],
      loadedMonth: '2026-05',
      loaded: true,
      loading: false,
      loadError: true,
    });

    await store.getState().load('2026-05');
    expect(store.getState()).toMatchObject({
      rows: [row],
      expectedIncome: 25_000,
      loadError: false,
    });
  });

  it('reset invalidates and clears in-flight snapshot ownership', async () => {
    const pending = deferred<BudgetMonthSnapshot>();
    mockBudgetRepository.getMonthSnapshot.mockReturnValueOnce(pending.promise);
    const store = createBudgetStore(mockBudgetRepository);

    const load = store.getState().load('2026-05');
    store.getState().reset();
    pending.resolve(snapshot('2026-05', { rows: [row] }));
    await load;

    expect(store.getState()).toMatchObject({
      rows: [],
      loadedMonth: undefined,
      loaded: false,
      loading: false,
      loadError: false,
    });

    await store.getState().load('2026-05');
    expect(mockBudgetRepository.getMonthSnapshot).toHaveBeenCalledTimes(2);
  });

  it('prevents an older copy preview from publishing after the source changes', async () => {
    const june = deferred<Budget[]>();
    const july = deferred<Budget[]>();
    mockBudgetRepository.getCopyPreview.mockImplementation((sourceMonth) =>
      sourceMonth === '2026-06' ? june.promise : july.promise,
    );
    const store = createBudgetStore(mockBudgetRepository);

    const juneLoad = store.getState().loadCopyPreview('2026-06', '2026-08');
    const julyLoad = store.getState().loadCopyPreview('2026-07', '2026-08');
    june.resolve([{ ...row, id: 'june', effective_from: '2026-06' }]);
    await juneLoad;

    expect(store.getState()).toMatchObject({
      copyPreviewRows: [],
      copyPreviewSourceMonth: '2026-07',
      copyPreviewLoaded: false,
    });

    july.resolve([{ ...row, id: 'july', effective_from: '2026-07' }]);
    await julyLoad;
    expect(store.getState()).toMatchObject({
      copyPreviewRows: [{ ...row, id: 'july', effective_from: '2026-07' }],
      copyPreviewSourceMonth: '2026-07',
      copyPreviewLoaded: true,
      copyPreviewError: false,
    });
  });

  it('distinguishes an empty copy preview from a failed preview', async () => {
    const store = createBudgetStore(mockBudgetRepository);

    await store.getState().loadCopyPreview('2026-06', '2026-08');
    expect(store.getState()).toMatchObject({
      copyPreviewRows: [],
      copyPreviewLoaded: true,
      copyPreviewError: false,
    });

    mockBudgetRepository.getCopyPreview.mockRejectedValueOnce(new Error('preview failed'));
    await store.getState().loadCopyPreview('2026-05', '2026-08');
    expect(store.getState()).toMatchObject({
      copyPreviewRows: [],
      copyPreviewLoaded: false,
      copyPreviewLoading: false,
      copyPreviewError: true,
    });
  });
});
