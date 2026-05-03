export const migration005 = {
  version: 5,
  up: `
    ALTER TABLE transactions ADD COLUMN to_amount REAL;
    ALTER TABLE transactions ADD COLUMN minimum_payment_snapshot REAL;

    UPDATE transactions
    SET to_amount = egp_amount
    WHERE type IN ('transfer', 'cc_payment');
  `,
};
