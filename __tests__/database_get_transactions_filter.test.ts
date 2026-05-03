import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { Currency, TransactionType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { addTransaction, getTransactions } from '@/database/transactions';
import type { Transaction } from '@/database/entities/transaction.entity';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';
const DATE = '2026-05-01';
const TIME = '12:00:00';

function seed() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES
         ('acc_a','Bank A','bank','EGP',1000,1000,0,0,0,?,?),
         ('acc_b','Bank B','bank','EGP',1000,1000,0,0,1,?,?),
         ('acc_c','USD Wallet','smart_wallet','USD',1000,1000,0,0,2,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW);

  realDb
    .prepare(
      `INSERT OR IGNORE INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
       VALUES
         ('cat_food','Food','expense','food','#C9973A',1,0,?,?),
         ('cat_fun','Entertainment','expense','movie','#C9973A',1,1,?,?),
         ('cat_sal','Salary','income','briefcase','#4CAF82',1,0,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seed();

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getAllAsync: jest.Mock;
        withTransactionAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 1 };
  });

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });

  mocked.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
    await fn();
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
  realDb.prepare('UPDATE accounts SET current_balance = 1000').run();
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getTransactions
>[0];

async function insert(overrides: Partial<Transaction> = {}) {
  const tx: Transaction = {
    id: overrides.id ?? `tx-${Math.random().toString(36).slice(2, 9)}`,
    type: TransactionType.Expense,
    amount: 50,
    currency: Currency.EGP,
    egp_amount: 50,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc_a',
    to_account_id: null,
    category_id: 'cat_food',
    note: null,
    transaction_date: DATE,
    transaction_time: TIME,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
  await addTransaction(mockDb, tx);
  return tx;
}

describe('getTransactions — accountIds filter', () => {
  it('empty accountIds matches all (no constraint)', async () => {
    await insert({ id: 't1', account_id: 'acc_a' });
    await insert({ id: 't2', account_id: 'acc_b' });

    const out = await getTransactions(mockDb, { accountIds: [] });
    expect(out).toHaveLength(2);
  });

  it('single accountId matches only that account', async () => {
    await insert({ id: 't1', account_id: 'acc_a' });
    await insert({ id: 't2', account_id: 'acc_b' });

    const out = await getTransactions(mockDb, { accountIds: ['acc_a'] });
    expect(out.map((t) => t.id).sort()).toEqual(['t1']);
  });

  it('multiple accountIds match any', async () => {
    await insert({ id: 't1', account_id: 'acc_a' });
    await insert({ id: 't2', account_id: 'acc_b' });
    await insert({ id: 't3', account_id: 'acc_c', currency: Currency.USD });

    const out = await getTransactions(mockDb, { accountIds: ['acc_a', 'acc_c'] });
    expect(out.map((t) => t.id).sort()).toEqual(['t1', 't3']);
  });

  it('matches transfers when EITHER source OR destination is in the list', async () => {
    await insert({
      id: 'xfer1',
      type: TransactionType.Transfer,
      account_id: 'acc_a',
      to_account_id: 'acc_b',
      category_id: null,
    });
    // Filtering by acc_b alone should still match this transfer.
    const out = await getTransactions(mockDb, { accountIds: ['acc_b'] });
    expect(out.map((t) => t.id)).toEqual(['xfer1']);
  });
});

describe('getTransactions — categoryIds filter', () => {
  it('empty categoryIds matches all', async () => {
    await insert({ id: 't1', category_id: 'cat_food' });
    await insert({ id: 't2', category_id: 'cat_fun' });
    const out = await getTransactions(mockDb, { categoryIds: [] });
    expect(out).toHaveLength(2);
  });

  it('multiple categoryIds match any', async () => {
    await insert({ id: 't1', category_id: 'cat_food' });
    await insert({ id: 't2', category_id: 'cat_fun' });
    await insert({ id: 't3', type: TransactionType.Income, category_id: 'cat_sal' });

    const out = await getTransactions(mockDb, { categoryIds: ['cat_food', 'cat_sal'] });
    expect(out.map((t) => t.id).sort()).toEqual(['t1', 't3']);
  });

  it('does NOT match transactions with NULL category_id', async () => {
    await insert({
      id: 'xfer',
      type: TransactionType.Transfer,
      category_id: null,
      to_account_id: 'acc_b',
    });
    const out = await getTransactions(mockDb, { categoryIds: ['cat_food'] });
    expect(out).toHaveLength(0);
  });
});

describe('getTransactions — date range filter', () => {
  it('dateFrom alone returns rows on or after that date', async () => {
    await insert({ id: 't1', transaction_date: '2026-04-15' });
    await insert({ id: 't2', transaction_date: '2026-05-01' });
    await insert({ id: 't3', transaction_date: '2026-05-15' });

    const out = await getTransactions(mockDb, { dateFrom: '2026-05-01' });
    expect(out.map((t) => t.id).sort()).toEqual(['t2', 't3']);
  });

  it('dateTo alone returns rows on or before that date', async () => {
    await insert({ id: 't1', transaction_date: '2026-04-15' });
    await insert({ id: 't2', transaction_date: '2026-05-01' });
    await insert({ id: 't3', transaction_date: '2026-05-15' });

    const out = await getTransactions(mockDb, { dateTo: '2026-05-01' });
    expect(out.map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('dateFrom and dateTo combine for inclusive range', async () => {
    await insert({ id: 't1', transaction_date: '2026-04-15' });
    await insert({ id: 't2', transaction_date: '2026-05-01' });
    await insert({ id: 't3', transaction_date: '2026-05-15' });
    await insert({ id: 't4', transaction_date: '2026-06-01' });

    const out = await getTransactions(mockDb, { dateFrom: '2026-05-01', dateTo: '2026-05-15' });
    expect(out.map((t) => t.id).sort()).toEqual(['t2', 't3']);
  });
});

describe('getTransactions — amount range filter (currency-aware)', () => {
  it('amountMin matches only rows of the given currency at or above the threshold', async () => {
    await insert({ id: 'egp_low', currency: Currency.EGP, amount: 50 });
    await insert({ id: 'egp_hi', currency: Currency.EGP, amount: 200 });
    await insert({ id: 'usd_hi', currency: Currency.USD, account_id: 'acc_c', amount: 80 });

    const out = await getTransactions(mockDb, {
      amountMin: 100,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['egp_hi']);
  });

  it('amountMax matches only rows of the given currency at or below the threshold', async () => {
    await insert({ id: 'egp_low', currency: Currency.EGP, amount: 50 });
    await insert({ id: 'egp_hi', currency: Currency.EGP, amount: 200 });
    await insert({ id: 'usd_low', currency: Currency.USD, account_id: 'acc_c', amount: 30 });

    const out = await getTransactions(mockDb, {
      amountMax: 60,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['egp_low']);
  });

  it('USD currency matches only USD rows', async () => {
    await insert({ id: 'egp_50', currency: Currency.EGP, amount: 50 });
    await insert({ id: 'usd_50', currency: Currency.USD, account_id: 'acc_c', amount: 50 });

    const out = await getTransactions(mockDb, {
      amountMin: 10,
      amountCurrency: Currency.USD,
    });
    expect(out.map((t) => t.id)).toEqual(['usd_50']);
  });

  it('amountMin and amountMax combine inside one currency', async () => {
    await insert({ id: 'a', currency: Currency.EGP, amount: 30 });
    await insert({ id: 'b', currency: Currency.EGP, amount: 75 });
    await insert({ id: 'c', currency: Currency.EGP, amount: 250 });
    await insert({ id: 'd', currency: Currency.USD, account_id: 'acc_c', amount: 75 });

    const out = await getTransactions(mockDb, {
      amountMin: 50,
      amountMax: 100,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['b']);
  });
});

describe('getTransactions — combined axes', () => {
  it('AND-composes type, account, category, date, and amount', async () => {
    // Match target: expense, acc_a, cat_food, 2026-05-10, EGP 100
    await insert({
      id: 'match',
      type: TransactionType.Expense,
      account_id: 'acc_a',
      category_id: 'cat_food',
      transaction_date: '2026-05-10',
      amount: 100,
      currency: Currency.EGP,
    });
    // Same date but wrong account
    await insert({
      id: 'wrong_acc',
      account_id: 'acc_b',
      transaction_date: '2026-05-10',
      amount: 100,
    });
    // Right account but outside date range
    await insert({
      id: 'wrong_date',
      account_id: 'acc_a',
      transaction_date: '2026-04-30',
      amount: 100,
    });

    const out = await getTransactions(mockDb, {
      type: TransactionType.Expense,
      accountIds: ['acc_a'],
      categoryIds: ['cat_food'],
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      amountMin: 50,
      amountMax: 200,
      amountCurrency: Currency.EGP,
    });
    expect(out.map((t) => t.id)).toEqual(['match']);
  });
});
