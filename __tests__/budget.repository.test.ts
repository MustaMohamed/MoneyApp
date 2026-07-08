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
  getBudgetRows: jest.fn(),
  setBudgetRow: jest.fn().mockResolvedValue(undefined),
}));

const { getBudgetRows, setBudgetRow } = jest.requireMock('@/modules/budget/database/budgets') as {
  getBudgetRows: jest.Mock<Promise<Budget[]>, [SQLiteDatabase]>;
  setBudgetRow: jest.Mock<Promise<void>, [SQLiteDatabase, Budget]>;
};

const NOW = '2026-07-01T00:00:00.000Z';

function budget(categoryId: string, amount: number | null, month: string): Budget {
  return {
    id: `${categoryId}-${month}`,
    category_id: categoryId,
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

describe('BudgetRepository.copyLimitsToMonth', () => {
  it('copies only limits explicitly defined in the source month', async () => {
    getBudgetRows.mockResolvedValueOnce([
      budget('food', 5000, '2026-07'),
      budget('housing', 700, '2026-06'),
    ]);

    await new BudgetRepository().copyLimitsToMonth('2026-07', '2026-08', ['food', 'housing']);

    expect(setBudgetRow).toHaveBeenCalledTimes(1);
    expect(setBudgetRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        category_id: 'food',
        limit_amount: 5000,
        effective_from: '2026-08',
      }),
    );
  });
});
