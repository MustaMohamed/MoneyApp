import { Strings } from '@/constants/strings';
import type { AccountCommitmentRef } from '@/modules/commitments/database/commitments';
import { formatAmount } from '@/utils/format_amount';

import { COUNT_DISPLAY_DECIMALS } from './account_facts.helpers';

export interface DeleteWarningInput {
  transactionCount: number;
  activeCommitments: readonly AccountCommitmentRef[];
}

function transactionsSentence(count: number): string {
  if (count === 0) return Strings.accountDetailDeleteTransactionsNone;
  if (count === 1) return Strings.accountDetailDeleteTransactionsOne;
  return Strings.accountDetailDeleteTransactionsMany(formatAmount(count, COUNT_DISPLAY_DECIMALS));
}

function commitmentsSentence(commitments: readonly AccountCommitmentRef[]): string | undefined {
  if (commitments.length === 0) return undefined;
  if (commitments.length === 1)
    return Strings.accountDetailDeleteCommitmentOne(commitments[0].name);
  return Strings.accountDetailDeleteCommitmentsMany(
    formatAmount(commitments.length, COUNT_DISPLAY_DECIMALS),
  );
}

/** E1's body: what stays, what loses its account, and what keeping it archived keeps. */
export function resolveDeleteWarningBody({
  transactionCount,
  activeCommitments,
}: DeleteWarningInput): string {
  return [
    transactionsSentence(transactionCount),
    commitmentsSentence(activeCommitments),
    Strings.accountDetailDeleteClose,
  ]
    .filter((sentence): sentence is string => sentence !== undefined)
    .join(' ');
}
