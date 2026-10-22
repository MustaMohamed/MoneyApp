import { CommitmentPaymentStatus } from '@/constants/enums';
import {
  type CommitmentHeldBucket,
  type CommitmentMonthAggregate,
  CommitmentMonthTotalsError,
} from '@/modules/commitments/domain/commitment_month_totals';
import {
  buildCommitmentsHeroModel,
  type CommitmentsHeroInput,
  resolveCommitmentsHeroAccountId,
  resolveCommitmentsHeroMode,
} from '@/modules/commitments/screens/commitments/components/commitments_hero.helpers';

const DASH = '—';
const KEY_OCT = '2026-10|';
const KEY_SEP = '2026-09|';
const KEY_OCT_ACCOUNT = '2026-10|a';

function held(overrides: Partial<CommitmentHeldBucket> = {}): CommitmentHeldBucket {
  return { egp: 0, usd: 0, count: 0, hasVariable: false, ...overrides };
}

function emptyAggregate(): CommitmentMonthAggregate {
  return {
    paid: { egp: 0, count: 0 },
    skipped: held(),
    overdue: held(),
    due: held(),
    upcoming: held(),
    carried: held(),
  };
}

// At rate 50: Committed 1,200 + 500 + (10 × 50) + (2,000 + 20 × 50) = 5,200; Paid 1,200 is 23%.
function mixedAggregate(): CommitmentMonthAggregate {
  return {
    paid: { egp: 1200, count: 2 },
    skipped: held({ egp: 300, count: 1 }),
    overdue: held({ egp: 500, count: 1 }),
    due: held({ usd: 10, count: 1 }),
    upcoming: held({ egp: 2000, usd: 20, count: 3, hasVariable: true }),
    carried: held({ egp: 400, count: 2, hasVariable: true }),
  };
}

function input(overrides: Partial<CommitmentsHeroInput> = {}): CommitmentsHeroInput {
  return {
    mode: 'figures',
    aggregate: mixedAggregate(),
    rate: 50,
    yearMonth: '2026-10',
    today: '2026-10-20',
    ...overrides,
  };
}

const DASH_FIGURE = { value: DASH, showTilde: false };
const DASH_COUNTS = {
  [CommitmentPaymentStatus.Paid]: DASH,
  [CommitmentPaymentStatus.Skipped]: DASH,
  [CommitmentPaymentStatus.Overdue]: DASH,
  [CommitmentPaymentStatus.Due]: DASH,
  [CommitmentPaymentStatus.Upcoming]: DASH,
};

describe('resolveCommitmentsHeroAccountId', () => {
  it('scopes the hero to the one account a filter holds', () => {
    expect(resolveCommitmentsHeroAccountId(['a'])).toBe('a');
  });

  it('covers every account with no account or two accounts in the filter', () => {
    expect(resolveCommitmentsHeroAccountId([])).toBeUndefined();
    expect(resolveCommitmentsHeroAccountId(['a', 'b'])).toBeUndefined();
  });
});

describe('resolveCommitmentsHeroMode', () => {
  it('shows figures for a slot held on the key on screen once the rate has loaded', () => {
    expect(
      resolveCommitmentsHeroMode({
        heldKey: KEY_OCT,
        errorKey: undefined,
        keyOnScreen: KEY_OCT,
        rateLoaded: true,
      }),
    ).toBe('figures');
  });

  it('holds the skeleton for a slot on the key on screen until the rate loads', () => {
    expect(
      resolveCommitmentsHeroMode({
        heldKey: KEY_OCT,
        errorKey: undefined,
        keyOnScreen: KEY_OCT,
        rateLoaded: false,
      }),
    ).toBe('skeleton');
  });

  it('keeps the held figures when a reload of the key on screen fails', () => {
    expect(
      resolveCommitmentsHeroMode({
        heldKey: KEY_OCT,
        errorKey: KEY_OCT,
        keyOnScreen: KEY_OCT,
        rateLoaded: true,
      }),
    ).toBe('figures');
  });

  it('prints dashes when the first load for the key on screen failed, rate loaded or not', () => {
    expect(
      resolveCommitmentsHeroMode({
        heldKey: undefined,
        errorKey: KEY_OCT,
        keyOnScreen: KEY_OCT,
        rateLoaded: true,
      }),
    ).toBe('dashes');
    expect(
      resolveCommitmentsHeroMode({
        heldKey: undefined,
        errorKey: KEY_OCT,
        keyOnScreen: KEY_OCT,
        rateLoaded: false,
      }),
    ).toBe('dashes');
    expect(
      resolveCommitmentsHeroMode({
        heldKey: KEY_SEP,
        errorKey: KEY_OCT,
        keyOnScreen: KEY_OCT,
        rateLoaded: true,
      }),
    ).toBe('dashes');
  });

  it("never shows another month's or account's slot, and holds the skeleton instead", () => {
    expect(
      resolveCommitmentsHeroMode({
        heldKey: KEY_SEP,
        errorKey: undefined,
        keyOnScreen: KEY_OCT,
        rateLoaded: true,
      }),
    ).toBe('skeleton');
    expect(
      resolveCommitmentsHeroMode({
        heldKey: KEY_OCT_ACCOUNT,
        errorKey: undefined,
        keyOnScreen: KEY_OCT,
        rateLoaded: true,
      }),
    ).toBe('skeleton');
  });

  it('holds the skeleton before any load and when only another key failed', () => {
    expect(
      resolveCommitmentsHeroMode({
        heldKey: undefined,
        errorKey: undefined,
        keyOnScreen: KEY_OCT,
        rateLoaded: true,
      }),
    ).toBe('skeleton');
    expect(
      resolveCommitmentsHeroMode({
        heldKey: undefined,
        errorKey: KEY_SEP,
        keyOnScreen: KEY_OCT,
        rateLoaded: true,
      }),
    ).toBe('skeleton');
  });
});

