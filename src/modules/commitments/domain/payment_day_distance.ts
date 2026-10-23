import { calendarDaysBetween } from '@/utils/year_month';

import type { CommitmentPayment } from '../entities/commitment_payment.entity';
import { isPaidPayment, isSkippedPayment } from './payment_state';

export type PaymentDaySettlement = 'unpaid' | 'paid' | 'skipped';

export interface PaymentDayDistance {
  settlement: PaymentDaySettlement;
  /** Whole calendar days from the due day to the reference day, positive after the due day. */
  days: number;
}

/** The reference day is the paid day, else the skipped day, else `today`, the local calendar date `YYYY-MM-DD`. */
export function resolvePaymentDayDistance(
  payment: Pick<CommitmentPayment, 'due_date' | 'paid_date' | 'skipped_date'>,
  today: string,
): PaymentDayDistance {
  if (isPaidPayment(payment)) {
    return { settlement: 'paid', days: calendarDaysBetween(payment.due_date, payment.paid_date) };
  }
  if (isSkippedPayment(payment)) {
    return {
      settlement: 'skipped',
      days: calendarDaysBetween(payment.due_date, payment.skipped_date),
    };
  }
  return { settlement: 'unpaid', days: calendarDaysBetween(payment.due_date, today) };
}
