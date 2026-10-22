import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import { MIGRATIONS } from '@/database/migrations';
import {
  addPayments,
  clearPaymentSkipped,
  deleteUnpaidPaymentsByCommitment,
  getExistingDueDates,
  getLastPaidPayment,
  getPaymentById,
  getPaymentsByCommitment,
  getPaymentsByMonth,
  getActiveCommitmentDueDates,
  getPaidCountByCommitment,
  getSettledCountByCommitment,
  insertPaymentRows,
  markCommitmentAsPaid,
  updatePaymentSkipped,
} from '@/modules/commitments/database/commitment_payments';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { makeTestPayment } from '@/test_helpers/commitment';
import { deferred } from '@/test_helpers/deferred';
import { bridgeBetterSQLite, getExpoSQLiteTestDatabase } from '@/test_helpers/sqlite';
import { explainQueryPlan } from '@/test_helpers/sqlite_fixtures';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-08T10:00:00.000Z';

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id, name, type, currency, opening_balance, current_balance,
        interest_tracking, is_archived, sort_order, created_at, updated_at)
       VALUES
         ('acc1', 'Main EGP', 'bank', 'EGP', 5000, 5000, 0, 0, 0, ?, ?),
         ('acc2', 'USD Savings', 'bank', 'USD', 1000, 1000, 0, 0, 1, ?, ?),
         ('acc_card', 'Credit Card', 'credit_card', 'EGP', 0, 1000, 0, 0, 2, ?, ?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW);

  realDb
    .prepare(
      `INSERT OR IGNORE INTO categories
       (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES ('cat1', 'Subscriptions', 'expense', 'tag', '#C9973A', 0, 0, ?, ?)`,
    )
    .run(NOW, NOW);

  realDb
    .prepare(
      `INSERT OR IGNORE INTO commitments
       (id, name, amount_type, amount, currency, category_id,
        recurrence_every, recurrence_period, start_date, account_id, notes,
        duration_type, end_date, end_after_count, is_active, created_at, updated_at)
       VALUES
         ('commitment1', 'Netflix', 'fixed', 200, 'EGP', 'cat1',
          1, 'months', '2026-01-01', 'acc1', NULL,
          'forever', NULL, NULL, 1, ?, ?),
         ('commitment2', 'Variable Bill', 'variable', NULL, 'EGP', 'cat1',
          1, 'months', '2026-01-01', NULL, NULL,
          'forever', NULL, NULL, 1, ?, ?)`,
    )
    .run(NOW, NOW, NOW, NOW);

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getAllAsync: jest.Mock;
        execAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  bridgeBetterSQLite(getExpoSQLiteTestDatabase(), realDb);
  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    const result = realDb.prepare(sql).run(...(params as never[]));
    return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
  });

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM commitment_payments');
  realDb.exec('DELETE FROM transactions');
  realDb.exec('UPDATE commitments SET is_active = 1');
  realDb.prepare("UPDATE accounts SET current_balance = 5000 WHERE id = 'acc1'").run();
  realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc2'").run();
  realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc_card'").run();
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getPaymentsByMonth
>[0];

