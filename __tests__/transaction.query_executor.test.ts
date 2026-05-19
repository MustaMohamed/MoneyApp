import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import { MIGRATIONS } from '@/database/migrations';
import {
  addTransaction,
  deleteTransaction,
  getMonthExpenseStats,
  getTransactionById,
  getTransactions,
  getTransactionsByAccount,
} from '@/database/transactions';

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
       ('acc_usd','USD Wallet','bank','USD',100,100,0,0,1,?,?),
       ('acc_cc','Credit Card','credit_card','EGP',0,500,0,0,2,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW);
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
        getFirstAsync: jest.Mock;
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

  mocked.getFirstAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).get(...(params as never[])) ?? null;
  });

  mocked.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
    await fn();
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions');
  // Reset account balances
  realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc_asset'").run();
  realDb.prepare("UPDATE accounts SET current_balance = 100 WHERE id = 'acc_usd'").run();
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
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc_asset',
    to_account_id: null,
    category_id: 'cat_food',
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

describe('addTransaction — expense', () => {
  it('inserts the transaction row', async () => {
    await addTransaction(mockDb, makeTx());
    const row = realDb.prepare("SELECT * FROM transactions WHERE id = 'tx-1'").get();
    expect(row).toBeDefined();
  });

  it('debits the account balance', async () => {
    await addTransaction(mockDb, makeTx({ amount: 200, egp_amount: 200 }));
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
      makeTx({ id: 'tx-income', type: TransactionType.Income, amount: 500, egp_amount: 500 }),
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
        amount: 300,
        egp_amount: 300,
        to_amount: 300,
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
        amount: 350,
        egp_amount: 350,
        to_amount: 350,
        minimum_payment_snapshot: 200,
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
        amount: 100,
        egp_amount: 100,
        to_amount: 100,
        minimum_payment_snapshot: 200,
        category_id: null,
        to_account_id: 'acc_cc',
      }),
    );
    const cc = realDb
      .prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { revolving_balance: number };
    expect(cc.revolving_balance).toBe(300); // unchanged
  });

  it('treats null revolving_balance and minimum_payment as 0 (covers ?? 0 branches)', async () => {
    // Seed a CC account with NULL revolving_balance and minimum_payment
    realDb
      .prepare(
        `INSERT OR IGNORE INTO accounts
         (id,name,type,currency,opening_balance,current_balance,
          interest_tracking,is_archived,sort_order,created_at,updated_at)
         VALUES ('acc_cc_null','CC Null Fields','credit_card','EGP',0,800,0,0,5,?,?)`,
      )
      .run(NOW, NOW);
    // Both revolving_balance and minimum_payment are NULL (not set)

    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-cc-null',
        type: TransactionType.CCPayment,
        amount: 200,
        egp_amount: 200,
        to_amount: 200,
        minimum_payment_snapshot: null,
        category_id: null,
        to_account_id: 'acc_cc_null',
      }),
    );

    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb
      .prepare("SELECT current_balance, revolving_balance FROM accounts WHERE id = 'acc_cc_null'")
      .get() as { current_balance: number; revolving_balance: number | null };

    // minimum_payment_snapshot=null → installmentDue=0, installmentCovered=0, revolvingReduction=200
    // revolving_balance=NULL → revolving=0, newRevolving = max(0, 0-200) = 0
    expect(asset.current_balance).toBe(800); // 1000 - 200
    expect(cc.current_balance).toBe(600); // 800 - 200
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
    const page1 = await getTransactions(mockDb, { limit: 2, offset: 0 });
    const page2 = await getTransactions(mockDb, { limit: 2, offset: 2 });
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
  it('removes the row and reverses an expense balance', async () => {
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

  it('reverses an income credit', async () => {
    await addTransaction(
      mockDb,
      makeTx({ id: 'tx-inc', type: TransactionType.Income, amount: 500, egp_amount: 500 }),
    );
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(1500);

    await deleteTransaction(mockDb, 'tx-inc');
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(1000);
  });

  it('reverses a transfer on both accounts', async () => {
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-tr',
        type: TransactionType.Transfer,
        amount: 300,
        egp_amount: 300,
        to_amount: 300,
        category_id: null,
        to_account_id: 'acc_cc',
      }),
    );
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(700);
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(800);

    await deleteTransaction(mockDb, 'tx-tr');
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(1000);
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(500);
  });

  it('reverses a cc_payment, restoring revolving_balance and current_balance', async () => {
    // Initial: acc_asset=1000, acc_cc current=500/revolving=300/min=200
    // Payment 350 → asset=650, cc current=150, revolving=150 (200 to installment, 150 to revolving)
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-cc',
        type: TransactionType.CCPayment,
        amount: 350,
        egp_amount: 350,
        to_amount: 350,
        minimum_payment_snapshot: 200,
        category_id: null,
        to_account_id: 'acc_cc',
      }),
    );
    await deleteTransaction(mockDb, 'tx-cc');

    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb
      .prepare("SELECT current_balance, revolving_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { current_balance: number; revolving_balance: number };
    expect(asset.current_balance).toBe(1000);
    expect(cc.current_balance).toBe(500);
    expect(cc.revolving_balance).toBe(300);
  });

  it('reverses a cc_payment that only covered installment (revolving stayed unchanged on add)', async () => {
    // Payment 100 against installment_due 200 → no revolving reduction on add
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-cc2',
        type: TransactionType.CCPayment,
        amount: 100,
        egp_amount: 100,
        to_amount: 100,
        minimum_payment_snapshot: 200,
        category_id: null,
        to_account_id: 'acc_cc',
      }),
    );
    await deleteTransaction(mockDb, 'tx-cc2');

    const cc = realDb
      .prepare("SELECT current_balance, revolving_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { current_balance: number; revolving_balance: number };
    expect(cc.current_balance).toBe(500);
    expect(cc.revolving_balance).toBe(300);
  });

  it('is a no-op for unknown id', async () => {
    await expect(deleteTransaction(mockDb, 'ghost')).resolves.toBeUndefined();
  });

  it('reverses cc_payment when cc account has null minimum_payment (covers ?? 0 branch)', async () => {
    // Seed a CC account with NULL revolving_balance and minimum_payment
    realDb
      .prepare(
        `INSERT OR IGNORE INTO accounts
         (id,name,type,currency,opening_balance,current_balance,
          interest_tracking,is_archived,sort_order,created_at,updated_at)
         VALUES ('acc_cc_null2','CC Null2','credit_card','EGP',0,800,0,0,6,?,?)`,
      )
      .run(NOW, NOW);

    // Add a cc_payment against this CC account (minimum_payment=NULL → treated as 0)
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-cc-null2',
        type: TransactionType.CCPayment,
        amount: 150,
        egp_amount: 150,
        to_amount: 150,
        minimum_payment_snapshot: null,
        category_id: null,
        to_account_id: 'acc_cc_null2',
      }),
    );

    // Now delete: deleteTransaction should restore the balance
    // With minimum_payment=NULL, installmentDue=0, revolvingRestore=150
    await deleteTransaction(mockDb, 'tx-cc-null2');

    const cc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc_null2'")
      .get() as { current_balance: number };
    expect(cc.current_balance).toBe(800); // fully restored
  });
});

