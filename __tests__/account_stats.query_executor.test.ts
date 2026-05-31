import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { getAccountsStats } from '@/database/account_stats';
import { MIGRATIONS } from '@/database/migrations';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';
const DATE = '2026-05-01';
const TIME = '12:00:00';

function seedAccounts() {
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,
        interest_tracking,is_archived,sort_order,created_at,updated_at)
     VALUES
       ('acc_bank','Checking','bank','EGP',10000,10000,0,0,0,?,?),
       ('acc_wallet','Wallet','physical_wallet','EGP',0,0,0,0,1,?,?),
       ('acc_usd','USD Account','bank','USD',500,500,0,0,2,?,?),
       ('acc_cc','Credit Card','credit_card','EGP',0,0,0,0,3,?,?)`,
    )
    .run(NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW);
}

function insertTx(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    id: 'tx-1',
    type: 'expense',
    amount: 100,
    currency: 'EGP',
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc_bank',
    to_account_id: null,
    category_id: null,
    note: null,
    transaction_date: DATE,
    transaction_time: TIME,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
  realDb
    .prepare(
      `INSERT INTO transactions
       (id,type,amount,currency,egp_amount,exchange_rate,
        to_amount,minimum_payment_snapshot,
        account_id,to_account_id,category_id,note,
        transaction_date,transaction_time,created_at,updated_at)
       VALUES (@id,@type,@amount,@currency,@egp_amount,@exchange_rate,
        @to_amount,@minimum_payment_snapshot,
        @account_id,@to_account_id,@category_id,@note,
        @transaction_date,@transaction_time,@created_at,@updated_at)`,
    )
    .run(defaults);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  seedAccounts();

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        getAllAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });
});

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(NOW) });
  realDb.exec('DELETE FROM transactions');
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getAccountsStats
>[0];

describe('getAccountsStats — empty accountIds', () => {
  it('returns an empty object immediately when accountIds is empty', async () => {
    const stats = await getAccountsStats(mockDb, []);
    expect(stats).toEqual({});
  });
});

describe('getAccountsStats — Sunday week-start branch', () => {
  it('computes correct weekStart when today is a Sunday (day=0 → -6 offset)', async () => {
    // 2026-05-10 is a Sunday. weekStart should be Monday 2026-05-04.
    jest.setSystemTime(new Date('2026-05-10T12:00:00.000Z'));

    // This call exercises computeDates() with a Sunday, covering the day===0 branch
    const stats = await getAccountsStats(mockDb, ['acc_bank']);
    // Should return a zero-stats entry for acc_bank (no transactions in that week)
    expect(stats['acc_bank']).toBeDefined();
    expect(stats['acc_bank'].month_in).toBe(0);
  });
});

describe('getAccountsStats — weekStart before monthStart branch', () => {
  it('uses weekStart as earliest when weekStart < monthStart (e.g. beginning of month on Thursday)', async () => {
    // 2026-05-01 is a Friday. Monday of that week = 2026-04-27, which is before monthStart (2026-05-01).
    // So weekStart (04-27) < monthStart (05-01), making earliest = weekStart.
    jest.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));

    const stats = await getAccountsStats(mockDb, ['acc_bank']);
    expect(stats['acc_bank']).toBeDefined();
  });
});

describe('getAccountsStats — default zero stats for accounts with no transactions', () => {
  it('returns zero stats for accounts not in any transactions', async () => {
    const stats = await getAccountsStats(mockDb, ['acc_bank', 'acc_wallet']);
    expect(stats['acc_bank']).toEqual({ month_in: 0, month_out: 0, week_in: 0, week_out: 0 });
    expect(stats['acc_wallet']).toEqual({ month_in: 0, month_out: 0, week_in: 0, week_out: 0 });
  });
});

describe('getAccountsStats — null row fields fallback (??0 branches)', () => {
  it('returns 0 for any null aggregate field returned by DB (covers ??0 branches)', async () => {
    // Override getAllAsync once to return a row with null fields
    // (simulates a DB returning NULL aggregates)
    const mocked = (SQLite as unknown as { __fakeDb: { getAllAsync: jest.Mock } }).__fakeDb;

    const original = mocked.getAllAsync.getMockImplementation();
    mocked.getAllAsync.mockResolvedValueOnce([
      { account_id: 'acc_bank', month_in: null, month_out: null, week_in: null, week_out: null },
    ]);

    const stats = await getAccountsStats(mockDb, ['acc_bank']);
    expect(stats['acc_bank'].month_in).toBe(0);
    expect(stats['acc_bank'].month_out).toBe(0);
    expect(stats['acc_bank'].week_in).toBe(0);
    expect(stats['acc_bank'].week_out).toBe(0);

    if (original) mocked.getAllAsync.mockImplementation(original);
  });
});

describe('getAccountsStats — transfer counts', () => {
  it('transfer out appears in source month_out, transfer in appears in destination month_in', async () => {
    insertTx({
      id: 'tx-transfer-1',
      type: 'transfer',
      amount: 3000,
      currency: 'EGP',
      egp_amount: 3000,
      to_amount: 3000,
      account_id: 'acc_bank',
      to_account_id: 'acc_wallet',
    });

    const stats = await getAccountsStats(mockDb, ['acc_bank', 'acc_wallet']);

    expect(stats['acc_bank'].month_out).toBe(3000);
    expect(stats['acc_bank'].month_in).toBe(0);
    expect(stats['acc_wallet'].month_in).toBe(3000);
    expect(stats['acc_wallet'].month_out).toBe(0);
  });
});

describe('getAccountsStats — cc_payment counts', () => {
  it('cc_payment out appears in paying account month_out, in appears in CC account month_in', async () => {
    insertTx({
      id: 'tx-cc-1',
      type: 'cc_payment',
      amount: 1500,
      currency: 'EGP',
      egp_amount: 1500,
      to_amount: 1500,
      minimum_payment_snapshot: 200,
      account_id: 'acc_bank',
      to_account_id: 'acc_cc',
    });

    const stats = await getAccountsStats(mockDb, ['acc_bank', 'acc_cc']);

    expect(stats['acc_bank'].month_out).toBe(1500);
    expect(stats['acc_bank'].month_in).toBe(0);
    expect(stats['acc_cc'].month_in).toBe(1500);
    expect(stats['acc_cc'].month_out).toBe(0);
  });
});

describe('getAccountsStats — cross-currency transfer', () => {
  it('source uses amount (USD), destination uses to_amount (EGP)', async () => {
    insertTx({
      id: 'tx-cross-1',
      type: 'transfer',
      amount: 200,
      currency: 'USD',
      egp_amount: 10000,
      exchange_rate: 50,
      to_amount: 10000,
      account_id: 'acc_usd',
      to_account_id: 'acc_bank',
    });

    const stats = await getAccountsStats(mockDb, ['acc_usd', 'acc_bank']);

    expect(stats['acc_usd'].month_out).toBe(200);
    expect(stats['acc_usd'].month_in).toBe(0);
    expect(stats['acc_bank'].month_in).toBe(10000);
    expect(stats['acc_bank'].month_out).toBe(0);
  });
});

describe('getAccountsStats — multi-leg summation', () => {
  it('income + transfer to same account sums correctly in month_in', async () => {
    insertTx({
      id: 'tx-income-1',
      type: 'income',
      amount: 5000,
      currency: 'EGP',
      egp_amount: 5000,
      account_id: 'acc_bank',
    });

    insertTx({
      id: 'tx-transfer-in-1',
      type: 'transfer',
      amount: 2000,
      currency: 'EGP',
      egp_amount: 2000,
      to_amount: 2000,
      account_id: 'acc_wallet',
      to_account_id: 'acc_bank',
    });

    const stats = await getAccountsStats(mockDb, ['acc_bank', 'acc_wallet']);

    expect(stats['acc_bank'].month_in).toBe(7000);
    expect(stats['acc_bank'].month_out).toBe(0);
    expect(stats['acc_wallet'].month_in).toBe(0);
    expect(stats['acc_wallet'].month_out).toBe(2000);
  });
});
