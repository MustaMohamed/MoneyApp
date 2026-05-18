export const migration010 = {
  version: 10,
  up: `
    ALTER TABLE transactions ADD COLUMN installment_id TEXT;
  `,
};