describe('addTransaction / deleteTransaction — unknown type (covers else-if false branch on cc_payment)', () => {
  // These tests use a pure in-memory mock db that does NOT enforce the SQLite CHECK constraint,
  // so we can pass an unknown transaction type to exercise the dead "else-if false" branches.
  function makeCustomMockDb(fakeTxRow: Transaction | null = null) {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 });
    const getAllAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM transactions') && fakeTxRow) return [fakeTxRow];
      return [];
    });
    const withTransactionAsync = jest.fn().mockImplementation(async (fn: () => Promise<void>) => {
      await fn();
    });
    return { runAsync, getAllAsync, withTransactionAsync } as unknown as Parameters<
      typeof addTransaction
    >[0];
  }

  it('addTransaction with unknown type inserts row without balance update', async () => {
    const db = makeCustomMockDb();
    const tx = makeTx({ id: 'tx-unk', type: 'unknown_type' as TransactionType });
    await addTransaction(db, tx);
    // Only the INSERT runAsync should fire; no account UPDATE
    const updateCalls = (db.runAsync as jest.Mock).mock.calls.filter(([sql]: [string]) =>
      sql.includes('UPDATE accounts'),
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('deleteTransaction with unknown-type transaction does not touch account balances', async () => {
    const fakeTx = makeTx({ id: 'tx-unk', type: 'unknown_type' as TransactionType });
    const db = makeCustomMockDb(fakeTx);
    await deleteTransaction(db, 'tx-unk');
    // DELETE runs, but no UPDATE accounts
    const updateCalls = (db.runAsync as jest.Mock).mock.calls.filter(([sql]: [string]) =>
      sql.includes('UPDATE accounts'),
    );
    expect(updateCalls).toHaveLength(0);
  });
});

describe('addTransaction — USD expense (Bug 1 regression)', () => {
  it('debits USD account by face-value amount, not egp_amount', async () => {
    // $50 expense at rate 50 → egp_amount=2500, but USD balance should drop from 100 to 50
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-usd-exp',
        type: TransactionType.Expense,
        amount: 50,
        currency: Currency.USD,
        egp_amount: 2500,
        exchange_rate: 50,
        account_id: 'acc_usd',
        to_account_id: null,
        to_amount: null,
        minimum_payment_snapshot: null,
        category_id: 'cat_food',
      }),
    );
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(50);
  });
});

