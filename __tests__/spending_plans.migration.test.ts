import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';
import { registerOpenDbsDrain } from '@/test_helpers/sqlite_drain';

const openDbs = registerOpenDbsDrain();

describe('spending plans migration', () => {
  it('creates spending plan tables with category/date indexes', () => {
    const db = new Database(':memory:');
    openDbs.push(db);
    db.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));

    const planCols = db.prepare(`PRAGMA table_info(spending_plans)`).all() as { name: string }[];
    expect(planCols.map((col) => col.name).sort()).toEqual(
      ['created_at', 'end_date', 'id', 'name', 'start_date', 'total_amount', 'updated_at'].sort(),
    );

    const categoryCols = db.prepare(`PRAGMA table_info(spending_plan_categories)`).all() as {
      name: string;
    }[];
    expect(categoryCols.map((col) => col.name).sort()).toEqual(
      ['allocated_amount', 'category_id', 'plan_id'].sort(),
    );

    const indexes = db.prepare(`PRAGMA index_list(spending_plan_categories)`).all() as {
      name: string;
    }[];
    expect(indexes.map((index) => index.name)).toContain('idx_spending_plan_categories_category');
    expect(indexes.map((index) => index.name)).toContain('idx_spending_plan_categories_plan');
  });

  it('cascades plan categories when a plan is deleted', () => {
    const db = new Database(':memory:');
    openDbs.push(db);
    db.pragma('foreign_keys = ON');
    db.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));

    const now = '2026-07-09T00:00:00.000Z';
    db.prepare(
      `INSERT INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
       VALUES ('cat_plan_food','Food','expense','food','#fff',0,0,?,?)`,
    ).run(now, now);
    db.prepare(
      `INSERT INTO spending_plans (id,name,start_date,end_date,total_amount,created_at,updated_at)
       VALUES ('plan_trip','Trip','2026-07-18','2026-07-21',8000,?,?)`,
    ).run(now, now);
    db.prepare(
      `INSERT INTO spending_plan_categories (plan_id,category_id,allocated_amount)
       VALUES ('plan_trip','cat_plan_food',3000)`,
    ).run();

    db.prepare(`DELETE FROM spending_plans WHERE id = 'plan_trip'`).run();
    const remaining = db
      .prepare(`SELECT COUNT(*) AS count FROM spending_plan_categories`)
      .get() as { count: number };
    expect(remaining.count).toBe(0);
  });
});
