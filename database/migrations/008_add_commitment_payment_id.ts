export const migration008 = {
  version: 8,
  up: `
    ALTER TABLE transactions ADD COLUMN commitment_payment_id TEXT;
  `,
};
