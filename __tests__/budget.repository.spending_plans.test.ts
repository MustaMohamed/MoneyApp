import type { SQLiteDatabase } from 'expo-sqlite';

import { BudgetGroup, CategoryType } from '@/constants/enums';
import type { SpendingPlan, SpendingPlanCategory } from '@/modules/budget/entities/budget.entity';
import { BudgetRepository } from '@/modules/budget/repositories/budget.repository';

jest.mock('react-native-uuid', () => ({ v4: jest.fn(() => 'new-plan-id') }));
jest.mock('@/database/client', () => {
  const mockWithExclusiveTransactionAsync = jest.fn(
    async (task: (txn: SQLiteDatabase) => Promise<void>) => {
      await task({} as SQLiteDatabase);
    },
  );
  return {
    getDb: jest
      .fn()
      .mockResolvedValue({ withExclusiveTransactionAsync: mockWithExclusiveTransactionAsync }),
    mockWithExclusiveTransactionAsync,
  };
});
jest.mock('@/modules/budget/database/budget_stats', () => ({
  getCategorySpendByMonth: jest.fn().mockResolvedValue({}),
  getSpendingPlanSpend: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/modules/budget/database/budgets', () => ({
  deleteBudgetRow: jest.fn().mockResolvedValue(undefined),
  getBudgetRowById: jest.fn().mockResolvedValue(null),
  getBudgetRows: jest.fn().mockResolvedValue([]),
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
  getCategoriesByType: jest.fn().mockResolvedValue([
    { id: 'cat_food', type: 'expense' },
    { id: 'cat_travel', type: 'expense' },
  ]),
  setCategoryGroup: jest.fn().mockResolvedValue(undefined),
}));

interface SpendingPlanWithCategories extends SpendingPlan {
  categories: SpendingPlanCategory[];
}

const { mockWithExclusiveTransactionAsync } = jest.requireMock('@/database/client') as {
  mockWithExclusiveTransactionAsync: jest.Mock<
    Promise<void>,
    [(txn: SQLiteDatabase) => Promise<void>]
  >;
};
const {
  deleteSpendingPlan,
  getSpendingPlanById,
  getSpendingPlanRows,
  getSpendingPlanRowsForRange,
  setSpendingPlanRow,
} = jest.requireMock('@/modules/budget/database/spending_plans') as {
  deleteSpendingPlan: jest.Mock<Promise<void>, [SQLiteDatabase, string]>;
  getSpendingPlanById: jest.Mock<Promise<SpendingPlan | null>, [SQLiteDatabase, string]>;
  getSpendingPlanRows: jest.Mock<Promise<SpendingPlan[]>, [SQLiteDatabase, string]>;
  getSpendingPlanRowsForRange: jest.Mock<
    Promise<SpendingPlan[]>,
    [SQLiteDatabase, { startDate: string; endDate: string }]
  >;
  setSpendingPlanRow: jest.Mock<Promise<void>, [SQLiteDatabase, SpendingPlan]>;
};
const { getSpendingPlanCategoryRows, replaceSpendingPlanCategoryRows } = jest.requireMock(
  '@/modules/budget/database/spending_plan_categories',
) as {
  getSpendingPlanCategoryRows: jest.Mock<
    Promise<SpendingPlanCategory[]>,
    [SQLiteDatabase, string[]]
  >;
  replaceSpendingPlanCategoryRows: jest.Mock<
    Promise<void>,
    [SQLiteDatabase, string, SpendingPlanCategory[]]
  >;
};
const { getSpendingPlanSpend } = jest.requireMock('@/modules/budget/database/budget_stats') as {
  getSpendingPlanSpend: jest.Mock<
    Promise<Record<string, Record<string, number>>>,
    [SQLiteDatabase, string[]]
  >;
};
const { getCategoriesByType } = jest.requireMock('@/modules/categories/database/categories') as {
  getCategoriesByType: jest.Mock<
    Promise<Array<{ id: string; type: CategoryType }>>,
    [SQLiteDatabase, string]
  >;
};
const { setCategoryGroup } = jest.requireMock('@/modules/categories/database/categories') as {
  setCategoryGroup: jest.Mock<Promise<void>, [SQLiteDatabase, string, BudgetGroup | null]>;
};
const { setBudgetRow } = jest.requireMock('@/modules/budget/database/budgets') as {
  setBudgetRow: jest.Mock<Promise<void>, [SQLiteDatabase, unknown]>;
};

