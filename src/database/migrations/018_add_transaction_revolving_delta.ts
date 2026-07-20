export const migration018 = {
  version: 18,
  up: `
    ALTER TABLE transactions ADD COLUMN revolving_balance_delta REAL;
  `,
};
