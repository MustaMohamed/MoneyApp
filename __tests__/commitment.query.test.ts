import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import {
  AmountType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { addPayments } from '@/modules/commitments/database/commitment_payments';
import {
  addCommitment,
  deactivateCommitment,
  deactivateExpiredCommitments,
  getCommitments,
  getCommitmentById,
  updateCommitment,
} from '@/modules/commitments/database/commitments';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-08T10:00:00.000Z';

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  // Seed a category required for FK constraints
  realDb
    .prepare(
      `INSERT OR IGNORE INTO categories
       (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES ('cat1', 'Bills', 'expense', 'tag', '#C9973A', 0, 0, ?, ?)`,
    )
    .run(NOW, NOW);

  // Seed an account required for FK constraints
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id, name, type, currency, opening_balance, current_balance,
        interest_tracking, is_archived, sort_order, created_at, updated_at)
       VALUES ('acc1', 'Main EGP', 'bank', 'EGP', 5000, 5000, 0, 0, 0, ?, ?)`,
    )
    .run(NOW, NOW);

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
  realDb.exec('DELETE FROM commitments');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getCommitments
>[0];

function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: `com-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Netflix',
    amount_type: AmountType.Fixed,
    amount: 200,
    currency: Currency.EGP,
    category_id: 'cat1',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: '2026-01-01',
    account_id: 'acc1',
    notes: null,
    duration_type: DurationType.Forever,
    end_date: null,
    end_after_count: null,
    is_active: 1,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe('addCommitment', () => {
  it('inserts a commitment row into the database', async () => {
    const commitment = makeCommitment({ id: 'com-insert-1', name: 'Spotify' });
    await addCommitment(mockDb, commitment);
    const row = realDb.prepare('SELECT * FROM commitments WHERE id = ?').get('com-insert-1') as
      | Commitment
      | undefined;
    expect(row).toBeDefined();
    expect(row?.name).toBe('Spotify');
    expect(row?.currency).toBe(Currency.EGP);
  });

  it('inserts a commitment with null optional fields', async () => {
    const commitment = makeCommitment({
      id: 'com-insert-null',
      account_id: null,
      notes: null,
      end_date: null,
      end_after_count: null,
      amount: null,
      amount_type: AmountType.Variable,
    });
    await addCommitment(mockDb, commitment);
    const row = realDb.prepare('SELECT * FROM commitments WHERE id = ?').get('com-insert-null') as
      | Commitment
      | undefined;
    expect(row).toBeDefined();
    expect(row?.account_id).toBeNull();
    expect(row?.amount).toBeNull();
  });

  it('inserts a commitment with AfterCount duration type', async () => {
    const commitment = makeCommitment({
      id: 'com-after-count',
      duration_type: DurationType.AfterCount,
      end_after_count: 12,
    });
    await addCommitment(mockDb, commitment);
    const row = realDb.prepare('SELECT * FROM commitments WHERE id = ?').get('com-after-count') as
      | Commitment
      | undefined;
    expect(row?.duration_type).toBe(DurationType.AfterCount);
    expect(row?.end_after_count).toBe(12);
  });

  it('inserts a commitment with UntilDate duration type', async () => {
    const commitment = makeCommitment({
      id: 'com-until-date',
      duration_type: DurationType.UntilDate,
      end_date: '2027-12-31',
    });
    await addCommitment(mockDb, commitment);
    const row = realDb.prepare('SELECT * FROM commitments WHERE id = ?').get('com-until-date') as
      | Commitment
      | undefined;
    expect(row?.duration_type).toBe(DurationType.UntilDate);
    expect(row?.end_date).toBe('2027-12-31');
  });
});

