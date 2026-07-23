import type { SQLiteDatabase } from 'expo-sqlite';

import { BudgetGroup } from '@/constants/enums';
import type {
  Budget,
  SpendingPlan,
  SpendingPlanCategory,
} from '@/modules/budget/entities/budget.entity';
import {
  BudgetRepository,
  currentYearMonth,
  lastMonths,
} from '@/modules/budget/repositories/budget.repository';

jest.mock('react-native-uuid', () => ({ v4: jest.fn(() => 'new-budget-id') }));
jest.mock('@/database/client', () => {
  const mockTransactionDb = {} as SQLiteDatabase;
  const mockWithExclusiveTransactionAsync = jest.fn(
    async (task: (db: SQLiteDatabase) => Promise<void>) => task(mockTransactionDb),
  );
  const mockDb = { withExclusiveTransactionAsync: mockWithExclusiveTransactionAsync };
  return {
    getDb: jest.fn().mockResolvedValue(mockDb),
    mockDb,
    mockTransactionDb,
    mockWithExclusiveTransactionAsync,
  };
});
jest.mock('@/modules/budget/database/budget_stats', () => ({
  getBudgetSpendByMonth: jest.fn().mockResolvedValue({}),
  getCategorySpendByMonth: jest.fn().mockResolvedValue({}),
  getSpendingPlanSpend: jest.fn().mockResolvedValue({}),
  getTrailingIncomeSuggestion: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/modules/budget/database/budget_month_profiles', () => ({
  copyBudgetMonthCategoryGroups: jest.fn().mockResolvedValue(undefined),
  getBudgetMonthCategoryGroups: jest.fn().mockResolvedValue({}),
  getBudgetMonthIncome: jest.fn().mockResolvedValue(null),
  setBudgetMonthCategoryGroup: jest.fn().mockResolvedValue(undefined),
  setBudgetMonthIncome: jest.fn().mockResolvedValue(undefined),
  snapshotBudgetMonthCategoryGroups: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/modules/budget/database/budgets', () => ({
  deleteBudgetRow: jest.fn().mockResolvedValue(undefined),
  getBudgetRowById: jest.fn().mockResolvedValue(null),
  getBudgetRows: jest.fn(),
  getBudgetRowsForMonths: jest.fn().mockResolvedValue([]),
  setBudgetRow: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/modules/budget/database/spending_plan_categories', () => ({
  getSpendingPlanCategoryRows: jest.fn().mockResolvedValue([]),
  replaceSpendingPlanCategoryRows: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/modules/budget/database/spending_plans', () => ({
  deleteSpendingPlan: jest.fn().mockResolvedValue(undefined),
  getSpendingPlanById: jest.fn().mockResolvedValue(null),
  getSpendingPlanRows: jest.fn().mockResolvedValue([]),
  getSpendingPlanRowsForRange: jest.fn().mockResolvedValue([]),
  setSpendingPlanRow: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/modules/categories/database/categories', () => ({
  getCategoriesByType: jest.fn().mockResolvedValue([]),
  setCategoryGroup: jest.fn().mockResolvedValue(undefined),
}));

const { deleteBudgetRow, getBudgetRowById, getBudgetRows, getBudgetRowsForMonths, setBudgetRow } =
  jest.requireMock('@/modules/budget/database/budgets') as {
    deleteBudgetRow: jest.Mock<Promise<void>, [SQLiteDatabase, string]>;
    getBudgetRowById: jest.Mock<Promise<Budget | null>, [SQLiteDatabase, string]>;
    getBudgetRows: jest.Mock<Promise<Budget[]>, [SQLiteDatabase]>;
    getBudgetRowsForMonths: jest.Mock<Promise<Budget[]>, [SQLiteDatabase, string[]]>;
    setBudgetRow: jest.Mock<Promise<void>, [SQLiteDatabase, Budget]>;
  };