function makePayment(
  overrides: Partial<CommitmentPayment> & Pick<CommitmentPayment, 'id'>,
): CommitmentPayment {
  return makeTestPayment({
    commitment_id: 'commitment1',
    due_date: '2026-05-01',
    amount_due: 200,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  });
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 9)}`,
    type: TransactionType.Expense,
    amount: 200,
    currency: Currency.EGP,
    egp_amount: 200,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc1',
    to_account_id: null,
    category_id: 'cat1',
    budget_id: null,
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
    revolving_balance_delta: overrides.revolving_balance_delta ?? null,
  };
}

describe('getPaymentsByMonth — December year-wrap', () => {
  it('correctly wraps from December to January of next year', async () => {
    const decPayment = makePayment({
      id: 'pay-dec-1',
      due_date: '2025-12-15',
    });
    const janPayment = makePayment({
      id: 'pay-jan-1',
      due_date: '2026-01-01',
    });
    await addPayments(mockDb, [decPayment, janPayment]);

    const results = await getPaymentsByMonth(mockDb, '2025-12', '2025-12-01');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('pay-dec-1');
    expect(ids).not.toContain('pay-jan-1');
  });
});

describe('getPaymentsByMonth', () => {
  it('returns payments with due_date in the given month', async () => {
    const p1 = makePayment({
      id: 'pay-may-1',
      due_date: '2026-05-01',
    });
    const p2 = makePayment({
      id: 'pay-may-15',
      due_date: '2026-05-15',
    });
    const p3 = makePayment({
      id: 'pay-jun-1',
      due_date: '2026-06-01',
    });
    await addPayments(mockDb, [p1, p2, p3]);

    const results = await getPaymentsByMonth(mockDb, '2026-05', '2026-05-01');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('pay-may-1');
    expect(ids).toContain('pay-may-15');
    expect(ids).not.toContain('pay-jun-1');
  });

  it('carries the unpaid rows due before the month in first and leaves settled rows out', async () => {
    await addPayments(mockDb, [
      makePayment({ id: 'pay-may-15', due_date: '2026-05-15' }),
      makePayment({ id: 'pay-may-1', due_date: '2026-05-01' }),
      makePayment({ id: 'pay-apr-unpaid', due_date: '2026-04-01' }),
      makePayment({
        id: 'pay-apr-paid',
        due_date: '2026-04-28',
        paid_date: '2026-05-03',
        amount_paid: 200,
      }),
      makePayment({ id: 'pay-mar-skipped', due_date: '2026-03-01', skipped_date: '2026-03-02' }),
    ]);

    const may = await getPaymentsByMonth(mockDb, '2026-05', '2026-05-01');
    const april = await getPaymentsByMonth(mockDb, '2026-04', '2026-04-01');

    expect(may.map((row) => row.id)).toEqual(['pay-apr-unpaid', 'pay-may-1', 'pay-may-15']);
    expect(april.map((row) => row.id)).toEqual(['pay-apr-unpaid', 'pay-apr-paid']);
  });

  it('carries into a past month only the unpaid rows due before its first day', async () => {
    await addPayments(mockDb, [
      makePayment({ id: 'pay-feb-unpaid', due_date: '2026-02-10' }),
      makePayment({
        id: 'pay-feb-paid',
        due_date: '2026-02-01',
        paid_date: '2026-02-01',
        amount_paid: 200,
      }),
      makePayment({ id: 'pay-mar-15', due_date: '2026-03-15' }),
      makePayment({ id: 'pay-apr-unpaid', due_date: '2026-04-01' }),
    ]);

    const march = await getPaymentsByMonth(mockDb, '2026-03', '2026-03-01');

    expect(march.map((row) => row.id)).toEqual(['pay-feb-unpaid', 'pay-mar-15']);
  });

  it('carries into a future month the unpaid rows due before today, never one due today or later', async () => {
    await addPayments(mockDb, [
      makePayment({ id: 'pay-may-7', due_date: '2026-05-07' }),
      makePayment({ id: 'pay-may-8', due_date: '2026-05-08' }),
      makePayment({ id: 'pay-jun-1', due_date: '2026-06-01' }),
      makePayment({ id: 'pay-jul-5', due_date: '2026-07-05' }),
      makePayment({ id: 'pay-apr-skipped', due_date: '2026-04-01', skipped_date: '2026-04-01' }),
    ]);

    const july = await getPaymentsByMonth(mockDb, '2026-07', '2026-05-08');

    expect(july.map((row) => row.id)).toEqual(['pay-may-7', 'pay-jul-5']);
  });

  it('reads the carried rows through due-date index searches, never a table scan', async () => {
    await addPayments(mockDb, [
      makePayment({ id: 'pay-apr-unpaid', due_date: '2026-04-01' }),
      makePayment({ id: 'pay-may-1', due_date: '2026-05-01' }),
    ]);
    const mocked = (SQLite as unknown as { __fakeDb: { getAllAsync: jest.Mock } }).__fakeDb;

    const rows = await getPaymentsByMonth(mockDb, '2026-05', '2026-05-01');
    const [sql, ...rest] = mocked.getAllAsync.mock.calls.at(-1) as [string, ...unknown[]];
    const plan = explainQueryPlan(realDb, sql, rest).join('\n');

    expect(plan).not.toMatch(/SCAN (commitment_payments|payment)\b(?! USING)/);
    expect(plan.split('\n').filter((detail) => detail.includes('idx_cp_due_date'))).toHaveLength(2);
    expect(rows.map((row) => [row.id, row.paid_egp_amount])).toEqual([
      ['pay-apr-unpaid', null],
      ['pay-may-1', null],
    ]);
  });
});

describe('getPaymentsByMonth — the paid row’s transaction EGP amount', () => {
  interface PaidPair {
    pair: string;
    id: string;
    commitmentId: string;
    currency: Currency;
    amountDue: number;
    accountId: string;
    accountCurrency: Currency;
    txAmount: number;
    egpAmount: number;
    exchangeRate: number | null;
  }

  const PAIRS: PaidPair[] = [
    {
      pair: 'EGP commitment on an EGP account',
      id: 'pay-egp-egp',
      commitmentId: 'commitment1',
      currency: Currency.EGP,
      amountDue: 200,
      accountId: 'acc1',
      accountCurrency: Currency.EGP,
      txAmount: 210,
      egpAmount: 210,
      exchangeRate: null,
    },
    {
      pair: 'EGP commitment on a USD account',
      id: 'pay-egp-usd',
      commitmentId: 'commitment1',
      currency: Currency.EGP,
      amountDue: 505,
      accountId: 'acc2',
      accountCurrency: Currency.USD,
      txAmount: 10,
      egpAmount: 505,
      exchangeRate: 50.5,
    },
    {
      pair: 'USD commitment on an EGP account',
      id: 'pay-usd-egp',
      commitmentId: 'commitment_usd',
      currency: Currency.USD,
      amountDue: 10,
      accountId: 'acc1',
      accountCurrency: Currency.EGP,
      txAmount: 505,
      egpAmount: 505,
      exchangeRate: 50.5,
    },
    {
      pair: 'USD commitment on a USD account',
      id: 'pay-usd-usd',
      commitmentId: 'commitment_usd',
      currency: Currency.USD,
      amountDue: 15,
      accountId: 'acc2',
      accountCurrency: Currency.USD,
      txAmount: 15.5,
      egpAmount: 782.75,
      exchangeRate: 50.5,
    },
  ];

  beforeAll(() => {
    realDb
      .prepare(
        `INSERT OR IGNORE INTO commitments
         (id, name, amount_type, amount, currency, category_id,
          recurrence_every, recurrence_period, start_date, account_id, notes,
          duration_type, end_date, end_after_count, is_active, created_at, updated_at)
         VALUES ('commitment_usd', 'Hosting', 'fixed', 10, 'USD', 'cat1',
          1, 'months', '2026-01-01', 'acc1', NULL, 'forever', NULL, NULL, 1, ?, ?)`,
      )
      .run(NOW, NOW);
  });

  async function payPair(spec: PaidPair): Promise<void> {
    await addPayments(mockDb, [
      makePayment({
        id: spec.id,
        commitment_id: spec.commitmentId,
        due_date: '2026-05-01',
        amount_due: spec.amountDue,
        currency: spec.currency,
      }),
    ]);
    await markCommitmentAsPaid(
      mockDb,
      spec.id,
      {
        amount_paid: spec.amountDue,
        account_id: spec.accountId,
        paid_date: '2026-05-02',
        exchange_rate_snapshot: spec.exchangeRate ?? undefined,
      },
      makeTx({
        id: `tx-${spec.id}`,
        amount: spec.txAmount,
        currency: spec.accountCurrency,
        egp_amount: spec.egpAmount,
        exchange_rate: spec.exchangeRate,
        account_id: spec.accountId,
        commitment_payment_id: spec.id,
      }),
      { accountId: spec.accountId, currentBalance: -spec.txAmount, revolvingBalance: 0 },
    );
  }

  it.each(PAIRS)('$pair: a paid row reads its transaction’s egp_amount', async (spec) => {
    await payPair(spec);

    const rows = await getPaymentsByMonth(mockDb, '2026-05', '2026-05-01');

    expect(rows.map((row) => [row.id, row.paid_egp_amount])).toEqual([[spec.id, spec.egpAmount]]);
  });

  it('an unpaid, a skipped and a carried row read null', async () => {
    await addPayments(mockDb, [
      makePayment({ id: 'pay-apr-carried', due_date: '2026-04-20' }),
      makePayment({ id: 'pay-may-unpaid', due_date: '2026-05-10' }),
      makePayment({ id: 'pay-may-skipped', due_date: '2026-05-05', skipped_date: '2026-05-05' }),
    ]);

    const rows = await getPaymentsByMonth(mockDb, '2026-05', '2026-05-01');

    expect(rows.map((row) => [row.id, row.paid_egp_amount])).toEqual([
      ['pay-apr-carried', null],
      ['pay-may-skipped', null],
      ['pay-may-unpaid', null],
    ]);
  });

  it('a paid row whose transaction id matches no transaction reads null', async () => {
    const foreignKeys = realDb.pragma('foreign_keys', { simple: true });
    realDb.pragma('foreign_keys = OFF');
    try {
      await addPayments(mockDb, [
        makePayment({
          id: 'pay-may-orphan',
          due_date: '2026-05-03',
          paid_date: '2026-05-03',
          amount_paid: 200,
          account_id: 'acc1',
          transaction_id: 'tx-missing',
        }),
      ]);
    } finally {
      realDb.pragma(`foreign_keys = ${foreignKeys}`);
    }

    const rows = await getPaymentsByMonth(mockDb, '2026-05', '2026-05-01');

    expect(rows.map((row) => [row.id, row.paid_egp_amount])).toEqual([['pay-may-orphan', null]]);
  });
});

describe('addPayments', () => {
  it('inserts a batch of payments', async () => {
    const payments = [
      makePayment({ id: 'pay-batch-1', due_date: '2026-05-01' }),
      makePayment({ id: 'pay-batch-2', due_date: '2026-06-01' }),
      makePayment({ id: 'pay-batch-3', due_date: '2026-07-01' }),
    ];
    await addPayments(mockDb, payments);

    const rows = realDb.prepare('SELECT * FROM commitment_payments').all();
    expect(rows).toHaveLength(3);
  });

  it('is idempotent — running twice does not create duplicates', async () => {
    const payments = [
      makePayment({ id: 'pay-idem-1', due_date: '2026-05-01' }),
      makePayment({ id: 'pay-idem-2', due_date: '2026-06-01' }),
    ];
    await addPayments(mockDb, payments);
    await addPayments(mockDb, payments);

    const rows = realDb.prepare('SELECT * FROM commitment_payments').all();
    expect(rows).toHaveLength(2);
  });

  it('keeps the standalone transaction and delegates one bounded insert chunk', async () => {
    const calls: string[] = [];
    const db = {
      runAsync: jest.fn(async (_sql: string, params: unknown[]) => {
        calls.push(String(params[0]));
        return { changes: 1, lastInsertRowId: 1 };
      }),
      execAsync: jest.fn(async (sql: string) => {
        calls.push(sql);
      }),
    } as unknown as Parameters<typeof addPayments>[0];
    const payments = [
      makePayment({ id: 'serial-1' }),
      makePayment({ id: 'serial-2' }),
      makePayment({ id: 'serial-3' }),
    ];

    await addPayments(db, payments);

    expect(calls).toEqual(['BEGIN IMMEDIATE', 'serial-1', 'COMMIT']);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect((db.runAsync as jest.Mock).mock.calls[0][1]).toEqual(
      expect.arrayContaining(['serial-1', 'serial-2', 'serial-3']),
    );
  });
});

describe('insertPaymentRows', () => {
  it('serializes bounded INSERT OR IGNORE chunks without opening a transaction', async () => {
    const first = deferred<SQLite.SQLiteRunResult>();
    const second = deferred<SQLite.SQLiteRunResult>();
    const runAsync = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const withTransactionAsync = jest.fn();
    const execAsync = jest.fn();
    const db = { runAsync, withTransactionAsync, execAsync } as unknown as Parameters<
      typeof insertPaymentRows
    >[0];
    const payments = Array.from({ length: 61 }, (_, index) =>
      makePayment({ id: `chunked-${index}` }),
    );
    const promise = insertPaymentRows(db, payments);

    expect(runAsync).toHaveBeenCalledTimes(1);
    expect(String(runAsync.mock.calls[0][0])).toContain('INSERT OR IGNORE');
    expect(runAsync.mock.calls[0][1]).toHaveLength(60 * 14);
    first.resolve({ changes: 1, lastInsertRowId: 1 });
    await Promise.resolve();
    expect(runAsync).toHaveBeenCalledTimes(2);
    expect(runAsync.mock.calls[1][1]).toHaveLength(14);
    second.resolve({ changes: 1, lastInsertRowId: 2 });
    await promise;

    expect(runAsync.mock.calls.map((call) => call[1][0])).toEqual(['chunked-0', 'chunked-60']);
    expect(withTransactionAsync).not.toHaveBeenCalled();
    expect(execAsync).not.toHaveBeenCalled();
  });
});

describe('getActiveCommitmentDueDates', () => {
  it('returns ordered due-date facts only for active commitments', async () => {
    realDb.prepare("UPDATE commitments SET is_active = 0 WHERE id = 'commitment2'").run();
    await addPayments(mockDb, [
      makePayment({ id: 'active-late', commitment_id: 'commitment1', due_date: '2026-06-01' }),
      makePayment({ id: 'active-early', commitment_id: 'commitment1', due_date: '2026-05-01' }),
      makePayment({ id: 'inactive', commitment_id: 'commitment2', due_date: '2026-04-01' }),
    ]);

    await expect(getActiveCommitmentDueDates(mockDb)).resolves.toEqual([
      { commitment_id: 'commitment1', due_date: '2026-05-01' },
      { commitment_id: 'commitment1', due_date: '2026-06-01' },
    ]);
  });

  it('uses existing indexes and does not require a new index', () => {
    const plan = realDb
      .prepare(
        `EXPLAIN QUERY PLAN
         SELECT payment.commitment_id, payment.due_date
           FROM commitment_payments payment
           JOIN commitments commitment ON commitment.id = payment.commitment_id
             AND commitment.is_active = 1
          ORDER BY payment.commitment_id, payment.due_date`,
      )
      .all() as Array<{ detail: string }>;
    const indexNames = realDb
      .prepare(
        `SELECT name
           FROM sqlite_master
          WHERE type = 'index'
            AND tbl_name IN ('commitments', 'commitment_payments')`,
      )
      .all() as Array<{ name: string }>;

    const details = plan.map((row) => row.detail).join('\n');
    expect(details).not.toMatch(/SCAN payment(?! USING)/);
    expect(details).not.toContain('USE TEMP B-TREE FOR ORDER BY');
    expect(indexNames.map((row) => row.name)).toEqual(
      expect.arrayContaining(['idx_cp_commitment_id', 'idx_cp_due_date']),
    );
  });
});

describe('getExistingDueDates', () => {
  it('returns due_date strings for the given commitment', async () => {
    const payments = [
      makePayment({ id: 'pay-dd-1', commitment_id: 'commitment1', due_date: '2026-05-01' }),
      makePayment({ id: 'pay-dd-2', commitment_id: 'commitment1', due_date: '2026-06-01' }),
      makePayment({ id: 'pay-dd-3', commitment_id: 'commitment2', due_date: '2026-05-01' }),
    ];
    await addPayments(mockDb, payments);

    const dates = await getExistingDueDates(mockDb, 'commitment1');
    expect(dates).toContain('2026-05-01');
    expect(dates).toContain('2026-06-01');
    expect(dates).toHaveLength(2);
  });
});

describe('deleteUnpaidPaymentsByCommitment', () => {
  it('removes every unpaid row, one due in the past included, and keeps paid and skipped rows', async () => {
    const payments = [
      makePayment({
        id: 'pay-del-upcoming',
        due_date: '2026-06-01',
      }),
      makePayment({
        id: 'pay-del-due',
        due_date: '2026-05-08',
      }),
      makePayment({
        id: 'pay-del-overdue',
        due_date: '2026-04-15',
      }),
      makePayment({
        id: 'pay-del-paid',
        due_date: '2026-04-01',
        paid_date: '2026-04-01',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-del-skipped',
        due_date: '2026-03-01',
        skipped_date: '2026-03-01',
      }),
    ];
    await addPayments(mockDb, payments);

    await deleteUnpaidPaymentsByCommitment(mockDb, 'commitment1');

    const remaining = realDb.prepare('SELECT id FROM commitment_payments ORDER BY id').all() as {
      id: string;
    }[];

    expect(remaining.map((r) => r.id)).toEqual(['pay-del-paid', 'pay-del-skipped']);
  });
});

describe('getPaidCountByCommitment', () => {
  it('counts paid payments correctly', async () => {
    const payments = [
      makePayment({
        id: 'pay-count-1',
        due_date: '2026-03-01',
        paid_date: '2026-03-01',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-count-2',
        due_date: '2026-04-01',
        paid_date: '2026-04-01',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-count-3',
        due_date: '2026-05-01',
      }),
      makePayment({
        id: 'pay-count-4',
        commitment_id: 'commitment2',
        due_date: '2026-03-01',
        paid_date: '2026-03-01',
        amount_paid: 150,
      }),
    ];
    await addPayments(mockDb, payments);

    const count = await getPaidCountByCommitment(mockDb, 'commitment1');
    expect(count).toBe(2);
  });

  it('returns 0 when there are no paid payments', async () => {
    const count = await getPaidCountByCommitment(mockDb, 'commitment1');
    expect(count).toBe(0);
  });
});

describe('getPaidCountByCommitment — null row fallback', () => {
  it('returns 0 when the result rows have no count (handles ??0 path)', async () => {
    // With no payments the COUNT query still returns a row with count 0, so `??` also yields 0.
    const count = await getPaidCountByCommitment(mockDb, 'commitment-no-payments');
    expect(count).toBe(0);
  });

  it('returns 0 when getAllAsync returns an empty array (rows[0] is undefined → ??0)', async () => {
    const mocked = (SQLite as unknown as { __fakeDb: { getAllAsync: jest.Mock } }).__fakeDb;

    const original = mocked.getAllAsync.getMockImplementation();
    mocked.getAllAsync.mockResolvedValueOnce([]);

    const count = await getPaidCountByCommitment(mockDb, 'any-id');
    expect(count).toBe(0);

    if (original) mocked.getAllAsync.mockImplementation(original);
  });
});

describe('getLastPaidPayment', () => {
  it('returns the most recent paid payment', async () => {
    const payments = [
      makePayment({
        id: 'pay-last-1',
        due_date: '2026-03-01',
        paid_date: '2026-03-02',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-last-2',
        due_date: '2026-04-01',
        paid_date: '2026-04-03',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-last-3',
        due_date: '2026-05-01',
      }),
    ];
    await addPayments(mockDb, payments);

    const last = await getLastPaidPayment(mockDb, 'commitment1');
    expect(last).not.toBeNull();
    expect(last?.id).toBe('pay-last-2');
  });

  it('returns null when there are no paid payments', async () => {
    const last = await getLastPaidPayment(mockDb, 'commitment1');
    expect(last).toBeNull();
  });
});

describe('getPaymentsByCommitment', () => {
  it('returns all payments for a commitment ordered by due_date ASC', async () => {
    const payments = [
      makePayment({ id: 'pay-all-1', commitment_id: 'commitment1', due_date: '2026-05-01' }),
      makePayment({ id: 'pay-all-2', commitment_id: 'commitment1', due_date: '2026-06-01' }),
      makePayment({ id: 'pay-all-other', commitment_id: 'commitment2', due_date: '2026-05-01' }),
    ];
    await addPayments(mockDb, payments);

    const results = await getPaymentsByCommitment(mockDb, 'commitment1');
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('pay-all-1');
    expect(results[1].id).toBe('pay-all-2');
  });
});

describe('getPaymentById', () => {
  it('returns the payment when it exists', async () => {
    const payment = makePayment({ id: 'pay-by-id-1', due_date: '2026-05-01' });
    await addPayments(mockDb, [payment]);

    const found = await getPaymentById(mockDb, 'pay-by-id-1');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('pay-by-id-1');
  });

  it('returns null when the payment does not exist', async () => {
    const found = await getPaymentById(mockDb, 'pay-nonexistent');
    expect(found).toBeNull();
  });
});

describe('updatePaymentSkipped', () => {
  it('writes the given skipped date on an unpaid row', async () => {
    await addPayments(mockDb, [makePayment({ id: 'pay-skip-1', due_date: '2026-05-01' })]);

    await updatePaymentSkipped(mockDb, 'pay-skip-1', '2026-05-08', '2026-05-08T09:15:00.000Z');

    expect(
      realDb
        .prepare('SELECT paid_date, skipped_date, updated_at FROM commitment_payments WHERE id = ?')
        .get('pay-skip-1'),
    ).toEqual({
      paid_date: null,
      skipped_date: '2026-05-08',
      updated_at: '2026-05-08T09:15:00.000Z',
    });
  });

  it('refuses a paid row without overwriting its paid metadata', async () => {
    const payment = makePayment({
      id: 'pay-paid-cannot-skip',
      paid_date: '2026-05-02',
      amount_paid: 200,
      account_id: 'acc1',
    });
    await addPayments(mockDb, [payment]);

    await expect(updatePaymentSkipped(mockDb, payment.id, '2026-05-03', NOW)).rejects.toThrow(
      `Commitment payment cannot be marked as skipped: ${payment.id}`,
    );

    expect(
      realDb
        .prepare(
          `SELECT paid_date, skipped_date, amount_paid, account_id, transaction_id
             FROM commitment_payments
            WHERE id = ?`,
        )
        .get(payment.id),
    ).toEqual({
      paid_date: '2026-05-02',
      skipped_date: null,
      amount_paid: 200,
      account_id: 'acc1',
      transaction_id: null,
    });
  });

  it('returns on a row already skipped and keeps its first skipped date', async () => {
    await addPayments(mockDb, [
      makePayment({ id: 'pay-already-skipped', skipped_date: '2026-05-01' }),
    ]);

    await expect(
      updatePaymentSkipped(mockDb, 'pay-already-skipped', '2026-05-08', NOW),
    ).resolves.toBeUndefined();

    expect(
      realDb
        .prepare('SELECT skipped_date FROM commitment_payments WHERE id = ?')
        .get('pay-already-skipped'),
    ).toEqual({ skipped_date: '2026-05-01' });
  });

  it('throws not found for a row that does not exist', async () => {
    await expect(updatePaymentSkipped(mockDb, 'pay-missing', '2026-05-08', NOW)).rejects.toThrow(
      'Commitment payment not found: pay-missing',
    );
  });
});

describe('markCommitmentAsPaid', () => {
  it('rejects paying a row whose skipped date is set, without paid metadata or side effects', async () => {
    const payment = makePayment({
      id: 'pay-skipped-cannot-pay',
      skipped_date: '2026-05-02',
    });
    await addPayments(mockDb, [payment]);

    await expect(
      markCommitmentAsPaid(
        mockDb,
        payment.id,
        {
          amount_paid: 200,
          account_id: 'acc1',
          paid_date: '2026-05-03',
        },
        makeTx({ id: 'tx-for-skipped', commitment_payment_id: payment.id }),
        { accountId: 'acc1', currentBalance: -200, revolvingBalance: 0 },
      ),
    ).rejects.toThrow(`Commitment payment cannot be marked as paid: ${payment.id}`);

    expect(
      realDb
        .prepare(
          `SELECT paid_date, skipped_date, amount_paid, transaction_id
             FROM commitment_payments
            WHERE id = ?`,
        )
        .get(payment.id),
    ).toEqual({
      paid_date: null,
      skipped_date: '2026-05-02',
      amount_paid: null,
      transaction_id: null,
    });
    expect(realDb.prepare('SELECT COUNT(*) AS count FROM transactions').get()).toEqual({
      count: 0,
    });
    expect(realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'").get()).toEqual({
      current_balance: 5000,
    });
  });

  it('does not post the same payment twice when a completed save is retried', async () => {
    const payment = makePayment({ id: 'pay-idempotent', amount_due: 200 });
    await addPayments(mockDb, [payment]);
    const details = {
      amount_paid: 200,
      account_id: 'acc1',
      paid_date: '2026-05-02',
    };

    await markCommitmentAsPaid(
      mockDb,
      payment.id,
      details,
      makeTx({ id: 'tx-first', commitment_payment_id: payment.id }),
      { accountId: 'acc1', currentBalance: -200, revolvingBalance: 0 },
    );
    await markCommitmentAsPaid(
      mockDb,
      payment.id,
      details,
      makeTx({ id: 'tx-retry', commitment_payment_id: payment.id }),
      { accountId: 'acc1', currentBalance: -200, revolvingBalance: 0 },
    );

    expect(realDb.prepare('SELECT COUNT(*) AS count FROM transactions').get()).toEqual({
      count: 1,
    });
    expect(realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'").get()).toEqual({
      current_balance: 4800,
    });
    expect(
      realDb.prepare('SELECT transaction_id FROM commitment_payments WHERE id = ?').get(payment.id),
    ).toEqual({ transaction_id: 'tx-first' });
  });

  it('marks payment as paid, inserts transaction, and deducts balance (same currency EGP)', async () => {
    const payment = makePayment({
      id: 'pay-paid-egp',
      due_date: '2026-05-01',
      amount_due: 200,
      currency: Currency.EGP,
    });
    await addPayments(mockDb, [payment]);

    const tx = makeTx({
      id: 'tx-paid-egp',
      amount: 200,
      currency: Currency.EGP,
      egp_amount: 200,
      exchange_rate: null,
      account_id: 'acc1',
      commitment_payment_id: 'pay-paid-egp',
    });

    await markCommitmentAsPaid(
      mockDb,
      'pay-paid-egp',
      {
        amount_paid: 200,
        account_id: 'acc1',
        paid_date: '2026-05-02',
      },
      tx,
      { accountId: 'acc1', currentBalance: -200, revolvingBalance: 0 },
    );

    const payRow = realDb
      .prepare('SELECT * FROM commitment_payments WHERE id = ?')
      .get('pay-paid-egp') as Record<string, unknown>;
    expect(payRow.paid_date).toBe('2026-05-02');
    expect(payRow.amount_paid).toBe(200);
    expect(payRow.transaction_id).toBe('tx-paid-egp');

    const txRow = realDb
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get('tx-paid-egp') as Record<string, unknown>;
    expect(txRow).toBeDefined();
    expect(txRow.amount).toBe(200);

    const accRow = realDb
      .prepare('SELECT current_balance FROM accounts WHERE id = ?')
      .get('acc1') as Record<string, unknown>;
    expect(accRow.current_balance).toBe(4800); // 5000 - 200
  });

  it('works when tx.commitment_payment_id is null (inserts null into transaction)', async () => {
    const payment = makePayment({
      id: 'pay-paid-no-link',
      due_date: '2026-05-01',
      amount_due: 100,
      currency: Currency.EGP,
    });
    await addPayments(mockDb, [payment]);

    const tx = makeTx({
      id: 'tx-no-link',
      amount: 100,
      currency: Currency.EGP,
      egp_amount: 100,
      exchange_rate: null,
      account_id: 'acc1',
      commitment_payment_id: null,
    });

    await markCommitmentAsPaid(
      mockDb,
      'pay-paid-no-link',
      {
        amount_paid: 100,
        account_id: 'acc1',
        paid_date: '2026-05-02',
      },
      tx,
      { accountId: 'acc1', currentBalance: -100, revolvingBalance: 0 },
    );

    const txRow = realDb
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get('tx-no-link') as Record<string, unknown>;
    expect(txRow).toBeDefined();
    expect(txRow.commitment_payment_id).toBeNull();
  });

  it('marks payment as paid and deducts egp_amount for cross-currency (USD commitment on EGP account)', async () => {
    const payment = makePayment({
      id: 'pay-paid-usd',
      due_date: '2026-05-01',
      amount_due: 10,
      currency: Currency.USD,
    });
    await addPayments(mockDb, [payment]);

    // USD 10 at rate 50 = EGP 500
    const tx = makeTx({
      id: 'tx-paid-usd',
      amount: 500, // native value in the selected EGP account
      currency: Currency.EGP,
      egp_amount: 500,
      exchange_rate: 50,
      account_id: 'acc1',
      commitment_payment_id: 'pay-paid-usd',
    });

    await markCommitmentAsPaid(
      mockDb,
      'pay-paid-usd',
      {
        amount_paid: 10,
        account_id: 'acc1',
        paid_date: '2026-05-02',
        exchange_rate_snapshot: 50,
        notes: 'USD payment',
      },
      tx,
      { accountId: 'acc1', currentBalance: -500, revolvingBalance: 0 },
    );

    const payRow = realDb
      .prepare('SELECT * FROM commitment_payments WHERE id = ?')
      .get('pay-paid-usd') as Record<string, unknown>;
    expect(payRow.paid_date).toBe('2026-05-02');
    expect(payRow.exchange_rate_snapshot).toBe(50);
    expect(payRow.notes).toBe('USD payment');
    expect(payRow.transaction_id).toBe('tx-paid-usd');

    const accRow = realDb
      .prepare('SELECT current_balance FROM accounts WHERE id = ?')
      .get('acc1') as Record<string, unknown>;
    expect(accRow.current_balance).toBe(4500); // 5000 - 500
  });

  it('increases liability when the selected payment account is a credit card', async () => {
    const payment = makePayment({ id: 'pay-card', amount_due: 200 });
    await addPayments(mockDb, [payment]);
    const tx = makeTx({
      id: 'tx-card',
      account_id: 'acc_card',
      commitment_payment_id: 'pay-card',
    });

    await markCommitmentAsPaid(
      mockDb,
      'pay-card',
      {
        amount_paid: 200,
        account_id: 'acc_card',
        paid_date: '2026-05-02',
      },
      tx,
      { accountId: 'acc_card', currentBalance: 200, revolvingBalance: 0 },
    );

    expect(
      (
        realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'acc_card'").get() as {
          current_balance: number;
        }
      ).current_balance,
    ).toBe(1_200);
    expect(realDb.prepare("SELECT budget_id FROM transactions WHERE id = 'tx-card'").get()).toEqual(
      {
        budget_id: null,
      },
    );
  });
});

describe('getSettledCountByCommitment', () => {
  it('counts the paid and the skipped rows and leaves the unpaid one out', async () => {
    await addPayments(mockDb, [
      makePayment({
        id: 'settled-paid',
        due_date: '2026-03-01',
        paid_date: '2026-03-02',
        amount_paid: 200,
      }),
      makePayment({ id: 'settled-skipped', due_date: '2026-04-01', skipped_date: '2026-04-02' }),
      makePayment({ id: 'settled-unpaid', due_date: '2026-05-01' }),
    ]);

    await expect(getSettledCountByCommitment(mockDb, 'commitment1')).resolves.toBe(2);
  });

  it('reads 0 for an unknown commitment id', async () => {
    await expect(getSettledCountByCommitment(mockDb, 'no-such-commitment')).resolves.toBe(0);
  });
});

describe('clearPaymentSkipped', () => {
  const UPDATED_AT = '2026-05-09T10:00:00.000Z';

  function readRow(id: string) {
    return realDb
      .prepare('SELECT paid_date, skipped_date, updated_at FROM commitment_payments WHERE id = ?')
      .get(id);
  }

  it('clears the skipped date on a skipped unpaid row and reports one change', async () => {
    await addPayments(mockDb, [makePayment({ id: 'clear-skipped', skipped_date: '2026-05-02' })]);

    await expect(clearPaymentSkipped(mockDb, 'clear-skipped', UPDATED_AT)).resolves.toBe(1);

    expect(readRow('clear-skipped')).toEqual({
      paid_date: null,
      skipped_date: null,
      updated_at: UPDATED_AT,
    });
  });

  it.each([
    ['a paid row', { paid_date: '2026-05-02', amount_paid: 200 }],
    [
      'a paid row that also holds a skipped date',
      { paid_date: '2026-05-02', amount_paid: 200, skipped_date: '2026-05-03' },
    ],
    ['an unpaid row', {}],
  ] as [string, Partial<CommitmentPayment>][])(
    'reports no change on %s and leaves it as it was',
    async (_name, overrides) => {
      await addPayments(mockDb, [makePayment({ id: 'clear-untouched', ...overrides })]);
      const before = readRow('clear-untouched');

      await expect(clearPaymentSkipped(mockDb, 'clear-untouched', UPDATED_AT)).resolves.toBe(0);

      expect(readRow('clear-untouched')).toEqual(before);
    },
  );

  it('reports no change for a missing row', async () => {
    await expect(clearPaymentSkipped(mockDb, 'no-such-payment', UPDATED_AT)).resolves.toBe(0);
  });
});
