export const migration009 = {
  version: 9,
  up: `
    INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
    VALUES (
      'cat_other_income',
      'Other Income',
      'income',
      'dots-horizontal',
      '#6B7F99',
      1,
      99,
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z'
    );
  `,
};
