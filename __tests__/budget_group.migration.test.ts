import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';

describe('migration 012 — budget_group', () => {
  let db: ReturnType<typeof Database>;

  beforeAll(() => {
    db = new Database(':memory:');
    db.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  });

  afterAll(() => db.close());

  it('adds budget_group column to categories with NULL default', () => {
    const cols = db.prepare('PRAGMA table_info(categories)').all() as {
      name: string;
      dflt_value: string | null;
      notnull: number;
    }[];
    const col = cols.find((c) => c.name === 'budget_group');
    expect(col).toBeDefined();
    expect(col!.notnull).toBe(0);
    expect(col!.dflt_value).toBeNull();
  });

  it('rejects invalid budget_group values', () => {
    expect(() =>
      db.prepare(`UPDATE categories SET budget_group = 'invalid' WHERE id = 'cat_housing'`).run(),
    ).toThrow();
  });

  it('accepts need, want, savings, and NULL', () => {
    expect(() =>
      db.prepare(`UPDATE categories SET budget_group = 'need' WHERE id = 'cat_housing'`).run(),
    ).not.toThrow();
    expect(() =>
      db.prepare(`UPDATE categories SET budget_group = 'want' WHERE id = 'cat_dining_out'`).run(),
    ).not.toThrow();
    expect(() =>
      db.prepare(`UPDATE categories SET budget_group = 'savings' WHERE id = 'cat_savings'`).run(),
    ).not.toThrow();
    expect(() =>
      db.prepare(`UPDATE categories SET budget_group = NULL WHERE id = 'cat_other_expense'`).run(),
    ).not.toThrow();
  });

  it('backfills seeded categories to their groups', () => {
    const groupOf = (id: string) =>
      (
        db.prepare(`SELECT budget_group FROM categories WHERE id = ?`).get(id) as {
          budget_group: string | null;
        }
      ).budget_group;
    expect(groupOf('cat_housing')).toBe('need');
    expect(groupOf('cat_phone_internet')).toBe('need');
    expect(groupOf('cat_debt_payment')).toBe('need');
    expect(groupOf('cat_dining_out')).toBe('want');
    expect(groupOf('cat_entertainment')).toBe('want');
  });

  it('inserts cat_savings with group savings', () => {
    const row = db.prepare(`SELECT * FROM categories WHERE id = 'cat_savings'`).get() as {
      name: string;
      type: string;
      budget_group: string;
    };
    expect(row).toBeDefined();
    expect(row.name).toBe('Savings & Investments');
    expect(row.type).toBe('expense');
    expect(row.budget_group).toBe('savings');
  });

  it('sets Money Transfer and Other to NULL group', () => {
    const rows = db
      .prepare(
        `SELECT id, budget_group FROM categories WHERE id IN ('cat_money_transfer','cat_other_expense')`,
      )
      .all() as { id: string; budget_group: string | null }[];
    for (const r of rows) {
      expect(r.budget_group).toBeNull();
    }
  });
});
