export const migration004 = {
  version: 4,
  up: `
    CREATE TABLE IF NOT EXISTS transactions (
      id               TEXT PRIMARY KEY,
      type             TEXT NOT NULL CHECK(type IN ('expense','income','transfer','cc_payment')),
      amount           REAL NOT NULL CHECK(amount > 0),
      currency         TEXT NOT NULL CHECK(currency IN ('EGP','USD')),
      egp_amount       REAL NOT NULL,
      exchange_rate    REAL,
      account_id       TEXT NOT NULL REFERENCES accounts(id),
      to_account_id    TEXT REFERENCES accounts(id),
      category_id      TEXT REFERENCES categories(id),
      note             TEXT,
      transaction_date TEXT NOT NULL,
      transaction_time TEXT NOT NULL,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account_id
      ON transactions(account_id);

    CREATE INDEX IF NOT EXISTS idx_transactions_to_account_id
      ON transactions(to_account_id);

    CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON transactions(transaction_date DESC);

    CREATE INDEX IF NOT EXISTS idx_transactions_type
      ON transactions(type);

    CREATE INDEX IF NOT EXISTS idx_transactions_category_id
      ON transactions(category_id);
  `,
};
