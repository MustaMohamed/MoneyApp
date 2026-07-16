export const migration016 = {
  version: 16,
  up: `
    CREATE TABLE IF NOT EXISTS budget_month_settings (
      year_month     TEXT NOT NULL PRIMARY KEY,
      expected_income REAL NOT NULL CHECK(
        typeof(expected_income) IN ('integer', 'real')
        AND expected_income > 0
        AND expected_income <= 9007199254740991
      ),
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_month_category_groups (
      year_month   TEXT NOT NULL,
      category_id  TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      budget_group TEXT NOT NULL CHECK(budget_group IN ('need', 'want', 'savings')),
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      PRIMARY KEY(year_month, category_id)
    );

    INSERT OR IGNORE INTO budget_month_settings
      (year_month, expected_income, created_at, updated_at)
    SELECT
      strftime('%Y-%m', 'now', 'localtime'),
      CAST(TRIM(value) AS REAL),
      datetime('now'),
      datetime('now')
    FROM app_settings
    WHERE key = 'expected_monthly_income'
      AND TRIM(value) <> ''
      AND TRIM(value) GLOB '[0-9]*'
      AND TRIM(value) NOT GLOB '*[^0-9.]*'
      AND TRIM(value) NOT GLOB '*.*.*'
      AND TRIM(value) NOT GLOB '*.'
      AND CAST(TRIM(value) AS REAL) > 0
      AND CAST(TRIM(value) AS REAL) <= 9007199254740991;

    INSERT OR IGNORE INTO budget_month_category_groups
      (year_month, category_id, budget_group, created_at, updated_at)
    SELECT DISTINCT
      budget.effective_from,
      budget.category_id,
      category.budget_group,
      datetime('now'),
      datetime('now')
    FROM budgets budget
    JOIN categories category ON category.id = budget.category_id
    WHERE category.budget_group IS NOT NULL;
  `,
};
