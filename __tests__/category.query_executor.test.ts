import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import {
  addCategory,
  deleteCategory,
  getCategories,
  getCategoriesByType,
  reassignCategory,
  updateCategory,
} from '@/database/categories';
import { CategoryType } from '@/constants/enums';
import type { Category } from '@/database/entities/category.entity';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getAllAsync: jest.Mock;
        execAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 1 };
  });

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });

  mocked.execAsync.mockImplementation(async (sql: string) => {
    realDb.exec(sql);
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM categories WHERE is_default = 0');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getCategories
>[0];

const customRow: Omit<Category, 'created_at' | 'updated_at'> = {
  id: 'test-custom-1',
  name: 'My Custom',
  type: CategoryType.Expense,
  icon: 'star',
  color: '#C9973A',
  is_default: 0,
  sort_order: 99,
};

describe('getCategories', () => {
  it('returns all 28 default rows (27 original + cat_other_income from migration009)', async () => {
    const rows = await getCategories(mockDb);
    expect(rows).toHaveLength(28);
  });

  it('orders by type then sort_order', async () => {
    const rows = await getCategories(mockDb);
    const expenseRows = rows.filter((r) => r.type === 'expense');
    const incomeRows = rows.filter((r) => r.type === 'income');
    expect(expenseRows[0].id).toBe('cat_housing');
    expect(incomeRows[0].id).toBe('cat_salary');
  });
});

describe('getCategoriesByType', () => {
  it('returns 22 expense categories', async () => {
    const rows = await getCategoriesByType(mockDb, 'expense');
    expect(rows).toHaveLength(22);
    expect(rows.every((r) => r.type === 'expense')).toBe(true);
  });

  it('returns 6 income categories (5 original + cat_other_income from migration009)', async () => {
    const rows = await getCategoriesByType(mockDb, 'income');
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.type === 'income')).toBe(true);
  });
});

describe('addCategory', () => {
  it('inserts a new row', async () => {
    const now = new Date().toISOString();
    await addCategory(mockDb, { ...customRow, created_at: now, updated_at: now });
    const row = realDb.prepare("SELECT * FROM categories WHERE id = 'test-custom-1'").get();
    expect(row).toBeDefined();
  });

  it('persists all fields correctly', async () => {
    const now = new Date().toISOString();
    await addCategory(mockDb, { ...customRow, created_at: now, updated_at: now });
    const row = realDb
      .prepare("SELECT * FROM categories WHERE id = 'test-custom-1'")
      .get() as Category;
    expect(row.name).toBe('My Custom');
    expect(row.type).toBe('expense');
    expect(row.icon).toBe('star');
    expect(row.color).toBe('#C9973A');
    expect(row.is_default).toBe(0);
  });
});

describe('updateCategory', () => {
  it('updates name, icon, and color', async () => {
    const now = new Date().toISOString();
    await addCategory(mockDb, { ...customRow, created_at: now, updated_at: now });
    await updateCategory(mockDb, 'test-custom-1', {
      name: 'Updated',
      icon: 'heart',
      color: '#4CAF82',
      updated_at: new Date().toISOString(),
    });
    const row = realDb
      .prepare("SELECT * FROM categories WHERE id = 'test-custom-1'")
      .get() as Category;
    expect(row.name).toBe('Updated');
    expect(row.icon).toBe('heart');
    expect(row.color).toBe('#4CAF82');
  });
});

describe('deleteCategory', () => {
  it('removes the row', async () => {
    const now = new Date().toISOString();
    await addCategory(mockDb, { ...customRow, created_at: now, updated_at: now });
    await deleteCategory(mockDb, 'test-custom-1');
    const row = realDb.prepare("SELECT * FROM categories WHERE id = 'test-custom-1'").get();
    expect(row).toBeUndefined();
  });
});

describe('reassignCategory', () => {
  it('updates category_id on all matching transactions', async () => {
    const now = new Date().toISOString();
    realDb
      .prepare(
        `INSERT INTO accounts (id,name,type,currency,opening_balance,current_balance,
       interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc1','Bank','bank','EGP',0,0,0,0,0,?,?)`,
      )
      .run(now, now);
    realDb
      .prepare(
        `INSERT INTO transactions (id,type,amount,currency,egp_amount,account_id,
       category_id,transaction_date,transaction_time,created_at,updated_at)
       VALUES ('tx1','expense',100,'EGP',100,'acc1','cat_housing','2026-01-01','12:00:00',?,?)`,
      )
      .run(now, now);

    await reassignCategory(mockDb, 'cat_housing', 'cat_other_expense');

    const row = realDb.prepare("SELECT category_id FROM transactions WHERE id = 'tx1'").get() as {
      category_id: string;
    };
    expect(row.category_id).toBe('cat_other_expense');
  });
});
