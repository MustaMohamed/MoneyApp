import { Strings } from '@/constants/strings';
import { formatAmount } from '@/utils/format_amount';

import type { ArchivedAccountDetailSnapshot } from '../../../../repositories/archived_account_detail.repository';
import { COUNT_DISPLAY_DECIMALS } from './account_facts.helpers';

type ActiveCommitments = Readonly<ArchivedAccountDetailSnapshot['activeCommitments']>;

interface DeleteWarningInput {
  transactionCount: number;
  activeCommitments: ActiveCommitments;
  hasReplacementAccount: boolean;
}

function transactionsSentence(count: number): string {
  if (count === 0) return Strings.accountDetailDeleteTransactionsNone;
  if (count === 1) return Strings.accountDetailDeleteTransactionsOne;
  return Strings.accountDetailDeleteTransactionsMany(formatAmount(count, COUNT_DISPLAY_DECIMALS));
}

function commitmentsSentence(
  commitments: ActiveCommitments,
  hasReplacementAccount: boolean,
): string | undefined {
  if (commitments.length === 0) return undefined;
  if (commitments.length === 1) {
    return hasReplacementAccount
      ? Strings.accountDetailDeleteCommitmentOne(commitments[0].name)
      : Strings.accountDetailDeleteCommitmentOneNoReplacement(commitments[0].name);
  }
  const count = formatAmount(commitments.length, COUNT_DISPLAY_DECIMALS);
  return hasReplacementAccount
    ? Strings.accountDetailDeleteCommitmentsMany(count)
    : Strings.accountDetailDeleteCommitmentsManyNoReplacement(count);
}

/** E1's body: what stays, what loses its account, and what keeping it archived keeps; an account with nothing on it gets the none sentence alone. */
export function resolveDeleteWarningBody({
  transactionCount,
  activeCommitments,
  hasReplacementAccount,
}: DeleteWarningInput): string {
  if (transactionCount === 0 && activeCommitments.length === 0) {
    return Strings.accountDetailDeleteTransactionsNone;
  }
  return [
    transactionsSentence(transactionCount),
    commitmentsSentence(activeCommitments, hasReplacementAccount),
    Strings.accountDetailDeleteClose,
  ]
    .filter((sentence): sentence is string => sentence !== undefined)
    .join(' ');
}
