/**
 * budget.repository.round_at_write.test.ts
 *
 * c8: BudgetRepository.setExpectedIncome / .setBudget / .setSpendingPlan
 * round at the method's first statement (ADR: money-rounding-layer §3 rows
 * 4-6 -- class C, no derived sibling). Bridges better-sqlite3 into the
 * mocked expo-sqlite surface the way `budget.repository.copy_atomic.test.ts`
 * does (`withExclusiveTransactionAsync` mapped to real BEGIN EXCLUSIVE /
 * COMMIT / ROLLBACK), so every assertion reads the real column, never a
 * mocked call.
 */
import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';

import { MIGRATIONS } from '@/database/migrations';
import { BudgetRepository } from '@/modules/budget/repositories/budget.repository';
import { getSQLiteParams } from '@/test_helpers/sqlite';

jest.mock('@/database/client', () => ({ getDb: jest.fn() }));
jest.mock('react-native-uuid', () => ({ v4: jest.fn() }));

const NOW_ISO = '2026-08-01T00:00:00.000Z';
let realDb: ReturnType<typeof Database>;
let fakeDb: SQLiteDatabase;
let generatedId = 0;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.pragma('foreign_keys = ON');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));

  fakeDb = {
    getAllAsync: jest.fn(async (sql: string, ...rest: unknown[]) =>
      realDb.prepare(sql).all(...getSQLiteParams(rest)),
    ),
    getFirstAsync: jest.fn(async (sql: string, ...rest: unknown[]) => {
      const row = realDb.prepare(sql).get(...getSQLiteParams(rest));
      return row ?? null;
    }),
    runAsync: jest.fn(async (sql: string, ...rest: unknown[]) => {
      const result = realDb.prepare(sql).run(...getSQLiteParams(rest));
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
    }),
    withExclusiveTransactionAsync: jest.fn(async <T>(task: (db: SQLiteDatabase) => Promise<T>) => {
      realDb.exec('BEGIN EXCLUSIVE');
      try {
        const result = await task(fakeDb);
        realDb.exec('COMMIT');
        return result;
      } catch (error) {
        realDb.exec('ROLLBACK');
        throw error;
      }
    }),
  } as unknown as SQLiteDatabase;

  const { getDb } = jest.requireMock('@/database/client') as {
    getDb: jest.Mock<Promise<SQLiteDatabase>, []>;
  };
  getDb.mockResolvedValue(fakeDb);
});

beforeEach(() => {
  realDb.exec(
    'DELETE FROM budget_month_settings; DELETE FROM budget_month_category_groups; DELETE FROM budgets;',
  );
  generatedId = 0;
  (uuid.v4 as jest.Mock).mockImplementation(() => `generated-${++generatedId}`);
  jest.clearAllMocks();
});

afterAll(() => {
  realDb.close();
});

function readExpectedIncome(yearMonth: string): number | null {
  const row = realDb
    .prepare('SELECT expected_income FROM budget_month_settings WHERE year_month = ?')
    .get(yearMonth) as { expected_income: number } | undefined;
  return row?.expected_income ?? null;
}

describe('BudgetRepository.setExpectedIncome — rounds at the first statement', () => {
  // Scenario row 22. Gate: delete the `roundMoney` rebinding (bind `amount`
  // straight into `setBudgetMonthIncome` again) and this reads back
  // 12000.004, since `verified 12000.004 -> 12000` only holds with the
  // rounding in place.
  it('12000.004 persists as 12000', async () => {
    const repo = new BudgetRepository();
    await repo.setExpectedIncome('2026-08', 12000.004);

    expect(readExpectedIncome('2026-08')).toBe(12000);
  });
});
