import Database from 'better-sqlite3';

import { Currency, TransactionType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import * as transactionsModule from '@/modules/transactions/database/transactions';
import { resolveTransactionAmounts } from '@/modules/transactions/domain/transaction_amounts';
import {
  TransactionBalanceError,
  TransactionNotFoundError,
  TransactionOwnershipError,
  TransactionValidationError,
} from '@/modules/transactions/repositories/transaction.errors';
import {
  TransactionRepository,
  type NewTransactionInput,
} from '@/modules/transactions/repositories/transaction.repository';
import { getExpoSQLiteTestDatabase, getSQLiteParams } from '@/test_helpers/sqlite';
import { toLocalDateString } from '@/utils/format_date';

// Override global UUID mock with a counter so each add() gets a unique id
let mockUuidCounter = 0;
jest.mock('react-native-uuid', () => ({
  __esModule: true,
  default: { v4: () => `tx-repo-${++mockUuidCounter}` },
}));

const getTransactions = jest.spyOn(transactionsModule, 'getTransactions');

const sqlite = getExpoSQLiteTestDatabase();
let realDb: ReturnType<typeof Database>;
const mocked = sqlite;

const NOW = '2026-05-01T12:00:00.000Z';

function seedAccount() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        revolving_balance,minimum_payment,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
     VALUES
       ('acc1','Bank','bank','EGP',5000,5000,NULL,NULL,0,0,0,?,?),
       ('acc2','Savings','bank','EGP',1000,1000,NULL,NULL,0,0,5,?,?),
       ('acc_usd','USD Bank','bank','USD',0,0,NULL,NULL,0,0,3,?,?),
       ('acc_cc','CC','credit_card','EGP',0,1000,500,200,0,0,1,?,?),
       ('acc_cc_usd','USD CC','credit_card','USD',0,100,50,20,0,0,6,?,?),
       ('acc_cc_no_min','CC2','credit_card','EGP',0,1000,500,NULL,0,0,2,?,?),
       ('acc_cc_installment','CC3','credit_card','EGP',0,1000,5000,500,0,0,4,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seedAccount();

  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = getSQLiteParams(rest);
    const result = realDb.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
  });

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = getSQLiteParams(rest);
    return realDb.prepare(sql).all(...params);
  });

  mocked.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
    realDb.exec('BEGIN');
    try {
      await fn();
      realDb.exec('COMMIT');
    } catch (error) {
      realDb.exec('ROLLBACK');
      throw error;
    }
  });
});

