import { Currency } from '@/constants/enums';
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

export interface CommitmentMonthAggregate {
  paid: CommitmentPaidBucket;
  skipped: CommitmentHeldBucket;
  overdue: CommitmentHeldBucket;
  due: CommitmentHeldBucket;
  upcoming: CommitmentHeldBucket;
  carried: CommitmentHeldBucket;
}

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
  counts: { paid: number; skipped: number; overdue: number; due: number; upcoming: number };
}

function heldBuckets(aggregate: CommitmentMonthAggregate): CommitmentHeldBucket[] {
  return [
    aggregate.skipped,
    aggregate.overdue,
    aggregate.due,
    aggregate.upcoming,
    aggregate.carried,
  ];
}

function heldEgp(bucket: CommitmentHeldBucket, rate: number): number {
  if (bucket.usd === 0) return roundMoney(bucket.egp);
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
  const hasUsd = heldBuckets(aggregate).some((bucket) => bucket.usd !== 0);
  if (hasUsd && (!Number.isFinite(rate) || rate <= 0)) {
    throw new RangeError(`Rate must be finite and positive with a USD leg: ${rate}`);
  }

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
      paid: aggregate.paid.count,
      skipped: aggregate.skipped.count,
      overdue: aggregate.overdue.count + aggregate.carried.count,
      due: aggregate.due.count,
      upcoming: aggregate.upcoming.count,
    },
  };
}
