import { RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import type { Commitment } from '../../entities/commitment.entity';

const PERIOD_LABEL: Record<RecurrencePeriod, string> = {
  [RecurrencePeriod.Days]: Strings.commitmentsRecurrencePeriodDay,
  [RecurrencePeriod.Weeks]: Strings.commitmentsRecurrencePeriodWeek,
  [RecurrencePeriod.Months]: Strings.commitmentsRecurrencePeriodMonth,
  [RecurrencePeriod.Years]: Strings.commitmentsRecurrencePeriodYear,
};

export function buildRecurrenceLabel(
  commitment: Pick<Commitment, 'recurrence_every' | 'recurrence_period'>,
): string {
  const { recurrence_every, recurrence_period } = commitment;
  return Strings.commitmentsRecurrenceEveryN(recurrence_every, PERIOD_LABEL[recurrence_period]);
}
