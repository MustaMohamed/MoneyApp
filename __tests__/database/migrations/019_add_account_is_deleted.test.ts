import Database from 'better-sqlite3';

import { runMigrations } from '@/database/client';
import { MIGRATIONS, type Migration } from '@/database/migrations';
import { bridgeBetterSQLite, getExpoSQLiteTestDatabase } from '@/test_helpers/sqlite';
import { registerOpenDbsDrain } from '@/test_helpers/sqlite_drain';

const openDbs = registerOpenDbsDrain();

const NOW = '2026-09-08T00:00:00.000Z';

interface AccountBalanceRow {
  current_balance: number;
  is_archived: number;
  opening_balance: number;
  revolving_balance: number | null;
}

function migration019(): Migration {
  const migration = MIGRATIONS.find(({ version }) => version === 19);
  expect(migration).toBeDefined();
  if (!migration) throw new Error('Expected migration 019');
  return migration;
}

function createDatabaseThrough018(): Database.Database {
  const db = new Database(':memory:');
  openDbs.push(db);
  db.pragma('foreign_keys = ON');
  db.exec(
    MIGRATIONS.filter(({ version }) => version <= 18)
      .map(({ up }) => up)
      .join('\n'),
  );
  return db;
}

function insertAccount(db: Database.Database, id: string): void {
  db.prepare(
    `INSERT INTO accounts
       (id, name, type, currency, opening_balance, current_balance,
        revolving_balance, interest_tracking, is_archived, sort_order, created_at, updated_at)
     VALUES (?, ?, 'credit_card', 'EGP', 1000, 850, 300, 0, 1, 0, ?, ?)`,
  ).run(id, id, NOW, NOW);
}

function balancesOf(db: Database.Database, id: string): AccountBalanceRow {
  return db
    .prepare(
      `SELECT opening_balance, current_balance, revolving_balance, is_archived
         FROM accounts WHERE id = ?`,
    )
    .get(id) as AccountBalanceRow;
}

describe('migration019 — accounts.is_deleted', () => {
  it('reads 0 on a row that existed before the column did', () => {
    const db = createDatabaseThrough018();
    insertAccount(db, 'legacy');

    db.exec(migration019().up);

    const row = db.prepare("SELECT is_deleted FROM accounts WHERE id = 'legacy'").get() as {
      is_deleted: number;
    };
    expect(row.is_deleted).toBe(0);
  });

  it('rejects a value outside 0 and 1', () => {
    const db = createDatabaseThrough018();
    insertAccount(db, 'legacy');
    db.exec(migration019().up);

    expect(() =>
      db.prepare("UPDATE accounts SET is_deleted = 2 WHERE id = 'legacy'").run(),
    ).toThrow();
  });

  it('rewrites no balance and no archive flag', () => {
    const db = createDatabaseThrough018();
    insertAccount(db, 'legacy');
    const before = balancesOf(db, 'legacy');

    db.exec(migration019().up);

    expect(balancesOf(db, 'legacy')).toEqual(before);
  });
});

describe('runMigrations — the runner that upgrades a real database', () => {
  const sqlite = getExpoSQLiteTestDatabase();

  function bridge(realDb: Database.Database): void {
    bridgeBetterSQLite(sqlite, realDb);
    sqlite.execAsync.mockImplementation(async (sql: string) => {
      realDb.exec(sql);
    });
    sqlite.withTransactionAsync.mockImplementation(async (task: () => Promise<void>) => {
      realDb.exec('BEGIN');
      try {
        await task();
        realDb.exec('COMMIT');
      } catch (error) {
        realDb.exec('ROLLBACK');
        throw error;
      }
    });
  }

  afterEach(() => {
    sqlite.reset();
  });

  it('applies every migration once and lands is_deleted on accounts', async () => {
    const realDb = new Database(':memory:');
    openDbs.push(realDb);
    bridge(realDb);

    await runMigrations(sqlite.database);

    const applied = realDb
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all() as { version: number }[];
    expect(applied.map((r) => r.version)).toEqual(MIGRATIONS.map((m) => m.version));
    const columns = realDb.prepare("PRAGMA table_info('accounts')").all() as { name: string }[];
    expect(columns.map((c) => c.name)).toContain('is_deleted');
  });

  it('is a no-op on a database already at the latest version', async () => {
    const realDb = new Database(':memory:');
    openDbs.push(realDb);
    bridge(realDb);
    await runMigrations(sqlite.database);

    sqlite.runAsync.mockClear();
    await runMigrations(sqlite.database);

    expect(sqlite.runAsync).not.toHaveBeenCalled();
    const count = realDb.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get() as {
      count: number;
    };
    expect(count.count).toBe(MIGRATIONS.length);
  });
});
