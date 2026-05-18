import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { Currency, TransactionType } from '@/constants/enums';
import { addTransaction, updateTransaction } from '@/database/transactions';
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
        revolving_balance,minimum_payment,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES
         ('acc_asset','Checking','bank','EGP',1000,1000,NULL,NULL,0,0,0,?,?),
         ('acc_cc','Credit Card','credit_card','EGP',0,500,300,200,0,0,1,?,?)`,
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
  typeof updateTransaction
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

async function seedTx(overrides: Partial<Transaction> = {}) {
  const tx = makeTx(overrides);
  await addTransaction(mockDb, tx);
  return tx;
}

describe('updateTransaction — custom mock db (unknown type and missing CC account)', () => {
  function makeCustomDb(
    fakeTxRow: Transaction,
    ccRows: unknown[] = [],
  ): Parameters<typeof updateTransaction>[0] {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 });
    let getAllCallCount = 0;
    const getAllAsync = jest.fn().mockImplementation(async (sql: string) => {
      // First call: fetch the existing transaction row
      if (sql.includes('SELECT * FROM transactions')) return [fakeTxRow];
      // Subsequent calls within the transaction: return ccRows for CC account lookup
      getAllCallCount++;
      return ccRows;
    });
    const withTransactionAsync = jest.fn().mockImplementation(async (fn: () => Promise<void>) => {
      await fn();
    });
    return { runAsync, getAllAsync, withTransactionAsync } as unknown as Parameters<
      typeof updateTransaction
    >[0];
  }

  it('updates row without balance changes for unknown type', async () => {
    const fakeTx = makeTx({ id: 'tx-unk', type: 'unknown_type' as TransactionType });
    const db = makeCustomDb(fakeTx);

    await updateTransaction(db, 'tx-unk', {
      amount: 75,
      currency: Currency.EGP,
      egp_amount: 75,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });

    const accountUpdateCalls = (db.runAsync as jest.Mock).mock.calls.filter(([sql]: [string]) =>
      sql.includes('UPDATE accounts'),
    );
    expect(accountUpdateCalls).toHaveLength(0);
  });

  it('cc_payment update with missing CC account (ccForApply undefined) covers ?. false branch on line 297', async () => {
    // fakeTx is a cc_payment, but the CC account lookup (ccForApply) returns empty → ccForApply is undefined
    // This covers the `ccForApply?.revolving_balance` undefined branch
    const fakeTx = makeTx({
      id: 'tx-cc-ghost',
      type: TransactionType.CCPayment,
      to_account_id: 'acc_ghost',
      category_id: null,
    });
    // ccRows: first ccForReverse call returns empty, ccForApply call also returns empty
    const db = makeCustomDb(fakeTx, []);

    await updateTransaction(db, 'tx-cc-ghost', {
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });

    // The update should complete without throwing — undefined cc treated as {minimum_payment: 0, revolving_balance: 0}
    const txUpdateCalls = (db.runAsync as jest.Mock).mock.calls.filter(([sql]: [string]) =>
      sql.includes('UPDATE transactions'),
    );
    expect(txUpdateCalls.length).toBeGreaterThan(0);
  });
});

describe('updateTransaction — no-op for unknown id', () => {
  it('resolves without error when id does not exist', async () => {
    await expect(
      updateTransaction(mockDb, 'ghost', {
        amount: 50,
        currency: Currency.EGP,
        egp_amount: 50,
        exchange_rate: null,
        category_id: null,
        note: null,
        transaction_date: DATE,
        transaction_time: TIME,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('updateTransaction — expense', () => {
  it('updates the transaction row fields', async () => {
    await seedTx({ egp_amount: 100 });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 200,
      currency: Currency.EGP,
      egp_amount: 200,
      exchange_rate: null,
      category_id: 'cat_groceries',
      note: 'updated note',
      transaction_date: '2026-06-01',
      transaction_time: '09:00:00',
    });
    const row = realDb
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get('tx-1') as Transaction;
    expect(row.amount).toBe(200);
    expect(row.egp_amount).toBe(200);
    expect(row.category_id).toBe('cat_groceries');
    expect(row.note).toBe('updated note');
    expect(row.transaction_date).toBe('2026-06-01');
    expect(row.transaction_time).toBe('09:00:00');
  });

  it('delta-applies balance: increase expense debits more', async () => {
    // Add 100 → balance 900. Update to 150 → delta = +50 → balance = 900 - 50 = 850
    await seedTx({ egp_amount: 100 });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 150,
      currency: Currency.EGP,
      egp_amount: 150,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(850);
  });

  it('delta-applies balance: decrease expense credits back', async () => {
    // Add 100 → balance 900. Update to 60 → delta = -40 → balance = 900 + 40 = 940
    await seedTx({ egp_amount: 100 });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 60,
      currency: Currency.EGP,
      egp_amount: 60,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(940);
  });

  it('zero delta leaves balance unchanged', async () => {
    await seedTx({ egp_amount: 100 });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(900);
  });
});

describe('updateTransaction — income', () => {
  it('delta-applies balance: increase income credits more', async () => {
    // Add income 200 → balance 1200. Update to 300 → delta = +100 → balance = 1200 + 100 = 1300
    await seedTx({ egp_amount: 200, type: TransactionType.Income });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 300,
      currency: Currency.EGP,
      egp_amount: 300,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(1300);
  });

  it('delta-applies balance: decrease income debits back', async () => {
    // Add income 200 → balance 1200. Update to 100 → delta = -100 → balance = 1200 - 100 = 1100
    await seedTx({ egp_amount: 200, type: TransactionType.Income });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const acc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    expect(acc.current_balance).toBe(1100);
  });
});

describe('updateTransaction — transfer', () => {
  it('delta-applies both accounts', async () => {
    // Add transfer 300: asset 700, cc 800. Update to 400: delta=+100 → asset 600, cc 900
    await seedTx({
      amount: 300,
      egp_amount: 300,
      to_amount: 300,
      type: TransactionType.Transfer,
      category_id: null,
      to_account_id: 'acc_cc',
    });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 400,
      currency: Currency.EGP,
      egp_amount: 400,
      to_amount: 400,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc'").get() as {
      current_balance: number;
    };
    expect(asset.current_balance).toBe(600);
    expect(cc.current_balance).toBe(900);
  });
});

describe('updateTransaction — cc_payment', () => {
  it('re-applies installment split after amount increase', async () => {
    // Initial: acc_asset=1000, acc_cc current=500, revolving=300, min_payment=200
    // Add cc_payment 350: asset=650, cc current=150, revolving=150
    // Update to 450: reverse 350 → asset=1000, cc current=500, revolving=300
    //                apply 450: inst_covered=200, revolving_reduction=250 → revolving=50
    //                           asset=550, cc current=50
    await seedTx({
      amount: 350,
      egp_amount: 350,
      to_amount: 350,
      minimum_payment_snapshot: 200,
      type: TransactionType.CCPayment,
      category_id: null,
      to_account_id: 'acc_cc',
    });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 450,
      currency: Currency.EGP,
      egp_amount: 450,
      to_amount: 450,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb
      .prepare("SELECT current_balance, revolving_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { current_balance: number; revolving_balance: number };
    expect(asset.current_balance).toBe(550);
    expect(cc.current_balance).toBe(50);
    expect(cc.revolving_balance).toBe(50);
  });

  it('re-applies installment split after amount decrease', async () => {
    // Add 350 → asset=650, cc current=150, revolving=150
    // Update to 100: reverse 350 → asset=1000, cc current=500, revolving=300
    //                apply 100: inst_covered=100, revolving_reduction=0 → revolving stays 300
    //                           asset=900, cc current=400
    await seedTx({
      amount: 350,
      egp_amount: 350,
      to_amount: 350,
      minimum_payment_snapshot: 200,
      type: TransactionType.CCPayment,
      category_id: null,
      to_account_id: 'acc_cc',
    });
    await updateTransaction(mockDb, 'tx-1', {
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      to_amount: 100,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });
    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb
      .prepare("SELECT current_balance, revolving_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { current_balance: number; revolving_balance: number };
    expect(asset.current_balance).toBe(900);
    expect(cc.current_balance).toBe(400);
    expect(cc.revolving_balance).toBe(300);
  });

  it('handles cc_payment update when cc account has null minimum_payment and revolving_balance (covers ?? 0 branches)', async () => {
    // Seed a CC account with NULL revolving_balance and minimum_payment
    realDb
      .prepare(
        `INSERT OR IGNORE INTO accounts
         (id,name,type,currency,opening_balance,current_balance,
          interest_tracking,is_archived,sort_order,created_at,updated_at)
         VALUES ('acc_cc_null','CC Null Fields','credit_card','EGP',0,800,0,0,5,?,?)`,
      )
      .run(NOW, NOW);

    // Add a cc_payment where minimum_payment=NULL → treated as 0
    // Amount=200: installment=0, revolving reduction=200, revolving=max(0,0-200)=0
    await seedTx({
      amount: 200,
      egp_amount: 200,
      to_amount: 200,
      minimum_payment_snapshot: null,
      type: TransactionType.CCPayment,
      category_id: null,
      to_account_id: 'acc_cc_null',
    });

    // Update: reverse old (minimum_payment=NULL → old installment=0, revolvingRestore=200)
    //         apply new 300: installment=0, revolving_reduction=300, revolving=max(0,0-300)=0
    await updateTransaction(mockDb, 'tx-1', {
      amount: 300,
      currency: Currency.EGP,
      egp_amount: 300,
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });

    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const cc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc_null'")
      .get() as { current_balance: number };

    // asset: 1000 - 200 (seed) → reversed: 1000, then - 300 (new apply) → 700
    expect(asset.current_balance).toBe(700);
    // cc_null: 800 - 200 (seed) → reversed: 800, then - 300 (new apply) → 500
    expect(cc.current_balance).toBe(500);
  });
});

describe('updateTransaction — transfer null to_amount fallback (legacy row)', () => {
  beforeEach(() => {
    realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc_asset'").run();
    realDb
      .prepare(
        "UPDATE accounts SET current_balance = 500, revolving_balance = 300 WHERE id = 'acc_cc'",
      )
      .run();
    realDb.exec('DELETE FROM transactions');
  });

  it('uses egp_amount when existing.to_amount and updates.to_amount are both null', async () => {
    // Legacy transfer: to_amount=null, so toAmt falls back to egp_amount=200
    await seedTx({
      type: TransactionType.Transfer,
      amount: 200,
      egp_amount: 200,
      to_amount: null, // legacy row
      account_id: 'acc_asset',
      to_account_id: 'acc_cc',
      category_id: null,
      minimum_payment_snapshot: null,
    });
    // acc_asset: 1000-200=800, acc_cc: 500+200=700 (using egp_amount fallback)
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(800);
    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(700);

    // Update: new amount=150, to_amount still null → uses egp_amount=150 fallback
    await updateTransaction(mockDb, 'tx-1', {
      amount: 150,
      currency: Currency.EGP,
      egp_amount: 150,
      to_amount: null, // still no to_amount
      exchange_rate: null,
      category_id: null,
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
    });

    const asset = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_asset'")
      .get() as { current_balance: number };
    const ccAcc = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc'")
      .get() as { current_balance: number };

    // deltaFrom = 150 - 200 = -50 → asset: 800 - (-50) = 850
    expect(asset.current_balance).toBe(850);
    // deltaTo = 150 - 200 = -50 → cc: 700 + (-50) = 650
    expect(ccAcc.current_balance).toBe(650);
  });
});
