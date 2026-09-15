import Database from 'better-sqlite3';

import { AccountType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { ArchivedAccountDetailRepository } from '@/modules/accounts/repositories/archived_account_detail.repository';
import { createArchivedAccountDetailStore } from '@/modules/accounts/screens/accounts/detail/archived_account_detail.store';
import { getActiveCommitmentsByAccount } from '@/modules/commitments/database/commitments';
import { getTransactionCountByAccount } from '@/modules/transactions/database/transactions';
import { bridgeBetterSQLite, getExpoSQLiteTestDatabase } from '@/test_helpers/sqlite';

const sqlite = getExpoSQLiteTestDatabase();
let realDb: ReturnType<typeof Database>;

const NOW = '2026-09-15T00:00:00.000Z';
const ARCH = 'arch';
const ARCH_EMPTY = 'arch_empty';
const GONE = 'gone';
const LIVE = 'live';
const UNKNOWN = 'no-such-account';

function seed(): void {
  const account = realDb.prepare(
    `INSERT INTO accounts
       (id, name, type, currency, opening_balance, current_balance, interest_tracking,
        is_archived, is_deleted, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, 'EGP', 0, 0, 0, ?, ?, 0, ?, ?)`,
  );
  account.run(ARCH, 'Old Bank', AccountType.Bank, 1, 0, NOW, NOW);
  account.run(ARCH_EMPTY, 'Untouched', AccountType.Bank, 1, 0, NOW, NOW);
  account.run(GONE, 'Deleted', AccountType.Bank, 1, 1, NOW, NOW);
  account.run(LIVE, 'Current', AccountType.Bank, 0, 0, NOW, NOW);

  realDb
    .prepare(
      `INSERT INTO categories (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES ('cat1', 'Bills', 'expense', 'tag', '#C9973A', 0, 0, ?, ?)`,
    )
    .run(NOW, NOW);

  const transaction = realDb.prepare(
    `INSERT INTO transactions
       (id, type, amount, currency, egp_amount, to_amount, account_id, to_account_id,
        category_id, transaction_date, transaction_time, created_at, updated_at)
     VALUES (?, ?, 10, 'EGP', 10, ?, ?, ?, ?, '2026-09-01', '12:00:00', ?, ?)`,
  );
  transaction.run('tx-arch-expense', 'expense', null, ARCH, null, 'cat1', NOW, NOW);
  transaction.run('tx-live-to-arch', 'transfer', 10, LIVE, ARCH, null, NOW, NOW);
  transaction.run('tx-arch-to-live', 'transfer', 10, ARCH, LIVE, null, NOW, NOW);
  transaction.run('tx-live-expense', 'expense', null, LIVE, null, 'cat1', NOW, NOW);

  const commitment = realDb.prepare(
    `INSERT INTO commitments
       (id, name, amount_type, amount, currency, category_id, recurrence_every,
        recurrence_period, start_date, account_id, duration_type, is_active, created_at, updated_at)
     VALUES (?, ?, 'fixed', 200, 'EGP', 'cat1', 1, 'months', '2026-01-01', ?, 'forever', ?, ?, ?)`,
  );
  commitment.run('com-arch-on', 'Gym', ARCH, 1, NOW, NOW);
  commitment.run('com-arch-off', 'Old gym', ARCH, 0, NOW, NOW);
  commitment.run('com-live-on', 'Netflix', LIVE, 1, NOW, NOW);
  commitment.run('com-none', 'Rent', null, 1, NOW, NOW);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  realDb.pragma('foreign_keys = ON');
  bridgeBetterSQLite(sqlite, realDb);
  sqlite.execAsync.mockImplementation(async (sql: string) => {
    realDb.exec(sql);
  });
  seed();
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

describe('getTransactionCountByAccount', () => {
  it.each([
    ['an archived account, on either leg', ARCH, 3],
    ['an active account, on either leg', LIVE, 3],
    ['an account with nothing on it', ARCH_EMPTY, 0],
    ['an unknown id', UNKNOWN, 0],
  ])('counts %s', async (_label, accountId, expected) => {
    await expect(getTransactionCountByAccount(sqlite.database, accountId)).resolves.toBe(expected);
  });
});

describe('getActiveCommitmentsByAccount', () => {
  it.each([
    ['an archived account, skipping the inactive one', ARCH, [{ id: 'com-arch-on', name: 'Gym' }]],
    ['an active account', LIVE, [{ id: 'com-live-on', name: 'Netflix' }]],
    ['an account with nothing on it', ARCH_EMPTY, []],
    ['an unknown id', UNKNOWN, []],
  ])('reads %s', async (_label, accountId, expected) => {
    await expect(getActiveCommitmentsByAccount(sqlite.database, accountId)).resolves.toEqual(
      expected,
    );
  });
});

describe('ArchivedAccountDetailRepository.getSnapshot', () => {
  const repo = new ArchivedAccountDetailRepository();

  it('resolves an archived account with both counts', async () => {
    const snapshot = await repo.getSnapshot({ accountId: ARCH, mutationVersion: 0 });

    expect(snapshot.accountId).toBe(ARCH);
    expect(snapshot.account?.id).toBe(ARCH);
    expect(snapshot.transactionCount).toBe(3);
    expect(snapshot.activeCommitments).toEqual([{ id: 'com-arch-on', name: 'Gym' }]);
  });

  it('resolves an archived account with nothing on it, both counts zero', async () => {
    const snapshot = await repo.getSnapshot({ accountId: ARCH_EMPTY, mutationVersion: 0 });

    expect(snapshot.account?.id).toBe(ARCH_EMPTY);
    expect(snapshot.transactionCount).toBe(0);
    expect(snapshot.activeCommitments).toEqual([]);
  });

  it('resolves a deleted id to no account', async () => {
    const snapshot = await repo.getSnapshot({ accountId: GONE, mutationVersion: 0 });

    expect(snapshot.account).toBeUndefined();
  });

  it('resolves an active id to no account, its counts still read', async () => {
    const snapshot = await repo.getSnapshot({ accountId: LIVE, mutationVersion: 0 });

    expect(snapshot.account).toBeUndefined();
    expect(snapshot.transactionCount).toBe(3);
    expect(snapshot.activeCommitments).toEqual([{ id: 'com-live-on', name: 'Netflix' }]);
  });

  it('resolves an unknown id to no account and zero counts', async () => {
    const snapshot = await repo.getSnapshot({ accountId: UNKNOWN, mutationVersion: 0 });

    expect(snapshot).toEqual({
      accountId: UNKNOWN,
      account: undefined,
      transactionCount: 0,
      activeCommitments: [],
    });
  });
});

describe('createArchivedAccountDetailStore on the real database', () => {
  it('publishes ready with the archived account and its counts', async () => {
    const store = createArchivedAccountDetailStore(new ArchivedAccountDetailRepository());

    await store.getState().ensure({ accountId: ARCH, mutationVersion: 0 });

    expect(store.getState().status).toBe('ready');
    expect(store.getState().snapshot?.account?.id).toBe(ARCH);
    expect(store.getState().snapshot?.transactionCount).toBe(3);
    expect(store.getState().snapshot?.activeCommitments).toEqual([
      { id: 'com-arch-on', name: 'Gym' },
    ]);
  });
});
