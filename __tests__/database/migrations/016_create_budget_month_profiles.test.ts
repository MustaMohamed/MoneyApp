import Database from 'better-sqlite3';

import { MIGRATIONS, type Migration } from '@/database/migrations';

const NOW = '2026-07-16T00:00:00.000Z';

function getMigration016(): Migration | undefined {
  const migration = MIGRATIONS.find(({ version }) => version === 16);
  expect(migration).toBeDefined();
  return migration;
}

function createDatabaseThrough015(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(
    MIGRATIONS.filter(({ version }) => version <= 15)
      .map(({ up }) => up)
      .join('\n'),
  );
  return db;
}

describe('migration016 - budget month profiles', () => {
  it('creates month settings and category group snapshot tables with the approved schema', () => {
    const migration = getMigration016();
    if (!migration) return;
    const db = createDatabaseThrough015();

    db.exec(migration.up);

    const settingsColumns = db.prepare('PRAGMA table_info(budget_month_settings)').all() as {
      name: string;
      notnull: number;
      pk: number;
    }[];
    const groupColumns = db.prepare('PRAGMA table_info(budget_month_category_groups)').all() as {
      name: string;
      notnull: number;
      pk: number;
    }[];
    const groupForeignKeys = db
      .prepare('PRAGMA foreign_key_list(budget_month_category_groups)')
      .all() as { from: string; on_delete: string; table: string; to: string }[];

    expect(settingsColumns.map(({ name }) => name)).toEqual([
      'year_month',
      'expected_income',
      'created_at',
      'updated_at',
    ]);
    expect(settingsColumns.every(({ notnull }) => notnull === 1)).toBe(true);
    expect(settingsColumns.find(({ name }) => name === 'year_month')?.pk).toBe(1);
    expect(groupColumns.map(({ name }) => name)).toEqual([
      'year_month',
      'category_id',
      'budget_group',
      'created_at',
      'updated_at',
    ]);
    expect(groupColumns.filter(({ pk }) => pk > 0).map(({ name }) => name)).toEqual([
      'year_month',
      'category_id',
    ]);
    expect(groupForeignKeys).toContainEqual(
      expect.objectContaining({
        from: 'category_id',
        on_delete: 'CASCADE',
        table: 'categories',
        to: 'id',
      }),
    );

    db.close();
  });

  it('seeds a valid positive legacy income into the current local month', () => {
    const migration = getMigration016();
    if (!migration) return;
    const db = createDatabaseThrough015();
    db.prepare("INSERT INTO app_settings (key, value) VALUES ('expected_monthly_income', ?)").run(
      '25000.5',
    );

    db.exec(migration.up);

    const currentMonth = db
      .prepare("SELECT strftime('%Y-%m', 'now', 'localtime') AS value")
      .get() as { value: string };
    const row = db.prepare('SELECT * FROM budget_month_settings').get() as {
      created_at: string;
      expected_income: number;
      updated_at: string;
      year_month: string;
    };
    expect(row).toMatchObject({ year_month: currentMonth.value, expected_income: 25000.5 });
    expect(row.created_at).toEqual(expect.any(String));
    expect(row.updated_at).toEqual(expect.any(String));

    db.close();
  });

  it.each(['0', '-500', 'not-a-number'])(
    'does not seed invalid legacy income %s',
    (legacyIncome) => {
      const migration = getMigration016();
      if (!migration) return;
      const db = createDatabaseThrough015();
      db.prepare("INSERT INTO app_settings (key, value) VALUES ('expected_monthly_income', ?)").run(
        legacyIncome,
      );

      db.exec(migration.up);

      expect(db.prepare('SELECT * FROM budget_month_settings').all()).toEqual([]);
      db.close();
    },
  );

  it('best-effort snapshots grouped categories for every existing budget month', () => {
    const migration = getMigration016();
    if (!migration) return;
    const db = createDatabaseThrough015();
    const insertBudget = db.prepare(
      `INSERT INTO budgets
       (id, category_id, name, limit_amount, effective_from, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    insertBudget.run('june-housing', 'cat_housing', 'Housing', 5000, '2026-06', NOW, NOW);
    insertBudget.run('july-food', 'cat_food', 'Food', 3000, '2026-07', NOW, NOW);
    insertBudget.run('july-other', 'cat_other_expense', 'Other', 500, '2026-07', NOW, NOW);

    db.exec(migration.up);

    expect(
      db
        .prepare(
          `SELECT year_month, category_id, budget_group
           FROM budget_month_category_groups
           ORDER BY year_month, category_id`,
        )
        .all(),
    ).toEqual([
      { year_month: '2026-06', category_id: 'cat_housing', budget_group: 'need' },
      { year_month: '2026-07', category_id: 'cat_food', budget_group: 'want' },
    ]);

    db.close();
  });

  it('rejects non-positive income and unsupported budget groups', () => {
    const migration = getMigration016();
    if (!migration) return;
    const db = createDatabaseThrough015();
    db.exec(migration.up);

    expect(() =>
      db
        .prepare(
          `INSERT INTO budget_month_settings
           (year_month, expected_income, created_at, updated_at)
           VALUES ('2026-07', 0, ?, ?)`,
        )
        .run(NOW, NOW),
    ).toThrow();
    expect(() =>
      db
        .prepare(
          `INSERT INTO budget_month_category_groups
           (year_month, category_id, budget_group, created_at, updated_at)
           VALUES ('2026-07', 'cat_housing', 'other', ?, ?)`,
        )
        .run(NOW, NOW),
    ).toThrow();

    db.close();
  });
});
