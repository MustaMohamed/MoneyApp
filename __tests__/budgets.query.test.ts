import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { getBudgetRows, setBudgetRow } from '@/modules/budget/database/budgets';
import { MIGRATIONS } from '@/database/migrations';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;
const NOW = '2026-05-01T00:00:00.000Z';

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));
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

beforeEach(() => realDb.exec('DELETE FROM budgets'));
afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const db = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getBudgetRows
>[0];

describe('budgets query file', () => {
  it('setBudgetRow inserts and getBudgetRows reads it back', async () => {
    await setBudgetRow(db, {
      id: 'b1',
      category_id: 'cat_food',
      limit_amount: 3000,
      effective_from: '2026-05',
      created_at: NOW,
      updated_at: NOW,
    });
    const rows = await getBudgetRows(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].limit_amount).toBe(3000);
  });

  it('INSERT OR REPLACE collapses a same-month re-set onto one row', async () => {
    const base = {
      category_id: 'cat_food',
      effective_from: '2026-05',
      created_at: NOW,
      updated_at: NOW,
    };
    await setBudgetRow(db, { id: 'b1', limit_amount: 3000, ...base });
    await setBudgetRow(db, { id: 'b1', limit_amount: 3500, ...base });
    const rows = await getBudgetRows(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].limit_amount).toBe(3500);
  });

  it('a null limit_amount tombstone persists', async () => {
    await setBudgetRow(db, {
      id: 'b1',
      category_id: 'cat_food',
      limit_amount: null,
      effective_from: '2026-06',
      created_at: NOW,
      updated_at: NOW,
    });
    const rows = await getBudgetRows(db);
    expect(rows[0].limit_amount).toBeNull();
  });
});
