import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { getTrailingIncomeSuggestion } from '@/database/budget_stats';
import { MIGRATIONS } from '@/database/migrations';

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

  // Seed: account + income-type category
  const now = '2026-05-01T00:00:00.000Z';
  realDb
    .prepare(
      `INSERT INTO accounts (id,name,type,currency,opening_balance,current_balance,
       interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc1','Bank','bank','EGP',0,0,0,0,0,?,?)`,
    )
    .run(now, now);
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getTrailingIncomeSuggestion
>[0];

function insertIncomeTx(id: string, amount: number, date: string) {
  const now = new Date().toISOString();
  realDb
    .prepare(
      `INSERT OR IGNORE INTO transactions
       (id,type,amount,currency,egp_amount,account_id,category_id,
        transaction_date,transaction_time,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(id, 'income', amount, 'EGP', amount, 'acc1', 'cat_salary', date, '00:00:00', now, now);
}

describe('getTrailingIncomeSuggestion', () => {
  beforeEach(() => {
    realDb.exec(`DELETE FROM transactions`);
  });

  it('returns null when there are no income transactions', async () => {
    const result = await getTrailingIncomeSuggestion(mockDb, '2026-05');
    expect(result).toBeNull();
  });

  it('returns null when income exists only in the current month (no complete months)', async () => {
    insertIncomeTx('tx1', 10000, '2026-05-10');
    const result = await getTrailingIncomeSuggestion(mockDb, '2026-05');
    expect(result).toBeNull();
  });

  it('returns the rounded monthly average over up to 3 complete months', async () => {
    // 3 months: Feb=12000, Mar=15000, Apr=18000 → avg=15000
    insertIncomeTx('tx-feb', 12000, '2026-02-10');
    insertIncomeTx('tx-mar', 15000, '2026-03-15');
    insertIncomeTx('tx-apr', 18000, '2026-04-20');
    const result = await getTrailingIncomeSuggestion(mockDb, '2026-05');
    expect(result).toBe(15000);
  });

  it('averages only the 3 most recent complete months when more exist', async () => {
    // 4 months: Jan=6000, Feb=12000, Mar=15000, Apr=18000 → avg of last 3 = 15000
    insertIncomeTx('tx-jan', 6000, '2026-01-05');
    insertIncomeTx('tx-feb', 12000, '2026-02-10');
    insertIncomeTx('tx-mar', 15000, '2026-03-15');
    insertIncomeTx('tx-apr', 18000, '2026-04-20');
    const result = await getTrailingIncomeSuggestion(mockDb, '2026-05');
    expect(result).toBe(15000);
  });

  it('rounds to nearest integer', async () => {
    // 2 months: Feb=10000, Mar=11001 → avg=10500.5 → rounds to 10501
    insertIncomeTx('tx-feb', 10000, '2026-02-10');
    insertIncomeTx('tx-mar', 11001, '2026-03-15');
    const result = await getTrailingIncomeSuggestion(mockDb, '2026-05');
    expect(result).toBe(10501);
  });
});
