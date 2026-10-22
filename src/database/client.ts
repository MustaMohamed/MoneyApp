import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from './migrations';
import { WRITE_LOCK_WAIT_MS } from './write_lock';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openConnection(options?: SQLite.SQLiteOpenOptions): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('moneyapp.db', options);
  try {
    await db.execAsync(
      `PRAGMA busy_timeout = ${WRITE_LOCK_WAIT_MS}; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;`,
    );
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= openConnection();
  return dbPromise;
}

/** BEGIN IMMEDIATE takes the write lock before any read, so the busy wait covers read-first tasks. */
export async function withWriteTransactionAsync(
  db: SQLite.SQLiteDatabase,
  task: () => Promise<void>,
): Promise<void> {
  await db.execAsync('BEGIN IMMEDIATE');
  try {
    await task();
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

/** Runs `task` in a write transaction on its own connection; `txn` is valid only while `task` runs. */
export async function withExclusiveWriteTransactionAsync(
  task: (txn: SQLite.SQLiteDatabase) => Promise<void>,
): Promise<void> {
  const txn = await openConnection({ useNewConnection: true });
  try {
    await withWriteTransactionAsync(txn, () => task(txn));
  } finally {
    await txn.closeAsync();
  }
}

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations',
  );
  const appliedVersions = new Set(applied.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      await withWriteTransactionAsync(db, async () => {
        await db.execAsync(migration.up);
        await db.runAsync(
          'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
          migration.version,
          new Date().toISOString(),
        );
      });
    }
  }
}
