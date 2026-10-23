import type { CommitmentPayment } from '../entities/commitment_payment.entity';

const DAY_MS = 86_400_000;

export type PaymentDaySettlement = 'unpaid' | 'paid' | 'skipped';

export interface PaymentDayDistance {
  settlement: PaymentDaySettlement;
  /** Whole calendar days from the due day to the reference day, positive after the due day. */
  days: number;
}

function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/** `to` minus `from`, both `YYYY-MM-DD`, in whole calendar days whatever the zone's clock changes. */
export function calendarDaysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** The reference day is the paid day, else the skipped day, else `today`, the local calendar date `YYYY-MM-DD`. */
export function resolvePaymentDayDistance(
  payment: Pick<CommitmentPayment, 'due_date' | 'paid_date' | 'skipped_date'>,
  today: string,
): PaymentDayDistance {
  if (payment.paid_date !== null) {
    return { settlement: 'paid', days: calendarDaysBetween(payment.due_date, payment.paid_date) };
  }
  if (payment.skipped_date !== null) {
    return {
      settlement: 'skipped',
      days: calendarDaysBetween(payment.due_date, payment.skipped_date),
    };
  }
  return { settlement: 'unpaid', days: calendarDaysBetween(payment.due_date, today) };
}
