import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';
import {
  getDashboardBudgetLimitRows,
  getDashboardTransactionFactRows,
  resolveDashboardMonthWindow,
  type DashboardTransactionFactRow,
} from '@/modules/dashboard/database/dashboard_snapshot';
import { createMockSQLiteDatabase, getSQLiteParams, isQueryPlanRow } from '@/test_helpers/sqlite';

const sqlite = createMockSQLiteDatabase();
const NOW = '2026-07-23T10:00:00.000Z';

let realDb: ReturnType<typeof Database>;

type TransactionInput = {
  id: string;
  type?: 'expense' | 'income' | 'transfer' | 'cc_payment';
  amount?: number;
  currency?: 'EGP' | 'USD';
  egpAmount?: number;
  accountId?: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  transactionDate?: string;
  commitmentPaymentId?: string | null;
};

function insertTransaction({
  id,
  type = 'expense',
  amount = 100,
  currency = 'EGP',
  egpAmount = amount,
  accountId = 'acc_bank',
  toAccountId = null,
  categoryId = 'cat_food',
  transactionDate = '2026-07-15',
  commitmentPaymentId = null,
}: TransactionInput): void {
  realDb
    .prepare(
      `INSERT INTO transactions (
         id, type, amount, currency, egp_amount, account_id, to_account_id,
         category_id, transaction_date, transaction_time, commitment_payment_id,
         created_at, updated_at
       ) VALUES (
         @id, @type, @amount, @currency, @egpAmount, @accountId, @toAccountId,
         @categoryId, @transactionDate, '12:00:00', @commitmentPaymentId,
         @createdAt, @updatedAt
       )`,
    )
    .run({
      id,
      type,
      amount,
      currency,
      egpAmount,
      accountId,
      toAccountId,
      categoryId,
      transactionDate,
      commitmentPaymentId,
      createdAt: NOW,
      updatedAt: NOW,
    });
}

function sumMonthRows(rows: DashboardTransactionFactRow[], yearMonth: string) {
  return rows
    .filter((row) => row.year_month === yearMonth)
    .reduce(
      (totals, row) => ({
        income_egp: totals.income_egp + row.income_egp,
        expense_egp: totals.expense_egp + row.expense_egp,
        usd_native: totals.usd_native + row.usd_native,
        transaction_count: totals.transaction_count + row.transaction_count,
      }),
      { income_egp: 0, expense_egp: 0, usd_native: 0, transaction_count: 0 },
    );
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
  realDb.exec(`
    INSERT INTO accounts (
      id, name, type, currency, opening_balance, current_balance,
      interest_tracking, is_archived, sort_order, created_at, updated_at
    ) VALUES
      ('acc_bank', 'Bank', 'bank', 'EGP', 0, 0, 0, 0, 0, '${NOW}', '${NOW}'),
      ('acc_archived', 'Archived', 'bank', 'EGP', 0, 0, 0, 1, 1, '${NOW}', '${NOW}'),
      ('acc_card', 'Card', 'credit_card', 'EGP', 0, 0, 0, 0, 2, '${NOW}', '${NOW}');
  `);

  sqlite.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = getSQLiteParams(rest);
    return realDb.prepare(sql).all(...params);
  });
});

beforeEach(() => {
  sqlite.getAllAsync.mockClear();
  realDb.exec('DELETE FROM transactions; DELETE FROM budgets;');
});

afterAll(() => {
  realDb.close();
});

describe('resolveDashboardMonthWindow', () => {
  it('resolves the previous and next month boundaries', () => {
    expect(resolveDashboardMonthWindow('2026-07')).toEqual({
      currentYearMonth: '2026-07',
      previousYearMonth: '2026-06',
      previousMonthStart: '2026-06-01',
      currentMonthStart: '2026-07-01',
      nextMonthStart: '2026-08-01',
    });
  });

  it('handles January year rollover', () => {
    expect(resolveDashboardMonthWindow('2026-01')).toEqual({
      currentYearMonth: '2026-01',
      previousYearMonth: '2025-12',
      previousMonthStart: '2025-12-01',
      currentMonthStart: '2026-01-01',
      nextMonthStart: '2026-02-01',
    });
  });
});

