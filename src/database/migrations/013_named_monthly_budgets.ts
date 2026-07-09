export const migration013 = {
  version: 13,
  up: `
    CREATE TABLE IF NOT EXISTS budgets_named_migration (
      id             TEXT PRIMARY KEY,
      category_id    TEXT NOT NULL REFERENCES categories(id),
      name           TEXT NOT NULL COLLATE NOCASE,
      limit_amount   REAL NOT NULL,
      effective_from TEXT NOT NULL,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL,
      UNIQUE(category_id, effective_from, name)
    );

    INSERT OR REPLACE INTO budgets_named_migration
      (id, category_id, name, limit_amount, effective_from, created_at, updated_at)
    SELECT
      b.id,
      b.category_id,
      COALESCE(NULLIF(TRIM(c.name), ''), 'Budget') AS name,
      b.limit_amount,
      b.effective_from,
      b.created_at,
      b.updated_at
    FROM budgets b
    LEFT JOIN categories c ON c.id = b.category_id
    WHERE b.limit_amount IS NOT NULL;

    DROP TABLE budgets;

    ALTER TABLE budgets_named_migration RENAME TO budgets;

    CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(effective_from);
  `,
};
