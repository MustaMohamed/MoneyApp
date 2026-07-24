import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import {
  getBudgetRows,
  getBudgetRowsForMonths,
  setBudgetRow,
} from '@/modules/budget/database/budgets';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;
const NOW = '2026-05-01T00:00:00.000Z';

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.pragma('foreign_keys = ON');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  realDb
    .prepare(
      `INSERT OR IGNORE INTO accounts
       (id,name,type,currency,opening_balance,current_balance,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc_main','Main','bank','EGP',0,0,0,0,?,?)`,
    )
    .run(NOW, NOW);
  realDb
    .prepare(
      `INSERT OR IGNORE INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
       VALUES ('cat_food','Food','expense','tag','#fff',1,0,?,?)`,
    )
    .run(NOW, NOW);

  const fake = (SQLite as unknown as { __fakeDb: { getAllAsync: jest.Mock; runAsync: jest.Mock } })
    .__fakeDb;
  fake.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });
  fake.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 1 };
  });
});

beforeEach(() => realDb.exec('DELETE FROM transactions; DELETE FROM budgets'));
afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const db = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getBudgetRows
>[0];
const fakeDb = (
  SQLite as unknown as {
    __fakeDb: { getAllAsync: jest.Mock; runAsync: jest.Mock };
  }
).__fakeDb;

describe('budgets query file', () => {
  function insertAssignedTransaction(id: string, budgetId: string) {
    realDb
      .prepare(
        `INSERT INTO transactions
         (id,type,amount,currency,egp_amount,account_id,category_id,budget_id,
          transaction_date,transaction_time,created_at,updated_at)
         VALUES (?,'expense',100,'EGP',100,'acc_main','cat_food',?,
                 '2026-05-10','10:00:00',?,?)`,
      )
      .run(id, budgetId, NOW, NOW);
  }

  it('setBudgetRow inserts and getBudgetRows reads it back', async () => {
    await setBudgetRow(db, {
      id: 'b1',
      category_id: 'cat_food',
      name: 'Monthly Food',
      limit_amount: 3000,
      effective_from: '2026-05',
      created_at: NOW,
      updated_at: NOW,
    });
    const rows = await getBudgetRows(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Monthly Food');
    expect(rows[0].limit_amount).toBe(3000);
  });

  it('returns no rows without querying SQLite when no months are requested', async () => {
    fakeDb.getAllAsync.mockClear();

    await expect(getBudgetRowsForMonths(db, [])).resolves.toEqual([]);

    expect(fakeDb.getAllAsync).not.toHaveBeenCalled();
  });

  it('returns only the requested 12-month window', async () => {
    const months = Array.from({ length: 24 }, (_, index) => {
      const date = new Date(Date.UTC(2024, 7 + index, 1));
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });
    for (const [index, month] of months.entries()) {
      await setBudgetRow(db, {
        id: `budget-${index}`,
        category_id: 'cat_food',
        name: `Food ${index}`,
        limit_amount: index + 1,
        effective_from: month,
        created_at: `${month}-01T00:00:00.000Z`,
        updated_at: `${month}-01T00:00:00.000Z`,
      });
    }

    const rows = await getBudgetRowsForMonths(db, months.slice(12));

    expect(rows.map((row) => row.effective_from)).toEqual(months.slice(12));
    expect(rows).toHaveLength(12);
    expect(rows).not.toContainEqual(expect.objectContaining({ effective_from: months[0] }));
    expect(rows).not.toContainEqual(expect.objectContaining({ effective_from: months[11] }));
  });

  it('deduplicates requested months before building placeholders and arguments', async () => {
    fakeDb.getAllAsync.mockClear();

    await getBudgetRowsForMonths(db, ['2026-04', '2026-05', '2026-04']);

    expect(fakeDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('IN (?, ?)'),
      '2026-04',
      '2026-05',
    );
  });

  it('uses the existing month index for explicit month reads', () => {
    const plan = realDb
      .prepare('EXPLAIN QUERY PLAN SELECT * FROM budgets WHERE effective_from IN (?, ?)')
      .all('2026-04', '2026-05') as { detail: string }[];

    expect(plan.some(({ detail }) => detail.includes('idx_budgets_month'))).toBe(true);
  });

  it('allows multiple named budgets in one category month', async () => {
    const base = {
      category_id: 'cat_food',
      effective_from: '2026-05',
      created_at: NOW,
      updated_at: NOW,
    };
    await setBudgetRow(db, { id: 'b1', name: 'Monthly Food', limit_amount: 3000, ...base });
    await setBudgetRow(db, { id: 'b2', name: 'Trip Food', limit_amount: 1500, ...base });
    const rows = await getBudgetRows(db);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.name)).toEqual(['Monthly Food', 'Trip Food']);
  });

  it('upserts a same category/month/name without replacing the existing row identity', async () => {
    const base = {
      category_id: 'cat_food',
      name: 'Monthly Food',
      effective_from: '2026-05',
      created_at: NOW,
      updated_at: NOW,
    };
    await setBudgetRow(db, { id: 'b1', limit_amount: 3000, ...base });
    await setBudgetRow(db, { id: 'b2', limit_amount: 3500, ...base });
    const rows = await getBudgetRows(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('b1');
    expect(rows[0].limit_amount).toBe(3500);
  });

  it('preserves transaction assignment when editing an existing budget', async () => {
    const base = {
      id: 'b1',
      category_id: 'cat_food',
      effective_from: '2026-05',
      created_at: NOW,
      updated_at: NOW,
    };
    await setBudgetRow(db, { ...base, name: 'Monthly Food', limit_amount: 3000 });
    insertAssignedTransaction('tx-edit', 'b1');

    await setBudgetRow(db, {
      ...base,
      name: 'Monthly Food Updated',
      limit_amount: 3500,
      updated_at: '2026-05-02T00:00:00.000Z',
    });

    expect(
      realDb.prepare('SELECT budget_id FROM transactions WHERE id = ?').get('tx-edit'),
    ).toEqual({ budget_id: 'b1' });
  });

  it('preserves target transaction assignment when copy-over updates its limit', async () => {
    const target = {
      id: 'target-budget',
      category_id: 'cat_food',
      name: 'Monthly Food',
      effective_from: '2026-05',
      created_at: NOW,
      updated_at: NOW,
    };
    await setBudgetRow(db, { ...target, limit_amount: 3000 });
    insertAssignedTransaction('tx-copy', 'target-budget');

    await setBudgetRow(db, {
      ...target,
      limit_amount: 5000,
      updated_at: '2026-05-02T00:00:00.000Z',
    });

    expect(
      realDb.prepare('SELECT budget_id FROM transactions WHERE id = ?').get('tx-copy'),
    ).toEqual({ budget_id: 'target-budget' });
  });

  it('rejects null limit amounts because budgets are monthly rows now', async () => {
    await expect(
      setBudgetRow(db, {
        id: 'b1',
        category_id: 'cat_food',
        name: 'Monthly Food',
        limit_amount: null as unknown as number,
        effective_from: '2026-06',
        created_at: NOW,
        updated_at: NOW,
      }),
    ).rejects.toThrow();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-positive or non-finite limit amount %s',
    async (limitAmount) => {
      await expect(
        setBudgetRow(db, {
          id: 'invalid-budget',
          category_id: 'cat_food',
          name: 'Invalid Budget',
          limit_amount: limitAmount,
          effective_from: '2026-06',
          created_at: NOW,
          updated_at: NOW,
        }),
      ).rejects.toThrow('Budget limit amount must be a finite positive number');
      expect(await getBudgetRows(db)).toEqual([]);
    },
  );
});
