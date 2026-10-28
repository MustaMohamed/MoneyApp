import type { DayCardTone } from '@/components/ui/day_card_row.helpers';
import type { DayHeaderFigures, DayHeaderSection } from '@/components/ui/day_header';
import type { SearchTallyModel } from '@/components/ui/search_tally';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { AmountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { formatAmount, formatDisplayAmount, formatDisplayMagnitude } from '@/utils/format_amount';

import {
  type CommitmentRowsTotal,
  type CommitmentSumRow,
  sumCommitmentRowsEgp,
} from '../../domain/commitment_section_sums';
import { isDueInMonth, resolvePaymentState } from '../../domain/payment_state';
import type { Commitment } from '../../entities/commitment.entity';
import type { CommitmentMonthPayment } from '../../entities/commitment_payment.entity';
import type { CommitmentStatusFilter } from './commitments.state';
import type { CommitmentsHeroMode } from './components/commitments_hero.helpers';

export interface CommitmentsSection extends DayHeaderSection {
  key: CommitmentPaymentStatus;
  tone: DayCardTone;
  data: CommitmentMonthPayment[];
}

interface CommitmentSectionsInput {
  rows: readonly CommitmentMonthPayment[];
  statusFilter: CommitmentStatusFilter;
  commitmentsById: ReadonlyMap<string, Commitment>;
  yearMonth: string;
  today: string;
  liveRate: number | undefined;
}

interface CommitmentSectionsModel {
  sections: CommitmentsSection[];
  tally: CommitmentRowsTotal | undefined;
}

const SECTION_RANK = {
  [CommitmentPaymentStatus.Overdue]: 0,
  [CommitmentPaymentStatus.Due]: 1,
  [CommitmentPaymentStatus.Upcoming]: 2,
  [CommitmentPaymentStatus.Paid]: 3,
  [CommitmentPaymentStatus.Skipped]: 4,
} satisfies Record<CommitmentPaymentStatus, number>;

const SECTION_ORDER = Object.values(CommitmentPaymentStatus).sort(
  (a, b) => SECTION_RANK[a] - SECTION_RANK[b],
);

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
  if (aPaid === bPaid) return byDueDate(a, b);
  return aPaid < bPaid ? 1 : -1;
}

/** Overdue takes every overdue row due by the month's end, carried rows included; the rest take the month's own rows. */
function sectionKeyOf(
  payment: CommitmentMonthPayment,
  statusFilter: CommitmentStatusFilter,
  yearMonth: string,
  today: string,
): CommitmentPaymentStatus | undefined {
  const state = resolvePaymentState(payment, today);
  if (statusFilter !== 'all' && state !== statusFilter) return undefined;
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

/** `rows` are the rows the search and filters matched, in any order; `statusFilter` is the status tab; `liveRate` is EGP per USD once loaded. */
export function buildCommitmentSections(input: CommitmentSectionsInput): CommitmentSectionsModel {
  const { rows, statusFilter, commitmentsById, yearMonth, today, liveRate } = input;
  const grouped = new Map<CommitmentPaymentStatus, CommitmentMonthPayment[]>();
  for (const payment of rows) {
    const key = sectionKeyOf(payment, statusFilter, yearMonth, today);
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
  const heldSumRows: CommitmentSumRow[] = [];
  for (const key of SECTION_ORDER) {
    const group = grouped.get(key);
    if (group === undefined) continue;
    const data = group.sort(
      key === CommitmentPaymentStatus.Paid ? byPaidDateDescending : byDueDate,
    );
    const sumRows = data.map(toSumRow);
    heldSumRows.push(...sumRows);
    const label = SECTION_LABELS[key];
    sections.push({
      key,
      label,
      tone: key === CommitmentPaymentStatus.Overdue ? 'danger' : 'default',
      data,
      ...sectionFigures(label, sumCommitmentRowsEgp(sumRows, liveRate)),
    });
  }

  return { sections, tally: sumCommitmentRowsEgp(heldSumRows, liveRate) };
}

interface CommitmentsSearchTallyInput {
  isOn: boolean;
  heroMode: CommitmentsHeroMode;
  /** `undefined` while the rows are not summed. */
  total: CommitmentRowsTotal | undefined;
}

const NO_TALLY_TEXT = {
  count: undefined,
  label: '',
  filterSummary: undefined,
  sum: undefined,
  accessibilityLabel: undefined,
} as const;

function tallyLine(
  mode: SearchTallyModel['mode'],
  count: string,
  label: string,
  sum: SearchTallyModel['sum'],
): SearchTallyModel {
  const spoken = sum === undefined ? [count, label] : [count, label, sum.text, sum.currencyCode];
  return {
    mode,
    count,
    label,
    filterSummary: undefined,
    sum,
    accessibilityLabel: spoken.join(' '),
  };
}

/** Follows the hero: its skeleton draws one bar, its dashes print `— payments`. */
export function buildCommitmentsSearchTally(input: CommitmentsSearchTallyInput): SearchTallyModel {
  const { isOn, heroMode, total } = input;
  if (!isOn) return { mode: 'empty', ...NO_TALLY_TEXT };
  if (heroMode === 'skeleton' || (heroMode === 'figures' && total === undefined)) {
    return { mode: 'skeleton', ...NO_TALLY_TEXT };
  }
  if (heroMode === 'dashes' || total === undefined) {
    return tallyLine(
      'failed',
      Strings.commitmentsHeroUnavailable,
      Strings.commitmentsTallyPayments,
      undefined,
    );
  }
  if (total.count === 0) {
    return tallyLine('figures', formatAmount(0), Strings.commitmentsTallyPayments, undefined);
  }
  const magnitude = formatDisplayMagnitude(total.egp, Currency.EGP).text;
  return tallyLine(
    'figures',
    formatAmount(total.count),
    total.count === 1 ? Strings.commitmentsTallyOnePayment : Strings.commitmentsTallyPayments,
    {
      text: total.showTilde ? Strings.commitmentsSectionSumEstimate(magnitude) : magnitude,
      polarity: 'neutral',
      currencyCode: CURRENCY_CONFIG[Currency.EGP].code,
    },
  );
}
