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
  it('updates budget_group for a category', async () => {
    await setCategoryGroup(mockDb, 'cat_housing', BudgetGroup.Need);
    const cats = await getCategories(mockDb);
    const housing = cats.find((c) => c.id === 'cat_housing');
    expect(housing?.budget_group).toBe(BudgetGroup.Need);
  });

  it('sets budget_group to null', async () => {
    await setCategoryGroup(mockDb, 'cat_housing', null);
    const cats = await getCategories(mockDb);
    const housing = cats.find((c) => c.id === 'cat_housing');
    expect(housing?.budget_group).toBeNull();
  });
});
