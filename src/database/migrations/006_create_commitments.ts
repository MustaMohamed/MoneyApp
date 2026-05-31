export const migration006 = {
  version: 6,
  up: `
    CREATE TABLE IF NOT EXISTS commitments (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      amount_type       TEXT NOT NULL CHECK(amount_type IN ('fixed', 'variable')),
      amount            REAL,
      currency          TEXT NOT NULL DEFAULT 'EGP',
      category_id       TEXT NOT NULL,
      recurrence_every  INTEGER NOT NULL DEFAULT 1,
      recurrence_period TEXT NOT NULL CHECK(recurrence_period IN ('days', 'weeks', 'months', 'years')),
      start_date        TEXT NOT NULL,
      account_id        TEXT,
      notes             TEXT,
      duration_type     TEXT NOT NULL DEFAULT 'forever' CHECK(duration_type IN ('forever', 'after_count', 'until_date')),
      end_date          TEXT,
      end_after_count   INTEGER,
      is_active         INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      FOREIGN KEY (account_id)  REFERENCES accounts(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `,
};
