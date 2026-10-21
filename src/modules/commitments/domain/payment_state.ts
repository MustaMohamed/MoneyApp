import { CommitmentPaymentStatus } from '@/constants/enums';

import type { CommitmentPayment } from '../entities/commitment_payment.entity';

type PaymentDates = Pick<CommitmentPayment, 'paid_date' | 'skipped_date'>;

/** `today` is the local calendar date `YYYY-MM-DD`; the dates compare as strings. */
export function resolvePaymentState(
  payment: Pick<CommitmentPayment, 'due_date' | 'paid_date' | 'skipped_date'>,
  today: string,
): CommitmentPaymentStatus {
  if (payment.paid_date !== null) return CommitmentPaymentStatus.Paid;
  if (payment.skipped_date !== null) return CommitmentPaymentStatus.Skipped;
  if (payment.due_date < today) return CommitmentPaymentStatus.Overdue;
  if (payment.due_date === today) return CommitmentPaymentStatus.Due;
  return CommitmentPaymentStatus.Upcoming;
}

export function isPaidPayment(payment: PaymentDates): boolean {
  return payment.paid_date !== null;
}

export function isSkippedPayment(payment: PaymentDates): boolean {
  return payment.paid_date === null && payment.skipped_date !== null;
}

export function isUnpaidPayment(payment: PaymentDates): boolean {
  return payment.paid_date === null && payment.skipped_date === null;
}

/** The earlier of the month's first day and `today`: unpaid rows due before it carry into `yearMonth`. */
export function carriedDueBound(yearMonth: string, today: string): string {
  const monthStart = `${yearMonth}-01`;
  return monthStart < today ? monthStart : today;
}

export function isDueInMonth(
  payment: Pick<CommitmentPayment, 'due_date'>,
  yearMonth: string,
): boolean {
  return payment.due_date.slice(0, 7) === yearMonth;
}
