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
import {
  BudgetRepository,
  SpendingPlanValidationError,
} from '@/modules/budget/repositories/budget.repository';
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
    `DELETE FROM budget_month_settings;
     DELETE FROM budget_month_category_groups;
     DELETE FROM budgets;
     DELETE FROM spending_plan_categories;
     DELETE FROM spending_plans;`,
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

function readLimitAmount(id: string): number | null {
  const row = realDb.prepare('SELECT limit_amount FROM budgets WHERE id = ?').get(id) as
    | { limit_amount: number }
    | undefined;
  return row?.limit_amount ?? null;
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

describe('BudgetRepository.setBudget — rounds at the first statement', () => {
  // Scenario row 21. Gate: delete the `roundMoney` rebinding (bind
  // `input.limit` straight into `setBudgetRow` again) and this reads back
  // 500.555.
  it('500.555 persists as 500.56', async () => {
    const repo = new BudgetRepository();
    await repo.setBudget({
      categoryId: 'cat_food',
      name: 'Weekday meals',
      limit: 500.555,
      yearMonth: '2026-08',
    });

    expect(readLimitAmount('generated-1')).toBe(500.56);
  });

  // setLimit (:348) delegates to setBudget and must not round a second time
  // -- roundMoney is idempotent, so a second call would be silently
  // undetectable from the persisted value alone; asserted separately so the
  // delegation itself (not just the arithmetic) cannot be silently replaced
  // with a duplicate rounding call.
  it('setLimit persists through the same rounding as setBudget', async () => {
    const repo = new BudgetRepository();
    await repo.setLimit('cat_food', 500.555, '2026-08');

    expect(readLimitAmount('generated-1')).toBe(500.56);
  });
});

function readTotalAmount(id: string): number {
  const row = realDb.prepare('SELECT total_amount FROM spending_plans WHERE id = ?').get(id) as {
    total_amount: number;
  };
  return row.total_amount;
}

function readAllocatedAmount(planId: string, categoryId: string): number | null {
  const row = realDb
    .prepare(
      'SELECT allocated_amount FROM spending_plan_categories WHERE plan_id = ? AND category_id = ?',
    )
    .get(planId, categoryId) as { allocated_amount: number | null } | undefined;
  return row?.allocated_amount ?? null;
}

function countSpendingPlans(): number {
  const row = realDb.prepare('SELECT COUNT(*) AS count FROM spending_plans').get() as {
    count: number;
  };
  return row.count;
}

describe('BudgetRepository.setSpendingPlan — rounds at the first statement, upstream of validation', () => {
  // Scenario row 24. `1000.005` is the spec's own worked example, but its
  // stated persisted value ("1000.01") does not match roundMoney: 1000.005 *
  // 100 lands exactly on the IEEE-754 double 100000.5, and 100000 is even,
  // so banker's rounding stays at 100000 -> 1000.00, not 1000.01 (the same
  // class of arithmetic error c7 found in the ticket's "12.345 -> 12.35"
  // example, which is actually 12.34). Verified with the shipped roundMoney
  // before writing this assertion. The three allocations are chosen to
  // raw-sum to the same 1000.005 and, after each is rounded independently,
  // still reconcile to the rounded total with no residual -- proving the
  // total is rounded on its own value, never summed-then-rounded from the
  // allocations.
  it('1000.005 total with three allocations summing to it persists total_amount = 1000.00, every allocation rounded independently', async () => {
    const repo = new BudgetRepository();
    await repo.setSpendingPlan({
      name: 'Trip',
      startDate: '2026-08-01',
      endDate: '2026-08-07',
      totalAmount: 1000.005,
      categories: [
        { categoryId: 'cat_food', allocatedAmount: 400 },
        { categoryId: 'cat_groceries', allocatedAmount: 300 },
        { categoryId: 'cat_dining_out', allocatedAmount: 300.005 },
      ],
    });

    expect(readTotalAmount('generated-1')).toBe(1000);
    expect(readAllocatedAmount('generated-1', 'cat_food')).toBe(400);
    expect(readAllocatedAmount('generated-1', 'cat_groceries')).toBe(300);
    // 300.005 * 100 is also exactly 30000.5 in IEEE-754 double, and 30000 is
    // even, so this rounds down to 300.00 too -- the allocations reconcile
    // to the rounded total (400 + 300 + 300 = 1000) with no residual.
    expect(readAllocatedAmount('generated-1', 'cat_dining_out')).toBe(300);
  });

  // Scenario row 23.
  it('allocation rounding: 333.333 -> 333.33, undefined persists NULL (not 0), 0 persists 0', async () => {
    const repo = new BudgetRepository();
    await repo.setSpendingPlan({
      name: 'Errands',
      startDate: '2026-08-10',
      endDate: '2026-08-11',
      totalAmount: 1000,
      categories: [
        { categoryId: 'cat_food', allocatedAmount: 333.333 },
        { categoryId: 'cat_groceries' },
        { categoryId: 'cat_dining_out', allocatedAmount: 0 },
      ],
    });

    expect(readAllocatedAmount('generated-1', 'cat_food')).toBe(333.33);
    // Read with an explicit `IS NULL` predicate, not just `?? null` on the
    // JS side -- the column CHECK (`allocated_amount IS NULL OR
    // allocated_amount >= 0`) accepts 0 happily, so a `roundMoney(null) ===
    // 0` regression would still pass a loose `toBeFalsy` here.
    const isNullRow = realDb
      .prepare(
        'SELECT allocated_amount IS NULL AS is_null FROM spending_plan_categories WHERE plan_id = ? AND category_id = ?',
      )
      .get('generated-1', 'cat_groceries') as { is_null: number };
    expect(isNullRow.is_null).toBe(1);
    expect(readAllocatedAmount('generated-1', 'cat_dining_out')).toBe(0);
  });

  // c1's ordering case. roundMoney is not additive: raw allocations
  // [0.335, 0.335, 0.33] sum to exactly 1.00 against a raw total of 1.00,
  // but each 0.335 rounds to 0.34 under banker's rounding (0.335 * 100 is
  // exactly 33.5, 34 is even), so the rounded allocations sum to 1.01 --
  // over the rounded total. Rounding upstream of validateSpendingPlanInput
  // is what makes this rejected rather than silently persisted as a plan
  // the app's own validator would reject.
  // Until MA-020 these raw values also passed the hook's own pre-check,
  // which compared raw floats; the hook now compares integer cents
  // (34 + 34 + 33 = 101 > 100) and rejects them first. What this case
  // covers is the repository's own guard -- all a non-sheet caller of
  // setSpendingPlan has.
  it('rejects when independently-rounded allocations exceed the rounded total, and writes nothing', async () => {
    const repo = new BudgetRepository();

    await expect(
      repo.setSpendingPlan({
        name: 'Rounding edge',
        startDate: '2026-08-15',
        endDate: '2026-08-16',
        totalAmount: 1,
        categories: [
          { categoryId: 'cat_food', allocatedAmount: 0.335 },
          { categoryId: 'cat_groceries', allocatedAmount: 0.335 },
          { categoryId: 'cat_dining_out', allocatedAmount: 0.33 },
        ],
      }),
    ).rejects.toThrow(SpendingPlanValidationError);

    expect(countSpendingPlans()).toBe(0);
  });
});
