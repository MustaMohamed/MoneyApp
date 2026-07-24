import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { BudgetRepository } from '@/modules/budget/repositories/budget.repository';
import { getSQLiteParams } from '@/test_helpers/sqlite';

let mockRepositoryDb: SQLiteDatabase;
let mockUuidCounter = 0;

jest.mock('@/database/client', () => ({
  getDb: jest.fn(async () => mockRepositoryDb),
}));
jest.mock('react-native-uuid', () => ({
  __esModule: true,
  default: { v4: () => `copied-budget-${++mockUuidCounter}` },
}));

const { getDb } = jest.requireMock('@/database/client') as {
  getDb: jest.Mock<Promise<SQLiteDatabase>, []>;
};

const NOW = '2026-07-01T00:00:00.000Z';
let realDb: ReturnType<typeof Database>;
let failOnBudgetWrite: number | undefined;
let budgetWriteCount = 0;
let transactionCount = 0;

function seedBudget(id: string, name: string, amount: number): void {
  realDb
    .prepare(
      `INSERT INTO budgets
         (id, category_id, name, limit_amount, effective_from, created_at, updated_at)
       VALUES (?, 'cat_food', ?, ?, '2026-07', ?, ?)`,
    )
    .run(id, name, amount, NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.pragma('foreign_keys = ON');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
  realDb
    .prepare(
      `INSERT OR IGNORE INTO categories
         (id, name, type, icon, color, is_default, sort_order, budget_group, created_at, updated_at)
       VALUES ('cat_food', 'Food', 'expense', 'food', '#fff', 0, 0, 'need', ?, ?)`,
    )
    .run(NOW, NOW);

  const bridge = {
    getAllAsync: async (sql: string, ...rest: unknown[]) =>
      realDb.prepare(sql).all(...getSQLiteParams(rest)),
    runAsync: async (sql: string, ...rest: unknown[]) => {
      if (sql.includes('INSERT INTO budgets')) {
        budgetWriteCount += 1;
        if (budgetWriteCount === failOnBudgetWrite) {
          throw new Error('injected budget write failure');
        }
      }
      const result = realDb.prepare(sql).run(...getSQLiteParams(rest));
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
    },
    withExclusiveTransactionAsync: async <T>(task: (db: SQLiteDatabase) => Promise<T>) => {
      transactionCount += 1;
      realDb.exec('BEGIN EXCLUSIVE');
      try {
        const result = await task(mockRepositoryDb);
        realDb.exec('COMMIT');
        return result;
      } catch (error) {
        realDb.exec('ROLLBACK');
        throw error;
      }
    },
  };
  mockRepositoryDb = bridge as unknown as SQLiteDatabase;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUuidCounter = 0;
  failOnBudgetWrite = undefined;
  budgetWriteCount = 0;
  transactionCount = 0;
  realDb.exec('DELETE FROM budget_month_category_groups; DELETE FROM budgets;');
  seedBudget('source-food', 'Food', 5000);
  seedBudget('source-trip', 'Trip Food', 900);
  seedBudget('source-snacks', 'Snacks', 400);
  realDb
    .prepare(
      `INSERT INTO budget_month_category_groups
         (year_month, category_id, budget_group, created_at, updated_at)
       VALUES ('2026-07', 'cat_food', 'need', ?, ?)`,
    )
    .run(NOW, NOW);
});

afterAll(() => {
  realDb.close();
});

describe('BudgetRepository atomic copy', () => {
  it.each([
    {
      label: 'selected Budget IDs',
      copy: (repository: BudgetRepository) =>
        repository.copyBudgetsToMonth('2026-07', '2026-08', [
          'source-food',
          'source-trip',
          'source-snacks',
        ]),
    },
    {
      label: 'selected category limits',
      copy: (repository: BudgetRepository) =>
        repository.copyLimitsToMonth('2026-07', '2026-08', ['cat_food']),
    },
  ])('rolls back the first write when write two fails for $label', async ({ copy }) => {
    failOnBudgetWrite = 2;

    await expect(copy(new BudgetRepository())).rejects.toThrow('injected budget write failure');

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(transactionCount).toBe(1);
    expect(budgetWriteCount).toBe(2);
    expect(
      realDb
        .prepare("SELECT COUNT(*) AS count FROM budgets WHERE effective_from = '2026-08'")
        .get(),
    ).toEqual({ count: 0 });
    expect(
      realDb
        .prepare(
          "SELECT COUNT(*) AS count FROM budget_month_category_groups WHERE year_month = '2026-08'",
        )
        .get(),
    ).toEqual({ count: 0 });
  });
});
