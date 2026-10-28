import { AmountType, type Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { formatDisplayAmount } from '@/utils/format_amount';
import { formatShortWeekdayDate, formatWeekdayDate } from '@/utils/format_date';
import { parsePositiveDecimal } from '@/utils/parse_decimal';

import { resolvePaymentDayDistance } from '../../../../domain/payment_day_distance';
import { resolvePaymentState } from '../../../../domain/payment_state';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import type { DayIndicatorTone } from '../../../../utils/day_indicator';
import {
  type CommitmentStatusTag,
  resolveCommitmentStatusTag,
} from '../../components/commitment_row.helpers';
import { resolveCycleDayLine } from '../detail.helpers';

/** What the write moves on the paying account, from `deriveResolution`'s figures. */
export interface PayWritePreview {
  amount: number;
  currency: Currency;
  accountName: string;
}

export interface PaySheetFieldErrors {
  amount?: string;
  account?: string;
  rate?: string;
}

interface PayTrackFootnoteInput {
  amountType: AmountType;
  amountText: string;
  estimate: number | undefined;
  commitmentCurrency: Currency;
  preview: PayWritePreview | undefined;
  paidDate: string;
  today: string;
}

/** The variable hints while the amount is empty, else the write preview; `undefined` is the idle track's empty line. */
export function resolvePayTrackFootnote(input: PayTrackFootnoteInput): string | undefined {
  const { amountType, amountText, estimate, commitmentCurrency, preview, paidDate, today } = input;
  if (amountType === AmountType.Variable && amountText.trim() === '') {
    return estimate === undefined
      ? Strings.commitmentsPayNoEstimateHint
      : Strings.commitmentsPayEstimateHint(formatDisplayAmount(estimate, commitmentCurrency));
  }
  if (preview === undefined) return undefined;
  const amount = formatDisplayAmount(preview.amount, preview.currency);
  return paidDate === today
    ? Strings.commitmentsPayPreviewToday(amount, preview.accountName)
    : Strings.commitmentsPayPreviewOnDay(
        amount,
        preview.accountName,
        formatShortWeekdayDate(paidDate, today),
      );
}

export function resolvePayButtonLabel(amountText: string, currency: Currency): string {
  const amount = parsePositiveDecimal(amountText);
  return amount === undefined
    ? Strings.commitmentsPayCtaBare
    : Strings.commitmentsPayCta(formatDisplayAmount(amount, currency));
}

/** The rate's line counts: it is a field marked above, in the rate card. */
export function resolvePaySheetStatusMessage(errors: PaySheetFieldErrors): string | undefined {
  const count = Object.values(errors).filter((message) => message !== undefined).length;
  return count === 0 ? undefined : Strings.fixFieldsMarkedAbove(count);
}

export interface PayCycleLine extends CommitmentStatusTag {
  text: string;
  tone: DayIndicatorTone;
}

/** The cycle line under the title: its status tag, then the due day and its distance from `today`. */
export function resolvePayCycleLine(
  payment: Pick<CommitmentPayment, 'due_date' | 'paid_date' | 'skipped_date'>,
  today: string,
): PayCycleLine {
  const indicator = resolveCycleDayLine(resolvePaymentDayDistance(payment, today));
  return {
    ...resolveCommitmentStatusTag(resolvePaymentState(payment, today)),
    text: Strings.commitmentsPayCycleLine(formatWeekdayDate(payment.due_date), indicator.text),
    tone: indicator.tone,
  };
}
