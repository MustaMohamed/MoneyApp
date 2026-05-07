import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { Currency, TransactionType } from '@/constants/enums';
import {
  addPayments,
  deleteUnpaidPaymentsByCommitment,
  getExistingDueDates,
  getLastPaidPayment,
  getPaymentsByCommitment,
  getPaymentsByMonth,
  getPaidCountByCommitment,
} from '@/database/commitment_payments';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import type { Transaction } from '@/database/entities/transaction.entity';

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
         ('acc2', 'USD Savings', 'bank', 'USD', 1000, 1000, 0, 0, 1, ?, ?)`,
    )
    .run(NOW, NOW, NOW, NOW);

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
  realDb.exec('DELETE FROM commitment_payments');
  realDb.exec('DELETE FROM transactions');
  realDb.prepare("UPDATE accounts SET current_balance = 5000 WHERE id = 'acc1'").run();
  realDb.prepare("UPDATE accounts SET current_balance = 1000 WHERE id = 'acc2'").run();
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
    status: 'upcoming' as CommitmentPayment['status'],
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
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    commitment_payment_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe('getPaymentsByMonth', () => {
  it('returns payments with due_date in the given month', async () => {
    const p1 = makePayment({ id: 'pay-may-1', due_date: '2026-05-01', status: 'upcoming' });
    const p2 = makePayment({ id: 'pay-may-15', due_date: '2026-05-15', status: 'due' });
    const p3 = makePayment({ id: 'pay-jun-1', due_date: '2026-06-01', status: 'upcoming' });
    await addPayments(mockDb, [p1, p2, p3]);

    const results = await getPaymentsByMonth(mockDb, '2026-05');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('pay-may-1');
    expect(ids).toContain('pay-may-15');
    expect(ids).not.toContain('pay-jun-1');
  });

  it('includes overdue/upcoming payments from previous months', async () => {
    const overdue = makePayment({
      id: 'pay-apr-overdue',
      due_date: '2026-04-01',
      status: 'overdue',
    });
    const upcoming_old = makePayment({
      id: 'pay-mar-upcoming',
      due_date: '2026-03-01',
      status: 'upcoming',
    });
    const current = makePayment({ id: 'pay-may-1', due_date: '2026-05-01', status: 'upcoming' });
    await addPayments(mockDb, [overdue, upcoming_old, current]);

    const results = await getPaymentsByMonth(mockDb, '2026-05');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('pay-apr-overdue');
    expect(ids).toContain('pay-mar-upcoming');
    expect(ids).toContain('pay-may-1');
  });

  it('excludes paid and skipped payments from previous months', async () => {
    const paid_old = makePayment({
      id: 'pay-apr-paid',
      due_date: '2026-04-01',
      status: 'paid',
      paid_date: '2026-04-01',
      amount_paid: 200,
    });
    const skipped_old = makePayment({
      id: 'pay-mar-skipped',
      due_date: '2026-03-01',
      status: 'skipped',
      skipped_date: '2026-03-01',
    });
    const current = makePayment({ id: 'pay-may-1', due_date: '2026-05-01', status: 'upcoming' });
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
  it('removes upcoming and due payments but preserves paid and skipped', async () => {
    const payments = [
      makePayment({ id: 'pay-del-upcoming', due_date: '2026-06-01', status: 'upcoming' }),
      makePayment({ id: 'pay-del-due', due_date: '2026-05-01', status: 'due' }),
      makePayment({
        id: 'pay-del-paid',
        due_date: '2026-04-01',
        status: 'paid',
        paid_date: '2026-04-01',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-del-skipped',
        due_date: '2026-03-01',
        status: 'skipped',
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
        status: 'paid',
        paid_date: '2026-03-01',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-count-2',
        due_date: '2026-04-01',
        status: 'paid',
        paid_date: '2026-04-01',
        amount_paid: 200,
      }),
      makePayment({ id: 'pay-count-3', due_date: '2026-05-01', status: 'upcoming' }),
      makePayment({
        id: 'pay-count-4',
        commitment_id: 'commitment2',
        due_date: '2026-03-01',
        status: 'paid',
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

describe('getLastPaidPayment', () => {
  it('returns the most recent paid payment', async () => {
    const payments = [
      makePayment({
        id: 'pay-last-1',
        due_date: '2026-03-01',
        status: 'paid',
        paid_date: '2026-03-02',
        amount_paid: 200,
      }),
      makePayment({
        id: 'pay-last-2',
        due_date: '2026-04-01',
        status: 'paid',
        paid_date: '2026-04-03',
        amount_paid: 200,
      }),
      makePayment({ id: 'pay-last-3', due_date: '2026-05-01', status: 'upcoming' }),
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
  it('returns all payments for a commitment ordered by due_date DESC', async () => {
    const payments = [
      makePayment({ id: 'pay-all-1', commitment_id: 'commitment1', due_date: '2026-05-01' }),
      makePayment({ id: 'pay-all-2', commitment_id: 'commitment1', due_date: '2026-06-01' }),
      makePayment({ id: 'pay-all-other', commitment_id: 'commitment2', due_date: '2026-05-01' }),
    ];
    await addPayments(mockDb, payments);

    const results = await getPaymentsByCommitment(mockDb, 'commitment1');
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('pay-all-2'); // DESC order
    expect(results[1].id).toBe('pay-all-1');
  });
});