const {
  getBudgetSpendByMonth,
  getCategorySpendByMonth,
  getSpendingPlanSpend,
  getTrailingIncomeSuggestion,
} = jest.requireMock('@/modules/budget/database/budget_stats') as {
  getBudgetSpendByMonth: jest.Mock<Promise<Record<string, number>>, [SQLiteDatabase, string[]]>;
  getCategorySpendByMonth: jest.Mock<
    Promise<Record<string, Record<string, number>>>,
    [SQLiteDatabase, string[]]
  >;
  getSpendingPlanSpend: jest.Mock<
    Promise<Record<string, Record<string, number>>>,
    [SQLiteDatabase, string[]]
  >;
  getTrailingIncomeSuggestion: jest.Mock<Promise<number | null>, [SQLiteDatabase, string, number?]>;
};
const {
  copyBudgetMonthCategoryGroups,
  getBudgetMonthCategoryGroups,
  getBudgetMonthIncome,
  setBudgetMonthCategoryGroup,
  setBudgetMonthIncome,
  snapshotBudgetMonthCategoryGroups,
} = jest.requireMock('@/modules/budget/database/budget_month_profiles') as {
  copyBudgetMonthCategoryGroups: jest.Mock<
    Promise<void>,
    [SQLiteDatabase, string, string, string[]]
  >;
  getBudgetMonthCategoryGroups: jest.Mock<
    Promise<Partial<Record<string, BudgetGroup>>>,
    [SQLiteDatabase, string]
  >;
  getBudgetMonthIncome: jest.Mock<Promise<number | null>, [SQLiteDatabase, string]>;
  setBudgetMonthCategoryGroup: jest.Mock<
    Promise<void>,
    [SQLiteDatabase, string, string, BudgetGroup]
  >;
  setBudgetMonthIncome: jest.Mock<Promise<void>, [SQLiteDatabase, string, number]>;
  snapshotBudgetMonthCategoryGroups: jest.Mock<Promise<void>, [SQLiteDatabase, string]>;
};
const { setCategoryGroup } = jest.requireMock('@/modules/categories/database/categories') as {
  setCategoryGroup: jest.Mock<Promise<void>, [SQLiteDatabase, string, BudgetGroup]>;
};
const { getSpendingPlanCategoryRows } = jest.requireMock(
  '@/modules/budget/database/spending_plan_categories',
) as {
  getSpendingPlanCategoryRows: jest.Mock<
    Promise<SpendingPlanCategory[]>,
    [SQLiteDatabase, string[]]
  >;
};
const { getSpendingPlanRows } = jest.requireMock('@/modules/budget/database/spending_plans') as {
  getSpendingPlanRows: jest.Mock<Promise<SpendingPlan[]>, [SQLiteDatabase, string]>;
};
const { getDb, mockDb, mockTransactionDb, mockWithExclusiveTransactionAsync } = jest.requireMock(
  '@/database/client',
) as {
  getDb: jest.Mock<Promise<SQLiteDatabase>, []>;
  mockDb: SQLiteDatabase;
  mockTransactionDb: SQLiteDatabase;
  mockWithExclusiveTransactionAsync: jest.Mock<
    Promise<void>,
    [(task: (db: SQLiteDatabase) => Promise<void>) => Promise<void>]
  >;
};

const NOW = '2026-07-01T00:00:00.000Z';

