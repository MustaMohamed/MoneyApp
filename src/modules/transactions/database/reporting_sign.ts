// Sign multipliers over the `transaction_row` and `account_row` aliases; `resolveReportingClass` is the reference.
export const REPORTING_SIGN_SQL = {
  out: `CASE
    WHEN transaction_row.type = 'expense' THEN 1
    WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card' THEN -1
    ELSE 0
  END`,
  in: `CASE
    WHEN transaction_row.type = 'income' AND account_row.type <> 'credit_card' THEN 1
    ELSE 0
  END`,
} as const;
