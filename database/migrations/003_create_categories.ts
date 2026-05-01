export const migration003 = {
  version: 3,
  up: `
    CREATE TABLE IF NOT EXISTS categories (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      icon       TEXT NOT NULL,
      color      TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default, sort_order, created_at, updated_at) VALUES
      ('cat_housing',        'Housing',          'expense', 'home',                 '#1B2B4B', 1, 0,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_food',           'Food & Dining',    'expense', 'food-fork-drink',      '#C9973A', 1, 1,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_groceries',      'Groceries',        'expense', 'cart',                 '#3D7A5F', 1, 2,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_dining_out',     'Dining Out',       'expense', 'silverware-fork-knife', '#D4830A', 1, 3,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_transport',      'Transport',        'expense', 'bus',                  '#185FA5', 1, 4,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_car',            'Car',              'expense', 'car',                  '#4A6FA5', 1, 5,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_utilities',      'Utilities',        'expense', 'lightning-bolt',       '#2D7D6E', 1, 6,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_phone_internet', 'Phone & Internet', 'expense', 'wifi',                 '#7B3F8C', 1, 7,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_health',         'Health',           'expense', 'pill',                 '#C0442A', 1, 8,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_subscriptions',  'Subscriptions',    'expense', 'cellphone',            '#4A2545', 1, 9,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_shopping',       'Shopping',         'expense', 'shopping',             '#C45C2A', 1, 10, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_clothes',        'Clothes',          'expense', 'hanger',               '#7A8B3C', 1, 11, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_education',      'Education',        'expense', 'school',               '#185FA5', 1, 12, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_family',         'Family',           'expense', 'account-group',        '#2D7D6E', 1, 13, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_charity',        'Charity',          'expense', 'hand-heart',           '#3D7A5F', 1, 14, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_gifts',          'Gifts',            'expense', 'gift-outline',         '#C9973A', 1, 15, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_bills',          'Bills',            'expense', 'receipt',              '#1B2B4B', 1, 16, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_debt_payment',   'Debt Payment',     'expense', 'bank-transfer',        '#C0442A', 1, 17, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_bank_fees',      'Bank Fees',        'expense', 'bank',                 '#4A2545', 1, 18, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_entertainment',  'Entertainment',    'expense', 'party-popper',         '#C45C2A', 1, 19, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_money_transfer', 'Money Transfer',   'expense', 'bank-transfer-out',    '#4A6FA5', 1, 20, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_other_expense',  'Other',            'expense', 'dots-horizontal',      '#6B7F99', 1, 21, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_salary',         'Salary',           'income',  'briefcase',            '#4CAF82', 1, 0,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_freelance',      'Freelance',        'income',  'lightbulb',            '#C9973A', 1, 1,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_gift_income',    'Gift',             'income',  'gift',                 '#7B3F8C', 1, 2,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_returns',        'Returns',          'income',  'chart-line',           '#185FA5', 1, 3,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('cat_transfer_in',    'Transfer In',      'income',  'arrow-down-circle',    '#3D7A5F', 1, 4,  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
  `,
};
