import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  buildTransactionRowPresentation,
  isCardCredit,
  type TransactionRowPresentation,
  type TransactionRowPresentationInput,
} from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { toLocalDateString } from '@/utils/format_date';
import { formatTime12h } from '@/utils/format_time_12h';
import { MONTHS_SHORT } from '@/utils/year_month';

import type { AccountActivityStatus } from '../account_activity.store';

export type ActivityCardBody = 'loading' | 'error' | 'empty' | 'rows';

function resolveActivityCardBody(
  status: AccountActivityStatus,
  rowCount: number,
): ActivityCardBody {
  if (status === 'idle' || status === 'initialLoading') return 'loading';
  if (status === 'initialError') return 'error';
  if (rowCount === 0) return 'empty';
  return 'rows';
}

/** One call decides the card's body and its See all, so the header cannot invite a tap into an empty or loading list. */
export function resolveActivityCardView(
  status: AccountActivityStatus,
  rowCount: number,
): { body: ActivityCardBody; showSeeAll: boolean } {
  const body = resolveActivityCardBody(status, rowCount);
  return { body, showSeeAll: body === 'rows' || body === 'error' };
}

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

/** The detail's second line is the transaction's own context; the category joins the date wherever the title does not already carry it. */
function activityContext(
  { tx, account, category }: TransactionRowPresentationInput,
  dayLabel: string,
  openAccountId: string,
): { context?: string; timeText: string } {
  if (tx.type === TransactionType.CCPayment && tx.to_account_id === openAccountId) {
    return {
      context: Strings.accountActivityFromAccount(account?.name ?? Strings.unknownAccount),
      timeText: dayLabel,
    };
  }
  // No override: the shared builder's own transfer, card-payment and account-name branches stand.
  if (tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment) {
    return { timeText: dayLabel };
  }
  if (!category) return { timeText: dayLabel };
  if (isCardCredit(tx, account)) return { context: `${category.name} · ${dayLabel}`, timeText: '' };
  return { context: dayLabel, timeText: '' };
}

/** The shipped row presentation with the detail's own second line and time slot. */
export function buildActivityRowPresentation(
  input: TransactionRowPresentationInput,
  now: Date,
  openAccountId: string,
): TransactionRowPresentation {
  const dayLabel = formatActivityDayLabel(
    input.tx.transaction_date,
    input.tx.transaction_time,
    now,
  );
  const { context, timeText } = activityContext(input, dayLabel, openAccountId);

  return { ...buildTransactionRowPresentation(input, context), timeText };
}
