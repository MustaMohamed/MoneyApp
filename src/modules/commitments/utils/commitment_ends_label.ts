import { DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { formatWeekdayDate } from '@/utils/format_date';

import type { Commitment } from '../entities/commitment.entity';

export function buildCommitmentEndsLabel(
  commitment: Pick<Commitment, 'duration_type' | 'end_after_count' | 'end_date'>,
): string {
  switch (commitment.duration_type) {
    case DurationType.Forever:
      return Strings.commitmentsEndsNever;
    case DurationType.AfterCount:
      return commitment.end_after_count === null
        ? Strings.commitmentsDurationAfterCount
        : Strings.commitmentsDurationAfterCountOf(commitment.end_after_count);
    case DurationType.UntilDate:
      return commitment.end_date === null
        ? Strings.commitmentsDurationUntilDate
        : Strings.commitmentsDurationUntilDateOf(formatWeekdayDate(commitment.end_date));
    default: {
      const unhandled: never = commitment.duration_type;
      return unhandled;
    }
  }
}
