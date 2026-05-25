import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';

describe('budgets migration', () => {
  it('creates a budgets table with the effective-dated columns and unique constraint', () => {
    const db = new Database(':memory:');
    db.exec(MIGRATIONS.map((m) => m.up).join('\n'));

    const cols = db.prepare(`PRAGMA table_info(budgets)`).all() as { name: string }[];
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(
      ['category_id', 'created_at', 'effective_from', 'id', 'limit_amount', 'updated_at'].sort(),
    );

    const NOW = '2026-05-01T00:00:00.000Z';
    db.prepare(
      `INSERT INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
       VALUES ('cat_x','X','expense','tag','#fff',0,0,?,?)`,
    ).run(NOW, NOW);
    const ins = db.prepare(
      `INSERT INTO budgets (id,category_id,limit_amount,effective_from,created_at,updated_at)
       VALUES (?,?,?,?,?,?)`,
    );
    ins.run('b1', 'cat_x', 3000, '2026-05', NOW, NOW);
    expect(() => ins.run('b2', 'cat_x', 3500, '2026-05', NOW, NOW)).toThrow();

    db.close();
  });
});
