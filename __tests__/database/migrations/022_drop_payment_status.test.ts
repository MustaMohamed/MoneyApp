import Database from 'better-sqlite3';

import { runMigrations } from '@/database/client';
import { MIGRATIONS, type Migration } from '@/database/migrations';
import { bridgeBetterSQLite, getExpoSQLiteTestDatabase } from '@/test_helpers/sqlite';
import { registerOpenDbsDrain } from '@/test_helpers/sqlite_drain';

const openDbs = registerOpenDbsDrain();

const NOW = '2026-10-21T00:00:00.000Z';

const COLUMNS_WITHOUT_STATUS = [
  'id',
  'commitment_id',
  'due_date',
  'paid_date',
  'skipped_date',
  'amount_due',
  'amount_paid',
  'currency',
  'exchange_rate_snapshot',
  'account_id',
  'transaction_id',
  'notes',
  'created_at',
  'updated_at',
];

function migration022(): Migration {
  const migration = MIGRATIONS.find(({ version }) => version === 22);
  expect(migration).toBeDefined();
  if (!migration) throw new Error('Expected migration 022');
  return migration;
}

function createDatabaseThrough021(): Database.Database {
  const db = new Database(':memory:');
  openDbs.push(db);
  db.pragma('foreign_keys = ON');
  db.exec(
    MIGRATIONS.filter(({ version }) => version <= 21)
      .map(({ up }) => up)
      .join('\n'),
  );
  db.prepare(
    `INSERT INTO categories (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
     VALUES ('cat1', 'Bills', 'expense', 'tag', '#C9973A', 0, 0, ?, ?)`,
  ).run(NOW, NOW);
  db.prepare(
    `INSERT INTO accounts
       (id, name, type, currency, opening_balance, current_balance,
        interest_tracking, is_archived, sort_order, created_at, updated_at)
     VALUES ('acc1', 'Main EGP', 'bank', 'EGP', 0, 0, 0, 0, 0, ?, ?)`,
  ).run(NOW, NOW);
  db.prepare(
    `INSERT INTO commitments
       (id, name, amount_type, amount, currency, category_id, recurrence_every,
        recurrence_period, start_date, account_id, duration_type, is_active, created_at, updated_at)
     VALUES ('c1', 'Rent', 'fixed', 200, 'EGP', 'cat1', 1, 'months', '2026-08-05', 'acc1',
             'forever', 1, ?, ?)`,
  ).run(NOW, NOW);
  db.prepare(
    `INSERT INTO commitment_payments
       (id, commitment_id, due_date, amount_due, currency, account_id, status, created_at, updated_at)
     VALUES ('legacy', 'c1', '2026-08-05', 200, 'EGP', 'acc1', 'upcoming', ?, ?)`,
  ).run(NOW, NOW);
  return db;
}

function createDatabaseThrough022(): Database.Database {
  const db = createDatabaseThrough021();
  db.exec(migration022().up);
  return db;
}

function insertPayment(db: Database.Database, id: string, dueDate: string, verb = 'INSERT') {
  return db
    .prepare(
      `${verb} INTO commitment_payments
         (id, commitment_id, due_date, amount_due, currency, account_id, created_at, updated_at)
       VALUES (?, 'c1', ?, 200, 'EGP', 'acc1', ?, ?)`,
    )
    .run(id, dueDate, NOW, NOW);
}

function indexNames(db: Database.Database): string[] {
  return (
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ?")
      .all('commitment_payments') as { name: string }[]
  ).map(({ name }) => name);
}

describe('migration022 — commitment_payments rebuilt without status', () => {
  it('leaves the fourteen columns of 007 less status', () => {
    const db = createDatabaseThrough022();

    const columns = (
      db.prepare("PRAGMA table_info('commitment_payments')").all() as { name: string }[]
    ).map(({ name }) => name);

    expect(columns).not.toContain('status');
    expect([...columns].sort()).toEqual([...COLUMNS_WITHOUT_STATUS].sort());
  });

  it('drops the rows the table held, reset as ruled', () => {
    const db = createDatabaseThrough022();

    expect(db.prepare('SELECT COUNT(*) AS count FROM commitment_payments').get()).toEqual({
      count: 0,
    });
  });

  it('keeps the commitment and due-date indexes by name and drops the status index', () => {
    const db = createDatabaseThrough022();

    const names = indexNames(db);

    expect(names).toEqual(expect.arrayContaining(['idx_cp_commitment_id', 'idx_cp_due_date']));
    expect(names).not.toContain('idx_cp_status');
  });

  it('rejects a second row on the same commitment and due date, and INSERT OR IGNORE skips it', () => {
    const db = createDatabaseThrough022();
    insertPayment(db, 'first', '2026-10-05');

    let error: unknown;
    try {
      insertPayment(db, 'second', '2026-10-05');
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({ code: 'SQLITE_CONSTRAINT_UNIQUE' });
    expect(insertPayment(db, 'third', '2026-10-05', 'INSERT OR IGNORE').changes).toBe(0);
    expect(insertPayment(db, 'next-cycle', '2026-11-05', 'INSERT OR IGNORE').changes).toBe(1);
  });

  it('prepares a read INDEXED BY idx_cp_commitment_id', () => {
    const db = createDatabaseThrough022();

    expect(() =>
      db.prepare(
        `SELECT id FROM commitment_payments INDEXED BY idx_cp_commitment_id
          WHERE commitment_id = ?`,
      ),
    ).not.toThrow();
  });

  it('runs twice without throwing', () => {
    const db = createDatabaseThrough022();

    expect(() => db.exec(migration022().up)).not.toThrow();
  });
});

describe('runMigrations — the runner lands 022 on a real database', () => {
  const sqlite = getExpoSQLiteTestDatabase();

  function bridge(realDb: Database.Database): void {
    bridgeBetterSQLite(sqlite, realDb);
    sqlite.execAsync.mockImplementation(async (sql: string) => {
      realDb.exec(sql);
    });
  }

  afterEach(() => {
    sqlite.reset();
  });

  it('records version 22 on a fresh database and leaves no status column', async () => {
    const realDb = new Database(':memory:');
    openDbs.push(realDb);
    bridge(realDb);

    await runMigrations(sqlite.database);

    const applied = realDb
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all() as { version: number }[];
    expect(applied.map(({ version }) => version)).toContain(22);
    const columns = realDb.prepare("PRAGMA table_info('commitment_payments')").all() as {
      name: string;
    }[];
    expect(columns.map(({ name }) => name)).not.toContain('status');
  });

  it('re-applies nothing on a second run', async () => {
    const realDb = new Database(':memory:');
    openDbs.push(realDb);
    bridge(realDb);
    await runMigrations(sqlite.database);

    sqlite.runAsync.mockClear();
    sqlite.execAsync.mockClear();
    await runMigrations(sqlite.database);

    expect(sqlite.runAsync).not.toHaveBeenCalled();
    expect(
      realDb.prepare('SELECT COUNT(*) AS count FROM schema_migrations WHERE version = 22').get(),
    ).toEqual({ count: 1 });
  });
});
