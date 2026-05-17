import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { getPeriodTotals } from '@/database/transactions';

type FakeDb = {
  execAsync: jest.Mock;
  runAsync: jest.Mock;
  getAllAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  withTransactionAsync: jest.Mock;
};

const sqlite = SQLite as unknown as {
  __fakeDb: FakeDb;
  __reset: () => void;
  openDatabaseAsync: jest.Mock;
};

let realDb: ReturnType<typeof Database>;

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    egp_amount REAL NOT NULL,
    exchange_rate REAL,
    to_amount REAL,
    minimum_payment_snapshot REAL,
    account_id TEXT NOT NULL,
    to_account_id TEXT,
    category_id TEXT,
    note TEXT,
    transaction_date TEXT NOT NULL,
    transaction_time TEXT NOT NULL,
    commitment_payment_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(CREATE_TABLE);

  const fakeDb = sqlite.__fakeDb;

  fakeDb.execAsync.mockImplementation(async (sql: string) => {
    realDb.exec(sql);
  });

  fakeDb.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 1 };
  });

  fakeDb.getFirstAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).get(...(params as never[])) ?? null;
  });

  sqlite.openDatabaseAsync.mockImplementation(async () => fakeDb);
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

async function insertRow(
  db: Parameters<typeof getPeriodTotals>[0],
  row: Record<string, unknown>,
): Promise<void> {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => '?').join(',');
  await db.runAsync(
    `INSERT INTO transactions (${keys.join(',')}) VALUES (${placeholders})`,
    Object.values(row) as never,
  );
}

describe('getPeriodTotals', () => {
  it('sums income and expense egp_amounts within the date range', async () => {
    const db = await sqlite.openDatabaseAsync(':memory:');
    await insertRow(db, {
      id: 't1', type: 'income', amount: 25000, currency: 'EGP', egp_amount: 25000,
      account_id: 'a1', transaction_date: '2026-05-01', transaction_time: '09:00:00',
      created_at: 'X', updated_at: 'X',
    });
    await insertRow(db, {
      id: 't2', type: 'expense', amount: 285, currency: 'EGP', egp_amount: 285,
      account_id: 'a1', transaction_date: '2026-05-15', transaction_time: '19:00:00',
      created_at: 'X', updated_at: 'X',
    });
    await insertRow(db, {
      id: 't3', type: 'expense', amount: 920, currency: 'EGP', egp_amount: 920,
      account_id: 'a1', transaction_date: '2026-05-31', transaction_time: '18:00:00',
      created_at: 'X', updated_at: 'X',
    });

    const result = await getPeriodTotals(db, { from: '2026-05-01', to: '2026-05-31' });
    expect(result).toEqual({ incomeEgp: 25000, expenseEgp: 1205, netEgp: 23795 });
  });

  it('excludes transfer and cc_payment rows', async () => {
    const db = await sqlite.openDatabaseAsync(':memory:');
    await insertRow(db, {
      id: 't1', type: 'transfer', amount: 5000, currency: 'EGP', egp_amount: 5000,
      account_id: 'a1', to_account_id: 'a2', transaction_date: '2026-05-15', transaction_time: '12:00:00',
      created_at: 'X', updated_at: 'X',
    });
    await insertRow(db, {
      id: 't2', type: 'cc_payment', amount: 4080, currency: 'EGP', egp_amount: 4080,
      account_id: 'a1', to_account_id: 'a3', transaction_date: '2026-05-20', transaction_time: '11:00:00',
      created_at: 'X', updated_at: 'X',
    });
    const result = await getPeriodTotals(db, { from: '2026-05-01', to: '2026-05-31' });
    expect(result).toEqual({ incomeEgp: 0, expenseEgp: 0, netEgp: 0 });
  });

  it('excludes rows outside the date range', async () => {
    const db = await sqlite.openDatabaseAsync(':memory:');
    await insertRow(db, {
      id: 't1', type: 'expense', amount: 100, currency: 'EGP', egp_amount: 100,
      account_id: 'a1', transaction_date: '2026-04-30', transaction_time: '10:00:00',
      created_at: 'X', updated_at: 'X',
    });
    await insertRow(db, {
      id: 't2', type: 'expense', amount: 200, currency: 'EGP', egp_amount: 200,
      account_id: 'a1', transaction_date: '2026-06-01', transaction_time: '10:00:00',
      created_at: 'X', updated_at: 'X',
    });
    const result = await getPeriodTotals(db, { from: '2026-05-01', to: '2026-05-31' });
    expect(result).toEqual({ incomeEgp: 0, expenseEgp: 0, netEgp: 0 });
  });

  it('returns all zeros for an empty range', async () => {
    const db = await sqlite.openDatabaseAsync(':memory:');
    const result = await getPeriodTotals(db, { from: '2026-05-01', to: '2026-05-31' });
    expect(result).toEqual({ incomeEgp: 0, expenseEgp: 0, netEgp: 0 });
  });
});
