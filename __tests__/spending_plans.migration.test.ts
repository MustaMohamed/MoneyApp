import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';

const openDbs: ReturnType<typeof Database>[] = [];

// afterEach, not the sibling afterAll(close) spelling: a test that throws mid-body still
// reaches this afterEach with its handle already pushed, so afterAll would leave it
// stranded until the file's last test — afterEach drains after every test instead.
afterEach(() => {
  const drained = openDbs.splice(0);
  const closeFailures: unknown[] = [];
  for (const db of drained) {
    try {
      db.close();
    } catch (err) {
      closeFailures.push(err);
    }
  }
  // One assertion, not a bare-boolean loop: it names which drained index(es) are still
  // open AND surfaces every close() error's text in the same failure, so a stranded
  // handle never reports as an anonymous `expect(db.open).toBe(false)` with the real
  // cause silently dropped. Passes only when both are empty, so the throws below are
  // unreachable on green — they exist to preserve stack fidelity on the failure path.
  const stranded = drained.flatMap((db, i) => (db.open ? [i] : []));
  expect({ stranded, closeErrors: closeFailures.map(String) }).toEqual({
    stranded: [],
    closeErrors: [],
  });
  if (closeFailures.length === 1) throw closeFailures[0];
  if (closeFailures.length > 1) throw new AggregateError(closeFailures);
});

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
