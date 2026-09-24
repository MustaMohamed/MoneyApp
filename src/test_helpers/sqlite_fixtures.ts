import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';

import { getSQLiteParams, isQueryPlanRow } from './sqlite';

export type RealSQLiteDatabase = ReturnType<typeof Database>;

/** `rest` is what follows the SQL in a mocked expo-sqlite call: one params array or variadic params. */
export function explainQueryPlan(db: RealSQLiteDatabase, sql: string, rest: unknown[]): string[] {
  return db
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .all(...getSQLiteParams(rest))
    .filter(isQueryPlanRow)
    .map((row) => row.detail);
}

export function createSeededDatabase(
  seed: ReadonlyArray<readonly [table: string, records: readonly object[]]>,
): RealSQLiteDatabase {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
  for (const [table, records] of seed) {
    for (const record of records) {
      const columns = Object.keys(record);
      db.prepare(
        `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map((column) => `@${column}`).join(',')})`,
      ).run(record);
    }
  }
  return db;
}
