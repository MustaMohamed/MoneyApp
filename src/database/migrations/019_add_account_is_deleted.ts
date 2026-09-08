export const migration019 = {
  version: 19,
  up: `
    ALTER TABLE accounts
      ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0
      CHECK(is_deleted IN (0, 1));
  `,
};