describe('addTransaction — USD income (Bug 1 regression)', () => {
  it('credits USD account by face-value amount, not egp_amount', async () => {
    // $200 income at rate 50 → egp_amount=10000, but USD balance should go from 100 to 300
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-usd-inc',
        type: TransactionType.Income,
        amount: 200,
        currency: Currency.USD,
        egp_amount: 10000,
        exchange_rate: 50,
        account_id: 'acc_usd',
        to_account_id: null,
        to_amount: null,
        minimum_payment_snapshot: null,
        category_id: 'cat_food',
      }),
    );
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(300);
  });
});

describe('addTransaction — USD → EGP transfer (Bug 1 + Bug 2 regression)', () => {
  it('debits USD FROM by amount and credits EGP TO by to_amount', async () => {
    // $50 from USD account → EGP account at rate 50 → to_amount = 2500 EGP
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-usd-egp',
        type: TransactionType.Transfer,
        amount: 50,
        currency: Currency.USD,
        egp_amount: 2500,
        exchange_rate: 50,
        account_id: 'acc_usd',
        to_account_id: 'acc_asset',
        category_id: null,
        to_amount: 2500,
        minimum_payment_snapshot: null,
      }),
    );
    const usd = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'")
      .get() as { current_balance: number };
    const egp = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(usd.current_balance).toBe(50); // 100 - 50
    expect(egp.current_balance).toBe(3500); // 1000 + 2500
  });
});

describe('addTransaction — EGP → USD transfer (Bug 2 regression)', () => {
  it('debits EGP FROM by amount and credits USD TO by to_amount', async () => {
    // 5000 EGP → USD account at rate 50 → to_amount = 100 USD
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-egp-usd',
        type: TransactionType.Transfer,
        amount: 5000,
        currency: Currency.EGP,
        egp_amount: 5000,
        exchange_rate: 50,
        account_id: 'acc_asset',
        to_account_id: 'acc_usd',
        category_id: null,
        to_amount: 100,
        minimum_payment_snapshot: null,
      }),
    );
    const egp = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const usd = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'")
      .get() as { current_balance: number };
    expect(egp.current_balance).toBe(-4000); // 1000 - 5000
    expect(usd.current_balance).toBe(200); // 100 + 100
  });
});

describe('deleteTransaction — USD expense reversal (Bug 1 regression)', () => {
  it('restores USD balance by face-value amount', async () => {
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-del-usd',
        type: TransactionType.Expense,
        amount: 50,
        currency: Currency.USD,
        egp_amount: 2500,
        exchange_rate: 50,
        account_id: 'acc_usd',
        to_account_id: null,
        category_id: 'cat_food',
        to_amount: null,
        minimum_payment_snapshot: null,
      }),
    );
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(50);

    await deleteTransaction(mockDb, 'tx-del-usd');
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(100);
  });
});

