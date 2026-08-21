import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';

import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatCurrencyAmount } from '@/utils/format_amount';

import type { Commitment } from '../../entities/commitment.entity';
import type { CommitmentPayment } from '../../entities/commitment_payment.entity';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export const STATUS_COLORS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Colors.dark.negative,
  [CommitmentPaymentStatus.Due]: Colors.dark.gold,
  [CommitmentPaymentStatus.Upcoming]: Colors.dark.text2,
  [CommitmentPaymentStatus.Paid]: Colors.dark.positive,
  [CommitmentPaymentStatus.Skipped]: Colors.dark.text3,
};

export const STATUS_LABELS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Strings.commitmentsStatusOverdue,
  [CommitmentPaymentStatus.Due]: Strings.commitmentsStatusDue,
  [CommitmentPaymentStatus.Upcoming]: Strings.commitmentsStatusUpcoming,
  [CommitmentPaymentStatus.Paid]: Strings.commitmentsStatusPaid,
  [CommitmentPaymentStatus.Skipped]: Strings.commitmentsStatusSkipped,
};

export const STATUS_ICONS: Record<CommitmentPaymentStatus, IconName> = {
  [CommitmentPaymentStatus.Overdue]: 'alert-circle',
  [CommitmentPaymentStatus.Due]: 'clock-outline',
  [CommitmentPaymentStatus.Upcoming]: 'calendar-clock',
  [CommitmentPaymentStatus.Paid]: 'check-circle',
  [CommitmentPaymentStatus.Skipped]: 'minus-circle',
};

export interface DisplayAmount {
  amount: number | undefined;
  showTilde: boolean;
}

/**
 * Resolves the amount to display for a payment, mirroring the logic previously
 * copy-pasted across commitment_row / current_cycle_card / detail_hero. Paid
 * rows prefer the actually-paid amount, then the due amount, then the
 * commitment's nominal amount; unpaid rows skip amount_paid. Variable-amount
 * commitments that are not yet paid get a leading tilde.
 */
export function resolveDisplayAmount(
  payment: CommitmentPayment | undefined,
  commitment: Commitment | undefined,
): DisplayAmount {
  const isPaid = payment?.status === CommitmentPaymentStatus.Paid;
  const isVariable = commitment?.amount_type === AmountType.Variable;
  // Extract field accesses before the isPaid ternary: inside the ternary the
  // truthiness of isPaid narrows `payment` to non-nullish, which would make the
  // optional chains read as "unnecessary".
  const paidAmount = payment?.amount_paid ?? undefined;
  const dueAmount = payment?.amount_due ?? undefined;
  const baseAmount = commitment?.amount ?? undefined;
  const amount = isPaid ? (paidAmount ?? dueAmount ?? baseAmount) : (dueAmount ?? baseAmount);
  return { amount, showTilde: isVariable && !isPaid };
}

/**
 * Fuses the tilde, the formatted amount and the currency code into the single
 * string every commitments surface renders. `undefined` when there is no
 * amount to format or no currency is available — the latter branch is
 * unreachable at all three call sites (each always supplies a payment or a
 * commitment with a `currency`), but the `| undefined` parameter types make
 * it possible in principle, so the signature stays honest about it.
 */
export function formatCommitmentAmount(
  payment: CommitmentPayment | undefined,
  commitment: Commitment | undefined,
): string | undefined {
  const { amount, showTilde } = resolveDisplayAmount(payment, commitment);
  const currency = payment?.currency ?? commitment?.currency;
  if (amount === undefined || currency === undefined) {
    return undefined;
  }
  return `${showTilde ? '~' : ''}${formatCurrencyAmount(amount, currency)}`;
}
