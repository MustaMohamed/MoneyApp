// Keeps no rows (reset ruled); the index names are load-bearing for INDEXED BY in commitments.ts.
export const migration022 = {
  version: 22,
  up: `
    DROP TABLE IF EXISTS commitment_payments;

    CREATE TABLE IF NOT EXISTS commitment_payments (
      id                      TEXT PRIMARY KEY,
      commitment_id           TEXT NOT NULL,
      due_date                TEXT NOT NULL,
      paid_date               TEXT,
      skipped_date            TEXT,
      amount_due              REAL,
      amount_paid             REAL,
      currency                TEXT NOT NULL,
      exchange_rate_snapshot  REAL,
      account_id              TEXT,
      transaction_id          TEXT,
      notes                   TEXT,
      created_at              TEXT NOT NULL,
      updated_at              TEXT NOT NULL,
      UNIQUE (commitment_id, due_date),
      FOREIGN KEY (commitment_id)  REFERENCES commitments(id),
      FOREIGN KEY (account_id)     REFERENCES accounts(id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_cp_commitment_id ON commitment_payments(commitment_id);
    CREATE INDEX IF NOT EXISTS idx_cp_due_date ON commitment_payments(due_date);
  `,
};
