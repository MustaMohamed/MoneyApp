import { CURRENCY_CONFIG } from '@/constants/currency';
import { CommitmentPaymentStatus, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  type CommitmentMonthAggregate,
  type CommitmentMonthFigure,
  computeCommitmentMonthTotals,
} from '@/modules/commitments/domain/commitment_month_totals';
import { formatOwnedAmountParts } from '@/utils/format_amount';
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
}

export interface CommitmentsHeroModel {
  mode: CommitmentsHeroMode;
  monthLabel: string;
  currencyCode: string;
  leftToPay: CommitmentsHeroFigure;
  committed: CommitmentsHeroFigure;
  paid: CommitmentsHeroFigure;
  skipped: CommitmentsHeroFigure;
  overdue: CommitmentsHeroFigure;
  counts: Record<CommitmentPaymentStatus, string>;
  paidPct: number | undefined;
  percent: string;
  carried: string | undefined;
  daysLeft: string | undefined;
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

function mapCounts(
  count: (status: CommitmentPaymentStatus) => string,
): Record<CommitmentPaymentStatus, string> {
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
  const base = {
    monthLabel: fullMonthName(input.yearMonth),
    currencyCode: CURRENCY_CONFIG[HERO_CURRENCY].code,
    daysLeft: days === undefined ? undefined : Strings.commitmentsHeroDays(days),
  };

  if (input.mode !== 'figures' || input.aggregate === undefined) {
    return {
      ...base,
      mode: input.mode === 'figures' ? 'skeleton' : input.mode,
      leftToPay: DASH_FIGURE,
      committed: DASH_FIGURE,
      paid: DASH_FIGURE,
      skipped: DASH_FIGURE,
      overdue: DASH_FIGURE,
      counts: mapCounts(() => Strings.commitmentsHeroUnavailable),
      paidPct: undefined,
      percent: Strings.commitmentsHeroUnavailable,
      carried: undefined,
    };
  }

  const totals = computeCommitmentMonthTotals(input.aggregate, input.rate);
  const paidPct =
    totals.committed.egp !== 0 ? wholePercent(totals.paid.egp, totals.committed.egp) : undefined;

  return {
    ...base,
    mode: 'figures',
    leftToPay: heroFigure(totals.leftToPay),
    committed: heroFigure(totals.committed),
    paid: heroFigure(totals.paid),
    skipped: heroFigure(totals.skipped),
    overdue: totals.carriedCount === 0 ? DASH_FIGURE : heroFigure(totals.overdue),
    counts: mapCounts((status) => String(totals.counts[status])),
    paidPct,
    percent:
      paidPct === undefined
        ? Strings.commitmentsHeroUnavailable
        : Strings.commitmentsHeroPercent(paidPct),
    carried:
      totals.carriedCount > 0
        ? Strings.commitmentsHeroCarriedOverdue(totals.carriedCount)
        : undefined,
  };
}
