import { Strings } from '@/constants/strings';
import type { AccountCommitmentRef } from '@/modules/commitments/database/commitments';
import { formatCommitmentAmount } from '@/modules/commitments/screens/commitments/commitment_status';
import { buildRecurrenceLabel } from '@/modules/commitments/screens/commitments/recurrence_label';
import { formatAmount } from '@/utils/format_amount';
import { formatShortDate } from '@/utils/format_date';

import { COUNT_DISPLAY_DECIMALS } from './account_facts.helpers';

type Commitments = Readonly<AccountCommitmentRef[]>;

interface ReplacementCommitmentRow {
  id: string;
  name: string;
  amount: string;
  cadence: string;
  nextDate: string | undefined;
}

export function buildReplacementCommitmentRow(ref: AccountCommitmentRef): ReplacementCommitmentRow {
  return {
    id: ref.id,
    name: ref.name,
    amount: formatCommitmentAmount(undefined, ref) ?? Strings.commitmentsAmountVariable,
    cadence: buildRecurrenceLabel(ref),
    nextDate: ref.next_due_date !== null ? formatShortDate(ref.next_due_date) : undefined,
  };
}

function formatCount(commitments: Commitments): string {
  return formatAmount(commitments.length, COUNT_DISPLAY_DECIMALS);
}

export function resolveMoveSheetCopy({
  commitments,
  accountName,
}: {
  commitments: Commitments;
  accountName: string;
}): { title: string; body: string } {
  if (commitments.length === 1) {
    return {
      title: Strings.accountDetailMoveTitleOne,
      body: Strings.accountDetailMoveBodyOne(commitments[0].name, accountName),
    };
  }
  const count = formatCount(commitments);
  return {
    title: Strings.accountDetailMoveTitleMany(count),
    body: Strings.accountDetailMoveBodyMany(count, accountName),
  };
}

export function resolveMovedToast({
  accountName,
  commitments,
  replacementName,
}: {
  accountName: string;
  commitments: Commitments;
  replacementName: string;
}): string {
  if (commitments.length === 1) {
    return Strings.accountDetailDeletedMovedOne(accountName, commitments[0].name, replacementName);
  }
  return Strings.accountDetailDeletedMovedMany(
    accountName,
    formatCount(commitments),
    replacementName,
  );
}
