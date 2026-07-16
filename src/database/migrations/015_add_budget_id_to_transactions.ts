export const migration015 = {
  version: 15,
  up: `
    ALTER TABLE transactions
      ADD COLUMN budget_id TEXT REFERENCES budgets(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_transactions_budget_id
      ON transactions(budget_id);
  `,
};
