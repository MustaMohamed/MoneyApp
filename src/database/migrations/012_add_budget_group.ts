// Money Transfer and Other stay NULL; that is the column default, so no UPDATE.

export const migration012 = {
  version: 12,
  up: `
    ALTER TABLE categories ADD COLUMN budget_group TEXT
      CHECK(budget_group IN ('need','want','savings'));

    UPDATE categories SET budget_group = 'need'
      WHERE id IN (
        'cat_housing','cat_groceries','cat_transport','cat_car',
        'cat_utilities','cat_phone_internet','cat_health','cat_bills',
        'cat_education','cat_family','cat_debt_payment','cat_bank_fees'
      );

    UPDATE categories SET budget_group = 'want'
      WHERE id IN (
        'cat_food','cat_dining_out','cat_subscriptions','cat_shopping',
        'cat_clothes','cat_gifts','cat_entertainment','cat_charity'
      );

    INSERT OR IGNORE INTO categories
      (id, name, type, icon, color, is_default, sort_order, budget_group, created_at, updated_at)
    VALUES
      ('cat_savings', 'Savings & Investments', 'expense', 'piggy-bank', '#4CAF82', 1, 22, 'savings',
       '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
  `,
};
