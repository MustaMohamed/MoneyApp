import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { CommitmentPaymentStatus, Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import { MIGRATIONS } from '@/database/migrations';
import {
  addPayments,
  deleteUnpaidPaymentsByCommitment,
  getExistingDueDates,
  getLastPaidPayment,
  getPaymentById,
  getPaymentsByCommitment,
  getPaymentsByMonth,
  getActiveCommitmentDueDates,
  getPaidCountByCommitment,
  insertPaymentRows,
  markCommitmentAsPaid,
  updatePaymentStatus,
} from '@/modules/commitments/database/commitment_payments';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-08T10:00:00.000Z';

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  // Seed accounts
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

  // Seed categories
  realDb
    .prepare(
      `INSERT OR IGNORE INTO categories
       (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES ('cat1', 'Subscriptions', 'expense', 'tag', '#C9973A', 0, 0, ?, ?)`,
    )
    .run(NOW, NOW);

  // Seed commitments
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
        withTransactionAsync: jest.Mock;
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

  mocked.withTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => {
    await fn();
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

function makePayment(overrides: Partial<CommitmentPayment> = {}): CommitmentPayment {
  return {
    id: `pay-${Math.random().toString(36).slice(2, 9)}`,
    commitment_id: 'commitment1',
    due_date: '2026-05-01',
    paid_date: null,
    skipped_date: null,
    amount_due: 200,
    amount_paid: null,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: null,
    transaction_id: null,
    status: CommitmentPaymentStatus.Upcoming,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
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
    // December 2025 payment — should be returned for '2025-12'
    const decPayment = makePayment({
      id: 'pay-dec-1',
      due_date: '2025-12-15',
      status: CommitmentPaymentStatus.Upcoming,
    });
    // January 2026 payment — should NOT be returned for '2025-12'
    const janPayment = makePayment({
      id: 'pay-jan-1',
      due_date: '2026-01-01',
      status: CommitmentPaymentStatus.Upcoming,
    });
    await addPayments(mockDb, [decPayment, janPayment]);

    const results = await getPaymentsByMonth(mockDb, '2025-12');
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
      status: CommitmentPaymentStatus.Upcoming,
    });
    const p2 = makePayment({
      id: 'pay-may-15',
      due_date: '2026-05-15',
      status: CommitmentPaymentStatus.Due,
    });
    const p3 = makePayment({
      id: 'pay-jun-1',
      due_date: '2026-06-01',
      status: CommitmentPaymentStatus.Upcoming,
    });
    await addPayments(mockDb, [p1, p2, p3]);

    const results = await getPaymentsByMonth(mockDb, '2026-05');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('pay-may-1');
    expect(ids).toContain('pay-may-15');
    expect(ids).not.toContain('pay-jun-1');
  });

  it('does not include overdue/upcoming payments from previous months', async () => {
    const overdue = makePayment({
      id: 'pay-apr-overdue',
      due_date: '2026-04-01',
      status: CommitmentPaymentStatus.Overdue,
    });
    const upcoming_old = makePayment({
      id: 'pay-mar-upcoming',
      due_date: '2026-03-01',
      status: CommitmentPaymentStatus.Upcoming,
    });
    const current = makePayment({
      id: 'pay-may-1',
      due_date: '2026-05-01',
      status: CommitmentPaymentStatus.Upcoming,
    });
    await addPayments(mockDb, [overdue, upcoming_old, current]);

    const results = await getPaymentsByMonth(mockDb, '2026-05');
    const ids = results.map((r) => r.id);
    expect(ids).not.toContain('pay-apr-overdue');
    expect(ids).not.toContain('pay-mar-upcoming');
    expect(ids).toContain('pay-may-1');
  });

  it('excludes paid and skipped payments from previous months', async () => {
    const paid_old = makePayment({
      id: 'pay-apr-paid',
      due_date: '2026-04-01',
      status: CommitmentPaymentStatus.Paid,
      paid_date: '2026-04-01',
      amount_paid: 200,
    });
    const skipped_old = makePayment({
      id: 'pay-mar-skipped',
      due_date: '2026-03-01',
      status: CommitmentPaymentStatus.Skipped,
      skipped_date: '2026-03-01',
    });
    const current = makePayment({
      id: 'pay-may-1',
      due_date: '2026-05-01',
      status: CommitmentPaymentStatus.Upcoming,
    });
    await addPayments(mockDb, [paid_old, skipped_old, current]);

    const results = await getPaymentsByMonth(mockDb, '2026-05');
    const ids = results.map((r) => r.id);
    expect(ids).not.toContain('pay-apr-paid');
    expect(ids).not.toContain('pay-mar-skipped');
    expect(ids).toContain('pay-may-1');
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
      withTransactionAsync: jest.fn(async (work: () => Promise<void>) => {
        calls.push('transaction:start');
        await work();
        calls.push('transaction:end');
      }),
    } as unknown as Parameters<typeof addPayments>[0];
    const payments = [
      makePayment({ id: 'serial-1' }),
      makePayment({ id: 'serial-2' }),
      makePayment({ id: 'serial-3' }),
    ];

    await addPayments(db, payments);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['transaction:start', 'serial-1', 'transaction:end']);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect((db.runAsync as jest.Mock).mock.calls[0][1]).toEqual(
      expect.arrayContaining(['serial-1', 'serial-2', 'serial-3']),
    );
  });
});

