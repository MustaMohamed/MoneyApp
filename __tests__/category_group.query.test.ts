import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { BudgetGroup } from '@/constants/enums';
import { getCategories, setCategoryGroup } from '@/database/categories';
import { MIGRATIONS } from '@/database/migrations';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  const mocked = (
    SQLite as unknown as {
      __fakeDb: { runAsync: jest.Mock; getAllAsync: jest.Mock };
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
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getCategories
>[0];

describe('setCategoryGroup', () => {
  it('updates budget_group to a valid group', async () => {
    await setCategoryGroup(mockDb, 'cat_housing', BudgetGroup.Need);
    const row = realDb
      .prepare('SELECT budget_group FROM categories WHERE id = ?')
      .get('cat_housing') as { budget_group: string };
    expect(row.budget_group).toBe('need');
  });

  it('sets budget_group to null', async () => {
    await setCategoryGroup(mockDb, 'cat_housing', null);
    const row = realDb
      .prepare('SELECT budget_group FROM categories WHERE id = ?')
      .get('cat_housing') as { budget_group: string | null };
    expect(row.budget_group).toBeNull();
  });
});

describe('getCategories returns budget_group', () => {
  it('includes budget_group field on every row', async () => {
    const rows = await getCategories(mockDb);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      // budget_group may be null or a string — key must exist
      expect('budget_group' in r).toBe(true);
    }
  });

  it('cat_savings has budget_group savings', async () => {
    const rows = await getCategories(mockDb);
    const savings = rows.find((r) => r.id === 'cat_savings');
    expect(savings).toBeDefined();
    expect(savings!.budget_group).toBe('savings');
  });
});
