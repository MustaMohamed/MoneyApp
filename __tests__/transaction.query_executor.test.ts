import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import { MIGRATIONS } from '@/database/migrations';
import {
  deleteTransactionRow,
  getMonthExpenseStats,
  getTransactionById,
  getTransactions,
  getTransactionsByAccount,
  insertTransactionRow,
} from '@/database/transactions';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';
const DATE = '2026-05-01';
const TIME = '12:00:00';

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
  realDb
    .prepare(
      `INSERT INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES
       ('acc_asset','Checking','bank','EGP',1000,1000,0,0,0,?,?),
       ('acc_other','Savings','bank','EGP',500,500,0,0,1,?,?),
       ('acc_card','Card','credit_card','EGP',0,0,0,0,2,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW);

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getAllAsync: jest.Mock;
        getFirstAsync: jest.Mock;
      };
    }
  ).__fakeDb;
  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    const result = realDb.prepare(sql).run(...(params as never[]));
    return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
  });
  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });
  mocked.getFirstAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).get(...(params as never[])) ?? null;
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
  realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc_asset'").run();
  realDb.prepare("UPDATE accounts SET current_balance = 500 WHERE id = 'acc_other'").run();
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getTransactions
>[0];

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc_asset',
    to_account_id: null,
    category_id: 'cat_food',
    budget_id: null,
    note: null,
    transaction_date: DATE,
    transaction_time: TIME,
    commitment_payment_id: null,
    installment_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe('transaction row primitives', () => {
  it('inserts one row without mutating an account', async () => {
    await expect(insertTransactionRow(mockDb, makeTx())).resolves.toBe(1);

    expect(realDb.prepare("SELECT id FROM transactions WHERE id = 'tx-1'").get()).toBeDefined();
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(1000);
  });

  it('deletes one row and reports a missing row without mutating accounts', async () => {
    await insertTransactionRow(mockDb, makeTx());

    await expect(deleteTransactionRow(mockDb, 'tx-1')).resolves.toBe(1);
    await expect(deleteTransactionRow(mockDb, 'tx-1')).resolves.toBe(0);
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(1000);
  });
});

describe('transaction reads', () => {
  it('gets rows by id and participating account', async () => {
    await insertTransactionRow(mockDb, makeTx());
    await insertTransactionRow(
      mockDb,
      makeTx({
        id: 'tx-transfer',
        type: TransactionType.Transfer,
        category_id: null,
        to_account_id: 'acc_other',
        to_amount: 100,
      }),
    );
    await expect(getTransactionById(mockDb, 'tx-1')).resolves.toMatchObject({ id: 'tx-1' });
    await expect(getTransactionById(mockDb, 'missing')).resolves.toBeNull();
    await expect(getTransactionsByAccount(mockDb, 'acc_other')).resolves.toEqual([
      expect.objectContaining({ id: 'tx-transfer' }),
    ]);
  });

  it('supports paging without overlapping rows', async () => {
    for (let index = 1; index <= 5; index++) {
      await insertTransactionRow(mockDb, makeTx({ id: `tx-${index}` }));
    }

    const firstPage = await getTransactions(mockDb, { limit: 2, offset: 0 });
    const secondPage = await getTransactions(mockDb, { limit: 2, offset: 2 });
    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(2);
    expect(firstPage.map((row) => row.id)).not.toEqual(secondPage.map((row) => row.id));
  });

  it('applies type and escaped search filters', async () => {
    await insertTransactionRow(mockDb, makeTx({ note: '100% groceries' }));
    await insertTransactionRow(
      mockDb,
      makeTx({ id: 'tx-income', type: TransactionType.Income, category_id: 'cat_salary' }),
    );

    await expect(
      getTransactions(mockDb, { type: TransactionType.Expense, search: '100%' }),
    ).resolves.toEqual([expect.objectContaining({ id: 'tx-1' })]);
  });
});

describe('getMonthExpenseStats', () => {
  it('returns EGP and native currency expense totals only', async () => {
    await insertTransactionRow(mockDb, makeTx({ amount: 500, egp_amount: 500 }));
    await insertTransactionRow(
      mockDb,
      makeTx({
        id: 'tx-usd',
        amount: 10,
        currency: Currency.USD,
        egp_amount: 500,
        exchange_rate: 50,
      }),
    );
    await insertTransactionRow(
      mockDb,
      makeTx({
        id: 'tx-income',
        type: TransactionType.Income,
        amount: 1_000,
        egp_amount: 1_000,
        category_id: 'cat_salary',
      }),
    );
    await insertTransactionRow(
      mockDb,
      makeTx({
        id: 'tx-card-credit',
        type: TransactionType.Income,
        amount: 150,
        egp_amount: 150,
        account_id: 'acc_card',
      }),
    );

    await expect(getMonthExpenseStats(mockDb, '2026-05')).resolves.toEqual({
      totalEgp: 850,
      egpNative: 350,
      usdNative: 10,
      count: 3,
    });
  });
});