beforeEach(() => {
  mockUuidCounter = 0;
  realDb.exec('DELETE FROM transactions; DELETE FROM budgets;');
  realDb.prepare("UPDATE accounts SET current_balance = 5000 WHERE id = 'acc1'").run();
  realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc2'").run();
  realDb.prepare("UPDATE accounts SET current_balance = 0 WHERE id = 'acc_usd'").run();
  realDb
    .prepare(
      "UPDATE accounts SET current_balance = 1000, revolving_balance = 500 WHERE id = 'acc_cc'",
    )
    .run();
  realDb
    .prepare(
      "UPDATE accounts SET current_balance = 100, revolving_balance = 50 WHERE id = 'acc_cc_usd'",
    )
    .run();
  realDb
    .prepare(
      "UPDATE accounts SET current_balance = 1000, revolving_balance = 500 WHERE id = 'acc_cc_no_min'",
    )
    .run();
  realDb
    .prepare(
      "UPDATE accounts SET current_balance = 1000, revolving_balance = 5000 WHERE id = 'acc_cc_installment'",
    )
    .run();
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
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
    expect(tx.transaction_date).toBe(toLocalDateString(new Date()));
  });

  it('stores null for optional fields when omitted', async () => {
    const tx = await repo.add(baseInput);
    expect(tx.note).toBeNull();
    expect(tx.exchange_rate).toBeNull();
    expect(tx.to_account_id).toBeNull();
  });

  it('rejects an expense without a category', async () => {
    const { category_id: _cat, ...withoutCategory } = baseInput;
    await expect(repo.add(withoutCategory)).rejects.toBeInstanceOf(TransactionValidationError);
  });

  it('defaults transaction_time to current time when omitted', async () => {
    const { transaction_time: _time, ...withoutTime } = baseInput;
    const before = new Date().toTimeString().slice(0, 8);
    const tx = await repo.add(withoutTime);
    const after = new Date().toTimeString().slice(0, 8);
    expect(tx.transaction_time >= before).toBe(true);
    expect(tx.transaction_time <= after).toBe(true);
  });

  it('persists a matching named budget assignment', async () => {
    realDb
      .prepare(
        `INSERT INTO budgets
         (id,category_id,name,limit_amount,effective_from,created_at,updated_at)
         VALUES ('budget_food','cat_food','Meals',500,'2026-05',?,?)`,
      )
      .run(NOW, NOW);

    const tx = await repo.add({ ...baseInput, budget_id: 'budget_food' });

    expect(tx.budget_id).toBe('budget_food');
    expect(
      (
        realDb.prepare('SELECT budget_id FROM transactions WHERE id = ?').get(tx.id) as {
          budget_id: string | null;
        }
      ).budget_id,
    ).toBe('budget_food');
  });

  it('rejects assignments for another category or month', async () => {
    realDb
      .prepare(
        `INSERT INTO budgets
         (id,category_id,name,limit_amount,effective_from,created_at,updated_at)
         VALUES ('budget_food','cat_food','Meals',500,'2026-05',?,?)`,
      )
      .run(NOW, NOW);

    await expect(
      repo.add({ ...baseInput, category_id: 'cat_car', budget_id: 'budget_food' }),
    ).rejects.toThrow('does not match');
    await expect(
      repo.add({ ...baseInput, transaction_date: '2026-06-01', budget_id: 'budget_food' }),
    ).rejects.toThrow('does not match');
  });

  it('rejects budget assignments for cash income', async () => {
    await expect(
      repo.add({
        ...baseInput,
        type: TransactionType.Income,
        category_id: 'cat_salary',
        budget_id: 'budget_food',
      }),
    ).rejects.toBeInstanceOf(TransactionValidationError);
  });

  it('rejects a raw amount beside a correctly-rounded egp_amount sibling — the reconciliation guard', async () => {
    // `roundMoney(10.005)` is 10, so the derived `egp_amount` is 10 x 48 = 480.
    await expect(
      repo.add({
        ...baseInput,
        account_id: 'acc_usd',
        currency: Currency.USD,
        amount: 10.005,
        egp_amount: 480,
        exchange_rate: 48,
      }),
    ).rejects.toBeInstanceOf(TransactionValidationError);
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

  it('updates a matching named budget assignment', async () => {
    realDb
      .prepare(
        `INSERT INTO budgets
         (id,category_id,name,limit_amount,effective_from,created_at,updated_at)
         VALUES ('budget_food','cat_food','Meals',500,'2026-05',?,?)`,
      )
      .run(NOW, NOW);
    const tx = await repo.add(baseInput);

    await repo.update(tx.id, {
      amount: 200,
      currency: Currency.EGP,
      egp_amount: 200,
      category_id: 'cat_food',
      budget_id: 'budget_food',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    const row = realDb.prepare('SELECT budget_id FROM transactions WHERE id = ?').get(tx.id) as {
      budget_id: string | null;
    };
    expect(row.budget_id).toBe('budget_food');
  });

  it('rejects retaining a named budget when the category is explicitly cleared', async () => {
    realDb
      .prepare(
        `INSERT INTO budgets
         (id,category_id,name,limit_amount,effective_from,created_at,updated_at)
         VALUES ('budget_food','cat_food','Meals',500,'2026-05',?,?)`,
      )
      .run(NOW, NOW);
    const tx = await repo.add({ ...baseInput, budget_id: 'budget_food' });

    await expect(
      repo.update(tx.id, {
        amount: 200,
        currency: Currency.EGP,
        egp_amount: 200,
        category_id: null,
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      }),
    ).rejects.toBeInstanceOf(TransactionValidationError);
  });

  it('rejects retaining a named budget when the transaction moves to another month', async () => {
    realDb
      .prepare(
        `INSERT INTO budgets
         (id,category_id,name,limit_amount,effective_from,created_at,updated_at)
         VALUES ('budget_food','cat_food','Meals',500,'2026-05',?,?)`,
      )
      .run(NOW, NOW);
    const tx = await repo.add({ ...baseInput, budget_id: 'budget_food' });

    await expect(
      repo.update(tx.id, {
        amount: 200,
        currency: Currency.EGP,
        egp_amount: 200,
        transaction_date: '2026-06-01',
        transaction_time: '10:00:00',
      }),
    ).rejects.toThrow('does not match');
  });
});

describe('TransactionRepository.add — cc_payment minimum_payment_snapshot', () => {
  it('captures minimum_payment_snapshot from CC account', async () => {
    const tx = await repo.add({
      type: TransactionType.CCPayment,
      amount: 200,
      currency: Currency.EGP,
      egp_amount: 200,
      to_amount: 200,
      account_id: 'acc1',
      to_account_id: 'acc_cc', // minimum_payment = 200
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });
    expect(tx.minimum_payment_snapshot).toBe(200);
  });

  it('stores null snapshot when CC account has no minimum_payment', async () => {
    const tx = await repo.add({
      type: TransactionType.CCPayment,
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      to_amount: 100,
      account_id: 'acc1',
      to_account_id: 'acc_cc_no_min', // minimum_payment = NULL
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });
    expect(tx.minimum_payment_snapshot).toBeNull();
  });

  it('stores and applies the payment in a USD card destination currency', async () => {
    const tx = await repo.add({
      type: TransactionType.CCPayment,
      amount: 500,
      currency: Currency.EGP,
      egp_amount: 500,
      to_amount: 10,
      exchange_rate: 50,
      account_id: 'acc1',
      to_account_id: 'acc_cc_usd',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    expect(tx.to_amount).toBe(10);
    expect(accountBalance('acc1')).toBe(4500);
    expect(accountBalance('acc_cc_usd')).toBe(90);
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

describe('Case A — same-currency transfer (EGP → EGP)', () => {
  it('to_amount equals amount, exchange_rate equals 1, balances update correctly', async () => {
    const tx = await repo.add({
      type: TransactionType.Transfer,
      amount: 1000,
      currency: Currency.EGP,
      egp_amount: 1000,
      to_amount: 1000,
      exchange_rate: 1,
      account_id: 'acc1',
      to_account_id: 'acc2',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    expect(tx.to_amount).toBe(1000);
    expect(tx.exchange_rate).toBe(1);

    const from = realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'").get() as {
      current_balance: number;
    };
    const to = realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc2'").get() as {
      current_balance: number;
    };

    expect(from.current_balance).toBe(4000); // 5000 - 1000
    expect(to.current_balance).toBe(2000); // 1000 + 1000
  });
});

describe('Case B — foreign-currency transfer (EGP → USD)', () => {
  it('to_amount is in destination currency, exchange_rate applied, balances update correctly', async () => {
    const tx = await repo.add({
      type: TransactionType.Transfer,
      amount: 1000,
      currency: Currency.EGP,
      egp_amount: 1000,
      to_amount: 20,
      exchange_rate: 50,
      account_id: 'acc1',
      to_account_id: 'acc_usd',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    expect(tx.amount).toBe(1000);
    expect(tx.to_amount).toBe(20);
    expect(tx.exchange_rate).toBe(50);

    const from = realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'").get() as {
      current_balance: number;
    };
    const to = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'")
      .get() as { current_balance: number };

    expect(from.current_balance).toBe(4000);
    expect(to.current_balance).toBe(20);
  });
});

describe('Case C — CC payment, payment ≤ minimum', () => {
  it('captures minimum_payment_snapshot, payment ≤ minimum does NOT reduce revolving_balance', async () => {
    // acc_cc_installment: revolving_balance=5000, minimum_payment=500
    const tx = await repo.add({
      type: TransactionType.CCPayment,
      amount: 300,
      currency: Currency.EGP,
      egp_amount: 300,
      to_amount: 300,
      account_id: 'acc1',
      to_account_id: 'acc_cc_installment',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    expect(tx.minimum_payment_snapshot).toBe(500);

    const cc = realDb
      .prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc_installment'")
      .get() as { revolving_balance: number };

    expect(cc.revolving_balance).toBe(5000);
  });
});

describe('Case D — CC payment > minimum, installment-first split', () => {
  it('first minimum satisfies installment, excess reduces revolving_balance', async () => {
    const tx = await repo.add({
      type: TransactionType.CCPayment,
      amount: 800,
      currency: Currency.EGP,
      egp_amount: 800,
      to_amount: 800,
      account_id: 'acc1',
      to_account_id: 'acc_cc_installment',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    expect(tx.minimum_payment_snapshot).toBe(500);

    const cc = realDb
      .prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc_installment'")
      .get() as { revolving_balance: number };

    expect(cc.revolving_balance).toBe(4700); // 5000 - 300 (excess only)
  });
});

describe('Case E — reversal symmetry (delete restores all balances)', () => {
  it('deleting same-currency transfer (Case A shape) restores both balances', async () => {
    const tx = await repo.add({
      type: TransactionType.Transfer,
      amount: 1000,
      currency: Currency.EGP,
      egp_amount: 1000,
      to_amount: 1000,
      exchange_rate: 1,
      account_id: 'acc1',
      to_account_id: 'acc2',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });
    await repo.delete(tx.id);
    const from = realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'").get() as {
      current_balance: number;
    };
    const to = realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc2'").get() as {
      current_balance: number;
    };
    expect(from.current_balance).toBe(5000);
    expect(to.current_balance).toBe(1000);
  });

  it('deleting foreign-currency transfer (Case B shape) restores both balances', async () => {
    const tx = await repo.add({
      type: TransactionType.Transfer,
      amount: 1000,
      currency: Currency.EGP,
      egp_amount: 1000,
      to_amount: 20,
      exchange_rate: 50,
      account_id: 'acc1',
      to_account_id: 'acc_usd',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });
    await repo.delete(tx.id);
    const from = realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'").get() as {
      current_balance: number;
    };
    const to = realDb
      .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'")
      .get() as { current_balance: number };
    expect(from.current_balance).toBe(5000);
    expect(to.current_balance).toBe(0);
  });

  it('deleting CC payment (Case C shape: ≤ min, no revolving change) leaves revolving at 5000', async () => {
    // Payment 300 <= minimum 500 never moved revolving, so the delete has nothing to credit back.
    const tx = await repo.add({
      type: TransactionType.CCPayment,
      amount: 300,
      currency: Currency.EGP,
      egp_amount: 300,
      to_amount: 300,
      account_id: 'acc1',
      to_account_id: 'acc_cc_installment',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });
    await repo.delete(tx.id);
    const cc = realDb
      .prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc_installment'")
      .get() as { revolving_balance: number };
    expect(cc.revolving_balance).toBe(5000);
  });

  it('deleting CC payment (Case D shape: > min, partial revolving reduction) restores revolving from 4700 to 5000', async () => {
    // Payment 800 > minimum 500 reduces revolving by the 300 excess, from 5000 to 4700.
    const tx = await repo.add({
      type: TransactionType.CCPayment,
      amount: 800,
      currency: Currency.EGP,
      egp_amount: 800,
      to_amount: 800,
      account_id: 'acc1',
      to_account_id: 'acc_cc_installment',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });
    await repo.delete(tx.id);
    const cc = realDb
      .prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc_installment'")
      .get() as { revolving_balance: number };
    expect(cc.revolving_balance).toBe(5000);
  });
});

describe('credit-card ledger policy', () => {
  it('rejects deleting a card expense after a later payment consumed its liability', async () => {
    realDb.prepare("UPDATE accounts SET current_balance = 0 WHERE id = 'acc_cc'").run();
    const expense = await repo.add({
      ...baseInput,
      amount: 100,
      egp_amount: 100,
      account_id: 'acc_cc',
    });
    await repo.add({
      type: TransactionType.CCPayment,
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      to_amount: 100,
      account_id: 'acc1',
      to_account_id: 'acc_cc',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    await expect(repo.delete(expense.id)).rejects.toBeInstanceOf(TransactionBalanceError);
    expect(accountBalance('acc_cc')).toBe(0);
    expect(realDb.prepare('SELECT amount FROM transactions WHERE id = ?').get(expense.id)).toEqual({
      amount: 100,
    });
  });

  it('rejects reducing a card expense after a later payment consumed its liability', async () => {
    realDb.prepare("UPDATE accounts SET current_balance = 0 WHERE id = 'acc_cc'").run();
    const expense = await repo.add({
      ...baseInput,
      amount: 100,
      egp_amount: 100,
      account_id: 'acc_cc',
    });
    await repo.add({
      type: TransactionType.CCPayment,
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      to_amount: 100,
      account_id: 'acc1',
      to_account_id: 'acc_cc',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    await expect(
      repo.update(expense.id, {
        amount: 50,
        currency: Currency.EGP,
        egp_amount: 50,
        category_id: 'cat_food',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      }),
    ).rejects.toBeInstanceOf(TransactionBalanceError);
    expect(accountBalance('acc_cc')).toBe(0);
    expect(realDb.prepare('SELECT amount FROM transactions WHERE id = ?').get(expense.id)).toEqual({
      amount: 100,
    });
  });

  it('rejects a destination account on an ordinary transaction before any write', async () => {
    const transactionCount = transactionRowCount();
    const bankBalance = accountBalance('acc1');

    await expect(repo.add({ ...baseInput, to_account_id: 'acc2' })).rejects.toBeInstanceOf(
      TransactionValidationError,
    );

    expect(transactionRowCount()).toBe(transactionCount);
    expect(accountBalance('acc1')).toBe(bankBalance);
  });

  it('keeps expense and Card credit create/update/delete effects reversible', async () => {
    realDb.prepare("UPDATE accounts SET current_balance = 500 WHERE id = 'acc_cc'").run();

    const expense = await repo.add({
      ...baseInput,
      amount: 200,
      egp_amount: 200,
      account_id: 'acc_cc',
    });
    expect(accountBalance('acc_cc')).toBe(700);

    await repo.update(expense.id, {
      amount: 350,
      currency: Currency.EGP,
      egp_amount: 350,
      category_id: 'cat_food',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });
    expect(accountBalance('acc_cc')).toBe(850);

    const credit = await repo.add({
      ...baseInput,
      type: TransactionType.Income,
      amount: 100,
      egp_amount: 100,
      account_id: 'acc_cc',
    });
    expect(accountBalance('acc_cc')).toBe(750);

    await repo.update(credit.id, {
      amount: 125,
      currency: Currency.EGP,
      egp_amount: 125,
      category_id: 'cat_food',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });
    expect(accountBalance('acc_cc')).toBe(725);

    await repo.delete(credit.id);
    expect(accountBalance('acc_cc')).toBe(850);
    await repo.delete(expense.id);
    expect(accountBalance('acc_cc')).toBe(500);
  });

  it('rejects over-credit and overpayment before any write', async () => {
    const transactionCount = transactionRowCount();
    const bankBalance = accountBalance('acc1');
    const cardBalance = accountBalance('acc_cc');

    await expect(
      repo.add({
        ...baseInput,
        type: TransactionType.Income,
        amount: 1_001,
        egp_amount: 1_001,
        account_id: 'acc_cc',
      }),
    ).rejects.toBeInstanceOf(TransactionBalanceError);
    await expect(
      repo.add({
        type: TransactionType.CCPayment,
        amount: 1_001,
        currency: Currency.EGP,
        egp_amount: 1_001,
        to_amount: 1_001,
        account_id: 'acc1',
        to_account_id: 'acc_cc',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      }),
    ).rejects.toBeInstanceOf(TransactionBalanceError);

    expect(transactionRowCount()).toBe(transactionCount);
    expect(accountBalance('acc1')).toBe(bankBalance);
    expect(accountBalance('acc_cc')).toBe(cardBalance);
  });

  it('rejects transfers involving a credit card before any write', async () => {
    const transactionCount = transactionRowCount();
    const cardBalance = accountBalance('acc_cc');

    await expect(
      repo.add({
        type: TransactionType.Transfer,
        amount: 100,
        currency: Currency.EGP,
        egp_amount: 100,
        to_amount: 100,
        account_id: 'acc_cc',
        to_account_id: 'acc1',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      }),
    ).rejects.toBeInstanceOf(TransactionValidationError);

    expect(transactionRowCount()).toBe(transactionCount);
    expect(accountBalance('acc_cc')).toBe(cardBalance);
  });

  it('rolls back the row when an account write fails', async () => {
    const originalRunAsync = mocked.runAsync.getMockImplementation();
    if (!originalRunAsync) throw new Error('Expected the SQLite run adapter');
    mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
      if (sql.includes('UPDATE accounts')) throw new Error('Injected account write failure');
      return originalRunAsync(sql, ...rest);
    });

    try {
      await expect(repo.add(baseInput)).rejects.toThrow('Injected account write failure');
      expect(transactionRowCount()).toBe(0);
      expect(accountBalance('acc1')).toBe(5000);
    } finally {
      mocked.runAsync.mockImplementation(originalRunAsync);
    }
  });
});

describe('credit-card revolving balance reversals', () => {
  it('restores the exact revolving amount when a payment reduced it to zero', async () => {
    realDb
      .prepare(
        "UPDATE accounts SET current_balance = 1000, revolving_balance = 30, minimum_payment = 100 WHERE id = 'acc_cc'",
      )
      .run();
    const payment = await repo.add({
      type: TransactionType.CCPayment,
      amount: 150,
      currency: Currency.EGP,
      egp_amount: 150,
      to_amount: 150,
      account_id: 'acc1',
      to_account_id: 'acc_cc',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    expect(
      realDb.prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc'").get(),
    ).toEqual({ revolving_balance: 0 });

    await repo.delete(payment.id);

    expect(
      realDb.prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc'").get(),
    ).toEqual({ revolving_balance: 30 });
  });
});

describe('missing transaction mutations', () => {
  it('rejects update and delete with typed not-found errors', async () => {
    await expect(
      repo.update('missing', {
        amount: 100,
        currency: Currency.EGP,
        egp_amount: 100,
        category_id: 'cat_food',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      }),
    ).rejects.toBeInstanceOf(TransactionNotFoundError);
    await expect(repo.delete('missing')).rejects.toBeInstanceOf(TransactionNotFoundError);
  });
});

describe('commitment-owned transaction mutations', () => {
  it('rejects generic update and delete without changing the row or balance', async () => {
    const transaction = await repo.add(baseInput);
    realDb
      .prepare('UPDATE transactions SET commitment_payment_id = ? WHERE id = ?')
      .run('payment-owner', transaction.id);
    const balance = accountBalance('acc1');

    await expect(
      repo.update(transaction.id, {
        amount: 300,
        currency: Currency.EGP,
        egp_amount: 300,
        category_id: 'cat_food',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      }),
    ).rejects.toBeInstanceOf(TransactionOwnershipError);
    await expect(repo.delete(transaction.id)).rejects.toBeInstanceOf(TransactionOwnershipError);

    expect(accountBalance('acc1')).toBe(balance);
    expect(
      realDb.prepare('SELECT amount FROM transactions WHERE id = ?').get(transaction.id),
    ).toEqual({
      amount: 200,
    });
  });
});

describe('MA-018 c6 — full-cycle write path: amount, egp_amount and the balance reconcile', () => {
  it('repo.add: 10.005 USD @ rate 48 persists amount 10, egp_amount 480, and moves acc_usd by exactly 10 (row 15)', async () => {
    const amounts = resolveTransactionAmounts({
      type: TransactionType.Expense,
      amount: 10.005,
      sourceCurrency: Currency.USD,
      exchangeRate: 48,
    });
    const before = accountBalance('acc_usd');

    const tx = await repo.add({
      ...baseInput,
      account_id: 'acc_usd',
      currency: Currency.USD,
      amount: amounts.amount,
      egp_amount: amounts.egpAmount,
      exchange_rate: amounts.exchangeRate ?? undefined,
    });

    const row = realDb
      .prepare('SELECT amount, egp_amount FROM transactions WHERE id = ?')
      .get(tx.id) as { amount: number; egp_amount: number };
    expect(row.amount).toBe(10);
    expect(row.egp_amount).toBe(480);
    // Expense from a non-credit-card account subtracts in the account's own currency.
    expect(accountBalance('acc_usd') - before).toBe(-10);
  });

  it('repo.update: re-deriving 10.005 USD @ rate 48 persists amount 10, egp_amount 480, and the account ends moved by exactly 10 (row 16)', async () => {
    // Seed with a different fractional amount so the update path is not re-reading add()'s value.
    const seedAmounts = resolveTransactionAmounts({
      type: TransactionType.Expense,
      amount: 5.005,
      sourceCurrency: Currency.USD,
      exchangeRate: 48,
    });
    const tx = await repo.add({
      ...baseInput,
      account_id: 'acc_usd',
      currency: Currency.USD,
      amount: seedAmounts.amount,
      egp_amount: seedAmounts.egpAmount,
      exchange_rate: seedAmounts.exchangeRate ?? undefined,
    });
    expect(accountBalance('acc_usd')).toBe(-5);

    const amounts = resolveTransactionAmounts({
      type: TransactionType.Expense,
      amount: 10.005,
      sourceCurrency: Currency.USD,
      exchangeRate: 48,
    });
    await repo.update(tx.id, {
      amount: amounts.amount,
      currency: Currency.USD,
      egp_amount: amounts.egpAmount,
      exchange_rate: amounts.exchangeRate ?? undefined,
      category_id: 'cat_food',
      transaction_date: '2026-05-01',
      transaction_time: '10:00:00',
    });

    const row = realDb
      .prepare('SELECT amount, egp_amount FROM transactions WHERE id = ?')
      .get(tx.id) as { amount: number; egp_amount: number };
    expect(row.amount).toBe(10);
    expect(row.egp_amount).toBe(480);
    // acc_usd starts at 0, so the final balance is the final amount, not a delta from the seed.
    expect(accountBalance('acc_usd')).toBe(-10);
  });
});

function accountBalance(id: string): number {
  return (
    realDb.prepare('SELECT current_balance FROM accounts WHERE id = ?').get(id) as {
      current_balance: number;
    }
  ).current_balance;
}

function transactionRowCount(): number {
  return (realDb.prepare('SELECT COUNT(*) AS count FROM transactions').get() as { count: number })
    .count;
}