describe('insertPaymentRows', () => {
  it('serializes bounded INSERT OR IGNORE chunks without opening a transaction', async () => {
    const first = deferredRun();
    const second = deferredRun();
    const runAsync = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const withTransactionAsync = jest.fn();
    const db = { runAsync, withTransactionAsync } as unknown as Parameters<
      typeof insertPaymentRows
    >[0];
    const payments = Array.from({ length: 61 }, (_, index) =>
      makePayment({ id: `chunked-${index}` }),
    );
    const promise = insertPaymentRows(db, payments);

    expect(runAsync).toHaveBeenCalledTimes(1);
    expect(String(runAsync.mock.calls[0][0])).toContain('INSERT OR IGNORE');
    expect(runAsync.mock.calls[0][1]).toHaveLength(60 * 15);
    first.resolve({ changes: 1, lastInsertRowId: 1 });
    await Promise.resolve();
    expect(runAsync).toHaveBeenCalledTimes(2);
    expect(runAsync.mock.calls[1][1]).toHaveLength(15);
    second.resolve({ changes: 1, lastInsertRowId: 2 });
    await promise;

    expect(runAsync.mock.calls.map((call) => call[1][0])).toEqual(['chunked-0', 'chunked-60']);
    expect(withTransactionAsync).not.toHaveBeenCalled();
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

    expect(plan.map((row) => row.detail).join('\n')).toContain('idx_cp_commitment_id');
    expect(indexNames.map((row) => row.name)).toEqual(
      expect.arrayContaining(['idx_cp_commitment_id', 'idx_cp_due_date', 'idx_cp_status']),
    );
  });
});

function deferredRun() {
  let resolve!: (value: { changes: number; lastInsertRowId: number }) => void;
  const promise = new Promise<{ changes: number; lastInsertRowId: number }>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

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
  it('removes upcoming and due payments but preserves paid and skipped', async () => {
    const payments = [
      makePayment({
        id: 'pay-del-upcoming',
        due_date: '2026-06-01',
        status: CommitmentPaymentStatus.Upcoming,
      }),
      makePayment({
        id: 'pay-del-due',
        due_date: '2026-05-01',
        status: CommitmentPaymentStatus.Due,
      }),
      makePayment({
        id: 'pay-del-paid',
        due_date: '2026-04-01',
        status: CommitmentPaymentStatus.Paid,
        paid_date: '2026-04-01',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-del-skipped',
        due_date: '2026-03-01',
        status: CommitmentPaymentStatus.Skipped,
        skipped_date: '2026-03-01',
      }),
    ];
    await addPayments(mockDb, payments);

    await deleteUnpaidPaymentsByCommitment(mockDb, 'commitment1');

    const remaining = realDb.prepare('SELECT id FROM commitment_payments ORDER BY id').all() as {
      id: string;
    }[];
    const remainingIds = remaining.map((r) => r.id);

    expect(remainingIds).not.toContain('pay-del-upcoming');
    expect(remainingIds).not.toContain('pay-del-due');
    expect(remainingIds).toContain('pay-del-paid');
    expect(remainingIds).toContain('pay-del-skipped');
  });
});

