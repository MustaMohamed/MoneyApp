export const migration011 = {
  version: 11,
  up: `
    CREATE TABLE IF NOT EXISTS budgets (
      id             TEXT PRIMARY KEY,
      category_id    TEXT NOT NULL REFERENCES categories(id),
      limit_amount   REAL,
      effective_from TEXT NOT NULL,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL,
      UNIQUE(category_id, effective_from)
    );

    CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
  `,
};
