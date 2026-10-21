import type {
  CommitmentHeldBucket,
  CommitmentMonthAggregate,
  CommitmentMonthTotals,
} from '@/modules/commitments/domain/commitment_month_totals';
import { computeCommitmentMonthTotals } from '@/modules/commitments/domain/commitment_month_totals';

type HeldBucketName = 'skipped' | 'overdue' | 'due' | 'upcoming' | 'carried';

const HELD_BUCKETS: HeldBucketName[] = ['skipped', 'overdue', 'due', 'upcoming', 'carried'];

function held(overrides: Partial<CommitmentHeldBucket> = {}): CommitmentHeldBucket {
  return { egp: 0, usd: 0, count: 0, hasVariable: false, ...overrides };
}

function aggregate(overrides: Partial<CommitmentMonthAggregate> = {}): CommitmentMonthAggregate {
  return {
    paid: { egp: 0, count: 0 },
    skipped: held(),
    overdue: held(),
    due: held(),
    upcoming: held(),
    carried: held(),
    ...overrides,
  };
}

function withBucket(
  name: HeldBucketName,
  bucket: CommitmentHeldBucket,
): Partial<CommitmentMonthAggregate> {
  const overrides: Partial<CommitmentMonthAggregate> = {};
  overrides[name] = bucket;
  return overrides;
}

function tildes(totals: CommitmentMonthTotals) {
  return {
    leftToPay: totals.leftToPay.showTilde,
    committed: totals.committed.showTilde,
    paid: totals.paid.showTilde,
    skipped: totals.skipped.showTilde,
    overdue: totals.overdue.showTilde,
  };
}

describe('computeCommitmentMonthTotals — the worked month at rate 50', () => {
  it('gives Committed as paid plus the month unpaid rows, Left to pay as Committed minus Paid', () => {
    const totals = computeCommitmentMonthTotals(
      aggregate({
        paid: { egp: 1000, count: 2 },
        overdue: held({ egp: 300, count: 1 }),
        due: held({ usd: 10, count: 1 }),
        upcoming: held({ egp: 200, usd: 1.5, count: 2, hasVariable: true }),
        carried: held({ egp: 120, usd: 2, count: 2 }),
        skipped: held({ usd: 3, count: 1, hasVariable: true }),
      }),
      50,
    );
    expect(totals).toEqual({
      leftToPay: { egp: 1075, showTilde: true },
      committed: { egp: 2075, showTilde: true },
      paid: { egp: 1000, showTilde: false },
      skipped: { egp: 150, showTilde: true },
      overdue: { egp: 220, showTilde: false },
      carriedCount: 2,
      counts: { paid: 2, skipped: 1, overdue: 3, due: 1, upcoming: 2 },
    });
  });
});

describe('computeCommitmentMonthTotals — rounding', () => {
  it('rounds a converted bucket half-even: USD 10.5 at 48.37 is 507.88', () => {
    const totals = computeCommitmentMonthTotals(
      aggregate({ carried: held({ usd: 10.5, count: 1 }), skipped: held({ usd: 10.5, count: 1 }) }),
      48.37,
    );
    expect(totals.overdue.egp).toBe(507.88);
    expect(totals.skipped.egp).toBe(507.88);
  });

  it('rounds each held bucket once before Committed sums them', () => {
    const totals = computeCommitmentMonthTotals(
      aggregate({ due: held({ usd: 10.5, count: 1 }), upcoming: held({ usd: 10.5, count: 1 }) }),
      48.37,
    );
    expect(totals.committed.egp).toBe(1015.76);
    expect(totals.leftToPay.egp).toBe(1015.76);
  });

  it('rounds the raw paid sum to 2dp', () => {
    const totals = computeCommitmentMonthTotals(
      aggregate({ paid: { egp: 0.1 + 0.2, count: 2 } }),
      50,
    );
    expect(totals.paid.egp).toBe(0.3);
    expect(totals.committed.egp).toBe(0.3);
    expect(totals.leftToPay.egp).toBe(0);
  });
});

describe('computeCommitmentMonthTotals — the "~" flags', () => {
  const NONE = { leftToPay: false, committed: false, paid: false, skipped: false, overdue: false };

  it.each<{ bucket: HeldBucketName; lit: Partial<typeof NONE> }>([
    { bucket: 'overdue', lit: { leftToPay: true, committed: true } },
    { bucket: 'due', lit: { leftToPay: true, committed: true } },
    { bucket: 'upcoming', lit: { leftToPay: true, committed: true } },
    { bucket: 'skipped', lit: { skipped: true } },
    { bucket: 'carried', lit: { overdue: true } },
  ])('a variable row with no estimate in $bucket lights only its own totals', ({ bucket, lit }) => {
    const totals = computeCommitmentMonthTotals(
      aggregate(withBucket(bucket, held({ count: 1, hasVariable: true }))),
      50,
    );
    expect(tildes(totals)).toEqual({ ...NONE, ...lit });
  });

  it('a variable row with an estimate lights the same totals as one without', () => {
    const totals = computeCommitmentMonthTotals(
      aggregate({ due: held({ egp: 75, count: 1, hasVariable: true }) }),
      50,
    );
    expect(totals.committed).toEqual({ egp: 75, showTilde: true });
    expect(totals.leftToPay).toEqual({ egp: 75, showTilde: true });
  });

  it('a paid sum never takes the "~", whatever the held buckets hold', () => {
    const variable = held({ count: 1, hasVariable: true });
    const totals = computeCommitmentMonthTotals(
      {
        paid: { egp: 400, count: 1 },
        skipped: variable,
        overdue: variable,
        due: variable,
        upcoming: variable,
        carried: variable,
      },
      50,
    );
    expect(totals.paid).toEqual({ egp: 400, showTilde: false });
  });
});

describe('computeCommitmentMonthTotals — an empty month', () => {
  it('gives every figure 0, no "~" and every count 0', () => {
    expect(computeCommitmentMonthTotals(aggregate(), 50)).toEqual({
      leftToPay: { egp: 0, showTilde: false },
      committed: { egp: 0, showTilde: false },
      paid: { egp: 0, showTilde: false },
      skipped: { egp: 0, showTilde: false },
      overdue: { egp: 0, showTilde: false },
      carriedCount: 0,
      counts: { paid: 0, skipped: 0, overdue: 0, due: 0, upcoming: 0 },
    });
  });
});

describe('computeCommitmentMonthTotals — the rate', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'throws RangeError at rate %p with a USD leg',
    (rate) => {
      expect(() =>
        computeCommitmentMonthTotals(aggregate({ due: held({ usd: 10, count: 1 }) }), rate),
      ).toThrow(RangeError);
    },
  );

  it.each(HELD_BUCKETS)('throws RangeError at rate 0 with a USD leg in %s', (bucket) => {
    expect(() =>
      computeCommitmentMonthTotals(aggregate(withBucket(bucket, held({ usd: 1, count: 1 }))), 0),
    ).toThrow(RangeError);
  });

  it('returns the figures at rate 0 when no bucket has a USD leg', () => {
    const totals = computeCommitmentMonthTotals(
      aggregate({
        paid: { egp: 100, count: 1 },
        overdue: held({ egp: 300, count: 1 }),
        carried: held({ egp: 50, count: 1 }),
      }),
      0,
    );
    expect(totals.committed).toEqual({ egp: 400, showTilde: false });
    expect(totals.leftToPay).toEqual({ egp: 300, showTilde: false });
    expect(totals.overdue).toEqual({ egp: 50, showTilde: false });
  });
});
