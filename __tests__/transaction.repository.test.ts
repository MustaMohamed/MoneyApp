import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { Currency, TransactionType } from '@/constants/enums';
import {
  TransactionRepository,
  type NewTransactionInput,
} from '@/repositories/transaction.repository';
import * as transactionsModule from '@/database/transactions';

// Override global UUID mock with a counter so each add() gets a unique id
let mockUuidCounter = 0;
jest.mock('react-native-uuid', () => ({
  __esModule: true,
  default: { v4: () => `tx-repo-${++mockUuidCounter}` },
}));

const getTransactions = jest.spyOn(transactionsModule, 'getTransactions');

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';

function seedAccount() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
     VALUES ('acc1','Bank','bank','EGP',5000,5000,0,0,0,?,?)`,
    )
    .run(NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seedAccount();

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
  mockUuidCounter = 0;
  realDb.exec('DELETE FROM transactions');
  realDb.prepare("UPDATE accounts SET current_balance = 5000 WHERE id = 'acc1'").run();
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const repo = new TransactionRepository();

const baseInput: NewTransactionInput = {
  type: TransactionType.Expense,
  amount: 200,
  currency: Currency.EGP,
  egp_amount: 200,
  account_id: 'acc1',
  category_id: 'cat_food',
  transaction_date: '2026-05-01',
  transaction_time: '10:00:00',
};

describe('TransactionRepository.add', () => {
  it('returns the created transaction with an id', async () => {
    const tx = await repo.add(baseInput);
    expect(tx.id).toBeTruthy();
    expect(tx.type).toBe(TransactionType.Expense);
    expect(tx.amount).toBe(200);
  });

  it('persists to the database', async () => {
    const tx = await repo.add(baseInput);
    const row = realDb.prepare('SELECT * FROM transactions WHERE id = ?').get(tx.id);
    expect(row).toBeDefined();
  });

  it('defaults transaction_date to today when omitted', async () => {
    const tx = await repo.add({ ...baseInput, transaction_date: undefined });
    const today = new Date().toISOString().slice(0, 10);
    expect(tx.transaction_date).toBe(today);
  });

  it('stores null for optional fields when omitted', async () => {
    const tx = await repo.add(baseInput);
    expect(tx.note).toBeNull();
    expect(tx.exchange_rate).toBeNull();
    expect(tx.to_account_id).toBeNull();
  });
});

describe('TransactionRepository.getAll', () => {
  beforeEach(() => {
    getTransactions.mockClear();
  });

  it('returns empty array when no transactions', async () => {
    const rows = await repo.getAll();
    expect(rows).toHaveLength(0);
  });

  it('returns inserted transactions', async () => {
    await repo.add(baseInput);
    await repo.add({ ...baseInput, amount: 50, egp_amount: 50 });
    const rows = await repo.getAll();
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('passes limit, offset, type, and search through to the executor', async () => {
    await repo.getAll({ limit: 10, offset: 5, type: TransactionType.Income, search: 'food' });
    expect(getTransactions).toHaveBeenCalledWith(expect.anything(), {
      limit: 10,
      offset: 5,
      type: TransactionType.Income,
      search: 'food',
    });
  });

  it('defaults to an empty query object when no args are given', async () => {
    await repo.getAll();
    expect(getTransactions).toHaveBeenCalledWith(expect.anything(), {});
  });
});

describe('TransactionRepository.getById', () => {
  it('returns null for unknown id', async () => {
    const result = await repo.getById('nonexistent');
    expect(result).toBeNull();
  });

  it('returns matching transaction', async () => {
    const tx = await repo.add(baseInput);
    const found = await repo.getById(tx.id);
    expect(found?.id).toBe(tx.id);
  });
});

describe('TransactionRepository.getByAccount', () => {
  it('returns transactions for the given account', async () => {
    await repo.add(baseInput);
    await repo.add({ ...baseInput, amount: 50, egp_amount: 50 });
    const rows = await repo.getByAccount('acc1');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    rows.forEach((r) => expect(r.account_id).toBe('acc1'));
  });

  it('returns an empty array when account has no transactions', async () => {
    const rows = await repo.getByAccount('unknown-account');
    expect(rows).toHaveLength(0);
  });

  it('respects limit and offset parameters', async () => {
    await repo.add(baseInput);
    await repo.add({ ...baseInput, amount: 50, egp_amount: 50 });
    await repo.add({ ...baseInput, amount: 75, egp_amount: 75 });

    const page1 = await repo.getByAccount('acc1', 2, 0);
    expect(page1).toHaveLength(2);

    const page2 = await repo.getByAccount('acc1', 2, 2);
    expect(page2).toHaveLength(1);
  });
});

describe('TransactionRepository.update', () => {
  it('updates the transaction fields in the database', async () => {
    const tx = await repo.add(baseInput);

    await repo.update(tx.id, {
      amount: 999,
      currency: Currency.EGP,
      egp_amount: 999,
      category_id: 'cat_bills',
      note: 'updated note',
      transaction_date: '2026-05-02',
      transaction_time: '14:30:00',
    });

    const row = realDb.prepare('SELECT * FROM transactions WHERE id = ?').get(tx.id) as {
      amount: number;
      note: string;
      transaction_date: string;
    };
    expect(row.amount).toBe(999);
    expect(row.note).toBe('updated note');
    expect(row.transaction_date).toBe('2026-05-02');
  });

  it('resolves without error when update succeeds', async () => {
    const tx = await repo.add(baseInput);
    await expect(
      repo.update(tx.id, {
        amount: 300,
        currency: Currency.EGP,
        egp_amount: 300,
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('TransactionRepository.delete', () => {
  it('removes the transaction and reverses balance', async () => {
    const tx = await repo.add(baseInput);
    const balBefore = (
      realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'").get() as {
        current_balance: number;
      }
    ).current_balance;
    expect(balBefore).toBe(4800); // 5000 - 200

    await repo.delete(tx.id);
    const balAfter = (
      realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'").get() as {
        current_balance: number;
      }
    ).current_balance;
    expect(balAfter).toBe(5000);
  });
});
