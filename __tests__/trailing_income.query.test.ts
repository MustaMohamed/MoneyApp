import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { getTrailingIncomeSuggestion } from '@/modules/budget/database/budget_stats';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  const mocked = (
    SQLite as unknown as {
      __fakeDb: { getFirstAsync: jest.Mock; getAllAsync: jest.Mock };
    }
  ).__fakeDb;

  mocked.getFirstAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).get(...(params as never[])) ?? null;
  });

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });

  // Seed: account + income transactions
  const now = '2026-05-01T00:00:00.000Z';
  realDb
    .prepare(
      `INSERT INTO accounts (id,name,type,currency,opening_balance,current_balance,
       interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc1','Bank','bank','EGP',0,0,0,0,0,?,?)`,
    )
    .run(now, now);

  // Insert 3 months of income: Feb=10000, Mar=20000, Apr=30000
  // currentYearMonth in tests = '2026-05' so all three are complete months
  for (const [month, amount] of [
    ['2026-02', 10000],
    ['2026-03', 20000],
    ['2026-04', 30000],
  ] as const) {
    realDb
      .prepare(
        `INSERT INTO transactions
         (id, account_id, type, amount, currency, egp_amount, transaction_date, transaction_time, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        `tx-${month}`,
        'acc1',
        'income',
        amount,
        'EGP',
        amount,
        `${month}-15`,
        '12:00',
        now,
        now,
      );
  }
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getTrailingIncomeSuggestion
>[0];

describe('getTrailingIncomeSuggestion', () => {
  it('returns rounded average of last 3 complete months', async () => {
    // avg(10000, 20000, 30000) = 20000
    const result = await getTrailingIncomeSuggestion(mockDb, '2026-05', 3);
    expect(result).toBe(20000);
  });

  it('uses default window size of 3 when not specified', async () => {
    // Default windowMonths = 3, avg(10000, 20000, 30000) = 20000
    const result = await getTrailingIncomeSuggestion(mockDb, '2026-05');
    expect(result).toBe(20000);
  });

  it('uses window size — last 2 months gives avg of Mar+Apr', async () => {
    // avg(20000, 30000) = 25000
    const result = await getTrailingIncomeSuggestion(mockDb, '2026-05', 2);
    expect(result).toBe(25000);
  });

  it('returns null when no income transactions exist before the current month', async () => {
    // No transactions before '2020-01'
    const result = await getTrailingIncomeSuggestion(mockDb, '2020-01', 3);
    expect(result).toBeNull();
  });
});
