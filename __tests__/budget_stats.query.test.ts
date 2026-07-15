import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import {
  getBudgetSpendByMonth,
  getCategorySpendByMonth,
} from '@/modules/budget/database/budget_stats';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;
const NOW = '2026-05-01T00:00:00.000Z';

function tx(o: Record<string, unknown>) {
  const d: Record<string, unknown> = {
    id: 'tx',
    type: 'expense',
    amount: 100,
    currency: 'EGP',
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc',
    to_account_id: null,
    category_id: 'cat_food',
    budget_id: null,
    note: null,
    transaction_date: '2026-05-04',
    transaction_time: '12:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...o,
  };
  const keys = Object.keys(d);
  realDb
    .prepare(
      `INSERT INTO transactions (${keys.join(',')}) VALUES (${keys.map((k) => '@' + k).join(',')})`,
    )
    .run(d);
}

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts (id,name,type,currency,opening_balance,current_balance,interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc','A','bank','EGP',0,0,0,0,0,?,?)`,
    )
    .run(NOW, NOW);
  const fake = (SQLite as unknown as { __fakeDb: { getAllAsync: jest.Mock } }).__fakeDb;
  fake.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM transactions; DELETE FROM budgets;');
});
afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const db = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getCategorySpendByMonth
>[0];

describe('getCategorySpendByMonth', () => {
  it('returns {} for empty months', async () => {
    expect(await getCategorySpendByMonth(db, [])).toEqual({});
  });

  it('sums expense egp_amount per category per month', async () => {
    tx({ id: 't1', egp_amount: 2000, transaction_date: '2026-05-04' });
    tx({ id: 't2', egp_amount: 400, transaction_date: '2026-05-20' });
    tx({ id: 't3', egp_amount: 999, transaction_date: '2026-04-15' });
    const out = await getCategorySpendByMonth(db, ['2026-05', '2026-04']);
    expect(out['cat_food']['2026-05']).toBe(2400);
    expect(out['cat_food']['2026-04']).toBe(999);
  });

  it('uses egp_amount (not native amount) and ignores non-expense types', async () => {
    tx({ id: 't1', currency: 'USD', amount: 50, egp_amount: 2500 });
    tx({ id: 't2', type: 'income', egp_amount: 9999 });
    tx({ id: 't3', type: 'transfer', egp_amount: 8888, to_amount: 8888, to_account_id: 'acc' });
    const out = await getCategorySpendByMonth(db, ['2026-05']);
    expect(out['cat_food']['2026-05']).toBe(2500);
  });

  it('includes commitment-payment expense rows (no special filter)', async () => {
    tx({ id: 't1', egp_amount: 1200, commitment_payment_id: 'cp1' });
    const out = await getCategorySpendByMonth(db, ['2026-05']);
    expect(out['cat_food']['2026-05']).toBe(1200);
  });
});

describe('getBudgetSpendByMonth', () => {
  it('attributes only matching expense category and month rows', async () => {
    realDb
      .prepare(
        `INSERT INTO budgets
         (id, category_id, name, limit_amount, effective_from, created_at, updated_at)
         VALUES ('food_monthly', 'cat_food', 'Monthly meals', 1000, '2026-05', ?, ?)`,
      )
      .run(NOW, NOW);

    tx({ id: 'valid', budget_id: 'food_monthly', egp_amount: 300 });
    tx({ id: 'income', budget_id: 'food_monthly', type: 'income', egp_amount: 900 });
    tx({
      id: 'wrong_category',
      budget_id: 'food_monthly',
      category_id: 'cat_car',
      egp_amount: 500,
    });
    tx({
      id: 'wrong_month',
      budget_id: 'food_monthly',
      transaction_date: '2026-06-01',
      egp_amount: 700,
    });

    await expect(getBudgetSpendByMonth(db, ['2026-05'])).resolves.toEqual({
      food_monthly: 300,
    });
  });

  it('returns an empty record when no months are requested', async () => {
    await expect(getBudgetSpendByMonth(db, [])).resolves.toEqual({});
  });
});
