export const migration011 = {
  version: 11,
  up: `
    INSERT OR IGNORE INTO categories (id, name, type, icon, color, created_at, updated_at)
    VALUES
      ('cc-balance-transfer-in',  'CC Balance Transfer In',  'income',  'swap-horizontal', '#9B73D4', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('cc-balance-transfer-out', 'CC Balance Transfer Out', 'expense', 'swap-horizontal', '#9B73D4', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
  `,
};