const NOW = '2026-07-09T00:00:00.000Z';

function plan(
  id: string,
  name: string,
  startDate: string,
  endDate: string,
  categoryIds: string[],
): SpendingPlanWithCategories {
  return {
    id,
    name,
    start_date: startDate,
    end_date: endDate,
    total_amount: 3000,
    created_at: NOW,
    updated_at: NOW,
    categories: categoryIds.map((categoryId) => ({
      plan_id: id,
      category_id: categoryId,
      allocated_amount: null,
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date(NOW));
  getCategoriesByType.mockResolvedValue([
    { id: 'cat_food', type: CategoryType.Expense },
    { id: 'cat_travel', type: CategoryType.Expense },
  ]);
});

afterEach(() => jest.useRealTimers());

describe('BudgetRepository spending plans', () => {
  it('writes a budget and its category group in one exclusive transaction', async () => {
    await new BudgetRepository().setBudget({
      categoryId: 'cat_food',
      name: 'Weekday meals',
      limit: 1200,
      yearMonth: '2026-07',
      categoryGroup: BudgetGroup.Need,
    });

    expect(mockWithExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    const transaction = mockWithExclusiveTransactionAsync.mock.calls[0]?.[0];
    const transactionDb = {} as SQLiteDatabase;
    setBudgetRow.mockClear();
    setCategoryGroup.mockClear();

    await transaction?.(transactionDb);

    expect(setBudgetRow).toHaveBeenCalledWith(transactionDb, expect.anything());
    expect(setCategoryGroup).toHaveBeenCalledWith(transactionDb, 'cat_food', BudgetGroup.Need);
  });

  it('creates a plan with selected categories and allocations', async () => {
    await new BudgetRepository().setSpendingPlan({
      name: 'Alexandria weekend',
      startDate: '2026-07-18',
      endDate: '2026-07-21',
      totalAmount: 8000,
      categories: [{ categoryId: 'cat_food', allocatedAmount: 3000 }, { categoryId: 'cat_travel' }],
    });

    expect(setSpendingPlanRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'new-plan-id',
        name: 'Alexandria weekend',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
      }),
    );
    expect(replaceSpendingPlanCategoryRows).toHaveBeenCalledWith(expect.anything(), 'new-plan-id', [
      { plan_id: 'new-plan-id', category_id: 'cat_food', allocated_amount: 3000 },
      { plan_id: 'new-plan-id', category_id: 'cat_travel', allocated_amount: null },
    ]);
  });

  it('serializes overlap validation and writes in an exclusive transaction', async () => {
    await new BudgetRepository().setSpendingPlan({
      name: 'Alexandria weekend',
      startDate: '2026-07-18',
      endDate: '2026-07-21',
      totalAmount: 8000,
      categories: [{ categoryId: 'cat_food' }],
    });

    expect(mockWithExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(getSpendingPlanRowsForRange).toHaveBeenCalledWith(expect.anything(), {
      startDate: '2026-07-18',
      endDate: '2026-07-21',
    });
    expect(setSpendingPlanRow).toHaveBeenCalledWith(expect.anything(), expect.anything());
  });

  it('rejects allocations above the plan total', async () => {
    await expect(
      new BudgetRepository().setSpendingPlan({
        name: 'Trip',
        startDate: '2026-07-18',
        endDate: '2026-07-21',
        totalAmount: 5000,
        categories: [
          { categoryId: 'cat_food', allocatedAmount: 3000 },
          { categoryId: 'cat_travel', allocatedAmount: 3000 },
        ],
      }),
    ).rejects.toThrow('Allocations exceed the plan total');
    expect(setSpendingPlanRow).not.toHaveBeenCalled();
  });

  it('rejects a negative category allocation before writing', async () => {
    await expect(
      new BudgetRepository().setSpendingPlan({
        name: 'Trip',
        startDate: '2026-07-18',
        endDate: '2026-07-21',
        totalAmount: 5000,
        categories: [{ categoryId: 'cat_food', allocatedAmount: -1 }],
      }),
    ).rejects.toThrow('Each allocation must be zero or greater');

    expect(setSpendingPlanRow).not.toHaveBeenCalled();
  });

  it('rejects non-expense categories before writing', async () => {
    getCategoriesByType.mockResolvedValueOnce([{ id: 'cat_food', type: CategoryType.Expense }]);

    await expect(
      new BudgetRepository().setSpendingPlan({
        name: 'Trip',
        startDate: '2026-07-18',
        endDate: '2026-07-21',
        totalAmount: 5000,
        categories: [{ categoryId: 'cat_income' }],
      }),
    ).rejects.toThrow('Select expense categories only');

    expect(setSpendingPlanRow).not.toHaveBeenCalled();
  });

  it('rejects overlapping plans for the same category', async () => {
    const existing = plan('existing', 'Existing trip', '2026-07-20', '2026-07-25', ['cat_food']);
    getSpendingPlanRowsForRange.mockResolvedValueOnce([existing]);
    getSpendingPlanCategoryRows.mockResolvedValueOnce(existing.categories);

    await expect(
      new BudgetRepository().setSpendingPlan({
        name: 'New trip',
        startDate: '2026-07-18',
        endDate: '2026-07-21',
        totalAmount: 5000,
        categories: [{ categoryId: 'cat_food' }],
      }),
    ).rejects.toThrow('cat_food overlaps Existing trip');
    expect(setSpendingPlanRow).not.toHaveBeenCalled();
  });

  it('allows overlapping dates for different categories', async () => {
    const existing = plan('existing', 'Existing trip', '2026-07-20', '2026-07-25', ['cat_food']);
    getSpendingPlanRowsForRange.mockResolvedValueOnce([existing]);
    getSpendingPlanCategoryRows.mockResolvedValueOnce(existing.categories);

    await new BudgetRepository().setSpendingPlan({
      name: 'New trip',
      startDate: '2026-07-18',
      endDate: '2026-07-21',
      totalAmount: 5000,
      categories: [{ categoryId: 'cat_travel' }],
    });

    expect(setSpendingPlanRow).toHaveBeenCalledTimes(1);
  });

  it('preserves created_at when editing an existing plan', async () => {
    getSpendingPlanById.mockResolvedValueOnce(
      plan('plan_trip', 'Trip', '2026-07-18', '2026-07-21', ['cat_food']),
    );

    await new BudgetRepository().setSpendingPlan({
      id: 'plan_trip',
      name: 'Trip edited',
      startDate: '2026-08-01',
      endDate: '2026-08-04',
      totalAmount: 7000,
      categories: [{ categoryId: 'cat_food' }],
    });

    expect(setSpendingPlanRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'plan_trip',
        name: 'Trip edited',
        created_at: NOW,
      }),
    );
  });

  it('loads visible plans and category spend for them', async () => {
    const loadedPlan = plan('plan_trip', 'Trip', '2026-07-18', '2026-07-21', ['cat_food']);
    getSpendingPlanRows.mockResolvedValueOnce([loadedPlan]);
    getSpendingPlanCategoryRows.mockResolvedValueOnce(loadedPlan.categories);
    getSpendingPlanSpend.mockResolvedValueOnce({ plan_trip: { cat_food: 1200 } });

    const result = await new BudgetRepository().getSpendingPlansForMonth('2026-07');

    expect(result.plans).toHaveLength(1);
    expect(result.spendByPlanId).toEqual({ plan_trip: { cat_food: 1200 } });
    expect(getSpendingPlanSpend).toHaveBeenCalledWith(expect.anything(), ['plan_trip']);
  });

  it('loads plan details by id independently of the selected month', async () => {
    const loadedPlan = plan('plan_trip', 'Trip', '2026-08-01', '2026-08-04', ['cat_food']);
    getSpendingPlanById.mockResolvedValueOnce(loadedPlan);
    getSpendingPlanCategoryRows.mockResolvedValueOnce(loadedPlan.categories);
    getSpendingPlanSpend.mockResolvedValueOnce({ plan_trip: { cat_food: 400 } });

    const result = await new BudgetRepository().getSpendingPlanDetails('plan_trip');

    expect(result).toEqual({ plan: loadedPlan, spend: { cat_food: 400 } });
  });

  it('deletes a spending plan by id', async () => {
    await new BudgetRepository().removeSpendingPlan('plan_trip');
    expect(deleteSpendingPlan).toHaveBeenCalledWith(expect.anything(), 'plan_trip');
  });
});
