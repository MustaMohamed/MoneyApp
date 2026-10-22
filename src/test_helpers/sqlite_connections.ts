import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase, SQLiteOpenOptions, SQLiteRunResult } from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';

import { deferred } from './deferred';
import { asSQLiteDatabase, getSQLiteParams } from './sqlite';
import type { RealSQLiteDatabase } from './sqlite_fixtures';

export interface BridgedConnection {
  options: SQLiteOpenOptions | undefined;
  closeAsync: jest.Mock<Promise<void>, []>;
}

export interface HeldWriteLock {
  released: Promise<void>;
}

export interface SQLiteConnections {
  /** A direct handle on the same file, for seeding and for reading committed rows. */
  inspect: RealSQLiteDatabase;
  /** Every connection `openDatabaseAsync` or a base-commit exclusive transaction opened, in order. */
  opened: BridgedConnection[];
  /** Resolves once another thread holds the write lock; `released` settles after it commits. */
  holdWriteLock: (holdMs: number) => Promise<HeldWriteLock>;
  settle: () => Promise<void>;
  dispose: () => void;
}

const HOLDER_SOURCE = `
const { parentPort, workerData } = require('node:worker_threads');
const Database = require(workerData.driver);
const db = new Database(workerData.path, { timeout: 0 });
db.exec('BEGIN IMMEDIATE');
db.prepare('INSERT INTO lock_holder (held_ms) VALUES (?)').run(workerData.holdMs);
parentPort.postMessage('locked');
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, workerData.holdMs);
db.exec('COMMIT');
db.close();
`;

// Steps the first row, then yields, as expo's separate native calls do; a synchronous read closes the window.
async function readRows(
  handle: RealSQLiteDatabase,
  source: string,
  rest: unknown[],
  limit: number,
): Promise<unknown[]> {
  const rows = handle.prepare(source).iterate(...getSQLiteParams(rest));
  try {
    const first = rows.next();
    await new Promise((resolve) => setImmediate(resolve));
    if (first.done) return [];
    const read: unknown[] = [first.value];
    for (const next of rows) {
      if (read.length >= limit) break;
      read.push(next);
    }
    return read;
  } finally {
    rows.return?.();
  }
}

function startHolder(path: string, holdMs: number, driver: string): Promise<HeldWriteLock> {
  const locked = deferred<HeldWriteLock>();
  const released = deferred();
  void released.promise.catch(() => undefined);
  const worker = new Worker(HOLDER_SOURCE, { eval: true, workerData: { driver, path, holdMs } });
  worker.once('message', () => locked.resolve({ released: released.promise }));
  worker.once('error', (error) => locked.reject(error));
  worker.once('exit', (code) => {
    if (code === 0) released.resolve();
    else released.reject(new Error(`lock holder exited with code ${code}`));
  });
  return locked.promise;
}

/** Opens each expo-sqlite connection on one temp file with the native defaults: no wait, foreign keys off. */
export function bridgeSQLiteConnections(): SQLiteConnections {
  const dir = mkdtempSync(join(tmpdir(), 'moneyapp-write-lock-'));
  const path = join(dir, 'moneyapp.db');
  const driver = require.resolve('better-sqlite3');
  const inspect = new Database(path);
  inspect.pragma('journal_mode = WAL');
  inspect.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
  inspect.exec('CREATE TABLE lock_holder (id INTEGER PRIMARY KEY, held_ms INTEGER NOT NULL)');
  const opened: BridgedConnection[] = [];
  const handles: RealSQLiteDatabase[] = [];
  const held: Promise<void>[] = [];

  function open(options?: SQLiteOpenOptions): SQLiteDatabase {
    const handle = new Database(path, { timeout: 0 });
    handle.pragma('foreign_keys = OFF');
    handle.unsafeMode(true);
    handles.push(handle);
    const closeAsync = jest.fn(async () => {
      handle.close();
    });
    opened.push({ options, closeAsync });
    const execAsync = async (source: string): Promise<void> => {
      handle.exec(source);
    };
    return asSQLiteDatabase({
      databasePath: path,
      options: options ?? {},
      execAsync,
      runAsync: async (source: string, ...rest: unknown[]): Promise<SQLiteRunResult> => {
        const result = handle.prepare(source).run(...getSQLiteParams(rest));
        return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
      },
      getAllAsync: async (source: string, ...rest: unknown[]) =>
        readRows(handle, source, rest, Infinity),
      getFirstAsync: async (source: string, ...rest: unknown[]) =>
        (await readRows(handle, source, rest, 1))[0] ?? null,
      closeAsync,
      isInTransactionAsync: async () => handle.inTransaction,
      // As expo-sqlite SQLiteDatabase.ts:141-149: plain BEGIN, and ROLLBACK even when BEGIN failed.
      withTransactionAsync: async (task: () => Promise<void>): Promise<void> => {
        try {
          await execAsync('BEGIN');
          await task();
          await execAsync('COMMIT');
        } catch (error) {
          await execAsync('ROLLBACK');
          throw error;
        }
      },
      // As SQLiteDatabase.ts:178-197 and :788-797: its own connection with the parent's options.
      withExclusiveTransactionAsync: async (
        task: (txn: SQLiteDatabase) => Promise<void>,
      ): Promise<void> => {
        const transaction = open({ ...options, useNewConnection: true });
        let failure: { error: unknown } | undefined;
        try {
          await transaction.execAsync('BEGIN');
          await task(transaction);
          await transaction.execAsync('COMMIT');
        } catch (error) {
          await transaction.execAsync('ROLLBACK');
          failure = { error };
        } finally {
          await transaction.closeAsync();
        }
        if (failure) throw failure.error;
      },
    });
  }

  jest
    .mocked(SQLite.openDatabaseAsync)
    .mockImplementation(async (_name: string, options?: SQLiteOpenOptions) => open(options));

  return {
    inspect,
    opened,
    holdWriteLock: async (holdMs: number) => {
      const lock = await startHolder(path, holdMs, driver);
      held.push(lock.released);
      return lock;
    },
    settle: async () => {
      await Promise.allSettled(held.splice(0));
    },
    dispose: () => {
      for (const handle of handles) if (handle.open) handle.close();
      inspect.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
