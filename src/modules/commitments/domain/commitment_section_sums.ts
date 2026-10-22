import { Currency } from '@/constants/enums';
import { baseEquivalent } from '@/modules/accounts/domain/account_figures';

import type { CommitmentMonthPayment } from '../entities/commitment_payment.entity';
import { assertUsdLegRate, heldEgp } from './commitment_month_totals';
import { isPaidPayment } from './payment_state';

/** `isVariable` is false when the row's commitment is not loaded. */
export interface CommitmentSumRow {
  payment: Pick<
    CommitmentMonthPayment,
    'paid_date' | 'skipped_date' | 'amount_due' | 'currency' | 'paid_egp_amount'
  >;
  isVariable: boolean;
}

export interface CommitmentRowsTotal {
  egp: number;
  count: number;
  showTilde: boolean;
}

/** `rate` is EGP per USD; `undefined` until it loads, which leaves a total with a USD leg unknown. */
export function sumCommitmentRowsEgp(
  rows: readonly CommitmentSumRow[],
  rate: number | undefined,
): CommitmentRowsTotal | undefined {
  let egp = 0;
  let usd = 0;
  let showTilde = false;
  for (const { payment, isVariable } of rows) {
    if (isPaidPayment(payment)) {
      egp += payment.paid_egp_amount ?? 0;
      continue;
    }
    if (payment.currency === Currency.USD) usd += payment.amount_due ?? 0;
    else egp += payment.amount_due ?? 0;
    if (isVariable) showTilde = true;
  }

  if (usd !== 0 && rate === undefined) return undefined;
  return { egp: heldEgp({ egp, usd }, rate), count: rows.length, showTilde };
}

/** `amount` is the amount the row prints; a paid row's leg is its transaction's EGP amount. */
export function resolveCommitmentRowLegEgp(input: {
  payment: Pick<
    CommitmentMonthPayment,
    'paid_date' | 'skipped_date' | 'currency' | 'paid_egp_amount'
  >;
  amount: number | undefined;
  rate: number | undefined;
}): number | undefined {
  const { payment, amount, rate } = input;
  if (payment.currency !== Currency.USD) return undefined;
  if (isPaidPayment(payment)) return payment.paid_egp_amount ?? undefined;
  if (amount === undefined || rate === undefined) return undefined;
  assertUsdLegRate(rate);
  return baseEquivalent({ amount, from: Currency.USD, to: Currency.EGP, rate });
}
