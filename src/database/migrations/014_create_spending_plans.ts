export const migration014 = {
  version: 14,
  up: `
    CREATE TABLE IF NOT EXISTS spending_plans (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      start_date   TEXT NOT NULL,
      end_date     TEXT NOT NULL,
      total_amount REAL NOT NULL CHECK(total_amount > 0),
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      CHECK(end_date >= start_date)
    );

    CREATE TABLE IF NOT EXISTS spending_plan_categories (
      plan_id          TEXT NOT NULL REFERENCES spending_plans(id) ON DELETE CASCADE,
      category_id      TEXT NOT NULL REFERENCES categories(id),
      allocated_amount REAL CHECK(allocated_amount IS NULL OR allocated_amount >= 0),
      PRIMARY KEY (plan_id, category_id)
    );

    CREATE INDEX IF NOT EXISTS idx_spending_plans_dates
      ON spending_plans(start_date, end_date);

    CREATE INDEX IF NOT EXISTS idx_spending_plan_categories_plan
      ON spending_plan_categories(plan_id);

    CREATE INDEX IF NOT EXISTS idx_spending_plan_categories_category
      ON spending_plan_categories(category_id);
  `,
};