describe('getPaidCountByCommitment', () => {
  it('counts paid payments correctly', async () => {
    const payments = [
      makePayment({
        id: 'pay-count-1',
        due_date: '2026-03-01',
        status: CommitmentPaymentStatus.Paid,
        paid_date: '2026-03-01',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-count-2',
        due_date: '2026-04-01',
        status: CommitmentPaymentStatus.Paid,
        paid_date: '2026-04-01',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-count-3',
        due_date: '2026-05-01',
        status: CommitmentPaymentStatus.Upcoming,
      }),
      makePayment({
        id: 'pay-count-4',
        commitment_id: 'commitment2',
        due_date: '2026-03-01',
        status: CommitmentPaymentStatus.Paid,
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
    // When there are no payments at all for this commitmentId, the COUNT query
    // still returns a row with count=0, so the ?? path gives 0 as well.
    const count = await getPaidCountByCommitment(mockDb, 'commitment-no-payments');
    expect(count).toBe(0);
  });

  it('returns 0 when getAllAsync returns an empty array (rows[0] is undefined → ??0)', async () => {
    // Override getAllAsync temporarily to return [] to hit the undefined path
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
        status: CommitmentPaymentStatus.Paid,
        paid_date: '2026-03-02',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-last-2',
        due_date: '2026-04-01',
        status: CommitmentPaymentStatus.Paid,
        paid_date: '2026-04-03',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-last-3',
        due_date: '2026-05-01',
        status: CommitmentPaymentStatus.Upcoming,
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
    expect(results[0].id).toBe('pay-all-1'); // ASC order — soonest first
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

describe('updatePaymentStatus', () => {
  it('updates status and optional fields when fields are provided', async () => {
    const payment = makePayment({
      id: 'pay-upd-1',
      due_date: '2026-05-01',
      status: CommitmentPaymentStatus.Upcoming,
    });
    await addPayments(mockDb, [payment]);

    await updatePaymentStatus(mockDb, 'pay-upd-1', CommitmentPaymentStatus.Paid, {
      paid_date: '2026-05-02',
      amount_paid: 200,
      account_id: 'acc1',
      exchange_rate_snapshot: 50,
    });

    const row = realDb
      .prepare('SELECT * FROM commitment_payments WHERE id = ?')
      .get('pay-upd-1') as Record<string, unknown>;
    expect(row.status).toBe('paid');
    expect(row.paid_date).toBe('2026-05-02');
    expect(row.amount_paid).toBe(200);
    expect(row.account_id).toBe('acc1');
    expect(row.exchange_rate_snapshot).toBe(50);
  });

  it('updates status without optional fields (fields omitted)', async () => {
    const payment = makePayment({
      id: 'pay-upd-2',
      due_date: '2026-05-01',
      status: CommitmentPaymentStatus.Upcoming,
    });
    await addPayments(mockDb, [payment]);

    await updatePaymentStatus(mockDb, 'pay-upd-2', CommitmentPaymentStatus.Skipped);

    const row = realDb
      .prepare('SELECT * FROM commitment_payments WHERE id = ?')
      .get('pay-upd-2') as Record<string, unknown>;
    expect(row.status).toBe('skipped');
    // optional fields should remain null (COALESCE with null keeps existing)
    expect(row.paid_date).toBeNull();
    expect(row.amount_paid).toBeNull();
  });

  it('updates skipped_date when provided', async () => {
    const payment = makePayment({
      id: 'pay-upd-3',
      due_date: '2026-05-01',
      status: CommitmentPaymentStatus.Upcoming,
    });
    await addPayments(mockDb, [payment]);

    await updatePaymentStatus(mockDb, 'pay-upd-3', CommitmentPaymentStatus.Skipped, {
      skipped_date: '2026-05-03',
    });

    const row = realDb
      .prepare('SELECT * FROM commitment_payments WHERE id = ?')
      .get('pay-upd-3') as Record<string, unknown>;
    expect(row.status).toBe('skipped');
    expect(row.skipped_date).toBe('2026-05-03');
  });

  it('rejects skipping a paid payment without overwriting paid metadata', async () => {
    const payment = makePayment({
      id: 'pay-paid-cannot-skip',
      status: CommitmentPaymentStatus.Paid,
      paid_date: '2026-05-02',
      amount_paid: 200,
      account_id: 'acc1',
    });
    await addPayments(mockDb, [payment]);

    await expect(
      updatePaymentStatus(mockDb, payment.id, CommitmentPaymentStatus.Skipped, {
        skipped_date: '2026-05-03',
      }),
    ).rejects.toThrow(`Commitment payment cannot be marked as skipped: ${payment.id}`);

    expect(
      realDb
        .prepare(
          `SELECT status, paid_date, skipped_date, amount_paid, account_id, transaction_id
             FROM commitment_payments
            WHERE id = ?`,
        )
        .get(payment.id),
    ).toEqual({
      status: CommitmentPaymentStatus.Paid,
      paid_date: '2026-05-02',
      skipped_date: null,
      amount_paid: 200,
      account_id: 'acc1',
      transaction_id: null,
    });
  });
});

describe('markCommitmentAsPaid', () => {
  it('rejects paying a skipped payment without creating paid metadata or side effects', async () => {
    const payment = makePayment({
      id: 'pay-skipped-cannot-pay',
      status: CommitmentPaymentStatus.Skipped,
      skipped_date: '2026-05-02T09:00:00.000Z',
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
          `SELECT status, paid_date, skipped_date, amount_paid, transaction_id
             FROM commitment_payments
            WHERE id = ?`,
        )
        .get(payment.id),
    ).toEqual({
      status: CommitmentPaymentStatus.Skipped,
      paid_date: null,
      skipped_date: '2026-05-02T09:00:00.000Z',
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
      status: CommitmentPaymentStatus.Upcoming,
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

    // Payment should be marked paid
    const payRow = realDb
      .prepare('SELECT * FROM commitment_payments WHERE id = ?')
      .get('pay-paid-egp') as Record<string, unknown>;
    expect(payRow.status).toBe('paid');
    expect(payRow.paid_date).toBe('2026-05-02');
    expect(payRow.amount_paid).toBe(200);
    expect(payRow.transaction_id).toBe('tx-paid-egp');

    // Transaction should be inserted
    const txRow = realDb
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get('tx-paid-egp') as Record<string, unknown>;
    expect(txRow).toBeDefined();
    expect(txRow.amount).toBe(200);

    // Account balance should be deducted by egp_amount (200)
    const accRow = realDb
      .prepare('SELECT current_balance FROM accounts WHERE id = ?')
      .get('acc1') as Record<string, unknown>;
    expect(accRow.current_balance).toBe(4800); // 5000 - 200
  });

  it('works when tx.commitment_payment_id is null (inserts null into transaction)', async () => {
    const payment = makePayment({
      id: 'pay-paid-no-link',
      due_date: '2026-05-01',
      status: CommitmentPaymentStatus.Upcoming,
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
      commitment_payment_id: null, // explicitly null — tests the ?? null branch
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
      status: CommitmentPaymentStatus.Upcoming,
      amount_due: 10,
      currency: Currency.USD,
    });
    await addPayments(mockDb, [payment]);

    // USD 10 at rate 50 = EGP 500
    const tx = makeTx({
      id: 'tx-paid-usd',
      amount: 500, // native value in the selected EGP account
      currency: Currency.EGP,
      egp_amount: 500, // EGP equivalent deducted from EGP account
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

    // Payment marked paid
    const payRow = realDb
      .prepare('SELECT * FROM commitment_payments WHERE id = ?')
      .get('pay-paid-usd') as Record<string, unknown>;
    expect(payRow.status).toBe('paid');
    expect(payRow.exchange_rate_snapshot).toBe(50);
    expect(payRow.notes).toBe('USD payment');
    expect(payRow.transaction_id).toBe('tx-paid-usd');

    // Account balance deducted by egp_amount (500), NOT by face value (10)
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
