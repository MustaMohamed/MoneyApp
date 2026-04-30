export const migration001 = {
  version: 1,
  up: `
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
  `,
};