describe('deleteTransaction — EGP → USD transfer reversal (Bug 2 regression)', () => {
  it('reverses both sides using native amounts', async () => {
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-del-egp-usd',
        type: TransactionType.Transfer,
        amount: 5000,
        currency: Currency.EGP,
        egp_amount: 5000,
        exchange_rate: 50,
        account_id: 'acc_asset',
        to_account_id: 'acc_usd',
        category_id: null,
        to_amount: 100,
        minimum_payment_snapshot: null,
      }),
    );
    await deleteTransaction(mockDb, 'tx-del-egp-usd');
    const egp = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const usd = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'")
      .get() as { current_balance: number };
    expect(egp.current_balance).toBe(1000);
    expect(usd.current_balance).toBe(100);
  });
});

describe('addTransaction — cc_payment uses minimum_payment_snapshot (Bug 3 regression)', () => {
  it('uses minimum_payment_snapshot for revolving logic; reversal is immune to later changes', async () => {
    // Snapshot = 200 at time of payment. Add the payment, then change minimum_payment on
    // the account, then delete — reversal must use the snapshot (200), not the new value (500).
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-cc-snap',
        type: TransactionType.CCPayment,
        amount: 350,
        currency: Currency.EGP,
        egp_amount: 350,
        exchange_rate: null,
        account_id: 'acc_asset',
        to_account_id: 'acc_cc',
        category_id: null,
        to_amount: 350,
        minimum_payment_snapshot: 200,
      }),
    );

    // Simulate the user changing minimum_payment after the transaction was saved.
    realDb.prepare("UPDATE accounts SET minimum_payment = 500 WHERE id = 'acc_cc'").run();

    await deleteTransaction(mockDb, 'tx-cc-snap');

    const cc = realDb
      .prepare("SELECT current_balance, revolving_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { current_balance: number; revolving_balance: number };

    // Original add with snapshot=200: installment_covered=200, revolving_reduction=150 → revolving=150
    // Reversal with snapshot=200: revolving_restore=max(0,350-200)=150 → revolving back to 300
    expect(cc.current_balance).toBe(500);
    expect(cc.revolving_balance).toBe(300);
  });
});

