import { CommitmentPaymentStatus, Currency } from '@/constants/enums';
import { convertCurrency } from '@/modules/accounts/domain/account_aggregation';
import { roundMoney } from '@/utils/money';

/** A paid row counts its transaction's EGP amount, so the bucket has no USD leg and no variable flag. */
export interface CommitmentPaidBucket {
  egp: number;
  count: number;
}

/** The rows' `amount_due` by currency leg, unrounded SQL sums; `hasVariable` is any row on a variable commitment. */
export interface CommitmentHeldBucket {
  egp: number;
  usd: number;
  count: number;
  hasVariable: boolean;
}

export const HELD_BUCKETS = ['skipped', 'overdue', 'due', 'upcoming', 'carried'] as const;
export type HeldBucketName = (typeof HELD_BUCKETS)[number];

export type CommitmentMonthAggregate = { paid: CommitmentPaidBucket } & Record<
  HeldBucketName,
  CommitmentHeldBucket
>;

export interface CommitmentMonthFigure {
  egp: number;
  showTilde: boolean;
}

export interface CommitmentMonthTotals {
  leftToPay: CommitmentMonthFigure;
  committed: CommitmentMonthFigure;
  paid: CommitmentMonthFigure;
  skipped: CommitmentMonthFigure;
  overdue: CommitmentMonthFigure;
  carriedCount: number;
  counts: Record<CommitmentPaymentStatus, number>;
}

/** Callers match on the thrown type, never on the message text. */
export class CommitmentMonthTotalsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommitmentMonthTotalsError';
  }
}

/** `rate` is EGP per USD; a USD leg needs it finite and positive. */
export function assertUsdLegRate(rate: number | undefined): asserts rate is number {
  if (rate === undefined || !Number.isFinite(rate) || rate <= 0) {
    throw new CommitmentMonthTotalsError(
      `Rate must be finite and positive with a USD leg: ${rate}`,
    );
  }
}

/** The EGP leg plus the USD leg converted once at `rate`, rounded once. */
export function heldEgp(
  bucket: Pick<CommitmentHeldBucket, 'egp' | 'usd'>,
  rate: number | undefined,
): number {
  if (bucket.usd === 0) return roundMoney(bucket.egp);
  assertUsdLegRate(rate);
  return roundMoney(
    bucket.egp +
      convertCurrency({ amount: bucket.usd, from: Currency.USD, to: Currency.EGP, rate }),
  );
}

/** `rate` is EGP per USD; it must be finite and positive while any held bucket has a USD leg. */
export function computeCommitmentMonthTotals(
  aggregate: CommitmentMonthAggregate,
  rate: number,
): CommitmentMonthTotals {
  const hasUsd = HELD_BUCKETS.map((name) => aggregate[name]).some((bucket) => bucket.usd !== 0);
  if (hasUsd) assertUsdLegRate(rate);

  const paid = roundMoney(aggregate.paid.egp);
  const committed = roundMoney(
    paid +
      heldEgp(aggregate.overdue, rate) +
      heldEgp(aggregate.due, rate) +
      heldEgp(aggregate.upcoming, rate),
  );
  const unpaidVariable =
    aggregate.overdue.hasVariable || aggregate.due.hasVariable || aggregate.upcoming.hasVariable;

  return {
    leftToPay: { egp: roundMoney(committed - paid), showTilde: unpaidVariable },
    committed: { egp: committed, showTilde: unpaidVariable },
    paid: { egp: paid, showTilde: false },
    skipped: {
      egp: heldEgp(aggregate.skipped, rate),
      showTilde: aggregate.skipped.hasVariable,
    },
    overdue: {
      egp: heldEgp(aggregate.carried, rate),
      showTilde: aggregate.carried.hasVariable,
    },
    carriedCount: aggregate.carried.count,
    counts: {
      [CommitmentPaymentStatus.Paid]: aggregate.paid.count,
      [CommitmentPaymentStatus.Skipped]: aggregate.skipped.count,
      [CommitmentPaymentStatus.Overdue]: aggregate.overdue.count + aggregate.carried.count,
      [CommitmentPaymentStatus.Due]: aggregate.due.count,
      [CommitmentPaymentStatus.Upcoming]: aggregate.upcoming.count,
    },
  };
}
