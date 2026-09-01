import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';

import { CURRENCY_CONFIG } from '@/constants/currency';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatDisplayMagnitude } from '@/utils/format_amount';

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

/** Paid rows prefer `amount_paid`; a variable commitment not yet paid shows a tilde. */
export function resolveDisplayAmount(
  payment: CommitmentPayment | undefined,
  commitment: Commitment | undefined,
): DisplayAmount {
  const isPaid = payment?.status === CommitmentPaymentStatus.Paid;
  const isVariable = commitment?.amount_type === AmountType.Variable;
  // Read the fields before the ternary; inside it `isPaid` narrows `payment` to non-nullish.
  const paidAmount = payment?.amount_paid ?? undefined;
  const dueAmount = payment?.amount_due ?? undefined;
  const baseAmount = commitment?.amount ?? undefined;
  const amount = isPaid ? (paidAmount ?? dueAmount ?? baseAmount) : (dueAmount ?? baseAmount);
  return { amount, showTilde: isVariable && !isPaid };
}

export function formatCommitmentAmount(
  payment: CommitmentPayment | undefined,
  commitment: Commitment | undefined,
): string | undefined {
  const { amount, showTilde } = resolveDisplayAmount(payment, commitment);
  const currency = payment?.currency ?? commitment?.currency;
  if (amount === undefined || currency === undefined) {
    return undefined;
  }
  const { text } = formatDisplayMagnitude(amount, currency);
  return `${showTilde ? '~' : ''}${text} ${CURRENCY_CONFIG[currency].code}`;
}