describe('getCommitments', () => {
  it('returns only active commitments ordered by created_at DESC', async () => {
    const c1 = makeCommitment({
      id: 'com-active-1',
      name: 'Netflix',
      is_active: 1,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    const c2 = makeCommitment({
      id: 'com-active-2',
      name: 'Spotify',
      is_active: 1,
      created_at: '2026-02-01T00:00:00.000Z',
    });
    const c3 = makeCommitment({ id: 'com-inactive', name: 'Old Sub', is_active: 0 });

    await addCommitment(mockDb, c1);
    await addCommitment(mockDb, c2);
    await addCommitment(mockDb, c3);

    const results = await getCommitments(mockDb);
    const ids = results.map((r) => r.id);

    expect(ids).toContain('com-active-1');
    expect(ids).toContain('com-active-2');
    expect(ids).not.toContain('com-inactive');
    // DESC order: c2 (Feb) should be first
    expect(ids[0]).toBe('com-active-2');
  });

  it('returns an empty array when no active commitments exist', async () => {
    const results = await getCommitments(mockDb);
    expect(results).toEqual([]);
  });
});

describe('getCommitmentById', () => {
  it('returns the commitment when it exists', async () => {
    const commitment = makeCommitment({ id: 'com-find-me', name: 'Water Bill' });
    await addCommitment(mockDb, commitment);

    const found = await getCommitmentById(mockDb, 'com-find-me');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('com-find-me');
    expect(found?.name).toBe('Water Bill');
  });

  it('returns null when the commitment does not exist', async () => {
    const found = await getCommitmentById(mockDb, 'com-nonexistent');
    expect(found).toBeNull();
  });
});

describe('updateCommitment', () => {
  it('updates all editable fields for an existing commitment', async () => {
    const original = makeCommitment({ id: 'com-update-1', name: 'Old Name', amount: 100 });
    await addCommitment(mockDb, original);

    await updateCommitment(mockDb, 'com-update-1', {
      name: 'New Name',
      amount_type: AmountType.Variable,
      amount: null,
      currency: Currency.USD,
      category_id: 'cat1',
      recurrence_every: 2,
      recurrence_period: RecurrencePeriod.Weeks,
      start_date: '2026-03-01',
      account_id: null,
      notes: 'Updated notes',
      duration_type: DurationType.AfterCount,
      end_date: null,
      end_after_count: 6,
    });

    const row = realDb.prepare('SELECT * FROM commitments WHERE id = ?').get('com-update-1') as
      | Commitment
      | undefined;
    expect(row?.name).toBe('New Name');
    expect(row?.amount_type).toBe(AmountType.Variable);
    expect(row?.amount).toBeNull();
    expect(row?.currency).toBe(Currency.USD);
    expect(row?.recurrence_every).toBe(2);
    expect(row?.recurrence_period).toBe(RecurrencePeriod.Weeks);
    expect(row?.end_after_count).toBe(6);
    expect(row?.notes).toBe('Updated notes');
    expect(row?.account_id).toBeNull();
  });

  it('sets updated_at when updating', async () => {
    const before = new Date().toISOString();
    const original = makeCommitment({
      id: 'com-update-ts',
      updated_at: '2020-01-01T00:00:00.000Z',
    });
    await addCommitment(mockDb, original);

    await updateCommitment(mockDb, 'com-update-ts', {
      name: 'Same Name',
      amount_type: AmountType.Fixed,
      amount: 200,
      currency: Currency.EGP,
      category_id: 'cat1',
      recurrence_every: 1,
      recurrence_period: RecurrencePeriod.Months,
      start_date: '2026-01-01',
      account_id: 'acc1',
      notes: null,
      duration_type: DurationType.Forever,
      end_date: null,
      end_after_count: null,
    });

    const row = realDb.prepare('SELECT * FROM commitments WHERE id = ?').get('com-update-ts') as
      | Commitment
      | undefined;
    expect(row?.updated_at).not.toBe('2020-01-01T00:00:00.000Z');
    expect(row!.updated_at >= before).toBe(true);
  });
});

describe('deactivateCommitment', () => {
  it('sets is_active = 0 for the given commitment', async () => {
    const commitment = makeCommitment({ id: 'com-deactivate', is_active: 1 });
    await addCommitment(mockDb, commitment);

    await deactivateCommitment(mockDb, 'com-deactivate');

    const row = realDb.prepare('SELECT * FROM commitments WHERE id = ?').get('com-deactivate') as
      | Commitment
      | undefined;
    expect(row?.is_active).toBe(0);
  });

  it('updates updated_at when deactivating', async () => {
    const commitment = makeCommitment({
      id: 'com-deact-ts',
      updated_at: '2020-01-01T00:00:00.000Z',
    });
    await addCommitment(mockDb, commitment);
    const before = new Date().toISOString();

    await deactivateCommitment(mockDb, 'com-deact-ts');

    const row = realDb.prepare('SELECT * FROM commitments WHERE id = ?').get('com-deact-ts') as
      | Commitment
      | undefined;
    expect(row!.updated_at >= before).toBe(true);
  });

  it('does not affect other commitments', async () => {
    const c1 = makeCommitment({ id: 'com-keep-1', is_active: 1 });
    const c2 = makeCommitment({ id: 'com-deact-other', is_active: 1 });
    await addCommitment(mockDb, c1);
    await addCommitment(mockDb, c2);

    await deactivateCommitment(mockDb, 'com-deact-other');

    const kept = realDb.prepare('SELECT * FROM commitments WHERE id = ?').get('com-keep-1') as
      | Commitment
      | undefined;
    expect(kept?.is_active).toBe(1);
  });
});

describe('deactivateExpiredCommitments', () => {
  it('deactivates active finite commitments only after their strict completion boundary', async () => {
    const commitments = [
      makeCommitment({
        id: 'until-before',
        duration_type: DurationType.UntilDate,
        end_date: '2026-05-07',
      }),
      makeCommitment({
        id: 'until-today',
        duration_type: DurationType.UntilDate,
        end_date: '2026-05-08',
      }),
      makeCommitment({
        id: 'after-complete',
        duration_type: DurationType.AfterCount,
        end_after_count: 2,
      }),
      makeCommitment({
        id: 'after-incomplete',
        duration_type: DurationType.AfterCount,
        end_after_count: 2,
      }),
      makeCommitment({ id: 'forever-active' }),
      makeCommitment({
        id: 'already-inactive',
        is_active: 0,
        duration_type: DurationType.UntilDate,
        end_date: '2020-01-01',
        updated_at: '2020-01-01T00:00:00.000Z',
      }),
    ];
    for (const commitment of commitments) await addCommitment(mockDb, commitment);

    const paidRows: CommitmentPayment[] = [
      makePayment('paid-1', 'after-complete', '2026-03-01'),
      makePayment('paid-2', 'after-complete', '2026-04-01'),
      makePayment('paid-3', 'after-incomplete', '2026-04-01'),
    ];
    await addPayments(mockDb, paidRows);

    await deactivateExpiredCommitments(mockDb, '2026-05-08', NOW);

    const rows = realDb
      .prepare('SELECT id, is_active, updated_at FROM commitments ORDER BY id')
      .all() as Array<{ id: string; is_active: number; updated_at: string }>;
    const byId = new Map(rows.map((row) => [row.id, row]));

    expect(byId.get('until-before')).toMatchObject({ is_active: 0, updated_at: NOW });
    expect(byId.get('after-complete')).toMatchObject({ is_active: 0, updated_at: NOW });
    expect(byId.get('until-today')?.is_active).toBe(1);
    expect(byId.get('after-incomplete')?.is_active).toBe(1);
    expect(byId.get('forever-active')?.is_active).toBe(1);
    expect(byId.get('already-inactive')).toMatchObject({
      is_active: 0,
      updated_at: '2020-01-01T00:00:00.000Z',
    });
  });

  it('uses the existing commitment payment index for paid-count expiry', () => {
    const plan = realDb
      .prepare(
        `EXPLAIN QUERY PLAN
         UPDATE commitments
            SET is_active = 0, updated_at = ?
          WHERE is_active = 1
            AND (
              (duration_type = 'until_date' AND end_date IS NOT NULL AND end_date < ?)
              OR
              (duration_type = 'after_count' AND end_after_count IS NOT NULL
                AND (SELECT COUNT(*)
                       FROM commitment_payments INDEXED BY idx_cp_commitment_id
                      WHERE commitment_id = commitments.id
                        AND status = 'paid') >= end_after_count)
            )`,
      )
      .all(NOW, '2026-05-08') as Array<{ detail: string }>;

    expect(plan.map((row) => row.detail).join('\n')).toContain('idx_cp_commitment_id');
  });
});

function makePayment(id: string, commitmentId: string, dueDate: string): CommitmentPayment {
  return {
    id,
    commitment_id: commitmentId,
    due_date: dueDate,
    paid_date: dueDate,
    skipped_date: null,
    amount_due: 200,
    amount_paid: 200,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: 'acc1',
    transaction_id: null,
    status: CommitmentPaymentStatus.Paid,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
  };
}
