import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync('moneyapp.db');
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  dbInstance = db;
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS accounts (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      type              TEXT NOT NULL
                          CHECK(type IN ('bank','smart_wallet','physical_wallet','physical_savings','credit_card')),
      currency          TEXT NOT NULL CHECK(currency IN ('EGP','USD')),
      opening_balance   REAL NOT NULL DEFAULT 0,
      current_balance   REAL NOT NULL DEFAULT 0,
      color             TEXT,
      credit_limit      REAL,
      revolving_balance REAL,
      minimum_payment   REAL,
      statement_due_day INTEGER,
      interest_tracking INTEGER NOT NULL DEFAULT 0,
      apr               REAL,
      is_archived       INTEGER NOT NULL DEFAULT 0,
      sort_order        INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

async function verifySchema(): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table'",
  );
  console.log(
    'Tables:',
    rows.map((r) => r.name),
  );
}
