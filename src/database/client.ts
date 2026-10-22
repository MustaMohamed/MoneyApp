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

const QUEUED_CALLS = new Set<PropertyKey>([
  'execAsync',
  'runAsync',
  'getFirstAsync',
  'getAllAsync',
]);

function callMember(target: object, key: PropertyKey, args: unknown[]): unknown {
  const member: unknown = Reflect.get(target, key);
  if (typeof member !== 'function') throw new TypeError(`${String(key)} is not a function`);
  const result: unknown = Reflect.apply(member, target, args);
  return result;
}

// A write issued beside another call's open read gets no busy wait, so the main connection runs one call at a time.
function queueCalls(db: SQLite.SQLiteDatabase): SQLite.SQLiteDatabase {
  let previous: Promise<unknown> = Promise.resolve();
  const wrappers = new Map<PropertyKey, (...args: unknown[]) => unknown>();
  const wrap = (key: PropertyKey) => {
    if (!QUEUED_CALLS.has(key)) return (...args: unknown[]) => callMember(db, key, args);
    return (...args: unknown[]) => {
      const call = previous.then(() => callMember(db, key, args));
      previous = call.catch(() => undefined);
      return call;
    };
  };
  return new Proxy(db, {
    get(target, key) {
      const member: unknown = Reflect.get(target, key);
      if (typeof member !== 'function') return member;
      let wrapper = wrappers.get(key);
      if (wrapper === undefined) {
        wrapper = wrap(key);
        wrappers.set(key, wrapper);
      }
      return wrapper;
    },
  });
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= openConnection()
    .then(queueCalls)
    .catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
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
    await rollBack(db);
    throw error;
  }
}

// SQLite has already rolled back after some errors; a ROLLBACK that fails with the transaction still open is the failure to report.
async function rollBack(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync('ROLLBACK');
  } catch (rollbackError) {
    if (await db.isInTransactionAsync()) {
      throw new Error('ROLLBACK failed and the transaction is still open', {
        cause: rollbackError,
      });
    }
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
