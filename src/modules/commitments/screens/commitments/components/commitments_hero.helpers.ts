import type { PolaritySignal } from '@/components/ui/flow_polarity';
import type { ListHeroModel } from '@/components/ui/list_hero';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { CommitmentPaymentStatus, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  type CommitmentMonthAggregate,
  type CommitmentMonthFigure,
  computeCommitmentMonthTotals,
} from '@/modules/commitments/domain/commitment_month_totals';
import {
  STATUS_COLORS,
  STATUS_COUNTER_ORDER,
  STATUS_ICONS,
  STATUS_LABELS,
} from '@/modules/commitments/utils/commitment_status';
import { formatOwnedAmount, formatOwnedAmountParts } from '@/utils/format_amount';
import { wholePercent } from '@/utils/money';
import { daysLeftInMonth, fullMonthName } from '@/utils/year_month';

export type CommitmentsHeroMode = 'skeleton' | 'dashes' | 'figures';

export interface CommitmentsHeroFigure {
  value: string;
  showTilde: boolean;
}

export interface CommitmentsHeroInput {
  mode: CommitmentsHeroMode;
  /** Read only in `'figures'`. */
  aggregate: CommitmentMonthAggregate | undefined;
  /** EGP per USD, read once by the screen hook. */
  rate: number;
  /** The selected month, `YYYY-MM`. */
  yearMonth: string;
  /** `YYYY-MM-DD`; the caller reads the clock, never this layer. */
  today: string;
  /** The one applied account's name; `undefined` when unscoped or not yet loaded. */
  accountLabel?: string;
}

export interface CommitmentsHeroCount {
  value: string;
  accessibilityLabel: string;
}

export interface CommitmentsHeroModel {
  mode: CommitmentsHeroMode;
  title: string;
  monthLabel: string;
  currencyCode: string;
  amountAccessibilityLabel: string;
  leftToPay: CommitmentsHeroFigure;
  committed: CommitmentsHeroFigure;
  paid: CommitmentsHeroFigure;
  skipped: CommitmentsHeroFigure;
  overdue: CommitmentsHeroFigure;
  overduePolarity: PolaritySignal;
  counts: Record<CommitmentPaymentStatus, CommitmentsHeroCount>;
  paidPct: number | undefined;
  percent: string;
  carried: string | undefined;
  daysLeft: string | undefined;
  /** What follows the danger `carried` segment on the caption's right line. */
  captionTrail: string | undefined;
  railAccessibilityLabel: string;
}

// The aggregate's totals are EGP, so every hero figure prints in EGP.
const HERO_CURRENCY = Currency.EGP;

const DASH_FIGURE: CommitmentsHeroFigure = {
  value: Strings.commitmentsHeroUnavailable,
  showTilde: false,
};

export function resolveCommitmentsHeroAccountId(accountIds: readonly string[]): string | undefined {
  return accountIds.length === 1 ? accountIds[0] : undefined;
}

export function resolveCommitmentsHeroMode(input: {
  heldKey: string | undefined;
  errorKey: string | undefined;
  keyOnScreen: string;
  rateLoaded: boolean;
}): CommitmentsHeroMode {
  if (input.heldKey === input.keyOnScreen) return input.rateLoaded ? 'figures' : 'skeleton';
  if (input.errorKey === input.keyOnScreen) return 'dashes';
  return 'skeleton';
}

function heroFigure(figure: CommitmentMonthFigure): CommitmentsHeroFigure {
  return {
    value: formatOwnedAmountParts(figure.egp, HERO_CURRENCY).value,
    showTilde: figure.showTilde,
  };
}

function printHeroFigure(figure: CommitmentsHeroFigure): string {
  return figure.showTilde ? Strings.commitmentsSectionSumEstimate(figure.value) : figure.value;
}

function resolveCaptionTrail(
  carried: string | undefined,
  daysLeft: string | undefined,
): string | undefined {
  if (carried !== undefined && daysLeft !== undefined) {
    return Strings.commitmentsHeroCarried + Strings.commitmentsHeroCaptionSeparator + daysLeft;
  }
  if (carried !== undefined) return Strings.commitmentsHeroCarried;
  return daysLeft;
}

function mapCounts(
  count: (status: CommitmentPaymentStatus) => CommitmentsHeroCount,
): Record<CommitmentPaymentStatus, CommitmentsHeroCount> {
  return {
    [CommitmentPaymentStatus.Paid]: count(CommitmentPaymentStatus.Paid),
    [CommitmentPaymentStatus.Skipped]: count(CommitmentPaymentStatus.Skipped),
    [CommitmentPaymentStatus.Overdue]: count(CommitmentPaymentStatus.Overdue),
    [CommitmentPaymentStatus.Due]: count(CommitmentPaymentStatus.Due),
    [CommitmentPaymentStatus.Upcoming]: count(CommitmentPaymentStatus.Upcoming),
  };
}

