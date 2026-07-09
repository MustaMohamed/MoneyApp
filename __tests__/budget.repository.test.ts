import type { SQLiteDatabase } from 'expo-sqlite';

import type { Budget } from '@/modules/budget/entities/budget.entity';
import {
  BudgetRepository,
  currentYearMonth,
  lastMonths,
} from '@/modules/budget/repositories/budget.repository';

jest.mock('react-native-uuid', () => ({ v4: jest.fn(() => 'new-budget-id') }));
jest.mock('@/database/client', () => ({ getDb: jest.fn().mockResolvedValue({}) }));
jest.mock('@/modules/budget/database/budget_stats', () => ({
  getCategorySpendByMonth: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/modules/budget/database/budgets', () => ({
  deleteBudgetRow: jest.fn().mockResolvedValue(undefined),
  getBudgetRows: jest.fn(),
  setBudgetRow: jest.fn().mockResolvedValue(undefined),
}));

const { deleteBudgetRow, getBudgetRows, setBudgetRow } = jest.requireMock(
  '@/modules/budget/database/budgets',
) as {
  deleteBudgetRow: jest.Mock<Promise<void>, [SQLiteDatabase, string]>;
  getBudgetRows: jest.Mock<Promise<Budget[]>, [SQLiteDatabase]>;
  setBudgetRow: jest.Mock<Promise<void>, [SQLiteDatabase, Budget]>;
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
  });

  it('updates an existing budget by id', async () => {
    getBudgetRows.mockResolvedValueOnce([
      budget('budget-food', 'food', 'Monthly Food', 5000, '2026-07'),
    ]);

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

    expect(setBudgetRow).toHaveBeenCalledTimes(1);
    expect(setBudgetRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'new-budget-id',
        category_id: 'food',
        name: 'Monthly Food',
        limit_amount: 5000,
        effective_from: '2026-08',
      }),
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
});