describe('getTransactions — filter + search', () => {
  beforeEach(async () => {
    realDb.exec('DELETE FROM transactions');
    realDb
      .prepare(
        `INSERT OR IGNORE INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
         VALUES ('cat_food','Food & Dining','expense','food','#C9973A',1,0,?,?)`,
      )
      .run(NOW, NOW);
    realDb
      .prepare(
        `INSERT OR IGNORE INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
         VALUES ('cat_salary','Salary','income','briefcase','#4CAF82',1,0,?,?)`,
      )
      .run(NOW, NOW);
  });

  async function insert(overrides: Partial<Transaction> = {}) {
    const tx: Transaction = {
      id: overrides.id ?? `tx-${Math.random().toString(36).slice(2, 9)}`,
      type: TransactionType.Expense,
      amount: 10,
      currency: Currency.EGP,
      egp_amount: 10,
      exchange_rate: null,
      to_amount: null,
      minimum_payment_snapshot: null,
      account_id: 'acc_asset',
      to_account_id: null,
      category_id: 'cat_food',
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
      commitment_payment_id: null,
      installment_id: null,
      created_at: NOW,
      updated_at: NOW,
      ...overrides,
    };
    await addTransaction(mockDb, tx);
    return tx;
  }

  it('returns all transactions ordered DESC when no filter is provided', async () => {
    await insert({ id: 'a', transaction_date: '2026-04-30', transaction_time: '10:00:00' });
    await insert({ id: 'b', transaction_date: '2026-05-01', transaction_time: '10:00:00' });

    const out = await getTransactions(mockDb, {});
    expect(out.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('filters by type', async () => {
    await insert({ id: 'e', type: TransactionType.Expense });
    await insert({ id: 'i', type: TransactionType.Income, category_id: 'cat_salary' });

    const out = await getTransactions(mockDb, {
      type: TransactionType.Expense,
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('e');
  });

  it('searches by note', async () => {
    await insert({ id: 'with', note: 'Lunch with team' });
    await insert({ id: 'without', note: 'Coffee' });

    const out = await getTransactions(mockDb, { search: 'lunch' });
    expect(out.map((t) => t.id)).toEqual(['with']);
  });

  it('searches by category name (case-insensitive)', async () => {
    await insert({ id: 'food-tx', category_id: 'cat_food' });
    await insert({ id: 'salary-tx', type: TransactionType.Income, category_id: 'cat_salary' });

    const out = await getTransactions(mockDb, { search: 'FOOD' });
    expect(out.map((t) => t.id)).toEqual(['food-tx']);
  });

  it('searches by source account name', async () => {
    await insert({ id: 'on-checking' }); // account_id = acc_asset, name 'Checking'
    realDb
      .prepare(
        `INSERT OR IGNORE INTO accounts
         (id,name,type,currency,opening_balance,current_balance,
          interest_tracking,is_archived,sort_order,created_at,updated_at)
         VALUES ('acc_other','Vodafone','smart_wallet','EGP',0,0,0,0,2,?,?)`,
      )
      .run(NOW, NOW);
    await insert({ id: 'on-vodafone', account_id: 'acc_other' });

    const out = await getTransactions(mockDb, { search: 'check' });
    expect(out.map((t) => t.id)).toEqual(['on-checking']);
  });

  it('searches by destination account name on transfers', async () => {
    realDb
      .prepare(
        `INSERT OR IGNORE INTO accounts
         (id,name,type,currency,opening_balance,current_balance,
          interest_tracking,is_archived,sort_order,created_at,updated_at)
         VALUES ('acc_dst','Vault','physical_savings','EGP',0,0,0,0,3,?,?)`,
      )
      .run(NOW, NOW);

    await insert({
      id: 'xfer',
      type: TransactionType.Transfer,
      to_amount: 10,
      to_account_id: 'acc_dst',
      category_id: null,
    });

    const out = await getTransactions(mockDb, { search: 'vault' });
    expect(out.map((t) => t.id)).toEqual(['xfer']);
  });

  it('combines filter + search (AND)', async () => {
    await insert({ id: 'expense-food', note: 'Lunch' });
    await insert({
      id: 'income-lunch',
      type: TransactionType.Income,
      category_id: 'cat_salary',
      note: 'Lunch reimbursement',
    });

    const out = await getTransactions(mockDb, {
      search: 'lunch',
      type: TransactionType.Expense,
    });
    expect(out.map((t) => t.id)).toEqual(['expense-food']);
  });

  it('treats empty / whitespace search as no filter', async () => {
    await insert({ id: 'a' });
    await insert({ id: 'b' });

    const out = await getTransactions(mockDb, { search: '   ' });
    expect(out).toHaveLength(2);
  });

  it('escapes LIKE wildcards so a literal "%" does not match every row', async () => {
    await insert({ id: 'plain', note: 'Coffee' });
    await insert({ id: 'literal', note: '50% tip' });

    const out = await getTransactions(mockDb, { search: '50%' });
    expect(out.map((t) => t.id)).toEqual(['literal']);
  });

  it('paginates with LIMIT/OFFSET', async () => {
    for (let i = 0; i < 35; i++) {
      const day = String(i + 1).padStart(2, '0');
      await insert({ id: `p${i}`, transaction_date: `2026-03-${day}` });
    }

    const page1 = await getTransactions(mockDb, { limit: 30, offset: 0 });
    const page2 = await getTransactions(mockDb, { limit: 30, offset: 30 });
    expect(page1).toHaveLength(30);
    expect(page2).toHaveLength(5);
    expect(page1[0].id).not.toBe(page2[0].id);
  });
});

describe('addTransaction — cc_payment null to_amount fallback (legacy row)', () => {
  it('falls back to egp_amount when to_amount is null', async () => {
    // Legacy cc_payment row with no to_amount — should use egp_amount for CC balance update.
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-cc-legacy',
        type: TransactionType.CCPayment,
        amount: 300,
        currency: Currency.EGP,
        egp_amount: 300,
        account_id: 'acc_asset',
        to_account_id: 'acc_cc',
        category_id: null,
        minimum_payment_snapshot: 200,
        to_amount: null, // legacy: no to_amount stored
      }),
    );
    const cc = realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc'").get() as {
      current_balance: number;
    };
    // 300 applied to CC (same as egp_amount), balance should decrease by 300
    expect(cc.current_balance).toBe(200); // 500 - 300
  });
});

describe('deleteTransaction — transfer null to_amount fallback (legacy row)', () => {
  it('uses egp_amount when to_amount is null on the stored transaction', async () => {
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-transfer-legacy',
        type: TransactionType.Transfer,
        amount: 200,
        currency: Currency.EGP,
        egp_amount: 200,
        account_id: 'acc_asset',
        to_account_id: 'acc_usd',
        category_id: null,
        minimum_payment_snapshot: null,
        to_amount: null, // legacy: no to_amount
      }),
    );
    // After add, usd account gained egp_amount=200 (fallback path)
    await deleteTransaction(mockDb, 'tx-transfer-legacy');
    // After delete, both accounts should be restored
    const egp = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(egp.current_balance).toBe(1000);
  });
});