export function buildCommitmentsHeroModel(input: CommitmentsHeroInput): CommitmentsHeroModel {
  const days = daysLeftInMonth(input.yearMonth, input.today);
  const daysLeft = days === undefined ? undefined : Strings.commitmentsHeroDays(days);
  const base = {
    title:
      input.accountLabel === undefined
        ? Strings.commitmentsHeroTitle
        : Strings.commitmentsHeroTitleScoped(input.accountLabel),
    monthLabel: fullMonthName(input.yearMonth),
    currencyCode: CURRENCY_CONFIG[HERO_CURRENCY].code,
    daysLeft,
  };

  if (input.mode !== 'figures' || input.aggregate === undefined) {
    return {
      ...base,
      mode: input.mode === 'figures' ? 'skeleton' : input.mode,
      amountAccessibilityLabel: Strings.commitmentsHeroAmountUnavailableA11y(base.currencyCode),
      leftToPay: DASH_FIGURE,
      committed: DASH_FIGURE,
      paid: DASH_FIGURE,
      skipped: DASH_FIGURE,
      overdue: DASH_FIGURE,
      overduePolarity: 'neutral',
      counts: mapCounts((status) => ({
        value: Strings.commitmentsHeroUnavailable,
        accessibilityLabel: Strings.commitmentsHeroCounterUnavailableA11y(STATUS_LABELS[status]),
      })),
      paidPct: undefined,
      percent: Strings.commitmentsHeroPercentUnavailable,
      carried: undefined,
      captionTrail: daysLeft,
      railAccessibilityLabel:
        input.mode === 'dashes'
          ? Strings.transactionsTotalsLoadError
          : Strings.commitmentsHeroPercentUnavailable,
    };
  }

  const totals = computeCommitmentMonthTotals(input.aggregate, input.rate);
  const paidPct =
    totals.committed.egp !== 0 ? wholePercent(totals.paid.egp, totals.committed.egp) : undefined;
  const leftToPay = heroFigure(totals.leftToPay);
  const amountText = formatOwnedAmount(totals.leftToPay.egp, HERO_CURRENCY);
  const percent =
    paidPct === undefined
      ? Strings.commitmentsHeroPercentUnavailable
      : Strings.commitmentsHeroPercent(paidPct);
  const carried =
    totals.carriedCount > 0
      ? Strings.commitmentsHeroCarriedOverdue(totals.carriedCount)
      : undefined;

  return {
    ...base,
    mode: 'figures',
    amountAccessibilityLabel: leftToPay.showTilde
      ? Strings.commitmentsSectionSumEstimate(amountText)
      : amountText,
    leftToPay,
    committed: heroFigure(totals.committed),
    paid: heroFigure(totals.paid),
    skipped: heroFigure(totals.skipped),
    overdue: totals.carriedCount === 0 ? DASH_FIGURE : heroFigure(totals.overdue),
    overduePolarity: totals.carriedCount === 0 ? 'neutral' : 'bad',
    counts: mapCounts((status) => ({
      value: String(totals.counts[status]),
      accessibilityLabel: Strings.commitmentsHeroCounterA11y(
        STATUS_LABELS[status],
        totals.counts[status],
      ),
    })),
    paidPct,
    percent,
    carried,
    captionTrail: resolveCaptionTrail(carried, daysLeft),
    railAccessibilityLabel: percent,
  };
}

export function buildCommitmentsListHeroModel(model: CommitmentsHeroModel): ListHeroModel {
  return {
    mode: model.mode === 'skeleton' ? 'skeleton' : 'loaded',
    title: model.title,
    monthLabel: model.monthLabel,
    amount: printHeroFigure(model.leftToPay),
    currencyCode: model.currencyCode,
    amountAccessibilityLabel: model.amountAccessibilityLabel,
    columns: [
      {
        label: Strings.commitmentsPaid,
        value: printHeroFigure(model.paid),
        align: 'left',
        polarity: 'neutral',
      },
      {
        label: Strings.commitmentsHeroCommitted,
        value: printHeroFigure(model.committed),
        align: 'center',
        polarity: 'neutral',
      },
      {
        label: Strings.commitmentsSkipped,
        value: printHeroFigure(model.skipped),
        align: 'center',
        polarity: 'neutral',
      },
      {
        label: Strings.commitmentsOverdue,
        value: printHeroFigure(model.overdue),
        align: 'right',
        polarity: model.overduePolarity,
      },
    ],
    rail: {
      pct: model.paidPct ?? 0,
      tone: 'gold',
      accessibilityLabel: model.railAccessibilityLabel,
    },
    counters: STATUS_COUNTER_ORDER.map((status) => ({
      icon: STATUS_ICONS[status],
      color: STATUS_COLORS[status],
      value: model.counts[status].value,
      accessibilityLabel: model.counts[status].accessibilityLabel,
    })),
  };
}
