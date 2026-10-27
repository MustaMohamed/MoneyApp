import { CommitmentPaymentStatus } from '@/constants/enums';
import {
  type CommitmentMonthAggregate,
  CommitmentMonthTotalsError,
} from '@/modules/commitments/domain/commitment_month_totals';
import {
  buildCommitmentsHeroModel,
  buildCommitmentsListHeroModel,
  type CommitmentsHeroInput,
  resolveCommitmentsHeroAccountId,
  resolveCommitmentsHeroMode,
} from '@/modules/commitments/screens/commitments/components/commitments_hero.helpers';
import { STATUS_COLORS, STATUS_ICONS } from '@/modules/commitments/utils/commitment_status';
import { makeTestHeldBucket, makeTestMonthAggregate } from '@/test_helpers/commitment';

const DASH = '—';
const KEY_OCT = '2026-10|';
const KEY_SEP = '2026-09|';
const KEY_OCT_ACCOUNT = '2026-10|a';

// At rate 50: Committed 1,200 + 500 + (10 × 50) + (2,000 + 20 × 50) = 5,200; Paid 1,200 is 23%.
function mixedAggregate(): CommitmentMonthAggregate {
  return {
    paid: { egp: 1200, count: 2 },
    skipped: makeTestHeldBucket({ egp: 300, count: 1 }),
    overdue: makeTestHeldBucket({ egp: 500, count: 1 }),
    due: makeTestHeldBucket({ usd: 10, count: 1 }),
    upcoming: makeTestHeldBucket({ egp: 2000, usd: 20, count: 3, hasVariable: true }),
    carried: makeTestHeldBucket({ egp: 400, count: 2, hasVariable: true }),
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
const DASH_PERCENT = '— paid';
const LOAD_ERROR = "Couldn't load this month's figures.";
const DASH_COUNTS = {
  [CommitmentPaymentStatus.Paid]: { value: DASH, accessibilityLabel: 'Paid, —' },
  [CommitmentPaymentStatus.Skipped]: { value: DASH, accessibilityLabel: 'Skipped, —' },
  [CommitmentPaymentStatus.Overdue]: { value: DASH, accessibilityLabel: 'Overdue, —' },
  [CommitmentPaymentStatus.Due]: { value: DASH, accessibilityLabel: 'Due, —' },
  [CommitmentPaymentStatus.Upcoming]: { value: DASH, accessibilityLabel: 'Upcoming, —' },
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
      title: 'Left to pay',
      monthLabel: 'October',
      currencyCode: 'EGP',
      amountAccessibilityLabel: '~ 4,000 EGP',
      leftToPay: { value: '4,000', showTilde: true },
      committed: { value: '5,200', showTilde: true },
      paid: { value: '1,200', showTilde: false },
      skipped: { value: '300', showTilde: false },
      overdue: { value: '400', showTilde: true },
      overduePolarity: 'bad',
      counts: {
        [CommitmentPaymentStatus.Paid]: { value: '2', accessibilityLabel: 'Paid, 2 payments' },
        [CommitmentPaymentStatus.Skipped]: { value: '1', accessibilityLabel: 'Skipped, 1 payment' },
        [CommitmentPaymentStatus.Overdue]: {
          value: '3',
          accessibilityLabel: 'Overdue, 3 payments',
        },
        [CommitmentPaymentStatus.Due]: { value: '1', accessibilityLabel: 'Due, 1 payment' },
        [CommitmentPaymentStatus.Upcoming]: {
          value: '3',
          accessibilityLabel: 'Upcoming, 3 payments',
        },
      },
      paidPct: 23,
      percent: '23% paid',
      carried: '2 overdue',
      daysLeft: '11 days left',
      captionTrail: ' carried · 11 days left',
      railAccessibilityLabel: '23% paid',
    });
  });

  it('converts the USD legs at the rate passed in, so Committed and Left to pay follow it', () => {
    const model = buildCommitmentsHeroModel(input({ rate: 48 }));

    // Committed 1,200 + 500 + 480 + 2,960 = 5,140.
    expect(model.committed).toEqual({ value: '5,140', showTilde: true });
    expect(model.leftToPay).toEqual({ value: '3,940', showTilde: true });
    expect(model.amountAccessibilityLabel).toBe('~ 3,940 EGP');
    expect(model.paid).toEqual({ value: '1,200', showTilde: false });
    expect(model.skipped).toEqual({ value: '300', showTilde: false });
    expect(model.overdue).toEqual({ value: '400', showTilde: true });
  });

  it('propagates the totals error for a USD leg at a rate that is not positive', () => {
    expect(() => buildCommitmentsHeroModel(input({ rate: 0 }))).toThrow(CommitmentMonthTotalsError);
  });

  it('prints zeros, the paid dash and days left for a month with no rows', () => {
    const model = buildCommitmentsHeroModel(input({ aggregate: makeTestMonthAggregate() }));

    expect(model).toMatchObject({
      mode: 'figures',
      amountAccessibilityLabel: '0 EGP',
      leftToPay: { value: '0', showTilde: false },
      committed: { value: '0', showTilde: false },
      paid: { value: '0', showTilde: false },
      skipped: { value: '0', showTilde: false },
      overdue: DASH_FIGURE,
      counts: {
        [CommitmentPaymentStatus.Paid]: { value: '0', accessibilityLabel: 'Paid, 0 payments' },
        [CommitmentPaymentStatus.Skipped]: {
          value: '0',
          accessibilityLabel: 'Skipped, 0 payments',
        },
        [CommitmentPaymentStatus.Overdue]: {
          value: '0',
          accessibilityLabel: 'Overdue, 0 payments',
        },
        [CommitmentPaymentStatus.Due]: { value: '0', accessibilityLabel: 'Due, 0 payments' },
        [CommitmentPaymentStatus.Upcoming]: {
          value: '0',
          accessibilityLabel: 'Upcoming, 0 payments',
        },
      },
      percent: DASH_PERCENT,
      railAccessibilityLabel: DASH_PERCENT,
      captionTrail: '11 days left',
    });
    expect(model.paidPct).toBeUndefined();
    expect(model.carried).toBeUndefined();
  });

  it("dashes Overdue at 0 carried rows and counts the month's own overdue rows", () => {
    const aggregate = { ...mixedAggregate(), carried: makeTestHeldBucket() };

    const model = buildCommitmentsHeroModel(input({ aggregate }));

    expect(model.overdue).toEqual(DASH_FIGURE);
    expect(model.counts[CommitmentPaymentStatus.Overdue]).toEqual({
      value: '1',
      accessibilityLabel: 'Overdue, 1 payment',
    });
    expect(model.carried).toBeUndefined();
    expect(model.percent).toBe('23% paid');
  });

  it('counts days left only in the current month, through its last day and a leap February', () => {
    expect(buildCommitmentsHeroModel(input({ today: '2026-10-31' })).daysLeft).toBe('0 days left');
    expect(
      buildCommitmentsHeroModel(
        input({ yearMonth: '2028-02', today: '2028-02-28', aggregate: makeTestMonthAggregate() }),
      ).daysLeft,
    ).toBe('1 day left');
    expect(
      buildCommitmentsHeroModel(input({ yearMonth: '2026-09', today: '2026-10-20' })).daysLeft,
    ).toBeUndefined();
  });

  it.each(['dashes', 'skeleton'] as const)(
    'prints the dash in every figure and count in %s mode and keeps days left',
    (mode) => {
      expect(buildCommitmentsHeroModel(input({ mode }))).toEqual({
        mode,
        title: 'Left to pay',
        monthLabel: 'October',
        currencyCode: 'EGP',
        amountAccessibilityLabel: '— EGP',
        leftToPay: DASH_FIGURE,
        committed: DASH_FIGURE,
        paid: DASH_FIGURE,
        skipped: DASH_FIGURE,
        overdue: DASH_FIGURE,
        overduePolarity: 'neutral',
        counts: DASH_COUNTS,
        paidPct: undefined,
        percent: DASH_PERCENT,
        carried: undefined,
        daysLeft: '11 days left',
        captionTrail: '11 days left',
        railAccessibilityLabel: mode === 'dashes' ? LOAD_ERROR : DASH_PERCENT,
      });
    },
  );

  it('falls back to the skeleton with dashes when figures mode has no aggregate', () => {
    expect(buildCommitmentsHeroModel(input({ mode: 'figures', aggregate: undefined }))).toEqual({
      mode: 'skeleton',
      title: 'Left to pay',
      monthLabel: 'October',
      currencyCode: 'EGP',
      amountAccessibilityLabel: '— EGP',
      leftToPay: DASH_FIGURE,
      committed: DASH_FIGURE,
      paid: DASH_FIGURE,
      skipped: DASH_FIGURE,
      overdue: DASH_FIGURE,
      overduePolarity: 'neutral',
      counts: DASH_COUNTS,
      paidPct: undefined,
      percent: DASH_PERCENT,
      carried: undefined,
      daysLeft: '11 days left',
      captionTrail: '11 days left',
      railAccessibilityLabel: DASH_PERCENT,
    });
  });

  it.each(['figures', 'dashes', 'skeleton'] as const)(
    'titles the hero Left to pay, and names the one account passed in, in %s mode',
    (mode) => {
      expect(buildCommitmentsHeroModel(input({ mode })).title).toBe('Left to pay');
      expect(buildCommitmentsHeroModel(input({ mode, accountLabel: 'CIB Premier' })).title).toBe(
        'Left to pay · CIB Premier',
      );
    },
  );

  it('joins the carried segment and days left into one caption trail', () => {
    const model = buildCommitmentsHeroModel(input());

    expect(model.carried).toBe('2 overdue');
    expect(model.captionTrail).toBe(' carried · 11 days left');
  });

  it('keeps the carried segment alone on a past month with carried rows', () => {
    const model = buildCommitmentsHeroModel(input({ yearMonth: '2026-09' }));

    expect(model.carried).toBe('2 overdue');
    expect(model.daysLeft).toBeUndefined();
    expect(model.captionTrail).toBe(' carried');
  });

  it('keeps days left alone at 0 carried rows', () => {
    const model = buildCommitmentsHeroModel(
      input({ aggregate: { ...mixedAggregate(), carried: makeTestHeldBucket() } }),
    );

    expect(model.carried).toBeUndefined();
    expect(model.captionTrail).toBe('11 days left');
  });

  it('prints the paid percent alone on a past month with 0 carried rows', () => {
    const model = buildCommitmentsHeroModel(
      input({
        yearMonth: '2026-09',
        aggregate: { ...mixedAggregate(), carried: makeTestHeldBucket() },
      }),
    );

    expect(model.percent).toBe('23% paid');
    expect(model.carried).toBeUndefined();
    expect(model.daysLeft).toBeUndefined();
    expect(model.captionTrail).toBeUndefined();
  });
});

