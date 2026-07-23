import Database from 'better-sqlite3';

import { getDb } from '@/database/client';
import { MIGRATIONS } from '@/database/migrations';
import * as accountStatsQuery from '@/modules/accounts/database/account_stats';
import { DashboardRepository } from '@/modules/dashboard/repositories/dashboard.repository';
import { createMockSQLiteDatabase, getSQLiteParams } from '@/test_helpers/sqlite';

jest.mock('@/database/client', () => ({
  getDb: jest.fn(),
}));

const sqlite = createMockSQLiteDatabase();
const mockedGetDb = jest.mocked(getDb);
const NOW = '2026-07-23T10:00:00.000Z';

let realDb: ReturnType<typeof Database>;

function insertAccount(input: {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  archived?: 0 | 1;
}): void {
  realDb
    .prepare(
      `INSERT INTO accounts (
         id, name, type, currency, opening_balance, current_balance,
         interest_tracking, is_archived, sort_order, created_at, updated_at
       ) VALUES (
         @id, @name, 'bank', 'EGP', 0, 0, 0, @archived, @sortOrder, @createdAt, @createdAt
       )`,
    )
    .run({ archived: 0, ...input });
}

function insertTransaction(input: {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  date: string;
}): void {
  realDb
    .prepare(
      `INSERT INTO transactions (
         id, type, amount, currency, egp_amount, account_id, category_id,
         transaction_date, transaction_time, created_at, updated_at
       ) VALUES (
         @id, @type, @amount, 'EGP', @amount, 'active-first', @categoryId,
         @date, '12:00:00', '${NOW}', '${NOW}'
       )`,
    )
    .run(input);
}

function seedSnapshotFixture(): void {
  insertAccount({
    id: 'active-second',
    name: 'Second',
    sortOrder: 1,
    createdAt: '2026-01-02T00:00:00.000Z',
  });
  insertAccount({
    id: 'archived',
    name: 'Archived',
    sortOrder: -1,
    createdAt: '2026-01-01T00:00:00.000Z',
    archived: 1,
  });
  insertAccount({
    id: 'active-first',
    name: 'First',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  insertTransaction({
    id: 'current-income',
    type: 'income',
    amount: 1000,
    categoryId: 'cat_salary',
    date: '2026-07-01',
  });
  insertTransaction({
    id: 'current-expense',
    type: 'expense',
    amount: 200,
    categoryId: 'cat_food',
    date: '2026-07-10',
  });
  insertTransaction({
    id: 'previous-expense',
    type: 'expense',
    amount: 50,
    categoryId: 'cat_food',
    date: '2026-06-10',
  });

  realDb
    .prepare(
      `INSERT INTO budgets (
         id, category_id, name, limit_amount, effective_from, created_at, updated_at
       ) VALUES ('food', 'cat_food', 'Food', 500, '2026-07', ?, ?)`,
    )
    .run(NOW, NOW);
  realDb.exec(`
    INSERT INTO commitments (
      id, name, amount_type, amount, currency, category_id, recurrence_every,
      recurrence_period, start_date, account_id, duration_type, is_active,
      created_at, updated_at
    ) VALUES (
      'commitment', 'Rent', 'fixed', 100, 'EGP', 'cat_housing', 1,
      'months', '2026-01-01', 'active-first', 'forever', 1, '${NOW}', '${NOW}'
    );
    INSERT INTO commitment_payments (
      id, commitment_id, due_date, amount_due, currency, status, created_at, updated_at
    ) VALUES
      ('payment-later', 'commitment', '2026-07-20', 100, 'EGP', 'upcoming', '${NOW}', '${NOW}'),
      ('payment-first', 'commitment', '2026-07-10', 100, 'EGP', 'due', '${NOW}', '${NOW}');
  `);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
});

beforeEach(() => {
  realDb.exec(`
    DELETE FROM commitment_payments;
    DELETE FROM commitments;
    DELETE FROM transactions;
    DELETE FROM budgets;
    DELETE FROM accounts;
  `);
  sqlite.getAllAsync.mockReset();
  sqlite.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    return realDb.prepare(sql).all(...getSQLiteParams(rest));
  });
  mockedGetDb.mockReset();
  mockedGetDb.mockResolvedValue(sqlite.database);
});

afterAll(() => {
  realDb.close();
});

describe('DashboardRepository', () => {
  it('assembles one complete ordered snapshot with at most five reads', async () => {
    seedSnapshotFixture();
    const now = new Date(NOW);
    const statsSpy = jest.spyOn(accountStatsQuery, 'getAccountsStats');
    const repository = new DashboardRepository();

    const snapshot = await repository.getSnapshot({ yearMonth: '2026-07', now });

    expect(mockedGetDb).toHaveBeenCalledTimes(1);
    expect(snapshot).toMatchObject({
      key: '2026-07',
      yearMonth: '2026-07',
      previousYearMonth: '2026-06',
      loadedAt: now.getTime(),
      currentMonth: {
        totals: { incomeEgp: 1000, expenseEgp: 200, netEgp: 800 },
        spend: { totalEgp: 200, usdNative: 0, count: 1 },
      },
      previousMonth: {
        totals: { incomeEgp: 0, expenseEgp: 50, netEgp: -50 },
      },
      budgetSummary: {
        budgeted: 500,
        spent: 200,
        left: 300,
        pct: 0.4,
        categoryCount: 1,
      },
    });
    expect(snapshot.accounts.map((account) => account.id)).toEqual([
      'active-first',
      'active-second',
    ]);
    expect(snapshot.commitmentPayments.map((payment) => payment.id)).toEqual([
      'payment-first',
      'payment-later',
    ]);
    expect(statsSpy).toHaveBeenCalledWith(sqlite.database, ['active-first', 'active-second'], now);
    expect(sqlite.getAllAsync).toHaveBeenCalledTimes(5);
    expect(
      sqlite.getAllAsync.mock.calls.filter(([sql]) =>
        sql.includes('FROM transactions transaction_row INDEXED BY idx_transactions_date'),
      ),
    ).toHaveLength(1);
    statsSpy.mockRestore();
  });

  it('skips the account-stats read when there are no accounts', async () => {
    const snapshot = await new DashboardRepository().getSnapshot({
      yearMonth: '2026-07',
      now: new Date(NOW),
    });

    expect(snapshot.statsMap).toEqual({});
    expect(sqlite.getAllAsync).toHaveBeenCalledTimes(4);
  });

  it('returns a complete legitimate zero snapshot for empty tables', async () => {
    await expect(
      new DashboardRepository().getSnapshot({
        yearMonth: '2026-07',
        now: new Date(NOW),
      }),
    ).resolves.toMatchObject({
      accounts: [],
      statsMap: {},
      currentMonth: {
        totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
        spend: { totalEgp: 0, usdNative: 0, count: 0 },
      },
      previousMonth: {
        totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
        spend: { totalEgp: 0, usdNative: 0, count: 0 },
      },
      budgetSummary: {
        budgeted: 0,
        spent: 0,
        left: 0,
        pct: 0,
        categoryCount: 0,
      },
      commitmentPayments: [],
    });
  });

  it('rejects the entire snapshot when any owned read fails', async () => {
    seedSnapshotFixture();
    const error = new Error('budget read failed');
    sqlite.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
      if (sql.includes('FROM budgets')) throw error;
      return realDb.prepare(sql).all(...getSQLiteParams(rest));
    });

    await expect(
      new DashboardRepository().getSnapshot({
        yearMonth: '2026-07',
        now: new Date(NOW),
      }),
    ).rejects.toBe(error);
  });
});
