import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';
import { registerOpenDbsDrain } from '@/test_helpers/sqlite_drain';

const openDbs = registerOpenDbsDrain();

describe('budgets migration', () => {
  it('creates a named monthly budgets table with category/month/name uniqueness', () => {
    const db = new Database(':memory:');
    openDbs.push(db);
    db.exec(MIGRATIONS.map((m) => m.up).join('\n'));

    const cols = db.prepare(`PRAGMA table_info(budgets)`).all() as { name: string }[];
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(
      [
        'category_id',
        'created_at',
        'effective_from',
        'id',
        'limit_amount',
        'name',
        'updated_at',
      ].sort(),
    );

    const NOW = '2026-05-01T00:00:00.000Z';
    db.prepare(
      `INSERT INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
       VALUES ('cat_x','X','expense','tag','#fff',0,0,?,?)`,
    ).run(NOW, NOW);
    const ins = db.prepare(
      `INSERT INTO budgets (id,category_id,name,limit_amount,effective_from,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?)`,
    );
    ins.run('b1', 'cat_x', 'Monthly Food', 3000, '2026-05', NOW, NOW);
    ins.run('b2', 'cat_x', 'Trip Food', 1500, '2026-05', NOW, NOW);
    expect(() => ins.run('b3', 'cat_x', 'Monthly Food', 3500, '2026-05', NOW, NOW)).toThrow();
  });

  it('migrates existing category/month budgets with the category name as budget name', () => {
    const db = new Database(':memory:');
    openDbs.push(db);
    const migrationsThrough012 = MIGRATIONS.filter((migration) => migration.version <= 12);
    db.exec(migrationsThrough012.map((m) => m.up).join('\n'));

    const NOW = '2026-05-01T00:00:00.000Z';
    db.prepare(
      `INSERT INTO budgets (id,category_id,limit_amount,effective_from,created_at,updated_at)
       VALUES ('b1','cat_food',5000,'2026-07',?,?)`,
    ).run(NOW, NOW);

    const migration013 = MIGRATIONS.find((migration) => migration.version === 13);
    expect(migration013).toBeDefined();
    db.exec(migration013!.up);

    const row = db.prepare(`SELECT name, limit_amount FROM budgets WHERE id = 'b1'`).get() as {
      name: string;
      limit_amount: number;
    };
    expect(row.name).toBe('Food & Dining');
    expect(row.limit_amount).toBe(5000);
  });
});