function counter(status: CommitmentPaymentStatus, value: string, accessibilityLabel: string) {
  return {
    icon: STATUS_ICONS[status],
    color: STATUS_COLORS[status],
    value,
    accessibilityLabel,
  };
}

const DASH_COUNTERS = [
  counter(CommitmentPaymentStatus.Paid, DASH, 'Paid, —'),
  counter(CommitmentPaymentStatus.Overdue, DASH, 'Overdue, —'),
  counter(CommitmentPaymentStatus.Due, DASH, 'Due, —'),
  counter(CommitmentPaymentStatus.Upcoming, DASH, 'Upcoming, —'),
  counter(CommitmentPaymentStatus.Skipped, DASH, 'Skipped, —'),
];

function listHero(overrides: Partial<CommitmentsHeroInput> = {}) {
  return buildCommitmentsListHeroModel(buildCommitmentsHeroModel(input(overrides)));
}

describe('buildCommitmentsListHeroModel', () => {
  it('draws Left to pay, four columns, the gold rail and five counters from the figures', () => {
    expect(listHero()).toEqual({
      mode: 'loaded',
      title: 'Left to pay',
      monthLabel: 'October',
      amount: '~ 4,000',
      currencyCode: 'EGP',
      amountAccessibilityLabel: '~ 4,000 EGP',
      columns: [
        { label: 'Paid', value: '1,200', align: 'left', polarity: 'neutral' },
        { label: 'Committed', value: '~ 5,200', align: 'center', polarity: 'neutral' },
        { label: 'Skipped', value: '300', align: 'center', polarity: 'neutral' },
        { label: 'Overdue', value: '~ 400', align: 'right', polarity: 'bad' },
      ],
      rail: { pct: 23, tone: 'gold', accessibilityLabel: '23% paid' },
      counters: [
        counter(CommitmentPaymentStatus.Paid, '2', 'Paid, 2 payments'),
        counter(CommitmentPaymentStatus.Overdue, '3', 'Overdue, 3 payments'),
        counter(CommitmentPaymentStatus.Due, '1', 'Due, 1 payment'),
        counter(CommitmentPaymentStatus.Upcoming, '3', 'Upcoming, 3 payments'),
        counter(CommitmentPaymentStatus.Skipped, '1', 'Skipped, 1 payment'),
      ],
    });
  });

  it('keeps the skeleton and draws the figures as loaded in both other modes', () => {
    expect(listHero({ mode: 'skeleton' }).mode).toBe('skeleton');
    expect(listHero({ mode: 'dashes' }).mode).toBe('loaded');
    expect(listHero({ mode: 'figures' }).mode).toBe('loaded');
  });

  it('prints the Skipped figure with the tilde while it holds a skipped variable row', () => {
    const aggregate = {
      ...mixedAggregate(),
      skipped: makeTestHeldBucket({ egp: 300, count: 1, hasVariable: true }),
    };

    expect(listHero({ aggregate }).columns[2]).toEqual({
      label: 'Skipped',
      value: '~ 300',
      align: 'center',
      polarity: 'neutral',
    });
  });

  it('draws the Overdue dash plain at 0 carried rows and when the figures failed', () => {
    const overdueDash = { label: 'Overdue', value: DASH, align: 'right', polarity: 'neutral' };

    expect(
      listHero({ aggregate: { ...mixedAggregate(), carried: makeTestHeldBucket() } }).columns[3],
    ).toEqual(overdueDash);
    expect(listHero({ mode: 'dashes' }).columns[3]).toEqual(overdueDash);
  });

  it('prints dashes in every figure and counter when the figures failed', () => {
    expect(listHero({ mode: 'dashes' })).toEqual({
      mode: 'loaded',
      title: 'Left to pay',
      monthLabel: 'October',
      amount: DASH,
      currencyCode: 'EGP',
      amountAccessibilityLabel: '— EGP',
      columns: [
        { label: 'Paid', value: DASH, align: 'left', polarity: 'neutral' },
        { label: 'Committed', value: DASH, align: 'center', polarity: 'neutral' },
        { label: 'Skipped', value: DASH, align: 'center', polarity: 'neutral' },
        { label: 'Overdue', value: DASH, align: 'right', polarity: 'neutral' },
      ],
      rail: { pct: 0, tone: 'gold', accessibilityLabel: LOAD_ERROR },
      counters: DASH_COUNTERS,
    });
  });

  it('fills the gold rail to 0 when no percent is paid at Committed 0', () => {
    expect(listHero({ aggregate: makeTestMonthAggregate() }).rail).toEqual({
      pct: 0,
      tone: 'gold',
      accessibilityLabel: DASH_PERCENT,
    });
  });

  it('draws five counters in the skeleton, so the skeleton draws five bars', () => {
    expect(listHero({ mode: 'skeleton' }).counters).toEqual(DASH_COUNTERS);
  });

  it('names the one account in the shared hero title', () => {
    expect(listHero({ accountLabel: 'CIB Premier' }).title).toBe('Left to pay · CIB Premier');
  });
});
