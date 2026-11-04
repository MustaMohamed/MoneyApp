import { Strings } from '@/constants/strings';
import { formatAmount } from '@/utils/format_amount';

import type { CommitmentStopCounts } from '../../../domain/payment_state';

/** A count of zero drops its sentence; with both at zero the body is the closing sentence alone. */
export function resolveStopConfirmBody(counts: CommitmentStopCounts): string {
  const { unpaid, paid } = counts;
  const sentences: string[] = [];
  if (unpaid > 0) {
    sentences.push(
      unpaid === 1
        ? Strings.commitmentsStopConfirmUnpaidOne
        : Strings.commitmentsStopConfirmUnpaidMany(formatAmount(unpaid)),
    );
  }
  if (paid > 0) {
    sentences.push(
      paid === 1
        ? Strings.commitmentsStopConfirmPaidOne
        : Strings.commitmentsStopConfirmPaidMany(formatAmount(paid)),
    );
  }
  sentences.push(Strings.commitmentsStopConfirmNothingCharged);
  return sentences.join(' ');
}
