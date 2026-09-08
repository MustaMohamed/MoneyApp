import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';
import { getAccountsStats } from '@/modules/accounts/database/account_stats';
import {
  AccountActivityRepository,
  RECENT_ACTIVITY_LIMIT,
} from '@/modules/accounts/repositories/account_activity.repository';
import { getExpoSQLiteTestDatabase, getSQLiteParams } from '@/test_helpers/sqlite';

const sqlite = getExpoSQLiteTestDatabase();
let realDb: ReturnType<typeof Database>;

// The 15th: every seeded row sits on or before it, so the month window covers all of them.
const NOW = new Date(2026, 8, 15, 12, 0, 0);
const CREATED_AT = '2026-09-01T00:00:00.000Z';

/** 12 expenses on `acc1`, 10 EGP through 120 EGP, dated the 1st through the 12th. */
const EXPENSE_DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const LATE_EXPENSE_AMOUNT = 5;
const EXPENSE_TOTAL = EXPENSE_DAYS.reduce((sum, day) => sum + day * 10, 0) + LATE_EXPENSE_AMOUNT;
const TRANSFER_AMOUNT = 500;

function seedAccounts(): void {
  realDb
    .prepare(
      `INSERT INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        revolving_balance,minimum_payment,interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES
       ('acc1','Bank','bank','EGP',5000,5000,NULL,NULL,0,0,0,?,?),
       ('acc2','Savings','bank','EGP',1000,1000,NULL,NULL,0,0,1,?,?),
       ('acc_empty','Untouched','bank','EGP',0,0,NULL,NULL,0,0,2,?,?)`,
    )
    .run(CREATED_AT, CREATED_AT, CREATED_AT, CREATED_AT, CREATED_AT, CREATED_AT);
}

function seedTransactions(): void {
  const insert = realDb.prepare(
    `INSERT INTO transactions
     (id,type,amount,currency,egp_amount,exchange_rate,account_id,to_account_id,category_id,
      note,transaction_date,transaction_time,to_amount,minimum_payment_snapshot,
      revolving_balance_delta,commitment_payment_id,installment_id,budget_id,created_at,updated_at)
     VALUES (?,?,?,'EGP',?,NULL,?,?,NULL,NULL,?,?,?,NULL,NULL,NULL,NULL,NULL,?,?)`,
  );

  for (const day of EXPENSE_DAYS) {
    const date = `2026-09-${String(day).padStart(2, '0')}`;
    insert.run(
      `tx-${day}`,
      'expense',
      day * 10,
      day * 10,
      'acc1',
      null,
      date,
      '09:00:00',
      null,
      `${date}T09:00:00.000Z`,
      `${date}T09:00:00.000Z`,
    );
  }

  // Same date as `tx-12`, later time: only the order clause's time leg separates the two.
  insert.run(
    'tx-12-late',
    'expense',
    LATE_EXPENSE_AMOUNT,
    LATE_EXPENSE_AMOUNT,
    'acc1',
    null,
    '2026-09-12',
    '18:00:00',
    null,
    '2026-09-12T18:00:00.000Z',
    '2026-09-12T18:00:00.000Z',
  );

  // The to-leg: `acc1` never appears as `account_id`, so only the `to_account_id` arm finds it.
  insert.run(
    'tx-transfer',
    'transfer',
    TRANSFER_AMOUNT,
    TRANSFER_AMOUNT,
    'acc2',
    'acc1',
    '2026-09-13',
    '18:30:00',
    TRANSFER_AMOUNT,
    '2026-09-13T18:30:00.000Z',
    '2026-09-13T18:30:00.000Z',
  );
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seedAccounts();
  seedTransactions();

  sqlite.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    return realDb.prepare(sql).all(...getSQLiteParams(rest));
  });
});

afterAll(() => {
  realDb.close();
});

const repo = new AccountActivityRepository();

describe('AccountActivityRepository.getSnapshot', () => {
  it('returns the ten newest rows, the transfer to-leg among them', async () => {
    const snapshot = await repo.getSnapshot({ accountId: 'acc1', mutationVersion: 0, now: NOW });

    expect(snapshot.rows).toHaveLength(RECENT_ACTIVITY_LIMIT);
    // `tx-12-late` before `tx-12`: same date, the later time wins.
    expect(snapshot.rows.map((row) => row.id)).toEqual([
      'tx-transfer',
      'tx-12-late',
      'tx-12',
      'tx-11',
      'tx-10',
      'tx-9',
      'tx-8',
      'tx-7',
      'tx-6',
      'tx-5',
    ]);
  });

  it('carries the stats query figures for the account, unchanged', async () => {
    const snapshot = await repo.getSnapshot({ accountId: 'acc1', mutationVersion: 0, now: NOW });
    const stats = await getAccountsStats(sqlite.database, ['acc1'], NOW);

    expect(snapshot.stats).toEqual(stats.acc1);
    expect(snapshot.stats.month_in).toBe(TRANSFER_AMOUNT);
    expect(snapshot.stats.month_out).toBe(EXPENSE_TOTAL);
  });

  it('stamps the snapshot with the caller-supplied clock and account', async () => {
    const snapshot = await repo.getSnapshot({ accountId: 'acc1', mutationVersion: 7, now: NOW });

    expect(snapshot.accountId).toBe('acc1');
    expect(snapshot.loadedAt).toBe(NOW.getTime());
  });

  it('returns no rows and zero figures for an account with no transactions', async () => {
    const snapshot = await repo.getSnapshot({
      accountId: 'acc_empty',
      mutationVersion: 0,
      now: NOW,
    });

    expect(snapshot.rows).toEqual([]);
    expect(snapshot.stats).toEqual({ month_in: 0, month_out: 0, week_in: 0, week_out: 0 });
  });
});