function budget(
  id: string,
  categoryId: string,
  name: string,
  amount: number,
  month: string,
): Budget {
  return {
    id,
    category_id: categoryId,
    name,
    limit_amount: amount,
    effective_from: month,
    created_at: NOW,
    updated_at: NOW,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('currentYearMonth', () => {
  it('formats YYYY-MM with zero-padded month', () => {
    expect(currentYearMonth(new Date('2026-05-09T00:00:00.000Z'))).toBe('2026-05');
    expect(currentYearMonth(new Date('2026-01-31T00:00:00.000Z'))).toBe('2026-01');
  });
});

describe('lastMonths', () => {
  it('returns N months ending at `end`, oldest first', () => {
    expect(lastMonths('2026-05', 4)).toEqual(['2026-02', '2026-03', '2026-04', '2026-05']);
  });
  it('crosses a year boundary correctly', () => {
    expect(lastMonths('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
  it('n=1 returns just the end month', () => {
    expect(lastMonths('2026-05', 1)).toEqual(['2026-05']);
  });
});

describe('BudgetRepository.setBudget', () => {
  it('creates a named monthly budget', async () => {
    await new BudgetRepository().setBudget({
      categoryId: 'food',
      name: 'Trip Food',
      limit: 1500,
      yearMonth: '2026-08',
    });

    expect(setBudgetRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'new-budget-id',
        category_id: 'food',
        name: 'Trip Food',
        limit_amount: 1500,
        effective_from: '2026-08',
      }),
    );
    expect(setBudgetMonthCategoryGroup).not.toHaveBeenCalled();
    expect(setCategoryGroup).not.toHaveBeenCalled();
  });

  it('updates an existing budget by id', async () => {
    getBudgetRowById.mockResolvedValueOnce(
      budget('budget-food', 'food', 'Monthly Food', 5000, '2026-07'),
    );

    await new BudgetRepository().setBudget({
      id: 'budget-food',
      categoryId: 'food',
      name: 'Monthly Food Updated',
      limit: 5500,
      yearMonth: '2026-07',
    });

    expect(setBudgetRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'budget-food',
        category_id: 'food',
        name: 'Monthly Food Updated',
        limit_amount: 5500,
        effective_from: '2026-07',
        created_at: NOW,
      }),
    );
  });

  it('writes the selected-month group snapshot and future category default atomically', async () => {
    await new BudgetRepository().setBudget({
      categoryId: 'food',
      name: 'Monthly Food',
      limit: 5000,
      yearMonth: '2026-08',
      categoryGroup: BudgetGroup.Need,
    });

    expect(setBudgetMonthCategoryGroup).toHaveBeenCalledWith(
      expect.anything(),
      '2026-08',
      'food',
      BudgetGroup.Need,
    );
    expect(setCategoryGroup).toHaveBeenCalledWith(expect.anything(), 'food', BudgetGroup.Need);
    expect(setBudgetMonthCategoryGroup.mock.calls[0]?.[0]).toBe(
      setCategoryGroup.mock.calls[0]?.[0],
    );
    expect(setBudgetRow.mock.calls[0]?.[0]).toBe(setCategoryGroup.mock.calls[0]?.[0]);
  });
});

describe('BudgetRepository month profiles', () => {
  it('loads expected income for the exact month', async () => {
    getBudgetMonthIncome.mockResolvedValueOnce(20_000);

    await expect(new BudgetRepository().getExpectedIncome('2026-07')).resolves.toBe(20_000);

    expect(getBudgetMonthIncome).toHaveBeenCalledWith(expect.anything(), '2026-07');
  });

  it('loads category groups for the exact month', async () => {
    const groups = { food: BudgetGroup.Need, dining: BudgetGroup.Want };
    getBudgetMonthCategoryGroups.mockResolvedValueOnce(groups);

    await expect(new BudgetRepository().getCategoryGroups('2026-06')).resolves.toEqual(groups);

    expect(getBudgetMonthCategoryGroups).toHaveBeenCalledWith(expect.anything(), '2026-06');
  });

  it('sets income and snapshots grouped expense categories in one transaction', async () => {
    await new BudgetRepository().setExpectedIncome('2026-07', 20_000);

    expect(setBudgetMonthIncome).toHaveBeenCalledWith(expect.anything(), '2026-07', 20_000);
    expect(snapshotBudgetMonthCategoryGroups).toHaveBeenCalledWith(expect.anything(), '2026-07');
    expect(setBudgetMonthIncome.mock.calls[0]?.[0]).toBe(
      snapshotBudgetMonthCategoryGroups.mock.calls[0]?.[0],
    );
  });
});

describe('BudgetRepository month snapshot', () => {
  it('assembles one coherent 12-month snapshot from one database handle', async () => {
    const months = lastMonths('2026-07', 12);
    const rows = [budget('budget-food', 'food', 'Monthly Food', 5000, '2026-07')];
    const plan: SpendingPlan = {
      id: 'plan-trip',
      name: 'Trip',
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      total_amount: 2000,
      created_at: NOW,
      updated_at: NOW,
    };
    const planCategories: SpendingPlanCategory[] = [
      { plan_id: plan.id, category_id: 'food', allocated_amount: 2000 },
    ];
    getBudgetRowsForMonths.mockResolvedValueOnce(rows);
    getCategorySpendByMonth.mockResolvedValueOnce({ food: { '2026-07': 1200 } });
    getBudgetSpendByMonth.mockResolvedValueOnce({ 'budget-food': 900 });
    getBudgetMonthIncome.mockResolvedValueOnce(20_000);
    getBudgetMonthCategoryGroups.mockResolvedValueOnce({ food: BudgetGroup.Need });
    getSpendingPlanRows.mockResolvedValueOnce([plan]);
    getSpendingPlanCategoryRows.mockResolvedValueOnce(planCategories);
    getSpendingPlanSpend.mockResolvedValueOnce({ 'plan-trip': { food: 500 } });
    getTrailingIncomeSuggestion.mockResolvedValueOnce(18_000);

    await expect(new BudgetRepository().getMonthSnapshot('2026-07')).resolves.toEqual({
      loadedMonth: '2026-07',
      rows,
      spendByMonth: { food: { '2026-07': 1200 } },
      spendByBudgetId: { 'budget-food': 900 },
      expectedIncome: 20_000,
      budgetGroupByCategoryId: { food: BudgetGroup.Need },
      spendingPlans: [{ ...plan, categories: planCategories }],
      spendingPlanSpendById: { 'plan-trip': { food: 500 } },
      incomeSuggestion: 18_000,
    });

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(getBudgetRowsForMonths).toHaveBeenCalledWith(mockDb, months);
    expect(getCategorySpendByMonth).toHaveBeenCalledWith(mockDb, months);
    expect(getBudgetSpendByMonth).toHaveBeenCalledWith(mockDb, months);
    expect(getBudgetMonthIncome).toHaveBeenCalledWith(mockDb, '2026-07');
    expect(getBudgetMonthCategoryGroups).toHaveBeenCalledWith(mockDb, '2026-07');
    expect(getSpendingPlanRows).toHaveBeenCalledWith(mockDb, '2026-07');
    expect(getSpendingPlanCategoryRows).toHaveBeenCalledWith(mockDb, ['plan-trip']);
    expect(getSpendingPlanSpend).toHaveBeenCalledWith(mockDb, ['plan-trip']);
    expect(getTrailingIncomeSuggestion).toHaveBeenCalledWith(mockDb, '2026-07');
    expect(getBudgetRows).not.toHaveBeenCalled();
  });
});

describe('BudgetRepository copy preview', () => {
  it.each([
    {
      label: 'source-only rows',
      rows: [budget('source-food', 'food', 'Food', 5000, '2026-06')],
    },
    {
      label: 'target-only rows',
      rows: [budget('target-food', 'food', 'Food', 4000, '2026-07')],
    },
    {
      label: 'source and target rows',
      rows: [
        budget('source-food', 'food', 'Food', 5000, '2026-06'),
        budget('target-food', 'food', 'Food', 4000, '2026-07'),
      ],
    },
    { label: 'an empty source and target', rows: [] },
  ])('loads only the requested months for $label', async ({ rows }) => {
    getBudgetRowsForMonths.mockResolvedValueOnce(rows);

    await expect(new BudgetRepository().getCopyPreview('2026-06', '2026-07')).resolves.toEqual(
      rows,
    );

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(getBudgetRowsForMonths).toHaveBeenCalledWith(mockDb, ['2026-06', '2026-07']);
    expect(getBudgetRows).not.toHaveBeenCalled();
  });
});

describe('BudgetRepository.removeBudget', () => {
  it('removes a budget by id', async () => {
    await new BudgetRepository().removeBudget('budget-food');

    expect(deleteBudgetRow).toHaveBeenCalledWith(expect.anything(), 'budget-food');
  });
});

describe('BudgetRepository.copyBudgetsToMonth', () => {
  it('copies selected source budgets by id', async () => {
    getBudgetRows.mockResolvedValueOnce([
      budget('budget-food', 'food', 'Monthly Food', 5000, '2026-07'),
      budget('budget-housing', 'housing', 'Rent', 700, '2026-06'),
    ]);

    await new BudgetRepository().copyBudgetsToMonth('2026-07', '2026-08', ['budget-food']);

    expect(mockWithExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(getBudgetRows).toHaveBeenCalledWith(mockTransactionDb);
    expect(setBudgetRow).toHaveBeenCalledTimes(1);
    expect(setBudgetRow).toHaveBeenCalledWith(
      mockTransactionDb,
      expect.objectContaining({
        id: 'new-budget-id',
        category_id: 'food',
        name: 'Monthly Food',
        limit_amount: 5000,
        effective_from: '2026-08',
      }),
    );
    expect(copyBudgetMonthCategoryGroups).toHaveBeenCalledWith(
      mockTransactionDb,
      '2026-07',
      '2026-08',
      ['food'],
    );
  });

  it('replaces an existing target budget with the same category and name', async () => {
    getBudgetRows.mockResolvedValueOnce([
      budget('source-food', 'food', 'Monthly Food', 5000, '2026-07'),
      budget('target-food', 'food', 'Monthly Food', 3200, '2026-08'),
    ]);

    await new BudgetRepository().copyBudgetsToMonth('2026-07', '2026-08', ['source-food']);

    expect(setBudgetRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'target-food',
        category_id: 'food',
        name: 'Monthly Food',
        limit_amount: 5000,
        effective_from: '2026-08',
        created_at: NOW,
      }),
    );
  });

  it('copies group snapshots only for categories of selected source budgets', async () => {
    getBudgetRows.mockResolvedValueOnce([
      budget('budget-food-main', 'food', 'Monthly Food', 5000, '2026-07'),
      budget('budget-food-trip', 'food', 'Trip Food', 900, '2026-07'),
      budget('budget-rent', 'housing', 'Rent', 7000, '2026-07'),
      budget('budget-old', 'transport', 'Transport', 500, '2026-06'),
    ]);

    await new BudgetRepository().copyBudgetsToMonth('2026-07', '2026-08', [
      'budget-food-main',
      'budget-food-trip',
      'budget-old',
      'missing-budget',
    ]);

    expect(copyBudgetMonthCategoryGroups).toHaveBeenCalledWith(
      expect.anything(),
      '2026-07',
      '2026-08',
      ['food'],
    );
  });

  it('stops sequential transaction writes and skips group snapshots when a budget copy fails', async () => {
    const writeError = new Error('budget copy failed');
    getBudgetRows.mockResolvedValueOnce([
      budget('budget-food', 'food', 'Food', 5000, '2026-07'),
      budget('budget-rent', 'housing', 'Rent', 7000, '2026-07'),
      budget('budget-fuel', 'transport', 'Fuel', 1000, '2026-07'),
    ]);
    setBudgetRow.mockResolvedValueOnce(undefined).mockRejectedValueOnce(writeError);

    await expect(
      new BudgetRepository().copyBudgetsToMonth('2026-07', '2026-08', [
        'budget-food',
        'budget-rent',
        'budget-fuel',
      ]),
    ).rejects.toThrow(writeError);

    expect(mockWithExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(setBudgetRow).toHaveBeenCalledTimes(2);
    expect(setBudgetRow.mock.calls.every(([db]) => db === mockTransactionDb)).toBe(true);
    expect(copyBudgetMonthCategoryGroups).not.toHaveBeenCalled();
  });
});
