import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { CategoryType } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { CategoryRepository, type NewCategoryInput } from '@/repositories/category.repository';

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

const repo = new CategoryRepository();

const baseInput: NewCategoryInput = {
  name: 'Travel',
  type: CategoryType.Expense,
  icon: 'airplane',
  color: '#185FA5',
};

describe('CategoryRepository.getAll', () => {
  it('returns all 28 defaults (27 original + cat_other_income from migration009)', async () => {
    const cats = await repo.getAll();
    expect(cats).toHaveLength(28);
  });

  it('returns custom categories alongside defaults after add', async () => {
    await repo.add(baseInput);
    const cats = await repo.getAll();
    expect(cats).toHaveLength(29);
  });
});

describe('CategoryRepository.getAllByType', () => {
  it('returns only expense categories', async () => {
    const cats = await repo.getAllByType('expense');
    expect(cats.every((c) => c.type === 'expense')).toBe(true);
  });

  it('returns only income categories', async () => {
    const cats = await repo.getAllByType('income');
    expect(cats.every((c) => c.type === 'income')).toBe(true);
  });
});

describe('CategoryRepository.add', () => {
  it('generates a UUID id', async () => {
    await repo.add(baseInput);
    const row = realDb.prepare("SELECT id FROM categories WHERE name = 'Travel'").get() as {
      id: string;
    };
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('sets is_default = 0', async () => {
    await repo.add(baseInput);
    const row = realDb.prepare("SELECT is_default FROM categories WHERE name = 'Travel'").get() as {
      is_default: number;
    };
    expect(row.is_default).toBe(0);
  });

  it('writes ISO 8601 timestamps', async () => {
    await repo.add(baseInput);
    const row = realDb
      .prepare("SELECT created_at, updated_at FROM categories WHERE name = 'Travel'")
      .get() as { created_at: string; updated_at: string };
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('assigns sort_order after last existing category of same type', async () => {
    await repo.add(baseInput);
    const row = realDb.prepare("SELECT sort_order FROM categories WHERE name = 'Travel'").get() as {
      sort_order: number;
    };
    expect(row.sort_order).toBeGreaterThan(21);
  });
});

describe('CategoryRepository.update', () => {
  it('updates name, icon, and color', async () => {
    await repo.add(baseInput);
    const id = (
      realDb.prepare("SELECT id FROM categories WHERE name = 'Travel'").get() as { id: string }
    ).id;

    await repo.update(id, { name: 'Vacation', icon: 'beach', color: '#3D7A5F' });

    const row = realDb.prepare('SELECT name, icon, color FROM categories WHERE id = ?').get(id) as {
      name: string;
      icon: string;
      color: string;
    };
    expect(row.name).toBe('Vacation');
    expect(row.icon).toBe('beach');
    expect(row.color).toBe('#3D7A5F');
  });

  it('updates updated_at timestamp', async () => {
    await repo.add(baseInput);
    const id = (
      realDb.prepare("SELECT id FROM categories WHERE name = 'Travel'").get() as { id: string }
    ).id;
    const before = (
      realDb.prepare('SELECT updated_at FROM categories WHERE id = ?').get(id) as {
        updated_at: string;
      }
    ).updated_at;

    await new Promise((r) => setTimeout(r, 10));
    await repo.update(id, { name: 'x', icon: 'star', color: '#fff' });

    const after = (
      realDb.prepare('SELECT updated_at FROM categories WHERE id = ?').get(id) as {
        updated_at: string;
      }
    ).updated_at;
    expect(after).not.toBe(before);
  });
});

describe('CategoryRepository.delete', () => {
  it('removes the row', async () => {
    await repo.add(baseInput);
    const id = (
      realDb.prepare("SELECT id FROM categories WHERE name = 'Travel'").get() as { id: string }
    ).id;

    await repo.delete(id);

    const row = realDb.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    expect(row).toBeUndefined();
  });
});

describe('CategoryRepository.reassignAndDelete', () => {
  it('deletes the source category (no-op reassign in M2a)', async () => {
    await repo.add(baseInput);
    const id = (
      realDb.prepare("SELECT id FROM categories WHERE name = 'Travel'").get() as { id: string }
    ).id;

    await repo.reassignAndDelete(id, 'cat_other_expense');

    const row = realDb.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    expect(row).toBeUndefined();
  });
});