describe('buildCommitmentsHeroModel', () => {
  it('prints every figure, tilde, count and caption segment from the month aggregate at rate 50', () => {
    expect(buildCommitmentsHeroModel(input())).toEqual({
      mode: 'figures',
      monthLabel: 'October',
      currencyCode: 'EGP',
      leftToPay: { value: '4,000', showTilde: true },
      committed: { value: '5,200', showTilde: true },
      paid: { value: '1,200', showTilde: false },
      skipped: { value: '300', showTilde: false },
      overdue: { value: '400', showTilde: true },
      counts: {
        [CommitmentPaymentStatus.Paid]: '2',
        [CommitmentPaymentStatus.Skipped]: '1',
        [CommitmentPaymentStatus.Overdue]: '3',
        [CommitmentPaymentStatus.Due]: '1',
        [CommitmentPaymentStatus.Upcoming]: '3',
      },
      paidPct: 23,
      percent: '23%',
      carried: '2 overdue',
      daysLeft: '11 days',
    });
  });

  it('converts the USD legs at the rate passed in, so Committed and Left to pay follow it', () => {
    const model = buildCommitmentsHeroModel(input({ rate: 48 }));

    // Committed 1,200 + 500 + 480 + 2,960 = 5,140.
    expect(model.committed).toEqual({ value: '5,140', showTilde: true });
    expect(model.leftToPay).toEqual({ value: '3,940', showTilde: true });
    expect(model.paid).toEqual({ value: '1,200', showTilde: false });
    expect(model.skipped).toEqual({ value: '300', showTilde: false });
    expect(model.overdue).toEqual({ value: '400', showTilde: true });
  });

  it('propagates the totals error for a USD leg at a rate that is not positive', () => {
    expect(() => buildCommitmentsHeroModel(input({ rate: 0 }))).toThrow(CommitmentMonthTotalsError);
  });

  it('prints zeros and dashes for a month with no rows', () => {
    const model = buildCommitmentsHeroModel(input({ aggregate: emptyAggregate() }));

    expect(model).toMatchObject({
      mode: 'figures',
      leftToPay: { value: '0', showTilde: false },
      committed: { value: '0', showTilde: false },
      paid: { value: '0', showTilde: false },
      skipped: { value: '0', showTilde: false },
      overdue: DASH_FIGURE,
      counts: {
        [CommitmentPaymentStatus.Paid]: '0',
        [CommitmentPaymentStatus.Skipped]: '0',
        [CommitmentPaymentStatus.Overdue]: '0',
        [CommitmentPaymentStatus.Due]: '0',
        [CommitmentPaymentStatus.Upcoming]: '0',
      },
      percent: DASH,
    });
    expect(model.paidPct).toBeUndefined();
    expect(model.carried).toBeUndefined();
  });

  it("dashes Overdue at 0 carried rows and counts the month's own overdue rows", () => {
    const aggregate = { ...mixedAggregate(), carried: held() };

    const model = buildCommitmentsHeroModel(input({ aggregate }));

    expect(model.overdue).toEqual(DASH_FIGURE);
    expect(model.counts[CommitmentPaymentStatus.Overdue]).toBe('1');
    expect(model.carried).toBeUndefined();
    expect(model.percent).toBe('23%');
  });

  it('counts days left only in the current month, through its last day and a leap February', () => {
    expect(buildCommitmentsHeroModel(input({ today: '2026-10-31' })).daysLeft).toBe('0 days');
    expect(
      buildCommitmentsHeroModel(
        input({ yearMonth: '2028-02', today: '2028-02-28', aggregate: emptyAggregate() }),
      ).daysLeft,
    ).toBe('1 day');
    expect(
      buildCommitmentsHeroModel(input({ yearMonth: '2026-09', today: '2026-10-20' })).daysLeft,
    ).toBeUndefined();
  });

  it.each(['dashes', 'skeleton'] as const)(
    'prints the dash in every figure and count in %s mode and keeps days left',
    (mode) => {
      expect(buildCommitmentsHeroModel(input({ mode }))).toEqual({
        mode,
        monthLabel: 'October',
        currencyCode: 'EGP',
        leftToPay: DASH_FIGURE,
        committed: DASH_FIGURE,
        paid: DASH_FIGURE,
        skipped: DASH_FIGURE,
        overdue: DASH_FIGURE,
        counts: DASH_COUNTS,
        paidPct: undefined,
        percent: DASH,
        carried: undefined,
        daysLeft: '11 days',
      });
    },
  );
});
