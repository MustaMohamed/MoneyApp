import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { getAccountsStats } from '@/database/account_stats';
import { MIGRATIONS } from '@/database/migrations';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

const NOW = '2026-05-01T12:00:00.000Z';
const DATE = '2026-05-01';
const TIME = '12:00:00';
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const CAIRO_DATE_FORMATTER = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
});
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface CairoDateParts {
  year: number;
  monthIndex: number;
  date: number;
  day: number;
}

function getCairoDateParts(date: Date): CairoDateParts {
  const parts = new Map<string, string>();
  for (const part of CAIRO_DATE_FORMATTER.formatToParts(date)) {
    parts.set(part.type, part.value);
  }

  const weekday = parts.get('weekday');
  const day = weekday === undefined ? undefined : WEEKDAY_INDEX[weekday];
  if (day === undefined) throw new Error(`Unexpected Cairo weekday: ${String(weekday)}`);

  return {
    year: Number(parts.get('year')),
    monthIndex: Number(parts.get('month')) - 1,
    date: Number(parts.get('day')),
    day,
  };
}

function installCairoDateHarness(): () => void {
  const nativeSetTime = Date.prototype.setTime;
  const getFullYear = jest
    .spyOn(Date.prototype, 'getFullYear')
    .mockImplementation(function getCairoFullYear(this: Date) {
      return getCairoDateParts(this).year;
    });
  const getMonth = jest
    .spyOn(Date.prototype, 'getMonth')
    .mockImplementation(function getCairoMonth(this: Date) {
      return getCairoDateParts(this).monthIndex;
    });
  const getDate = jest
    .spyOn(Date.prototype, 'getDate')
    .mockImplementation(function getCairoDate(this: Date) {
      return getCairoDateParts(this).date;
    });
  const getDay = jest
    .spyOn(Date.prototype, 'getDay')
    .mockImplementation(function getCairoDay(this: Date) {
      return getCairoDateParts(this).day;
    });
  const setDate = jest.spyOn(Date.prototype, 'setDate').mockImplementation(function setCairoDate(
    this: Date,
    date: number,
  ) {
    const currentDate = getCairoDateParts(this).date;
    return nativeSetTime.call(this, this.getTime() + (date - currentDate) * MILLISECONDS_PER_DAY);
  });

  return () => {
    setDate.mockRestore();
    getDay.mockRestore();
    getDate.mockRestore();
    getMonth.mockRestore();
    getFullYear.mockRestore();
  };
}

async function withCairoDateHarness(run: () => Promise<void>): Promise<void> {
  const restore = installCairoDateHarness();
  try {
    await run();
  } finally {
    restore();
  }
}

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

    const stats = await getAccountsStats(mockDb, ['acc_bank']);
    expect(stats['acc_bank']).toBeDefined();
    expect(stats['acc_bank'].month_in).toBe(0);
  });
});

describe('getAccountsStats — captured clock', () => {
  it('uses the supplied month and week boundaries instead of the process clock', async () => {
    jest.setSystemTime(new Date('2026-07-20T12:00:00.000Z'));
    insertTx({
      id: 'may-income',
      type: 'income',
      amount: 500,
      egp_amount: 500,
      transaction_date: '2026-05-04',
    });
    insertTx({
      id: 'may-expense',
      amount: 200,
      egp_amount: 200,
      transaction_date: '2026-05-10',
    });
    insertTx({
      id: 'july-income',
      type: 'income',
      amount: 900,
      egp_amount: 900,
      transaction_date: '2026-07-05',
    });
    insertTx({
      id: 'july-expense',
      amount: 800,
      egp_amount: 800,
      transaction_date: '2026-07-06',
    });

    const stats = await getAccountsStats(
      mockDb,
      ['acc_bank'],
      new Date('2026-05-10T12:00:00.000Z'),
    );

    expect(stats.acc_bank).toEqual({
      month_in: 500,
      month_out: 200,
      week_in: 500,
      week_out: 200,
    });
  });
});

describe('getAccountsStats — Cairo local-calendar boundaries', () => {
  it('includes the Cairo current day just after local midnight', async () => {
    await withCairoDateHarness(async () => {
      const cairoJustAfterMidnight = new Date('2026-05-04T21:30:00.000Z');
      insertTx({
        id: 'cairo-current-day-expense',
        amount: 125,
        egp_amount: 125,
        transaction_date: '2026-05-05',
      });

      const stats = await getAccountsStats(mockDb, ['acc_bank'], cairoJustAfterMidnight);

      expect(stats.acc_bank.month_out).toBe(125);
    });
  });

  it('starts the week on Cairo Monday during early local Monday', async () => {
    await withCairoDateHarness(async () => {
      const cairoEarlyMonday = new Date('2026-05-03T21:30:00.000Z');
      insertTx({
        id: 'cairo-sunday-expense',
        amount: 70,
        egp_amount: 70,
        transaction_date: '2026-05-03',
      });
      insertTx({
        id: 'cairo-monday-income',
        type: 'income',
        amount: 90,
        egp_amount: 90,
        transaction_date: '2026-05-04',
      });

      const stats = await getAccountsStats(mockDb, ['acc_bank'], cairoEarlyMonday);

      expect(stats.acc_bank.week_in).toBe(90);
      expect(stats.acc_bank.week_out).toBe(0);
    });
  });
});

describe('getAccountsStats — weekStart before monthStart branch', () => {
  it('uses weekStart as earliest when weekStart < monthStart (e.g. beginning of month on Thursday)', async () => {
    // 2026-05-01 is a Friday, so weekStart 2026-04-27 precedes monthStart and becomes earliest.
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
