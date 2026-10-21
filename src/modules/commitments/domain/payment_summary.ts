import { CommitmentPaymentStatus, type Currency } from '@/constants/enums';

import type { CommitmentPayment } from '../entities/commitment_payment.entity';
import { isDueInMonth, resolvePaymentState } from './payment_state';

export interface MonthPaymentSummary {
  counts: {
    paid: number;
    overdue: number;
    due: number;
    upcoming: number;
    skipped: number;
    total: number;
  };
  totalsByCurrency: Map<Currency, number>;
}

export const EMPTY_MONTH_PAYMENT_SUMMARY: MonthPaymentSummary = {
  counts: { paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 },
  totalsByCurrency: new Map(),
};

export function summarizeMonthPayments(
  payments: CommitmentPayment[],
  yearMonth: string,
  today: string,
): MonthPaymentSummary {
  const counts = { paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 };
  const totalsByCurrency = new Map<Currency, number>();

  for (const payment of payments) {
    const state = resolvePaymentState(payment, today);
    if (state === CommitmentPaymentStatus.Overdue) counts.overdue++;
    // A row carried from an earlier month counts as overdue and nowhere else.
    if (!isDueInMonth(payment, yearMonth)) continue;
    switch (state) {
      case CommitmentPaymentStatus.Paid:
        counts.paid++;
        break;
      case CommitmentPaymentStatus.Overdue:
        break;
      case CommitmentPaymentStatus.Due:
        counts.due++;
        break;
      case CommitmentPaymentStatus.Upcoming:
        counts.upcoming++;
        break;
      case CommitmentPaymentStatus.Skipped:
        counts.skipped++;
        continue;
    }

    counts.total++;
    const amount =
      state === CommitmentPaymentStatus.Paid
        ? (payment.amount_paid ?? payment.amount_due)
        : payment.amount_due;
    if (amount !== null) {
      totalsByCurrency.set(
        payment.currency,
        (totalsByCurrency.get(payment.currency) ?? 0) + amount,
      );
    }
  }

  return { counts, totalsByCurrency };
}
