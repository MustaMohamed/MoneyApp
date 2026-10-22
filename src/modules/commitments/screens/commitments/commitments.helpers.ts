import type { DayCardTone } from '@/components/ui/day_card_row.helpers';
import type { DayHeaderFigures, DayHeaderSection } from '@/components/ui/day_header';
import { AmountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { formatAmount, formatDisplayAmount } from '@/utils/format_amount';

import {
  type CommitmentRowsTotal,
  type CommitmentSumRow,
  sumCommitmentRowsEgp,
} from '../../domain/commitment_section_sums';
import { isDueInMonth, resolvePaymentState } from '../../domain/payment_state';
import type { Commitment } from '../../entities/commitment.entity';
import type { CommitmentMonthPayment } from '../../entities/commitment_payment.entity';

export interface CommitmentsSection extends DayHeaderSection {
  key: CommitmentPaymentStatus;
  tone: DayCardTone;
  data: CommitmentMonthPayment[];
}

interface CommitmentSectionsInput {
  rows: readonly CommitmentMonthPayment[];
  commitmentsById: ReadonlyMap<string, Commitment>;
  yearMonth: string;
  today: string;
  liveRate: number | undefined;
}

interface CommitmentSectionsModel {
  sections: CommitmentsSection[];
  tally: CommitmentRowsTotal | undefined;
}

const SECTION_ORDER: readonly CommitmentPaymentStatus[] = [
  CommitmentPaymentStatus.Overdue,
  CommitmentPaymentStatus.Due,
  CommitmentPaymentStatus.Upcoming,
  CommitmentPaymentStatus.Paid,
  CommitmentPaymentStatus.Skipped,
];

const SECTION_LABELS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Strings.commitmentsOverdue,
  [CommitmentPaymentStatus.Due]: Strings.commitmentsDueToday,
  [CommitmentPaymentStatus.Upcoming]: Strings.commitmentsUpcoming,
  [CommitmentPaymentStatus.Paid]: Strings.commitmentsPaid,
  [CommitmentPaymentStatus.Skipped]: Strings.commitmentsSkipped,
};

function byDueDate(a: CommitmentMonthPayment, b: CommitmentMonthPayment): number {
  if (a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

function byPaidDateDescending(a: CommitmentMonthPayment, b: CommitmentMonthPayment): number {
  const aPaid = a.paid_date ?? '';
  const bPaid = b.paid_date ?? '';
  if (aPaid === bPaid) return 0;
  return aPaid < bPaid ? 1 : -1;
}

/** Overdue takes every overdue row due by the month's end, carried rows included; the rest take the month's own rows. */
function sectionKeyOf(
  payment: CommitmentMonthPayment,
  yearMonth: string,
  today: string,
): CommitmentPaymentStatus | undefined {
  const state = resolvePaymentState(payment, today);
  if (state === CommitmentPaymentStatus.Overdue) {
    return payment.due_date.slice(0, 7) <= yearMonth ? state : undefined;
  }
  return isDueInMonth(payment, yearMonth) ? state : undefined;
}

function sectionFigures(
  label: string,
  total: CommitmentRowsTotal | undefined,
): Pick<DayHeaderSection, 'figures' | 'accessibilityLabel'> {
  if (total === undefined) {
    return {
      figures: { mode: 'skeleton' },
      accessibilityLabel: Strings.commitmentsSectionLoadingA11y(label),
    };
  }
  const sum = formatDisplayAmount(total.egp, Currency.EGP);
  const net = total.showTilde ? Strings.commitmentsSectionSumEstimate(sum) : sum;
  const figures: DayHeaderFigures = { mode: 'figures', net, count: formatAmount(total.count) };
  return {
    figures,
    accessibilityLabel:
      total.count === 1
        ? Strings.commitmentsSectionOneA11y(label, net)
        : Strings.commitmentsSectionA11y(label, net, formatAmount(total.count)),
  };
}

/** `rows` are the rows the status tab, search and filters matched, in any order; `liveRate` is EGP per USD once loaded. */
export function buildCommitmentSections(input: CommitmentSectionsInput): CommitmentSectionsModel {
  const { rows, commitmentsById, yearMonth, today, liveRate } = input;
  const grouped = new Map<CommitmentPaymentStatus, CommitmentMonthPayment[]>();
  for (const payment of rows) {
    const key = sectionKeyOf(payment, yearMonth, today);
    if (key === undefined) continue;
    const group = grouped.get(key);
    if (group === undefined) grouped.set(key, [payment]);
    else group.push(payment);
  }

  const toSumRow = (payment: CommitmentMonthPayment): CommitmentSumRow => ({
    payment,
    isVariable: commitmentsById.get(payment.commitment_id)?.amount_type === AmountType.Variable,
  });

  const sections: CommitmentsSection[] = [];
  for (const key of SECTION_ORDER) {
    const group = grouped.get(key);
    if (group === undefined) continue;
    const data = group.sort(
      key === CommitmentPaymentStatus.Paid ? byPaidDateDescending : byDueDate,
    );
    const label = SECTION_LABELS[key];
    sections.push({
      key,
      label,
      tone: key === CommitmentPaymentStatus.Overdue ? 'danger' : 'default',
      data,
      ...sectionFigures(label, sumCommitmentRowsEgp(data.map(toSumRow), liveRate)),
    });
  }

  const held = sections.flatMap((section) => section.data);
  return { sections, tally: sumCommitmentRowsEgp(held.map(toSumRow), liveRate) };
}
