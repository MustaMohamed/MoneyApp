import type { SQLiteDatabase } from 'expo-sqlite';

import type { SpendingPlan, SpendingPlanCategory } from '@/modules/budget/entities/budget.entity';
import { BudgetRepository } from '@/modules/budget/repositories/budget.repository';

jest.mock('react-native-uuid', () => ({ v4: jest.fn(() => 'new-plan-id') }));
jest.mock('@/database/client', () => ({ getDb: jest.fn().mockResolvedValue({}) }));
jest.mock('@/modules/budget/database/budget_stats', () => ({
  getCategorySpendByMonth: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/modules/budget/database/budgets', () => ({
  deleteBudgetRow: jest.fn().mockResolvedValue(undefined),
  getBudgetRows: jest.fn().mockResolvedValue([]),
  setBudgetRow: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/modules/budget/database/spending_plans', () => ({
  deleteSpendingPlan: jest.fn().mockResolvedValue(undefined),
  getPlanCategorySpend: jest.fn().mockResolvedValue({}),
  getSpendingPlanById: jest.fn().mockResolvedValue(null),
  getSpendingPlanRows: jest.fn().mockResolvedValue([]),
  getSpendingPlanRowsForRange: jest.fn().mockResolvedValue([]),
  setSpendingPlan: jest.fn().mockResolvedValue(undefined),
}));

interface SpendingPlanWithCategories extends SpendingPlan {
  categories: SpendingPlanCategory[];
}

const {
  deleteSpendingPlan,
  getPlanCategorySpend,
  getSpendingPlanById,
  getSpendingPlanRows,
  getSpendingPlanRowsForRange,
  setSpendingPlan,
} = jest.requireMock('@/modules/budget/database/spending_plans') as {
  deleteSpendingPlan: jest.Mock<Promise<void>, [SQLiteDatabase, string]>;
  getPlanCategorySpend: jest.Mock<Promise<Record<string, number>>, [SQLiteDatabase, unknown]>;
  getSpendingPlanById: jest.Mock<
    Promise<SpendingPlanWithCategories | null>,
    [SQLiteDatabase, string]
  >;
  getSpendingPlanRows: jest.Mock<Promise<SpendingPlanWithCategories[]>, [SQLiteDatabase, string]>;
  getSpendingPlanRowsForRange: jest.Mock<
    Promise<SpendingPlanWithCategories[]>,
    [SQLiteDatabase, { startDate: string; endDate: string }]
  >;
  setSpendingPlan: jest.Mock<Promise<void>, [SQLiteDatabase, SpendingPlan, SpendingPlanCategory[]]>;
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
});

afterEach(() => jest.useRealTimers());

describe('BudgetRepository spending plans', () => {
  it('creates a plan with selected categories and allocations', async () => {
    await new BudgetRepository().setSpendingPlan({
      name: 'Alexandria weekend',
      startDate: '2026-07-18',
      endDate: '2026-07-21',
      totalAmount: 8000,
      categories: [{ categoryId: 'cat_food', allocatedAmount: 3000 }, { categoryId: 'cat_travel' }],
    });

    expect(setSpendingPlan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'new-plan-id',
        name: 'Alexandria weekend',
        start_date: '2026-07-18',
        end_date: '2026-07-21',
        total_amount: 8000,
      }),
      [
        { plan_id: 'new-plan-id', category_id: 'cat_food', allocated_amount: 3000 },
        { plan_id: 'new-plan-id', category_id: 'cat_travel', allocated_amount: null },
      ],
    );
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
    expect(setSpendingPlan).not.toHaveBeenCalled();
  });

  it('rejects overlapping plans for the same category', async () => {
    getSpendingPlanRowsForRange.mockResolvedValueOnce([
      plan('existing', 'Existing trip', '2026-07-20', '2026-07-25', ['cat_food']),
    ]);

    await expect(
      new BudgetRepository().setSpendingPlan({
        name: 'New trip',
        startDate: '2026-07-18',
        endDate: '2026-07-21',
        totalAmount: 5000,
        categories: [{ categoryId: 'cat_food' }],
      }),
    ).rejects.toThrow('cat_food overlaps Existing trip');
    expect(setSpendingPlan).not.toHaveBeenCalled();
  });

  it('allows overlapping dates for different categories', async () => {
    getSpendingPlanRowsForRange.mockResolvedValueOnce([
      plan('existing', 'Existing trip', '2026-07-20', '2026-07-25', ['cat_food']),
    ]);

    await new BudgetRepository().setSpendingPlan({
      name: 'New trip',
      startDate: '2026-07-18',
      endDate: '2026-07-21',
      totalAmount: 5000,
      categories: [{ categoryId: 'cat_travel' }],
    });

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
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

    expect(setSpendingPlan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'plan_trip',
        name: 'Trip edited',
        created_at: NOW,
      }),
      expect.any(Array),
    );
  });

  it('loads visible plans and category spend for them', async () => {
    getSpendingPlanRows.mockResolvedValueOnce([
      plan('plan_trip', 'Trip', '2026-07-18', '2026-07-21', ['cat_food']),
    ]);
    getPlanCategorySpend.mockResolvedValueOnce({ cat_food: 1200 });

    const result = await new BudgetRepository().getSpendingPlansForMonth('2026-07');

    expect(result.plans).toHaveLength(1);
    expect(result.spendByPlanId).toEqual({ plan_trip: { cat_food: 1200 } });
    expect(getPlanCategorySpend).toHaveBeenCalledWith(expect.anything(), {
      startDate: '2026-07-18',
      endDate: '2026-07-21',
      categoryIds: ['cat_food'],
    });
  });

  it('deletes a spending plan by id', async () => {
    await new BudgetRepository().removeSpendingPlan('plan_trip');
    expect(deleteSpendingPlan).toHaveBeenCalledWith(expect.anything(), 'plan_trip');
  });
});