describe('deleteTransaction — cc_payment null to_amount fallback (legacy row)', () => {
  it('uses egp_amount for cc reversal when to_amount is null', async () => {
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-cc-del-legacy',
        type: TransactionType.CCPayment,
        amount: 200,
        currency: Currency.EGP,
        egp_amount: 200,
        account_id: 'acc_asset',
        to_account_id: 'acc_cc',
        category_id: null,
        minimum_payment_snapshot: 200,
        to_amount: null, // legacy: no to_amount
      }),
    );
    await deleteTransaction(mockDb, 'tx-cc-del-legacy');
    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(asset.current_balance).toBe(1000);
  });
});

describe('getMonthExpenseStats', () => {
  beforeEach(() => {
    realDb.exec('DELETE FROM transactions');
    realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc_asset'").run();
  });

  it('returns zeros for a month with no expenses', async () => {
    const stats = await getMonthExpenseStats(mockDb, '2026-03');
    expect(stats).toEqual({ totalEgp: 0, egpNative: 0, usdNative: 0, count: 0 });
  });

  it('returns zeros when getFirstAsync returns null (covers row?? 0 branches)', async () => {
    // Use a custom mock db where getFirstAsync always returns null
    const nullDb = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
    } as unknown as Parameters<typeof getMonthExpenseStats>[0];
    const stats = await getMonthExpenseStats(nullDb, '2026-03');
    expect(stats).toEqual({ totalEgp: 0, egpNative: 0, usdNative: 0, count: 0 });
  });

  it('sums EGP expenses for a non-December month (covers month !== 12 branch)', async () => {
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-mar-1',
        type: TransactionType.Expense,
        amount: 200,
        currency: Currency.EGP,
        egp_amount: 200,
        transaction_date: '2026-03-15',
      }),
    );
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-mar-2',
        type: TransactionType.Expense,
        amount: 100,
        currency: Currency.EGP,
        egp_amount: 100,
        transaction_date: '2026-03-28',
      }),
    );
    const stats = await getMonthExpenseStats(mockDb, '2026-03');
    expect(stats.totalEgp).toBe(300);
    expect(stats.egpNative).toBe(300);
    expect(stats.usdNative).toBe(0);
    expect(stats.count).toBe(2);
  });

  it('wraps correctly for December (covers month === 12 branch: nextMonth=1, nextYear+1)', async () => {
    // Expense in December 2025 — should be inside [2025-12-01, 2026-01-01)
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-dec',
        type: TransactionType.Expense,
        amount: 500,
        currency: Currency.EGP,
        egp_amount: 500,
        transaction_date: '2025-12-20',
      }),
    );
    // Expense in January 2026 — should NOT be included
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-jan',
        type: TransactionType.Expense,
        amount: 999,
        currency: Currency.EGP,
        egp_amount: 999,
        transaction_date: '2026-01-01',
      }),
    );
    const stats = await getMonthExpenseStats(mockDb, '2025-12');
    expect(stats.totalEgp).toBe(500);
    expect(stats.count).toBe(1);
  });

  it('excludes non-expense types (income, transfer, cc_payment)', async () => {
    await addTransaction(
      mockDb,
      makeTx({
        id: 'tx-inc',
        type: TransactionType.Income,
        amount: 1000,
        currency: Currency.EGP,
        egp_amount: 1000,
        transaction_date: '2026-03-10',
      }),
    );
    const stats = await getMonthExpenseStats(mockDb, '2026-03');
    expect(stats.count).toBe(0);
  });
});
