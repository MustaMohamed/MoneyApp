import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { TransactionType } from '@/constants/enums';
import {
  addTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  getTransactionsByAccount,
} from '@/database/transactions';
import type { Transaction } from '@/database/entities/transaction.entity';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';
const DATE = '2026-05-01';
const TIME = '12:00:00';

function seedAccounts() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
     VALUES
       ('acc_asset','Checking','bank','EGP',1000,1000,0,0,0,?,?),
       ('acc_cc','Credit Card','credit_card','EGP',0,500,0,0,1,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seedAccounts();

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
  // Reset account balances
  realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc_asset'").run();
  realDb
    .prepare(
      "UPDATE accounts SET current_balance = 500, revolving_balance = 300, minimum_payment = 200 WHERE id = 'acc_cc'",
    )
    .run();
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
    currency: 'EGP' as const,
    egp_amount: 100,
    exchange_rate: null,
    account_id: 'acc_asset',
    to_account_id: null,
    category_id: 'cat_food',
    note: null,
    transaction_date: DATE,
    transaction_time: TIME,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe('addTransaction — expense', () => {
  it('inserts the transaction row', async () => {
    await addTransaction(mockDb, makeTx());
    const row = realDb.prepare("SELECT * FROM transactions WHERE id = 'tx-1'").get();
    expect(row).toBeDefined();
  });

  it('debits the account balance', async () => {
    await addTransaction(mockDb, makeTx({ egp_amount: 200 }));
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(800);
  });
});

describe('addTransaction — income', () => {
  it('credits the account balance', async () => {
    await addTransaction(
      mockDb,
      makeTx({ id: 'tx-income', type: TransactionType.Income, egp_amount: 500 }),
    );
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(1500);
  });
});

describe('addTransaction — transfer', () => {
  it('debits from account and credits to account', async () => {
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-transfer',
        type: TransactionType.Transfer,
        egp_amount: 300,
        category_id: null,
        to_account_id: 'acc_cc',
      }),
    );
    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc'").get() as {
      current_balance: number;
    };
    expect(asset.current_balance).toBe(700);
    expect(cc.current_balance).toBe(800);
  });
});

describe('addTransaction — cc_payment', () => {
  it('debits asset, reduces cc balance, covers installment first then revolving', async () => {
    // minimum_payment = 200 (installment due), revolving_balance = 300
    // payment = 350: 200 to installment, 150 to revolving → new revolving = 300 - 150 = 150
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-cc',
        type: TransactionType.CCPayment,
        egp_amount: 350,
        category_id: null,
        to_account_id: 'acc_cc',
      }),
    );
    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb
      .prepare("SELECT current_balance, revolving_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { current_balance: number; revolving_balance: number };
    expect(asset.current_balance).toBe(650);
    expect(cc.current_balance).toBe(150);
    expect(cc.revolving_balance).toBe(150);
  });

  it('payment <= installment due only reduces installment (revolving unchanged)', async () => {
    // payment = 100, installment_due = 200 → installment_covered = 100, revolving reduction = 0
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-cc2',
        type: TransactionType.CCPayment,
        egp_amount: 100,
        category_id: null,
        to_account_id: 'acc_cc',
      }),
    );
    const cc = realDb
      .prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { revolving_balance: number };
    expect(cc.revolving_balance).toBe(300); // unchanged
  });
});

describe('getTransactions', () => {
  it('returns empty when no transactions', async () => {
    const rows = await getTransactions(mockDb);
    expect(rows).toHaveLength(0);
  });

  it('returns inserted transaction', async () => {
    await addTransaction(mockDb, makeTx());
    const rows = await getTransactions(mockDb);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('tx-1');
  });

  it('respects limit and offset', async () => {
    for (let i = 1; i <= 5; i++) {
      await addTransaction(mockDb, makeTx({ id: `tx-${i}`, egp_amount: i * 10 }));
    }
    const page1 = await getTransactions(mockDb, 2, 0);
    const page2 = await getTransactions(mockDb, 2, 2);
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page1[0].id).not.toBe(page2[0].id);
  });
});

describe('getTransactionsByAccount', () => {
  it('returns transactions for specific account', async () => {
    await addTransaction(mockDb, makeTx({ id: 'tx-a1', account_id: 'acc_asset' }));
    const rows = await getTransactionsByAccount(mockDb, 'acc_asset');
    expect(rows.some((r) => r.id === 'tx-a1')).toBe(true);
  });
});

describe('getTransactionById', () => {
  it('returns null for unknown id', async () => {
    const row = await getTransactionById(mockDb, 'nonexistent');
    expect(row).toBeNull();
  });

  it('returns the matching transaction', async () => {
    await addTransaction(mockDb, makeTx());
    const row = await getTransactionById(mockDb, 'tx-1');
    expect(row?.id).toBe('tx-1');
  });
});

describe('deleteTransaction', () => {
  it('removes the row and reverses the balance', async () => {
    await addTransaction(mockDb, makeTx({ egp_amount: 100 }));
    const balanceAfterAdd = (
      realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'").get() as {
        current_balance: number;
      }
    ).current_balance;
    expect(balanceAfterAdd).toBe(900);

    await deleteTransaction(mockDb, 'tx-1');
    const balanceAfterDelete = (
      realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'").get() as {
        current_balance: number;
      }
    ).current_balance;
    expect(balanceAfterDelete).toBe(1000);
    const row = realDb.prepare("SELECT * FROM transactions WHERE id = 'tx-1'").get();
    expect(row).toBeUndefined();
  });

  it('is a no-op for unknown id', async () => {
    await expect(deleteTransaction(mockDb, 'ghost')).resolves.toBeUndefined();
  });
});
