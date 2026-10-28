// The SQL forms of `isUnpaidPayment`, `isPaidPayment`, `isSkippedPayment` and `!isUnpaidPayment` (`domain/payment_state.ts`), over an optional table alias.
function column(alias: string | undefined, name: string): string {
  return alias === undefined ? name : `${alias}.${name}`;
}

export function unpaidPaymentSql(alias?: string): string {
  return `${column(alias, 'paid_date')} IS NULL AND ${column(alias, 'skipped_date')} IS NULL`;
}

export function paidPaymentSql(alias?: string): string {
  return `${column(alias, 'paid_date')} IS NOT NULL`;
}

// The SQL form of `resolveCommitmentRowAccountId` (`domain/payment_state.ts`).
export function commitmentRowAccountIdSql(paymentAlias: string, commitmentAlias: string): string {
  return `CASE WHEN ${paidPaymentSql(paymentAlias)} THEN ${paymentAlias}.account_id ELSE ${commitmentAlias}.account_id END`;
}

export function skippedPaymentSql(alias?: string): string {
  return `${column(alias, 'paid_date')} IS NULL AND ${column(alias, 'skipped_date')} IS NOT NULL`;
}

export function settledPaymentSql(alias?: string): string {
  return `(${column(alias, 'paid_date')} IS NOT NULL OR ${column(alias, 'skipped_date')} IS NOT NULL)`;
}
