import { CURRENCY_CONFIG } from '@/constants/currency';
import { Strings } from '@/constants/strings';
import { formatShortWeekdayDate } from '@/utils/format_date';
import { fullMonthName } from '@/utils/year_month';

import type { Commitment } from '../../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import { composeCommitmentAmount, resolveDisplayAmount } from '../../../../utils/commitment_status';

/** `today` is the local calendar date `YYYY-MM-DD`; the month is the one the row counts toward. */
export function resolveSkipConfirmBody(input: {
  payment: CommitmentPayment;
  commitment: Commitment;
  today: string;
}): string {
  const { payment, commitment, today } = input;
  const { withCode } = composeCommitmentAmount(
    resolveDisplayAmount(payment, commitment),
    payment.currency,
    CURRENCY_CONFIG[payment.currency].code,
  );
  return Strings.commitmentsSkipConfirmBody(
    commitment.name,
    formatShortWeekdayDate(payment.due_date, today),
    withCode,
    fullMonthName(payment.due_date.slice(0, 7)),
  );
}