describe('getDashboardTransactionFactRows', () => {
  it('consolidates two bounded months while preserving transaction policy', async () => {
    insertTransaction({
      id: 'previous-income-first-day',
      type: 'income',
      amount: 500,
      egpAmount: 500,
      categoryId: 'cat_salary',
      transactionDate: '2026-06-01',
    });
    insertTransaction({
      id: 'previous-expense',
      amount: 200,
      egpAmount: 200,
      transactionDate: '2026-06-30',
    });
    insertTransaction({
      id: 'current-income-first-day',
      type: 'income',
      amount: 1000,
      egpAmount: 1000,
      categoryId: 'cat_salary',
      transactionDate: '2026-07-01',
    });
    insertTransaction({
      id: 'current-egp-expense',
      amount: 600,
      egpAmount: 600,
      accountId: 'acc_archived',
      categoryId: null,
      commitmentPaymentId: 'payment-history',
    });
    insertTransaction({
      id: 'current-egp-card-credit',
      type: 'income',
      amount: 150,
      egpAmount: 150,
      accountId: 'acc_card',
    });
    insertTransaction({
      id: 'current-usd-expense',
      amount: 10,
      currency: 'USD',
      egpAmount: 500,
      categoryId: 'cat_transport',
    });
    insertTransaction({
      id: 'current-usd-card-credit',
      type: 'income',
      amount: 1,
      currency: 'USD',
      egpAmount: 50,
      accountId: 'acc_card',
      categoryId: 'cat_transport',
    });
    insertTransaction({
      id: 'ignored-transfer',
      type: 'transfer',
      amount: 9000,
      egpAmount: 9000,
      toAccountId: 'acc_card',
    });
    insertTransaction({
      id: 'ignored-card-payment',
      type: 'cc_payment',
      amount: 8000,
      egpAmount: 8000,
      toAccountId: 'acc_card',
    });
    insertTransaction({
      id: 'before-range',
      amount: 7000,
      egpAmount: 7000,
      transactionDate: '2026-05-31',
    });
    insertTransaction({
      id: 'next-month-first-day',
      amount: 6000,
      egpAmount: 6000,
      transactionDate: '2026-08-01',
    });

    const rows = await getDashboardTransactionFactRows(
      sqlite.database,
      resolveDashboardMonthWindow('2026-07'),
    );

    expect(sumMonthRows(rows, '2026-07')).toEqual({
      income_egp: 1000,
      expense_egp: 900,
      usd_native: 9,
      transaction_count: 4,
    });
    expect(sumMonthRows(rows, '2026-06')).toMatchObject({
      income_egp: 500,
      expense_egp: 200,
    });
    expect(rows.some((row) => row.year_month === '2026-08')).toBe(false);
    expect(rows.some((row) => row.category_id === null)).toBe(true);
  });

  it('returns no rows for a legitimate empty range', async () => {
    await expect(
      getDashboardTransactionFactRows(sqlite.database, resolveDashboardMonthWindow('2026-07')),
    ).resolves.toEqual([]);
  });

  it('uses the transaction-date index for a range search', async () => {
    await getDashboardTransactionFactRows(sqlite.database, resolveDashboardMonthWindow('2026-07'));
    const [sql, params] = sqlite.getAllAsync.mock.calls[0];
    const plan = realDb.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...getSQLiteParams([params]));
    const details = plan.filter(isQueryPlanRow).map((row) => row.detail);

    expect(
      details.some((detail) =>
        /SEARCH transaction_row USING INDEX idx_transactions_date/.test(detail),
      ),
    ).toBe(true);
    expect(details.some((detail) => /transaction_date[<>?]/.test(detail))).toBe(true);
  });
});

describe('getDashboardBudgetLimitRows', () => {
  it('sums named limits by category for only the requested month', async () => {
    const insert = realDb.prepare(
      `INSERT INTO budgets (
         id, category_id, name, limit_amount, effective_from, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    insert.run('food-home', 'cat_food', 'Home', 4000, '2026-07', NOW, NOW);
    insert.run('food-work', 'cat_food', 'Work', 3000, '2026-07', NOW, NOW);
    insert.run('transport', 'cat_transport', 'Transport', 3000, '2026-07', NOW, NOW);
    insert.run('food-history', 'cat_food', 'History', 9000, '2026-06', NOW, NOW);

    await expect(getDashboardBudgetLimitRows(sqlite.database, '2026-07')).resolves.toEqual([
      { category_id: 'cat_food', limit_amount: 7000 },
      { category_id: 'cat_transport', limit_amount: 3000 },
    ]);
  });

  it('returns no limits for a legitimate empty month', async () => {
    await expect(getDashboardBudgetLimitRows(sqlite.database, '2026-07')).resolves.toEqual([]);
  });
});
