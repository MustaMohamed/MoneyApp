import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  buildTransactionRowPresentation,
  resolveRowTile,
  type TransactionRowPresentation,
  type TransactionRowPresentationInput,
} from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { resolveAccountName } from '@/utils/account_name';
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

/** The shipped row with the day label for its time, and the counterparty's tile alone: the open account is the card's own identity. */
export function buildActivityRowPresentation(
  input: TransactionRowPresentationInput,
  now: Date,
  openAccountId: string,
): TransactionRowPresentation {
  const { tx, account, toAccount } = input;
  const time = formatActivityDayLabel(tx.transaction_date, tx.transaction_time, now);
  const lead =
    tx.type === TransactionType.CCPayment && tx.to_account_id === openAccountId
      ? Strings.accountActivityFromAccount(resolveAccountName(account))
      : undefined;
  const twoAccount = tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment;
  const other = tx.account_id === openAccountId ? toAccount : account;

  return {
    ...buildTransactionRowPresentation(input, { lead, time }),
    tiles: twoAccount ? [resolveRowTile(other)] : [],
  };
}
