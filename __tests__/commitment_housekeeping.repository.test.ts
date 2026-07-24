import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';

import {
  AmountType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import { getDb } from '@/database/client';
import { MIGRATIONS } from '@/database/migrations';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { CommitmentRepository } from '@/modules/commitments/repositories/commitment.repository';

jest.mock('@/database/client', () => ({ getDb: jest.fn() }));
jest.mock('react-native-uuid', () => ({ v4: jest.fn() }));

const NOW = new Date('2026-05-08T10:11:12.000Z');
const NOW_ISO = NOW.toISOString();
let realDb: ReturnType<typeof Database>;
let fakeDb: SQLiteDatabase;
let sqlCalls: Array<{ kind: 'read' | 'write' | 'exclusive'; sql: string }>;
let generatedId = 0;
let injectedInsertFailure: number | undefined;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
  realDb
    .prepare(
      `INSERT INTO categories
        (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES ('cat', 'Bills', 'expense', 'tag', '#C9973A', 0, 0, ?, ?)`,
    )
    .run(NOW_ISO, NOW_ISO);
  realDb
    .prepare(
      `INSERT INTO accounts
        (id, name, type, currency, opening_balance, current_balance,
         interest_tracking, is_archived, sort_order, created_at, updated_at)
       VALUES ('account', 'Main', 'bank', 'EGP', 1000, 1000, 0, 0, 0, ?, ?)`,
    )
    .run(NOW_ISO, NOW_ISO);

  fakeDb = {
    getAllAsync: jest.fn(async (sql: string, ...rest: unknown[]) => {
      sqlCalls.push({ kind: 'read', sql });
      const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
      return realDb.prepare(sql).all(...(params as never[]));
    }),
    runAsync: jest.fn(async (sql: string, ...rest: unknown[]) => {
      sqlCalls.push({ kind: 'write', sql });
      if (sql.includes('INSERT OR IGNORE INTO commitment_payments')) {
        if (injectedInsertFailure === 0) throw new Error('injected insert failure');
        if (injectedInsertFailure !== undefined) injectedInsertFailure -= 1;
      }
      const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
      const result = realDb.prepare(sql).run(...(params as never[]));
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
    }),
    withExclusiveTransactionAsync: jest.fn(async (work: (db: SQLiteDatabase) => Promise<void>) => {
      sqlCalls.push({ kind: 'exclusive', sql: 'BEGIN EXCLUSIVE' });
      realDb.exec('BEGIN IMMEDIATE');
      try {
        await work(fakeDb);
        realDb.exec('COMMIT');
      } catch (error) {
        realDb.exec('ROLLBACK');
        throw error;
      }
    }),
  } as unknown as SQLiteDatabase;
});

beforeEach(() => {
  realDb.exec('DELETE FROM commitment_payments; DELETE FROM commitments;');
  sqlCalls = [];
  generatedId = 0;
  injectedInsertFailure = undefined;
  (uuid.v4 as jest.Mock).mockImplementation(() => `generated-${++generatedId}`);
  (getDb as jest.Mock).mockResolvedValue(fakeDb);
  jest.clearAllMocks();
});

afterAll(() => {
  realDb.close();
});

function commitment(id: string, overrides: Partial<Commitment> = {}): Commitment {
  return {
    id,
    name: id,
    amount_type: AmountType.Fixed,
    amount: 200,
    currency: Currency.EGP,
    category_id: 'cat',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: '2026-05-08',
    account_id: 'account',
    notes: null,
    duration_type: DurationType.AfterCount,
    end_date: null,
    end_after_count: 1,
    is_active: 1,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...overrides,
  };
}

