export const migration017 = {
  version: 17,
  up: `
    ALTER TABLE accounts
      ADD COLUMN balance_review_required INTEGER NOT NULL DEFAULT 0
      CHECK(balance_review_required IN (0, 1));

    UPDATE accounts
       SET balance_review_required = 1
     WHERE type = 'credit_card'
       AND EXISTS (
         SELECT 1
           FROM transactions t
          WHERE t.account_id = accounts.id
            AND t.type IN ('expense', 'income')
       );
  `,
};
