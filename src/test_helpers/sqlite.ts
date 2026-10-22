import type Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase, SQLiteRunResult } from 'expo-sqlite';

type SQLiteArguments = [source: string, ...params: unknown[]];

export interface MockSQLiteDatabase {
  database: SQLiteDatabase;
  runAsync: jest.Mock<Promise<SQLiteRunResult>, SQLiteArguments>;
  getAllAsync: jest.Mock<Promise<unknown[]>, SQLiteArguments>;
  getFirstAsync: jest.Mock<Promise<unknown | null>, SQLiteArguments>;
  execAsync: jest.Mock<Promise<void>, [source: string]>;
}

export interface ExpoSQLiteTestDatabase extends MockSQLiteDatabase {
  reset: () => void;
}

type ExpoSQLiteMockModule = typeof SQLite & {
  __fakeDb: Omit<MockSQLiteDatabase, 'database'>;
  __reset: () => void;
};

export function asSQLiteDatabase(methods: object): SQLiteDatabase {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- one structural bridge for the Jest Expo SQLite facade; consumers remain fully typed
  return methods as unknown as SQLiteDatabase;
}

export function createMockSQLiteDatabase(): MockSQLiteDatabase {
  const methods: Omit<MockSQLiteDatabase, 'database'> = {
    runAsync: jest.fn<Promise<SQLiteRunResult>, SQLiteArguments>(),
    getAllAsync: jest.fn<Promise<unknown[]>, SQLiteArguments>(),
    getFirstAsync: jest.fn<Promise<unknown | null>, SQLiteArguments>(),
    execAsync: jest.fn<Promise<void>, [source: string]>(),
  };
  return { database: asSQLiteDatabase(methods), ...methods };
}

export function getExpoSQLiteTestDatabase(): ExpoSQLiteTestDatabase {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Jest adds these test-only exports to the mocked Expo module
  const sqliteMock = SQLite as ExpoSQLiteMockModule;
  return {
    database: asSQLiteDatabase(sqliteMock.__fakeDb),
    ...sqliteMock.__fakeDb,
    reset: sqliteMock.__reset,
  };
}

export function getSQLiteParams(rest: unknown[]): unknown[] {
  return Array.isArray(rest[0]) ? rest[0] : rest;
}

/** Bridges `execAsync` too, so `BEGIN IMMEDIATE`, `COMMIT` and `ROLLBACK` reach `realDb` (M33). */
export function bridgeBetterSQLite(
  mock: MockSQLiteDatabase,
  realDb: ReturnType<typeof Database>,
): void {
  mock.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const result = realDb.prepare(sql).run(...getSQLiteParams(rest));
    return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
  });
  mock.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) =>
    realDb.prepare(sql).all(...getSQLiteParams(rest)),
  );
  mock.getFirstAsync.mockImplementation(
    async (sql: string, ...rest: unknown[]) =>
      realDb.prepare(sql).get(...getSQLiteParams(rest)) ?? null,
  );
  mock.execAsync.mockImplementation(async (sql: string) => {
    realDb.exec(sql);
  });
}

/** Maps `withExclusiveWriteTransactionAsync` onto `realDb` as the client does: BEGIN IMMEDIATE, the task, COMMIT, ROLLBACK on a throw. */
export function exclusiveWriteOnRealDb(
  realDb: ReturnType<typeof Database>,
  txn: SQLiteDatabase,
  onBegin?: () => void,
): (task: (txn: SQLiteDatabase) => Promise<void>) => Promise<void> {
  return async (task) => {
    onBegin?.();
    realDb.exec('BEGIN IMMEDIATE');
    try {
      await task(txn);
      realDb.exec('COMMIT');
    } catch (error) {
      realDb.exec('ROLLBACK');
      throw error;
    }
  };
}

export function isQueryPlanRow(value: unknown): value is { detail: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'detail' in value &&
    typeof value.detail === 'string'
  );
}