function insertCommitments(rows: Commitment[]) {
  const insert = realDb.prepare(
    `INSERT INTO commitments
      (id, name, amount_type, amount, currency, category_id, recurrence_every,
       recurrence_period, start_date, account_id, notes, duration_type, end_date,
       end_after_count, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const row of rows) {
    insert.run(
      row.id,
      row.name,
      row.amount_type,
      row.amount,
      row.currency,
      row.category_id,
      row.recurrence_every,
      row.recurrence_period,
      row.start_date,
      row.account_id,
      row.notes,
      row.duration_type,
      row.end_date,
      row.end_after_count,
      row.is_active,
      row.created_at,
      row.updated_at,
    );
  }
}

function insertPayment(row: CommitmentPayment) {
  realDb
    .prepare(
      `INSERT INTO commitment_payments
        (id, commitment_id, due_date, paid_date, skipped_date, amount_due, amount_paid,
         currency, exchange_rate_snapshot, account_id, transaction_id, status, notes,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.commitment_id,
      row.due_date,
      row.paid_date,
      row.skipped_date,
      row.amount_due,
      row.amount_paid,
      row.currency,
      row.exchange_rate_snapshot,
      row.account_id,
      row.transaction_id,
      row.status,
      row.notes,
      row.created_at,
      row.updated_at,
    );
}

function payment(
  id: string,
  commitmentId: string,
  dueDate: string,
  status = CommitmentPaymentStatus.Upcoming,
): CommitmentPayment {
  return {
    id,
    commitment_id: commitmentId,
    due_date: dueDate,
    paid_date: status === CommitmentPaymentStatus.Paid ? dueDate : null,
    skipped_date: null,
    amount_due: 200,
    amount_paid: status === CommitmentPaymentStatus.Paid ? 200 : null,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: 'account',
    transaction_id: null,
    status,
    notes: null,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  };
}

function workloadCounts() {
  return {
    activeReads: sqlCalls.filter(
      (call) => call.kind === 'read' && call.sql.includes('SELECT * FROM commitments'),
    ).length,
    dueDateReads: sqlCalls.filter(
      (call) => call.kind === 'read' && call.sql.includes('payment.commitment_id'),
    ).length,
    inserts: sqlCalls.filter(
      (call) => call.kind === 'write' && call.sql.includes('INSERT OR IGNORE'),
    ).length,
    expiryUpdates: sqlCalls.filter(
      (call) => call.kind === 'write' && call.sql.includes('duration_type ='),
    ).length,
    exclusiveTransactions: sqlCalls.filter((call) => call.kind === 'exclusive').length,
  };
}

describe('CommitmentRepository.runHousekeeping', () => {
  it.each([1, 100])(
    'keeps batched read/query counts fixed for %i active commitments',
    async (count) => {
      insertCommitments(
        Array.from({ length: count }, (_, index) => commitment(`commitment-${index}`)),
      );
      const repository = new CommitmentRepository();

      await repository.runHousekeeping(NOW);

      expect(workloadCounts()).toEqual({
        activeReads: 1,
        dueDateReads: 1,
        inserts: Math.ceil(count / 60),
        expiryUpdates: 1,
        exclusiveTransactions: 1,
      });
      expect(getDb).toHaveBeenCalledTimes(1);
    },
  );

  it('chunks the maximum 100-by-64 generation workload into bounded writes', async () => {
    const commitmentCount = 100;
    const occurrencesPerCommitment = 64;
    insertCommitments(
      Array.from({ length: commitmentCount }, (_, index) =>
        commitment(`maximum-${index}`, {
          recurrence_period: RecurrencePeriod.Days,
          duration_type: DurationType.Forever,
          end_after_count: null,
        }),
      ),
    );

    await new CommitmentRepository().runHousekeeping(NOW);

    expect(realDb.prepare('SELECT COUNT(*) AS count FROM commitment_payments').get()).toEqual({
      count: commitmentCount * occurrencesPerCommitment,
    });
    expect(workloadCounts().inserts).toBeLessThanOrEqual(108);
  });

  it('writes exact fixed and variable rows and inserts no duplicates on a second pass', async () => {
    insertCommitments([
      commitment('overdue', { start_date: '2026-05-07' }),
      commitment('due', { start_date: '2026-05-08' }),
      commitment('variable', {
        amount_type: AmountType.Variable,
        amount: null,
        account_id: null,
        start_date: '2026-05-09',
      }),
    ]);
    const repository = new CommitmentRepository();

    await repository.runHousekeeping(NOW);
    const firstPass = realDb
      .prepare(
        `SELECT commitment_id, due_date, amount_due, account_id, status, created_at, updated_at
           FROM commitment_payments
          ORDER BY commitment_id`,
      )
      .all();
    sqlCalls = [];
    await repository.runHousekeeping(NOW);

    expect(firstPass).toEqual([
      {
        commitment_id: 'due',
        due_date: '2026-05-08',
        amount_due: 200,
        account_id: 'account',
        status: CommitmentPaymentStatus.Due,
        created_at: NOW_ISO,
        updated_at: NOW_ISO,
      },
      {
        commitment_id: 'overdue',
        due_date: '2026-05-07',
        amount_due: 200,
        account_id: 'account',
        status: CommitmentPaymentStatus.Overdue,
        created_at: NOW_ISO,
        updated_at: NOW_ISO,
      },
      {
        commitment_id: 'variable',
        due_date: '2026-05-09',
        amount_due: null,
        account_id: null,
        status: CommitmentPaymentStatus.Upcoming,
        created_at: NOW_ISO,
        updated_at: NOW_ISO,
      },
    ]);
    expect(workloadCounts().inserts).toBe(0);
    expect(realDb.prepare('SELECT COUNT(*) AS count FROM commitment_payments').get()).toEqual({
      count: 3,
    });
  });

  it('generates before applying strict UntilDate and AfterCount expiry', async () => {
    insertCommitments([
      commitment('until-before', {
        duration_type: DurationType.UntilDate,
        end_date: '2026-05-07',
        end_after_count: null,
      }),
      commitment('until-today', {
        duration_type: DurationType.UntilDate,
        end_date: '2026-05-08',
        end_after_count: null,
      }),
      commitment('after-paid', { end_after_count: 1 }),
    ]);
    insertPayment(payment('paid', 'after-paid', '2026-05-08', CommitmentPaymentStatus.Paid));

    await new CommitmentRepository().runHousekeeping(NOW);

    const active = realDb
      .prepare('SELECT id, is_active FROM commitments ORDER BY id')
      .all() as Array<{ id: string; is_active: number }>;
    expect(active).toEqual([
      { id: 'after-paid', is_active: 0 },
      { id: 'until-before', is_active: 0 },
      { id: 'until-today', is_active: 1 },
    ]);
    expect(sqlCalls.findIndex((call) => call.sql.includes('INSERT OR IGNORE'))).toBeLessThan(
      sqlCalls.findIndex((call) => call.sql.includes('duration_type =')),
    );
  });

  it('rolls back earlier chunks when a later insert chunk fails', async () => {
    insertCommitments(Array.from({ length: 61 }, (_, index) => commitment(`rollback-${index}`)));
    injectedInsertFailure = 1;

    await expect(new CommitmentRepository().runHousekeeping(NOW)).rejects.toThrow(
      'injected insert failure',
    );

    expect(realDb.prepare('SELECT COUNT(*) AS count FROM commitment_payments').get()).toEqual({
      count: 0,
    });
  });
});

describe('CommitmentRepository.getMonthSnapshot', () => {
  it('returns one exact-month coherent snapshot from one DB handle', async () => {
    insertCommitments([commitment('monthly', { duration_type: DurationType.Forever })]);
    insertPayment(payment('april', 'monthly', '2026-04-30'));
    insertPayment(payment('may-paid', 'monthly', '2026-05-02', CommitmentPaymentStatus.Paid));
    insertPayment(payment('may-upcoming', 'monthly', '2026-05-20'));
    insertPayment(payment('june', 'monthly', '2026-06-01'));
    const repository = new CommitmentRepository();

    const snapshot = await repository.getMonthSnapshot('2026-05');

    expect(snapshot.loadedMonth).toBe('2026-05');
    expect(snapshot.commitments.map((row) => row.id)).toEqual(['monthly']);
    expect(snapshot.payments.map((row) => row.id)).toEqual(['may-paid', 'may-upcoming']);
    expect(
      snapshot.payments.filter((row) => row.status === CommitmentPaymentStatus.Paid),
    ).toHaveLength(1);
    expect(snapshot.commitments.reduce((total, row) => total + (row.amount ?? 0), 0)).toBe(200);
    expect(getDb).toHaveBeenCalledTimes(1);
  });
});
