import { CommitmentPaymentStatus, DurationType } from '@/constants/enums';

import type { Commitment } from '../entities/commitment.entity';
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

export function isPaidPayment<T extends PaymentDates>(
  payment: T,
): payment is T & { paid_date: string } {
  return payment.paid_date !== null;
}

/** The account a row counts and matches under: its paid-from account when paid, else its commitment's. */
export function resolveCommitmentRowAccountId(
  payment: CommitmentPayment,
  commitment: Commitment | undefined,
): string | undefined {
  const id = isPaidPayment(payment) ? payment.account_id : commitment?.account_id;
  return id ?? undefined;
}

export function isSkippedPayment<T extends PaymentDates>(
  payment: T,
): payment is T & { paid_date: null; skipped_date: string } {
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

/** `settledCount` counts the skipped row itself; `today` is the local calendar date `YYYY-MM-DD`. */
export function resolveUndoSkip(
  commitment: Pick<Commitment, 'is_active' | 'duration_type' | 'end_date' | 'end_after_count'>,
  settledCount: number,
  today: string,
): 'clear' | 'reactivate' | 'refuse' {
  if (commitment.is_active === 1) return 'clear';
  const { duration_type, end_after_count, end_date } = commitment;
  if (
    duration_type === DurationType.AfterCount &&
    end_after_count !== null &&
    settledCount >= end_after_count
  ) {
    return settledCount - 1 < end_after_count ? 'reactivate' : 'clear';
  }
  if (duration_type === DurationType.UntilDate && end_date !== null && end_date < today) {
    return 'clear';
  }
  return 'refuse';
}
