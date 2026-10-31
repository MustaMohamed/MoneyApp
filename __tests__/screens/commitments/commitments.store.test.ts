import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';

import { Currency } from '@/constants/enums';
import { getDb, withExclusiveWriteTransactionAsync } from '@/database/client';
import { MIGRATIONS } from '@/database/migrations';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type {
  CommitmentMonthPayment,
  CommitmentPayment,
} from '@/modules/commitments/entities/commitment_payment.entity';
import { CommitmentRepository } from '@/modules/commitments/repositories/commitment.repository';
import { createCommitmentsScreenStore } from '@/modules/commitments/screens/commitments/commitments.store';
import {
  makeTestCommitment,
  makeTestMonthPayment,
  makeTestPayment,
} from '@/test_helpers/commitment';
import { deferred } from '@/test_helpers/deferred';
import {
  bridgeBetterSQLite,
  createMockSQLiteDatabase,
  exclusiveWriteOnRealDb,
} from '@/test_helpers/sqlite';

jest.mock('@/database/client', () => ({
  getDb: jest.fn(),
  withWriteTransactionAsync:
    jest.requireActual<typeof import('@/database/client')>('@/database/client')
      .withWriteTransactionAsync,
  withExclusiveWriteTransactionAsync: jest.fn(),
}));

const NOW = new Date(2026, 9, 31, 23, 50);
const TODAY = '2026-10-31';
const RENT = makeTestCommitment({ id: 'rent', name: 'Rent' });
const GYM = makeTestCommitment({ id: 'gym', name: 'Gym' });
const RENT_ROW = makeTestMonthPayment({ id: 'rent-row', commitment_id: 'rent' });
const GYM_ROW = makeTestMonthPayment({ id: 'gym-row', commitment_id: 'gym' });
const COMMITMENTS_BY_ID = new Map([
  [RENT.id, RENT],
  [GYM.id, GYM],
]);
const READ_FAILED = new Error('read failed');

