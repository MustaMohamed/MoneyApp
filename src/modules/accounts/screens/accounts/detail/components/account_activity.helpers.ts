import { Strings } from '@/constants/strings';
import {
  buildTransactionRowPresentation,
  type TransactionRowPresentation,
  type TransactionRowPresentationInput,
} from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { toLocalDateString } from '@/utils/format_date';
import { formatTime12h } from '@/utils/format_time_12h';
import { MONTHS_SHORT } from '@/utils/year_month';

/** The activity row's time slot: the clock for today, a word for yesterday, a date before that. */
export function formatActivityDayLabel(
  transactionDate: string,
  transactionTime: string,
  now: Date,
): string {
  if (transactionDate === toLocalDateString(now)) {
    return Strings.accountActivityToday(formatTime12h(transactionTime));
  }

  // The Date constructor normalises day 0 and day −1, so month ends, year ends and leap days hold.
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (transactionDate === toLocalDateString(yesterday)) return Strings.accountActivityYesterday;

  const [, month, day] = transactionDate.split('-');
  return `${Number(day)} ${MONTHS_SHORT[Number(month) - 1]}`;
}

/** The shipped row presentation with the list's time-only slot swapped for the day label. */
export function buildActivityRowPresentation(
  input: TransactionRowPresentationInput,
  now: Date,
): TransactionRowPresentation {
  return {
    ...buildTransactionRowPresentation(input),
    timeText: formatActivityDayLabel(input.tx.transaction_date, input.tx.transaction_time, now),
  };
}
