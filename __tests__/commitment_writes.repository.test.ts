import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import uuid from 'react-native-uuid';

import { CommitmentPaymentStatus, DurationType } from '@/constants/enums';
import { getDb, withExclusiveWriteTransactionAsync } from '@/database/client';
import { MIGRATIONS } from '@/database/migrations';
import { deactivateExpiredCommitments } from '@/modules/commitments/database/commitments';
import { resolvePaymentState, resolveUndoSkip } from '@/modules/commitments/domain/payment_state';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  CommitmentPaymentNotFoundError,
  CommitmentPaymentNotSkippedError,
  CommitmentUndoRefusedError,
} from '@/modules/commitments/repositories/commitment.errors';
import {
  CommitmentRepository,
  type UpdateCommitmentInput,
} from '@/modules/commitments/repositories/commitment.repository';
import { createCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';
import {
  bridgeBetterSQLite,
  createMockSQLiteDatabase,
  exclusiveWriteOnRealDb,
  getSQLiteParams,
} from '@/test_helpers/sqlite';

jest.mock('@/database/client', () => ({
  getDb: jest.fn(),
  withWriteTransactionAsync:
    jest.requireActual<typeof import('@/database/client')>('@/database/client')
      .withWriteTransactionAsync,
  withExclusiveWriteTransactionAsync: jest.fn(),
}));
jest.mock('react-native-uuid', () => ({ v4: jest.fn() }));

const NOW = new Date('2026-05-08T10:11:12.000Z');
const NOW_ISO = NOW.toISOString();
const TODAY = '2026-05-08';
const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const OPENING_BALANCE = 1000;

type InjectedFailure = 'payment insert' | 'unpaid delete' | 'reactivation';

let realDb: ReturnType<typeof Database>;
let fakeDb: SQLiteDatabase;
let generatedId = 0;
let injectedFailure: InjectedFailure | undefined;

function failsOn(sql: string): InjectedFailure | undefined {
  if (sql.includes('INSERT OR IGNORE INTO commitment_payments')) return 'payment insert';
  if (sql.includes('DELETE FROM commitment_payments')) return 'unpaid delete';
  if (/UPDATE commitments\s+SET is_active = 1/.test(sql)) return 'reactivation';
  return undefined;
}

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
       VALUES ('account', 'Main', 'bank', 'EGP', ?, ?, 0, 0, 0, ?, ?)`,
    )
    .run(OPENING_BALANCE, OPENING_BALANCE, NOW_ISO, NOW_ISO);

  const sqlite = createMockSQLiteDatabase();
  bridgeBetterSQLite(sqlite, realDb);
  sqlite.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    if (injectedFailure !== undefined && failsOn(sql) === injectedFailure) {
      throw new Error(`injected ${injectedFailure} failure`);
    }
    const result = realDb.prepare(sql).run(...getSQLiteParams(rest));
    return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
  });
  fakeDb = sqlite.database;
  jest
    .mocked(withExclusiveWriteTransactionAsync)
    .mockImplementation(exclusiveWriteOnRealDb(realDb, fakeDb));
});

beforeEach(() => {
  realDb.exec(
    'DELETE FROM commitment_payments; DELETE FROM transactions; DELETE FROM commitments;',
  );
  realDb
    .prepare("UPDATE accounts SET current_balance = ? WHERE id = 'account'")
    .run(OPENING_BALANCE);
  generatedId = 0;
  injectedFailure = undefined;
  (uuid.v4 as jest.Mock).mockImplementation(() => `generated-${++generatedId}`);
  (getDb as jest.Mock).mockResolvedValue(fakeDb);
});

afterAll(() => {
  realDb.close();
});

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return makeTestCommitment({
    id: 'commitment',
    amount: 100,
    category_id: 'cat',
    start_date: '2026-03-01',
    account_id: 'account',
    created_at: SEEDED_AT,
    updated_at: SEEDED_AT,
    ...overrides,
  });
}

function payment(
  id: string,
  dueDate: string,
  overrides: Partial<CommitmentPayment> = {},
): CommitmentPayment {
  return makeTestPayment({
    id,
    commitment_id: 'commitment',
    due_date: dueDate,
    amount_due: 100,
    account_id: 'account',
    created_at: SEEDED_AT,
    updated_at: SEEDED_AT,
    ...overrides,
  });
}

function seed(row: Commitment, payments: CommitmentPayment[]) {
  realDb
    .prepare(
      `INSERT INTO commitments
        (id, name, amount_type, amount, currency, category_id, recurrence_every,
         recurrence_period, start_date, account_id, notes, duration_type, end_date,
         end_after_count, is_active, created_at, updated_at)
       VALUES (@id, @name, @amount_type, @amount, @currency, @category_id, @recurrence_every,
         @recurrence_period, @start_date, @account_id, @notes, @duration_type, @end_date,
         @end_after_count, @is_active, @created_at, @updated_at)`,
    )
    .run(row);
  const insert = realDb.prepare(
    `INSERT INTO commitment_payments
      (id, commitment_id, due_date, paid_date, skipped_date, amount_due, amount_paid, currency,
       exchange_rate_snapshot, account_id, transaction_id, notes, created_at, updated_at)
     VALUES (@id, @commitment_id, @due_date, @paid_date, @skipped_date, @amount_due, @amount_paid,
       @currency, @exchange_rate_snapshot, @account_id, @transaction_id, @notes, @created_at,
       @updated_at)`,
  );
  for (const row of payments) insert.run(row);
}

const PAID_MARCH = payment('paid-march', '2026-03-01', {
  paid_date: '2026-03-02',
  amount_paid: 95,
});
const SKIPPED_APRIL = payment('skipped-april', '2026-04-01', { skipped_date: '2026-04-03' });
const OVERDUE_MAY = payment('overdue-may', '2026-05-01');
const UPCOMING_JUNE = payment('upcoming-june', '2026-06-01');

function seedMonthly(overrides: Partial<Commitment> = {}) {
  seed(commitment(overrides), [PAID_MARCH, SKIPPED_APRIL, OVERDUE_MAY, UPCOMING_JUNE]);
}

function rows(): CommitmentPayment[] {
  return realDb
    .prepare('SELECT * FROM commitment_payments ORDER BY due_date, id')
    .all() as CommitmentPayment[];
}

function unpaidRows(): CommitmentPayment[] {
  return rows().filter((row) => row.paid_date === null && row.skipped_date === null);
}

function row(id: string): CommitmentPayment | undefined {
  return realDb.prepare('SELECT * FROM commitment_payments WHERE id = ?').get(id) as
    | CommitmentPayment
    | undefined;
}

function storedCommitment(): Commitment {
  return realDb.prepare("SELECT * FROM commitments WHERE id = 'commitment'").get() as Commitment;
}

function transactionCount(): number {
  return (realDb.prepare('SELECT COUNT(*) AS count FROM transactions').get() as { count: number })
    .count;
}

function accountBalance(): number {
  return (
    realDb.prepare("SELECT current_balance FROM accounts WHERE id = 'account'").get() as {
      current_balance: number;
    }
  ).current_balance;
}

function editInput(overrides: Partial<UpdateCommitmentInput> = {}): UpdateCommitmentInput {
  const seeded = commitment();
  return {
    name: seeded.name,
    amount_type: seeded.amount_type,
    amount: seeded.amount,
    currency: seeded.currency,
    category_id: seeded.category_id,
    recurrence_every: seeded.recurrence_every,
    recurrence_period: seeded.recurrence_period,
    start_date: seeded.start_date,
    account_id: seeded.account_id,
    notes: seeded.notes,
    duration_type: seeded.duration_type,
    end_date: seeded.end_date,
    end_after_count: seeded.end_after_count,
    ...overrides,
  };
}

const repository = new CommitmentRepository();

describe('CommitmentRepository.update', () => {
  it('keeps the paid and skipped rows and moves every unpaid row, the overdue one included, to the new amount', async () => {
    seedMonthly();

    await repository.update('commitment', editInput({ amount: 150 }), NOW);

    expect(row('paid-march')).toEqual(PAID_MARCH);
    expect(row('skipped-april')).toEqual(SKIPPED_APRIL);
    const unpaid = unpaidRows();
    expect(unpaid.length).toBeGreaterThan(0);
    expect(unpaid.map((r) => r.amount_due)).toEqual(unpaid.map(() => 150));
    expect(unpaid.find((r) => r.due_date === '2026-05-01')?.amount_due).toBe(150);
    expect(storedCommitment().amount).toBe(150);
  });

  it('regenerates the unpaid rows on the new schedule', async () => {
    seedMonthly();

    await repository.update('commitment', editInput({ start_date: '2026-03-15' }), NOW);

    const unpaid = unpaidRows();
    expect(unpaid.length).toBeGreaterThan(0);
    expect(unpaid.filter((r) => r.due_date.endsWith('-01'))).toEqual([]);
    expect(unpaid[0].due_date).toBe('2026-03-15');
    expect(unpaid.every((r) => r.due_date.endsWith('-15'))).toBe(true);
    expect(row('paid-march')).toEqual(PAID_MARCH);
    expect(row('skipped-april')).toEqual(SKIPPED_APRIL);
  });

  it('keeps N rows in all for an after-N commitment whose schedule moves, its settled rows included', async () => {
    const afterThree = { duration_type: DurationType.AfterCount, end_after_count: 3 };
    seed(commitment(afterThree), [PAID_MARCH, SKIPPED_APRIL, OVERDUE_MAY]);

    await repository.update(
      'commitment',
      editInput({ ...afterThree, start_date: '2026-03-15' }),
      NOW,
    );

    expect(rows().map((r) => r.due_date)).toEqual(['2026-03-01', '2026-03-15', '2026-04-01']);
    expect(row('paid-march')).toEqual(PAID_MARCH);
    expect(row('skipped-april')).toEqual(SKIPPED_APRIL);
  });

  it('rolls the whole edit back when the payment insert fails', async () => {
    seedMonthly();
    const before = rows();
    injectedFailure = 'payment insert';

    await expect(repository.update('commitment', editInput({ amount: 150 }), NOW)).rejects.toThrow(
      'injected payment insert failure',
    );

    expect(storedCommitment().amount).toBe(100);
    expect(rows()).toEqual(before);
  });

  it('writes only the commitment row when the commitment its end date ended is edited', async () => {
    const untilMay7 = { duration_type: DurationType.UntilDate, end_date: '2026-05-07' };
    seed(commitment(untilMay7), [PAID_MARCH, SKIPPED_APRIL, OVERDUE_MAY]);
    await repository.runHousekeeping(NOW);
    expect(storedCommitment().is_active).toBe(0);
    const before = rows();

    await repository.update(
      'commitment',
      editInput({ ...untilMay7, name: 'Rent, renamed', amount: 150 }),
      NOW,
    );

    expect(row('overdue-may')).toEqual(OVERDUE_MAY);
    expect(rows()).toEqual(before);
    expect(storedCommitment()).toMatchObject({ name: 'Rent, renamed', amount: 150, is_active: 0 });
  });
});

describe('until-date expiry agrees with resolveUndoSkip', () => {
  it.each([
    ['ends the day before', 'ended-before', '2026-05-07'],
    ['ends on the day', 'ends-today', '2026-05-08'],
    ['ends the day after', 'ends-after', '2026-05-09'],
  ])('a commitment that %s', async (_name, id, endDate) => {
    const row = commitment({ id, duration_type: DurationType.UntilDate, end_date: endDate });
    seed(row, []);

    await deactivateExpiredCommitments(fakeDb, TODAY, NOW_ISO);

    const { is_active } = realDb
      .prepare('SELECT is_active FROM commitments WHERE id = ?')
      .get(id) as Pick<Commitment, 'is_active'>;
    const endedByDate = resolveUndoSkip({ ...row, is_active: 0 }, 0, TODAY) !== 'refuse';
    expect(is_active).toBe(endedByDate ? 0 : 1);
  });
});

describe('CommitmentRepository.deactivate', () => {
  it('marks the commitment inactive and deletes every unpaid row, keeping the settled ones in their months', async () => {
    seedMonthly();

    await repository.deactivate('commitment');

    expect(storedCommitment().is_active).toBe(0);
    expect(rows().map((r) => r.id)).toEqual(['paid-march', 'skipped-april']);

    const idsIn = async (month: string) =>
      (await repository.getMonthSnapshot(month, TODAY)).payments
        .filter((p) => p.commitment_id === 'commitment')
        .map((p) => p.id);
    await expect(idsIn('2026-03')).resolves.toEqual(['paid-march']);
    await expect(idsIn('2026-04')).resolves.toEqual(['skipped-april']);
    await expect(idsIn('2026-05')).resolves.toEqual([]);
    await expect(idsIn('2026-06')).resolves.toEqual([]);
  });

  it('leaves the commitment active and its rows in place when the delete fails', async () => {
    seedMonthly();
    const before = rows();
    injectedFailure = 'unpaid delete';

    await expect(repository.deactivate('commitment')).rejects.toThrow(
      'injected unpaid delete failure',
    );

    expect(storedCommitment().is_active).toBe(1);
    expect(rows()).toEqual(before);
  });
});

describe('CommitmentRepository.undoSkip', () => {
  it('skips with the local date and no transaction, and undo returns the row to its derived state', async () => {
    seed(commitment(), [OVERDUE_MAY, payment('upcoming-may-31', '2026-05-31')]);

    await repository.markAsSkipped('overdue-may', TODAY, NOW_ISO);
    await repository.markAsSkipped('upcoming-may-31', TODAY, NOW_ISO);
    expect(row('overdue-may')?.skipped_date).toBe(TODAY);
    expect(transactionCount()).toBe(0);

    await repository.undoSkip('overdue-may', TODAY, NOW_ISO);
    await repository.undoSkip('upcoming-may-31', TODAY, NOW_ISO);

    const overdue = row('overdue-may')!;
    const upcoming = row('upcoming-may-31')!;
    expect(overdue.skipped_date).toBeNull();
    expect(resolvePaymentState(overdue, TODAY)).toBe(CommitmentPaymentStatus.Overdue);
    expect(resolvePaymentState(upcoming, TODAY)).toBe(CommitmentPaymentStatus.Upcoming);
    expect(transactionCount()).toBe(0);
  });

  it('rejects on a paid row and leaves it unchanged', async () => {
    seedMonthly();

    await expect(repository.undoSkip('paid-march', TODAY, NOW_ISO)).rejects.toThrow(
      CommitmentPaymentNotSkippedError,
    );

    expect(row('paid-march')).toEqual(PAID_MARCH);
  });

  it('resolves with no write on an unpaid row that holds no skip', async () => {
    seedMonthly();

    await expect(repository.undoSkip('overdue-may', TODAY, NOW_ISO)).resolves.toBeUndefined();

    expect(row('overdue-may')).toEqual(OVERDUE_MAY);
  });

  it('makes an after-N commitment the skip ended active again', async () => {
    seed(commitment({ duration_type: DurationType.AfterCount, end_after_count: 2 }), [
      PAID_MARCH,
      SKIPPED_APRIL,
    ]);
    await repository.runHousekeeping(NOW);
    expect(storedCommitment().is_active).toBe(0);

    await repository.undoSkip('skipped-april', TODAY, NOW_ISO);

    expect(storedCommitment().is_active).toBe(1);
    expect(row('skipped-april')).toMatchObject({ paid_date: null, skipped_date: null });
  });

  it('rolls the cleared skip back when the reactivation fails', async () => {
    seed(commitment({ duration_type: DurationType.AfterCount, end_after_count: 2 }), [
      PAID_MARCH,
      SKIPPED_APRIL,
    ]);
    await repository.runHousekeeping(NOW);
    injectedFailure = 'reactivation';

    await expect(repository.undoSkip('skipped-april', TODAY, NOW_ISO)).rejects.toThrow(
      'injected reactivation failure',
    );

    expect(row('skipped-april')?.skipped_date).toBe(SKIPPED_APRIL.skipped_date);
    expect(storedCommitment().is_active).toBe(0);
  });

  it('refuses on a skipped row of a stopped commitment', async () => {
    seed(commitment({ is_active: 0 }), [SKIPPED_APRIL]);

    await expect(repository.undoSkip('skipped-april', TODAY, NOW_ISO)).rejects.toBeInstanceOf(
      CommitmentUndoRefusedError,
    );

    expect(row('skipped-april')).toEqual(SKIPPED_APRIL);
    expect(storedCommitment().is_active).toBe(0);
  });

  it('clears the skip on an until-date commitment its end date ended and leaves it inactive', async () => {
    seed(
      commitment({ is_active: 0, duration_type: DurationType.UntilDate, end_date: '2026-05-07' }),
      [SKIPPED_APRIL],
    );

    await repository.undoSkip('skipped-april', TODAY, NOW_ISO);

    expect(row('skipped-april')?.skipped_date).toBeNull();
    expect(storedCommitment().is_active).toBe(0);
  });
});

describe('a carried row through the store (MA-215)', () => {
  const MAY = '2026-05';
  const CARRIED = 'carried-april';

  // Pins `new Date()` alone: the timers stay real so the awaited reads still run.
  beforeEach(() => {
    jest.useFakeTimers({
      now: NOW,
      doNotFake: [
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function monthStore() {
    const store = createCommitmentStore(new CommitmentRepository(), () => undefined);

    // A write's unawaited reload holds `BEGIN IMMEDIATE` on the one connection, so this waits it out first.
    async function reload() {
      await store.getState().ensureHousekeepingCurrent(NOW);
      await store.getState().loadMonthSnapshot(MAY, NOW);
      await store.getState().loadMonthAggregate(MAY, undefined, NOW);
    }

    function carriedOnTheList() {
      return {
        listed: store.getState().payments.some((candidate) => candidate.id === CARRIED),
        carriedCount: store.getState().monthAggregate?.aggregate.carried.count,
      };
    }

    return { store, reload, carriedOnTheList };
  }

  it('leaves May on a skip, returns on the undo and leaves for good on a pay', async () => {
    seed(commitment({ start_date: '2026-04-01' }), [payment(CARRIED, '2026-04-01')]);
    const { store, reload, carriedOnTheList } = monthStore();

    await reload();
    expect(carriedOnTheList()).toEqual({ listed: true, carriedCount: 1 });

    await store.getState().skipPayment(CARRIED, NOW);
    await reload();
    expect(carriedOnTheList()).toEqual({ listed: false, carriedCount: 0 });

    await store.getState().undoSkip(CARRIED, NOW);
    await reload();
    expect(carriedOnTheList()).toEqual({ listed: true, carriedCount: 1 });

    const amounts = await store
      .getState()
      .markAsPaid(CARRIED, { amount_paid: 100, account_id: 'account', paid_date: TODAY });
    await reload();
    expect(carriedOnTheList()).toEqual({ listed: false, carriedCount: 0 });
    expect(amounts).toMatchObject({ paymentAmount: 100 });
  });
});

describe('CommitmentRepository.markAsPaid on a removed row', () => {
  const details = { amount_paid: 100, account_id: 'account', paid_date: TODAY };

  it('rejects a row a stop deleted with no payment, transaction or balance change', async () => {
    seedMonthly();
    await repository.deactivate('commitment');

    await expect(repository.markAsPaid('overdue-may', details)).rejects.toThrow(
      CommitmentPaymentNotFoundError,
    );

    expect(row('overdue-may')).toBeUndefined();
    expect(transactionCount()).toBe(0);
    expect(accountBalance()).toBe(OPENING_BALANCE);
  });

  it('rejects a row an edit replaced with no payment, transaction or balance change', async () => {
    seedMonthly();
    await repository.update('commitment', editInput({ amount: 150 }), NOW);
    const after = rows();

    await expect(repository.markAsPaid('overdue-may', details)).rejects.toThrow(
      CommitmentPaymentNotFoundError,
    );

    expect(rows()).toEqual(after);
    expect(transactionCount()).toBe(0);
    expect(accountBalance()).toBe(OPENING_BALANCE);
  });
});