function fakeRepo() {
  return {
    getById: jest.fn(async (id: string) => COMMITMENTS_BY_ID.get(id)),
    getPaymentsByCommitment: jest.fn<Promise<CommitmentMonthPayment[]>, [string]>(),
  };
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('createCommitmentsScreenStore on a fake repository', () => {
  it('starts holding no read and no failure', () => {
    const store = createCommitmentsScreenStore(fakeRepo());

    expect(store.getState().rowsRead).toBeUndefined();
    expect(store.getState().rowsLoadErrorId).toBeUndefined();
  });

  it('publishes the commitment, its rows and the id', async () => {
    const repo = fakeRepo();
    repo.getPaymentsByCommitment.mockResolvedValue([RENT_ROW]);
    const store = createCommitmentsScreenStore(repo);

    await store.getState().loadCommitmentRows('rent', NOW);

    expect(repo.getById).toHaveBeenCalledWith('rent');
    expect(repo.getPaymentsByCommitment).toHaveBeenCalledWith('rent');
    expect(store.getState().rowsRead).toEqual({
      commitmentId: 'rent',
      commitment: RENT,
      rows: [RENT_ROW],
      today: TODAY,
    });
  });

  it('holds an undefined commitment and no rows when no commitment holds the id', async () => {
    const repo = fakeRepo();
    repo.getPaymentsByCommitment.mockResolvedValue([]);
    const store = createCommitmentsScreenStore(repo);

    await store.getState().loadCommitmentRows('gone', NOW);

    expect(store.getState().rowsRead).toEqual({
      commitmentId: 'gone',
      commitment: undefined,
      rows: [],
      today: TODAY,
    });
  });

  it('dates the read by the local day of `now`', async () => {
    const repo = fakeRepo();
    repo.getPaymentsByCommitment.mockResolvedValue([RENT_ROW]);
    const store = createCommitmentsScreenStore(repo);

    await store.getState().loadCommitmentRows('rent', new Date(2028, 1, 29, 0, 5));

    expect(store.getState().rowsRead?.today).toBe('2028-02-29');
  });

  it('keeps B when B lands before an older A', async () => {
    const repo = fakeRepo();
    const older = deferred<CommitmentMonthPayment[]>();
    const newer = deferred<CommitmentMonthPayment[]>();
    repo.getPaymentsByCommitment
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const store = createCommitmentsScreenStore(repo);

    const loadA = store.getState().loadCommitmentRows('rent', NOW);
    const loadB = store.getState().loadCommitmentRows('gym', NOW);
    newer.resolve([GYM_ROW]);
    await loadB;
    older.resolve([RENT_ROW]);
    await loadA;

    expect(store.getState().rowsRead).toEqual({
      commitmentId: 'gym',
      commitment: GYM,
      rows: [GYM_ROW],
      today: TODAY,
    });
  });

  it('publishes nothing from a stale failure', async () => {
    const repo = fakeRepo();
    const older = deferred<CommitmentMonthPayment[]>();
    const newer = deferred<CommitmentMonthPayment[]>();
    repo.getPaymentsByCommitment
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const store = createCommitmentsScreenStore(repo);
    const loadA = store.getState().loadCommitmentRows('rent', NOW);
    const loadB = store.getState().loadCommitmentRows('gym', NOW);
    newer.resolve([GYM_ROW]);
    await loadB;
    const held = store.getState().rowsRead;
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    older.reject(READ_FAILED);
    await loadA;
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
    expect(store.getState().rowsLoadErrorId).toBeUndefined();
    expect(store.getState().rowsRead).toBe(held);
  });

  it.each(['getById', 'getPaymentsByCommitment'] as const)(
    'sets the error id with no read when %s fails a first load',
    async (method) => {
      const repo = fakeRepo();
      repo.getPaymentsByCommitment.mockResolvedValue([RENT_ROW]);
      repo[method].mockRejectedValueOnce(READ_FAILED);
      const store = createCommitmentsScreenStore(repo);

      await store.getState().loadCommitmentRows('rent', NOW);

      expect(store.getState().rowsLoadErrorId).toBe('rent');
      expect(store.getState().rowsRead).toBeUndefined();
    },
  );

  it('keeps the read and sets the error id on a failed reload', async () => {
    const repo = fakeRepo();
    repo.getPaymentsByCommitment
      .mockResolvedValueOnce([RENT_ROW])
      .mockRejectedValueOnce(READ_FAILED);
    const store = createCommitmentsScreenStore(repo);
    await store.getState().loadCommitmentRows('rent', NOW);
    const held = store.getState().rowsRead;
    expect(held).toBeDefined();

    await store.getState().loadCommitmentRows('rent', NOW);

    expect(store.getState().rowsRead).toBe(held);
    expect(store.getState().rowsLoadErrorId).toBe('rent');
  });

  it('clears the error id as a new load starts', async () => {
    const repo = fakeRepo();
    const retry = deferred<CommitmentMonthPayment[]>();
    repo.getPaymentsByCommitment
      .mockRejectedValueOnce(READ_FAILED)
      .mockReturnValueOnce(retry.promise);
    const store = createCommitmentsScreenStore(repo);
    await store.getState().loadCommitmentRows('rent', NOW);
    expect(store.getState().rowsLoadErrorId).toBe('rent');

    const load = store.getState().loadCommitmentRows('rent', NOW);

    expect(store.getState().rowsLoadErrorId).toBeUndefined();
    retry.resolve([RENT_ROW]);
    await load;
    expect(store.getState().rowsLoadErrorId).toBeUndefined();
    expect(store.getState().rowsRead?.rows).toEqual([RENT_ROW]);
  });

  it('notifies once per landed load', async () => {
    const repo = fakeRepo();
    repo.getPaymentsByCommitment.mockResolvedValue([RENT_ROW]);
    const store = createCommitmentsScreenStore(repo);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    await store.getState().loadCommitmentRows('rent', NOW);
    expect(listener).toHaveBeenCalledTimes(1);

    await store.getState().loadCommitmentRows('rent', NOW);
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('resolves its promise on a failure', async () => {
    const repo = fakeRepo();
    repo.getPaymentsByCommitment.mockRejectedValue(READ_FAILED);
    const store = createCommitmentsScreenStore(repo);

    await expect(store.getState().loadCommitmentRows('rent', NOW)).resolves.toBeUndefined();
  });

  it('reset drops the read and the failure', async () => {
    const repo = fakeRepo();
    repo.getPaymentsByCommitment
      .mockResolvedValueOnce([RENT_ROW])
      .mockRejectedValueOnce(READ_FAILED);
    const store = createCommitmentsScreenStore(repo);
    await store.getState().loadCommitmentRows('rent', NOW);
    await store.getState().loadCommitmentRows('rent', NOW);

    store.getState().reset();

    expect(store.getState().rowsRead).toBeUndefined();
    expect(store.getState().rowsLoadErrorId).toBeUndefined();
  });
});

describe('createCommitmentsScreenStore on the real repository', () => {
  const SEEDED_AT = '2026-01-01T00:00:00.000Z';
  const repository = new CommitmentRepository();
  let realDb: ReturnType<typeof Database>;
  let fakeDb: SQLiteDatabase;

  function commitment(): Commitment {
    return makeTestCommitment({
      id: 'commitment',
      amount: 100,
      currency: Currency.USD,
      category_id: 'cat',
      start_date: '2026-03-01',
      account_id: 'account',
      created_at: SEEDED_AT,
      updated_at: SEEDED_AT,
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
      currency: Currency.USD,
      account_id: 'account',
      created_at: SEEDED_AT,
      updated_at: SEEDED_AT,
      ...overrides,
    });
  }

  function seedCommitment(row: Commitment, payments: CommitmentPayment[]): void {
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

  beforeAll(() => {
    realDb = new Database(':memory:');
    realDb.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
    realDb
      .prepare(
        `INSERT INTO categories
          (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
         VALUES ('cat', 'Bills', 'expense', 'tag', '#C9973A', 0, 0, ?, ?)`,
      )
      .run(SEEDED_AT, SEEDED_AT);
    realDb
      .prepare(
        `INSERT INTO accounts
          (id, name, type, currency, opening_balance, current_balance,
           interest_tracking, is_archived, sort_order, created_at, updated_at)
         VALUES ('account', 'Main', 'bank', 'EGP', 1000, 1000, 0, 0, 0, ?, ?)`,
      )
      .run(SEEDED_AT, SEEDED_AT);
    realDb
      .prepare(
        `INSERT INTO transactions
          (id, type, amount, currency, egp_amount, account_id, transaction_date,
           transaction_time, created_at, updated_at)
         VALUES ('tx-march', 'expense', 95, 'USD', 4750, 'account', '2026-03-02', '12:00:00', ?, ?)`,
      )
      .run(SEEDED_AT, SEEDED_AT);

    const sqlite = createMockSQLiteDatabase();
    bridgeBetterSQLite(sqlite, realDb);
    fakeDb = sqlite.database;
    jest
      .mocked(withExclusiveWriteTransactionAsync)
      .mockImplementation(exclusiveWriteOnRealDb(realDb, fakeDb));
  });

  beforeEach(() => {
    (getDb as jest.Mock).mockResolvedValue(fakeDb);
  });

  afterAll(() => {
    realDb.close();
  });

  it('holds the paid and skipped rows alone after a deactivate, the paid row at its EGP amount', async () => {
    seedCommitment(commitment(), [
      payment('paid-march', '2026-03-01', {
        paid_date: '2026-03-02',
        amount_paid: 95,
        transaction_id: 'tx-march',
      }),
      payment('skipped-april', '2026-04-01', { skipped_date: '2026-04-03' }),
      payment('overdue-may', '2026-05-01'),
      payment('upcoming-june', '2026-06-01'),
    ]);
    await repository.deactivate('commitment');
    const store = createCommitmentsScreenStore(repository);

    await store.getState().loadCommitmentRows('commitment', NOW);

    const read = store.getState().rowsRead;
    expect(read?.commitment?.is_active).toBe(0);
    expect(read?.rows.map((row) => [row.id, row.paid_egp_amount])).toEqual([
      ['paid-march', 4750],
      ['skipped-april', null],
    ]);
  });
});
