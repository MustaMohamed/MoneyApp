import Database from 'better-sqlite3';

import { MIGRATIONS, type Migration } from '@/database/migrations';

const openDbs: ReturnType<typeof Database>[] = [];

const NOW = '2026-07-16T00:00:00.000Z';

interface TableInfoRow {
  name: string;
  notnull: number;
  pk: number;
}

interface ForeignKeyRow {
  from: string;
  on_delete: string;
  table: string;
  to: string;
}

interface CurrentMonthRow {
  value: string;
}

interface BudgetMonthSettingRow {
  created_at: string;
  expected_income: number;
  updated_at: string;
  year_month: string;
}

interface BudgetMonthGroupSeedRow {
  budget_group: string;
  category_id: string;
  year_month: string;
}

function getMigration016(): Migration | undefined {
  const migration = MIGRATIONS.find(({ version }) => version === 16);
  expect(migration).toBeDefined();
  return migration;
}

function createDatabaseThrough015(): Database.Database {
  const db = new Database(':memory:');
  openDbs.push(db);
  db.pragma('foreign_keys = ON');
  db.exec(
    MIGRATIONS.filter(({ version }) => version <= 15)
      .map(({ up }) => up)
      .join('\n'),
  );
  return db;
}

// afterEach, not afterAll: a test that throws mid-body still drains its handle here.
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
  // The throws below are unreachable on green; they preserve stack fidelity when it fails.
  const stranded = drained.flatMap((db, i) => (db.open ? [i] : []));
  expect({ stranded, closeErrors: closeFailures.map(String) }).toEqual({
    stranded: [],
    closeErrors: [],
  });
  if (closeFailures.length === 1) throw closeFailures[0];
  if (closeFailures.length > 1) throw new AggregateError(closeFailures);
});

describe('migration016 - budget month profiles', () => {
  it('creates month settings and category group snapshot tables with the approved schema', () => {
    const migration = getMigration016();
    if (!migration) return;
    const db = createDatabaseThrough015();

    db.exec(migration.up);

    const settingsColumns = db
      .prepare<[], TableInfoRow>('PRAGMA table_info(budget_month_settings)')
      .all();
    const groupColumns = db
      .prepare<[], TableInfoRow>('PRAGMA table_info(budget_month_category_groups)')
      .all();
    const groupForeignKeys = db
      .prepare<[], ForeignKeyRow>('PRAGMA foreign_key_list(budget_month_category_groups)')
      .all();

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
  });

  it('seeds a valid positive legacy income into the current local month', () => {
    const migration = getMigration016();
    if (!migration) return;
    const db = createDatabaseThrough015();
    db.prepare<[string]>(
      "INSERT INTO app_settings (key, value) VALUES ('expected_monthly_income', ?)",
    ).run(' 25000.5 ');

    db.exec(migration.up);

    const currentMonth = db
      .prepare<[], CurrentMonthRow>("SELECT strftime('%Y-%m', 'now', 'localtime') AS value")
      .get();
    const row = db.prepare<[], BudgetMonthSettingRow>('SELECT * FROM budget_month_settings').get();
    if (!currentMonth || !row) throw new Error('Expected migration 016 to seed month income');
    expect(row).toMatchObject({ year_month: currentMonth.value, expected_income: 25000.5 });
    expect(row.created_at).toEqual(expect.any(String));
    expect(row.updated_at).toEqual(expect.any(String));
  });

  it.each(['0', '-500', '25000oops', 'not-a-number', '9007199254740992'])(
    'does not seed invalid legacy income %s',
    (legacyIncome) => {
      const migration = getMigration016();
      if (!migration) return;
      const db = createDatabaseThrough015();
      db.prepare<[string]>(
        "INSERT INTO app_settings (key, value) VALUES ('expected_monthly_income', ?)",
      ).run(legacyIncome);

      db.exec(migration.up);

      expect(db.prepare('SELECT * FROM budget_month_settings').all()).toEqual([]);
    },
  );

  it('best-effort snapshots grouped categories for every existing budget month', () => {
    const migration = getMigration016();
    if (!migration) return;
    const db = createDatabaseThrough015();
    const insertBudget = db.prepare<[string, string, string, number, string, string, string]>(
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
  });

  it('does not snapshot a grouped income-category budget', () => {
    const migration = getMigration016();
    if (!migration) return;
    const db = createDatabaseThrough015();
    db.prepare<[string, string]>(
      `INSERT INTO categories
       (id, name, type, icon, color, is_default, sort_order, budget_group, created_at, updated_at)
       VALUES ('cat_grouped_income', 'Grouped Income', 'income', 'cash', '#fff', 0, 100,
               'want', ?, ?)`,
    ).run(NOW, NOW);
    db.prepare<[string, string]>(
      `INSERT INTO budgets
       (id, category_id, name, limit_amount, effective_from, created_at, updated_at)
       VALUES ('income-budget', 'cat_grouped_income', 'Income Budget', 1000, '2026-07', ?, ?)`,
    ).run(NOW, NOW);

    db.exec(migration.up);

    const rows = db
      .prepare<[], BudgetMonthGroupSeedRow>(
        `SELECT year_month, category_id, budget_group
           FROM budget_month_category_groups
          WHERE category_id = 'cat_grouped_income'`,
      )
      .all();
    expect(rows).toEqual([]);
  });

  it('rejects nonnumeric, non-positive, non-finite, or unsafe income values', () => {
    const migration = getMigration016();
    if (!migration) return;
    const db = createDatabaseThrough015();
    db.exec(migration.up);

    const insertIncome = db.prepare<[string | number, string, string]>(
      `INSERT INTO budget_month_settings
       (year_month, expected_income, created_at, updated_at)
       VALUES ('2026-07', ?, ?, ?)`,
    );

    for (const income of [0, 'not-a-number', Number.POSITIVE_INFINITY, 9_007_199_254_740_992]) {
      expect(() => insertIncome.run(income, NOW, NOW)).toThrow();
    }
  });

  it('rejects unsupported budget groups', () => {
    const migration = getMigration016();
    if (!migration) return;
    const db = createDatabaseThrough015();
    db.exec(migration.up);

    expect(() =>
      db
        .prepare<[string, string]>(
          `INSERT INTO budget_month_category_groups
           (year_month, category_id, budget_group, created_at, updated_at)
           VALUES ('2026-07', 'cat_housing', 'other', ?, ?)`,
        )
        .run(NOW, NOW),
    ).toThrow();
  });
});
