import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase, SQLiteRunResult } from 'expo-sqlite';

type SQLiteArguments = [source: string, ...params: unknown[]];

export interface MockSQLiteDatabase {
  database: SQLiteDatabase;
  runAsync: jest.Mock<Promise<SQLiteRunResult>, SQLiteArguments>;
  getAllAsync: jest.Mock<Promise<unknown[]>, SQLiteArguments>;
  getFirstAsync: jest.Mock<Promise<unknown | null>, SQLiteArguments>;
  execAsync: jest.Mock<Promise<void>, [source: string]>;
  withTransactionAsync: jest.Mock<Promise<void>, [task: () => Promise<void>]>;
}

export interface ExpoSQLiteTestDatabase extends MockSQLiteDatabase {
  reset: () => void;
}

type ExpoSQLiteMockModule = typeof SQLite & {
  __fakeDb: Omit<MockSQLiteDatabase, 'database'>;
  __reset: () => void;
};

function asSQLiteDatabase(methods: Omit<MockSQLiteDatabase, 'database'>): SQLiteDatabase {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- one structural bridge for the Jest Expo SQLite facade; consumers remain fully typed
  return methods as unknown as SQLiteDatabase;
}

export function createMockSQLiteDatabase(): MockSQLiteDatabase {
  const methods: Omit<MockSQLiteDatabase, 'database'> = {
    runAsync: jest.fn<Promise<SQLiteRunResult>, SQLiteArguments>(),
    getAllAsync: jest.fn<Promise<unknown[]>, SQLiteArguments>(),
    getFirstAsync: jest.fn<Promise<unknown | null>, SQLiteArguments>(),
    execAsync: jest.fn<Promise<void>, [source: string]>(),
    withTransactionAsync: jest.fn<Promise<void>, [task: () => Promise<void>]>((task) => task()),
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

export function isQueryPlanRow(value: unknown): value is { detail: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'detail' in value &&
    typeof value.detail === 'string'
  );
}
