import { AmountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentMonthPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  buildCommitmentSections,
  buildCommitmentsSearchTally,
  type CommitmentsSection,
} from '@/modules/commitments/screens/commitments/commitments.helpers';
import type { CommitmentStatusFilter } from '@/modules/commitments/screens/commitments/commitments.state';
import { makeTestCommitment, makeTestMonthPayment } from '@/test_helpers/commitment';

const TODAY = '2026-10-22';
const MONTH = '2026-10';
const RATE = 50.5;

const COMMITMENTS: Commitment[] = [
  makeTestCommitment({ id: 'rent', name: 'Rent', amount: 8000 }),
  makeTestCommitment({ id: 'gym', name: 'Gym', amount: 500 }),
  makeTestCommitment({ id: 'netflix', name: 'Netflix', amount: 15.5, currency: Currency.USD }),
  makeTestCommitment({
    id: 'bill',
    name: 'Electricity',
    amount_type: AmountType.Variable,
    amount: null,
  }),
  makeTestCommitment({ id: 'old', name: 'Old gym', amount: 400, is_active: 0 }),
];
const AMOUNT_BY_COMMITMENT: Record<string, number> = {
  rent: 8000,
  gym: 500,
  netflix: 15.5,
  bill: 600,
  old: 400,
};

function pay(
  id: string,
  commitmentId: string,
  overrides: Partial<CommitmentMonthPayment> & Pick<CommitmentMonthPayment, 'due_date'>,
): CommitmentMonthPayment {
  return makeTestMonthPayment({
    id,
    commitment_id: commitmentId,
    amount_due: AMOUNT_BY_COMMITMENT[commitmentId],
    currency: commitmentId === 'netflix' ? Currency.USD : Currency.EGP,
    ...overrides,
  });
}

function build(
  rows: CommitmentMonthPayment[],
  options: {
    yearMonth?: string;
    today?: string;
    liveRate?: number | undefined;
    statusFilter?: CommitmentStatusFilter;
  } = {},
) {
  return buildCommitmentSections({
    rows,
    commitmentsById: new Map(COMMITMENTS.map((commitment) => [commitment.id, commitment])),
    yearMonth: options.yearMonth ?? MONTH,
    today: options.today ?? TODAY,
    liveRate: 'liveRate' in options ? options.liveRate : RATE,
    statusFilter: options.statusFilter ?? 'all',
  });
}

function ids(sections: CommitmentsSection[]) {
  return sections.map((section) => [section.key, section.data.map((payment) => payment.id)]);
}

function sectionOf(sections: CommitmentsSection[], key: CommitmentPaymentStatus) {
  const section = sections.find((candidate) => candidate.key === key);
  if (section === undefined) throw new Error(`no ${key} section`);
  return section;
}

const OCTOBER_ROWS = [
  pay('rent-skipped', 'rent', { due_date: '2026-10-10', skipped_date: '2026-10-10' }),
  pay('netflix-oct', 'netflix', { due_date: '2026-10-28' }),
  pay('gym-oct', 'gym', { due_date: '2026-10-05' }),
  pay('gym-paid', 'gym', {
    due_date: '2026-10-01',
    paid_date: '2026-10-02',
    amount_paid: 500,
    paid_egp_amount: 500,
  }),
  pay('rent-oct', 'rent', { due_date: '2026-10-22' }),
  pay('rent-sep', 'rent', { due_date: '2026-09-01' }),
];

describe('buildCommitmentSections — the five sections', () => {
  it('draws Overdue, Due today, Upcoming, Paid and Skipped in order with labels, counts and EGP sums', () => {
    const { sections } = build(OCTOBER_ROWS);

    expect(
      sections.map(({ key, label, figures, data }) => ({
        key,
        label,
        figures,
        count: data.length,
      })),
    ).toEqual([
      {
        key: CommitmentPaymentStatus.Overdue,
        label: 'Overdue',
        figures: { mode: 'figures', net: '8,500 EGP', count: '2' },
        count: 2,
      },
      {
        key: CommitmentPaymentStatus.Due,
        label: 'Due today',
        figures: { mode: 'figures', net: '8,000 EGP', count: '1' },
        count: 1,
      },
      {
        key: CommitmentPaymentStatus.Upcoming,
        label: 'Upcoming',
        figures: { mode: 'figures', net: '783 EGP', count: '1' },
        count: 1,
      },
      {
        key: CommitmentPaymentStatus.Paid,
        label: 'Paid',
        figures: { mode: 'figures', net: '500 EGP', count: '1' },
        count: 1,
      },
      {
        key: CommitmentPaymentStatus.Skipped,
        label: 'Skipped',
        figures: { mode: 'figures', net: '8,000 EGP', count: '1' },
        count: 1,
      },
    ]);
  });

  it('marks Overdue alone in the danger tone', () => {
    const { sections } = build(OCTOBER_ROWS);

    expect(sections.map((section) => [section.key, section.tone])).toEqual([
      [CommitmentPaymentStatus.Overdue, 'danger'],
      [CommitmentPaymentStatus.Due, 'default'],
      [CommitmentPaymentStatus.Upcoming, 'default'],
      [CommitmentPaymentStatus.Paid, 'default'],
      [CommitmentPaymentStatus.Skipped, 'default'],
    ]);
  });

  it('puts the rows carried from earlier months first in Overdue', () => {
    const { sections } = build([
      pay('gym-oct', 'gym', { due_date: '2026-10-05' }),
      pay('rent-sep', 'rent', { due_date: '2026-09-01' }),
      pay('rent-aug', 'rent', { due_date: '2026-08-01' }),
    ]);

    expect(ids(sections)).toEqual([
      [CommitmentPaymentStatus.Overdue, ['rent-aug', 'rent-sep', 'gym-oct']],
    ]);
  });

  it('draws no section for no rows, and a zero tally', () => {
    expect(build([])).toEqual({ sections: [], tally: { egp: 0, count: 0, showTilde: false } });
  });

  it('draws Overdue alone for a month whose only rows are carried overdue', () => {
    const { sections } = build([
      pay('rent-aug', 'rent', { due_date: '2026-08-01' }),
      pay('rent-sep', 'rent', { due_date: '2026-09-01' }),
    ]);

    expect(ids(sections)).toEqual([[CommitmentPaymentStatus.Overdue, ['rent-aug', 'rent-sep']]]);
  });
});

describe('buildCommitmentSections — the selected month', () => {
  it('a past month holds its unpaid rows and the carried rows in Overdue and a later month’s row in none', () => {
    const { sections } = build(
      [
        pay('rent-sep', 'rent', { due_date: '2026-09-01' }),
        pay('gym-aug', 'gym', { due_date: '2026-08-20' }),
        pay('gym-aug-paid', 'gym', {
          due_date: '2026-08-05',
          paid_date: '2026-08-05',
          amount_paid: 500,
          paid_egp_amount: 500,
        }),
        pay('rent-aug', 'rent', { due_date: '2026-08-01' }),
        pay('rent-jul', 'rent', { due_date: '2026-07-01' }),
      ],
      { yearMonth: '2026-08' },
    );

    expect(ids(sections)).toEqual([
      [CommitmentPaymentStatus.Overdue, ['rent-jul', 'rent-aug', 'gym-aug']],
      [CommitmentPaymentStatus.Paid, ['gym-aug-paid']],
    ]);
  });

  it('a future month holds the overdue rows carried to it and leaves out a row of an earlier future month', () => {
    const { sections } = build(
      [
        pay('rent-dec', 'rent', { due_date: '2026-12-01' }),
        pay('rent-nov', 'rent', { due_date: '2026-11-01' }),
        pay('gym-oct', 'gym', { due_date: '2026-10-05' }),
      ],
      { yearMonth: '2026-12' },
    );

    expect(ids(sections)).toEqual([
      [CommitmentPaymentStatus.Overdue, ['gym-oct']],
      [CommitmentPaymentStatus.Upcoming, ['rent-dec']],
    ]);
  });

  it('a carried row paid or skipped since sits in no section', () => {
    const { sections } = build([
      pay('rent-sep-paid', 'rent', {
        due_date: '2026-09-01',
        paid_date: '2026-10-02',
        amount_paid: 8000,
        paid_egp_amount: 8000,
      }),
      pay('gym-sep-skipped', 'gym', { due_date: '2026-09-15', skipped_date: '2026-10-01' }),
      pay('gym-oct', 'gym', { due_date: '2026-10-25' }),
    ]);

    expect(ids(sections)).toEqual([[CommitmentPaymentStatus.Upcoming, ['gym-oct']]]);
  });

  it('a stopped commitment’s paid and skipped rows sit in Paid and Skipped', () => {
    const { sections } = build([
      pay('old-skipped', 'old', { due_date: '2026-10-03', skipped_date: '2026-10-03' }),
      pay('old-paid', 'old', {
        due_date: '2026-10-01',
        paid_date: '2026-10-01',
        amount_paid: 400,
        paid_egp_amount: 400,
      }),
    ]);

    expect(ids(sections)).toEqual([
      [CommitmentPaymentStatus.Paid, ['old-paid']],
      [CommitmentPaymentStatus.Skipped, ['old-skipped']],
    ]);
  });

  it('on a 30-day month’s last day a row that day is due today and the next day’s sits in none', () => {
    const { sections } = build(
      [
        pay('rent-may', 'rent', { due_date: '2026-05-01' }),
        pay('rent-apr-30', 'rent', { due_date: '2026-04-30' }),
        pay('gym-apr-29', 'gym', { due_date: '2026-04-29' }),
      ],
      { yearMonth: '2026-04', today: '2026-04-30' },
    );

    expect(ids(sections)).toEqual([
      [CommitmentPaymentStatus.Overdue, ['gym-apr-29']],
      [CommitmentPaymentStatus.Due, ['rent-apr-30']],
    ]);
  });

  it('carries a row due on 31 January into February as Overdue', () => {
    const { sections } = build(
      [
        pay('rent-feb-28', 'rent', { due_date: '2026-02-28' }),
        pay('rent-jan-31', 'rent', { due_date: '2026-01-31' }),
      ],
      { yearMonth: '2026-02', today: '2026-02-10' },
    );

    expect(ids(sections)).toEqual([
      [CommitmentPaymentStatus.Overdue, ['rent-jan-31']],
      [CommitmentPaymentStatus.Upcoming, ['rent-feb-28']],
    ]);
  });

  it('holds a leap-day row due today in February, Overdue in February after it, and carried into March', () => {
    const leapDay = [pay('rent-leap', 'rent', { due_date: '2028-02-29' })];

    expect(ids(build(leapDay, { yearMonth: '2028-02', today: '2028-02-29' }).sections)).toEqual([
      [CommitmentPaymentStatus.Due, ['rent-leap']],
    ]);
    expect(ids(build(leapDay, { yearMonth: '2028-02', today: '2028-03-05' }).sections)).toEqual([
      [CommitmentPaymentStatus.Overdue, ['rent-leap']],
    ]);
    expect(ids(build(leapDay, { yearMonth: '2028-03', today: '2028-03-05' }).sections)).toEqual([
      [CommitmentPaymentStatus.Overdue, ['rent-leap']],
    ]);
  });
});

describe('buildCommitmentSections — order within a section', () => {
  it('sorts Paid by paid date descending and the other four by due date then id, from shuffled rows', () => {
    const paid = (id: string, dueDate: string, paidDate: string) =>
      pay(id, 'gym', {
        due_date: dueDate,
        paid_date: paidDate,
        amount_paid: 500,
        paid_egp_amount: 500,
      });
    const skipped = (id: string, dueDate: string) =>
      pay(id, 'gym', { due_date: dueDate, skipped_date: dueDate });

    const { sections } = build([
      pay('z-oct-30', 'gym', { due_date: '2026-10-30' }),
      paid('p1', '2026-10-01', '2026-10-03'),
      pay('b-oct-05', 'gym', { due_date: '2026-10-05' }),
      skipped('s2', '2026-10-12'),
      pay('d-b', 'gym', { due_date: TODAY }),
      paid('p3', '2026-10-15', '2026-10-10'),
      pay('c-sep-30', 'gym', { due_date: '2026-09-30' }),
      pay('y-oct-25', 'gym', { due_date: '2026-10-25' }),
      skipped('s1', '2026-10-03'),
      pay('a-oct-05', 'gym', { due_date: '2026-10-05' }),
      paid('p2', '2026-10-02', '2026-10-20'),
      pay('d-a', 'gym', { due_date: TODAY }),
    ]);

    expect(ids(sections)).toEqual([
      [CommitmentPaymentStatus.Overdue, ['c-sep-30', 'a-oct-05', 'b-oct-05']],
      [CommitmentPaymentStatus.Due, ['d-a', 'd-b']],
      [CommitmentPaymentStatus.Upcoming, ['y-oct-25', 'z-oct-30']],
      [CommitmentPaymentStatus.Paid, ['p2', 'p3', 'p1']],
      [CommitmentPaymentStatus.Skipped, ['s1', 's2']],
    ]);
  });
});

describe('buildCommitmentSections — section sums', () => {
  it('prefixes "~" on an Upcoming sum holding variable rows, the one without an estimate adding 0', () => {
    const { sections } = build([
      pay('rent-up', 'rent', { due_date: '2026-10-28' }),
      pay('bill-none', 'bill', { due_date: '2026-10-26', amount_due: null }),
      pay('bill-est', 'bill', { due_date: '2026-10-25', amount_due: 600 }),
    ]);

    expect(sectionOf(sections, CommitmentPaymentStatus.Upcoming).figures).toEqual({
      mode: 'figures',
      net: '~ 8,600 EGP',
      count: '3',
    });
  });

  it('prefixes "~" on a Skipped sum holding a skipped variable row, never on Paid', () => {
    const { sections } = build([
      pay('bill-skipped', 'bill', {
        due_date: '2026-10-03',
        skipped_date: '2026-10-03',
        amount_due: 600,
      }),
      pay('bill-paid', 'bill', {
        due_date: '2026-10-01',
        paid_date: '2026-10-01',
        amount_due: 600,
        amount_paid: 640,
        paid_egp_amount: 640,
      }),
    ]);

    expect(sectionOf(sections, CommitmentPaymentStatus.Skipped).figures).toEqual({
      mode: 'figures',
      net: '~ 600 EGP',
      count: '1',
    });
    expect(sectionOf(sections, CommitmentPaymentStatus.Paid).figures).toEqual({
      mode: 'figures',
      net: '640 EGP',
      count: '1',
    });
  });

  it('holds a section with a USD unpaid row in its skeleton until the rate loads, and prints the rest', () => {
    const { sections } = build(
      [
        pay('netflix-oct', 'netflix', { due_date: '2026-10-28' }),
        pay('rent-oct', 'rent', { due_date: TODAY }),
        pay('netflix-paid', 'netflix', {
          due_date: '2026-10-01',
          paid_date: '2026-10-01',
          amount_paid: 15.5,
          paid_egp_amount: 760,
        }),
      ],
      { liveRate: undefined },
    );

    expect(
      sections.map(({ key, figures, accessibilityLabel }) => ({
        key,
        figures,
        accessibilityLabel,
      })),
    ).toEqual([
      {
        key: CommitmentPaymentStatus.Due,
        figures: { mode: 'figures', net: '8,000 EGP', count: '1' },
        accessibilityLabel: 'Due today, 8,000 EGP, 1 payment',
      },
      {
        key: CommitmentPaymentStatus.Upcoming,
        figures: { mode: 'skeleton' },
        accessibilityLabel: 'Upcoming, loading',
      },
      {
        key: CommitmentPaymentStatus.Paid,
        figures: { mode: 'figures', net: '760 EGP', count: '1' },
        accessibilityLabel: 'Paid, 760 EGP, 1 payment',
      },
    ]);
  });

  it('speaks the section, its sum and its count, singular at one row', () => {
    const { sections } = build([
      pay('rent-sep', 'rent', { due_date: '2026-09-01' }),
      pay('rent-up', 'rent', { due_date: '2026-10-28' }),
      pay('gym-up', 'gym', { due_date: '2026-10-29' }),
      pay('gym-up-2', 'gym', { due_date: '2026-10-30' }),
    ]);

    expect(sections.map((section) => section.accessibilityLabel)).toEqual([
      'Overdue, 8,000 EGP, 1 payment',
      'Upcoming, 9,000 EGP, 3 payments',
    ]);
  });
});

describe('buildCommitmentSections — status tab and ties', () => {
  it('under a status tab holds that state’s rows alone, its sum and the tally over them', () => {
    const { sections, tally } = build(OCTOBER_ROWS, {
      statusFilter: CommitmentPaymentStatus.Overdue,
    });

    expect(ids(sections)).toEqual([[CommitmentPaymentStatus.Overdue, ['rent-sep', 'gym-oct']]]);
    expect(sections[0]?.figures).toEqual({ mode: 'figures', net: '8,500 EGP', count: '2' });
    expect(tally).toEqual({ egp: 8500, count: 2, showTilde: false });
  });

  it('breaks a tie on paid date by due date then id, whatever the input order', () => {
    const paid = (id: string, dueDate: string) =>
      pay(id, 'gym', {
        due_date: dueDate,
        paid_date: '2026-10-20',
        amount_paid: 500,
        paid_egp_amount: 500,
      });
    const rows = [paid('p-b', '2026-10-05'), paid('p-c', '2026-10-01'), paid('p-a', '2026-10-05')];

    expect(ids(build(rows).sections)).toEqual([
      [CommitmentPaymentStatus.Paid, ['p-c', 'p-a', 'p-b']],
    ]);
    expect(ids(build([...rows].reverse()).sections)).toEqual([
      [CommitmentPaymentStatus.Paid, ['p-c', 'p-a', 'p-b']],
    ]);
  });
});

describe('buildCommitmentSections — the search tally', () => {
  const MATCHED = [
    pay('netflix-paid', 'netflix', {
      due_date: '2026-10-01',
      paid_date: '2026-10-01',
      amount_paid: 15.5,
      paid_egp_amount: 760,
    }),
    pay('netflix-oct', 'netflix', { due_date: '2026-10-28' }),
    pay('rent-oct', 'rent', { due_date: TODAY }),
    pay('rent-sep-paid', 'rent', {
      due_date: '2026-09-01',
      paid_date: '2026-10-02',
      amount_paid: 8000,
      paid_egp_amount: 8000,
    }),
  ];

  it('counts the rows the sections hold, a paid USD row at its paid_egp_amount and an unpaid one at the rate', () => {
    const { sections, tally } = build(MATCHED);

    expect(tally).toEqual({ egp: 9542.75, count: 3, showTilde: false });
    expect(tally?.count).toBe(sections.reduce((total, section) => total + section.data.length, 0));
  });

  it('is undefined before the rate loads while an unpaid USD row matches', () => {
    expect(build(MATCHED, { liveRate: undefined }).tally).toBeUndefined();
  });
});

describe('buildCommitmentsSearchTally', () => {
  const TOTAL = { egp: 1240, count: 3, showTilde: false };
  const NO_TEXT = {
    count: undefined,
    label: '',
    filterSummary: undefined,
    sum: undefined,
    accessibilityLabel: undefined,
  };

  it('leaves the slot empty with no text while nothing is on, whatever the hero shows', () => {
    for (const heroMode of ['figures', 'skeleton', 'dashes'] as const) {
      expect(buildCommitmentsSearchTally({ isOn: false, heroMode, total: TOTAL })).toEqual({
        mode: 'empty',
        ...NO_TEXT,
      });
    }
  });

  it('draws the skeleton bar while the hero holds its skeleton', () => {
    expect(buildCommitmentsSearchTally({ isOn: true, heroMode: 'skeleton', total: TOTAL })).toEqual(
      { mode: 'skeleton', ...NO_TEXT },
    );
  });

  it('draws the skeleton bar while the hero shows figures and the rows are not summed', () => {
    expect(
      buildCommitmentsSearchTally({ isOn: true, heroMode: 'figures', total: undefined }),
    ).toEqual({ mode: 'skeleton', ...NO_TEXT });
  });

  it('prints "— payments" with no sum while the hero prints dashes', () => {
    for (const total of [TOTAL, undefined]) {
      expect(buildCommitmentsSearchTally({ isOn: true, heroMode: 'dashes', total })).toEqual({
        mode: 'failed',
        count: '—',
        label: 'payments',
        filterSummary: undefined,
        sum: undefined,
        accessibilityLabel: '— payments',
      });
    }
  });

  it('prints "0 payments" with no sum at 0 matches', () => {
    expect(
      buildCommitmentsSearchTally({
        isOn: true,
        heroMode: 'figures',
        total: { egp: 0, count: 0, showTilde: false },
      }),
    ).toEqual({
      mode: 'figures',
      count: '0',
      label: 'payments',
      filterSummary: undefined,
      sum: undefined,
      accessibilityLabel: '0 payments',
    });
  });

  it('prints the count and the unsigned EGP sum in the neutral colour, spoken as one line', () => {
    expect(buildCommitmentsSearchTally({ isOn: true, heroMode: 'figures', total: TOTAL })).toEqual({
      mode: 'figures',
      count: '3',
      label: 'payments',
      filterSummary: undefined,
      sum: { text: '1,240', polarity: 'neutral', currencyCode: 'EGP' },
      accessibilityLabel: '3 payments 1,240 EGP',
    });
  });

  it('says "payment" at one match', () => {
    expect(
      buildCommitmentsSearchTally({
        isOn: true,
        heroMode: 'figures',
        total: { egp: 500, count: 1, showTilde: false },
      }),
    ).toEqual({
      mode: 'figures',
      count: '1',
      label: 'payment',
      filterSummary: undefined,
      sum: { text: '500', polarity: 'neutral', currencyCode: 'EGP' },
      accessibilityLabel: '1 payment 500 EGP',
    });
  });

  it('prefixes "~" on a sum holding an unpaid variable row, in print and in speech', () => {
    const tally = buildCommitmentsSearchTally({
      isOn: true,
      heroMode: 'figures',
      total: { egp: 12_600, count: 2, showTilde: true },
    });

    expect(tally.sum).toEqual({ text: '~ 12,600', polarity: 'neutral', currencyCode: 'EGP' });
    expect(tally.accessibilityLabel).toBe('2 payments ~ 12,600 EGP');
  });

  it('groups a four-digit count', () => {
    expect(
      buildCommitmentsSearchTally({
        isOn: true,
        heroMode: 'figures',
        total: { egp: 2_000_000, count: 1_200, showTilde: false },
      }),
    ).toMatchObject({ count: '1,200', sum: { text: '2,000,000' } });
  });

  it('sums all four paid currency pairs at their transactions’ EGP amounts and an unpaid USD row at the live rate', () => {
    const rows = [
      pay('gym-paid-egp', 'gym', {
        due_date: '2026-10-01',
        paid_date: '2026-10-01',
        amount_paid: 500,
        account_id: 'acc-egp',
        paid_egp_amount: 500,
      }),
      pay('rent-paid-usd', 'rent', {
        due_date: '2026-10-02',
        paid_date: '2026-10-02',
        amount_paid: 8000,
        account_id: 'acc-usd',
        paid_egp_amount: 8000,
      }),
      pay('netflix-paid-egp', 'netflix', {
        due_date: '2026-10-03',
        paid_date: '2026-10-03',
        amount_paid: 15.5,
        account_id: 'acc-egp',
        paid_egp_amount: 775,
      }),
      pay('netflix-paid-usd', 'netflix', {
        due_date: '2026-10-04',
        paid_date: '2026-10-04',
        amount_paid: 15.5,
        account_id: 'acc-usd',
        paid_egp_amount: 759.5,
      }),
      pay('netflix-unpaid', 'netflix', { due_date: '2026-10-28' }),
    ];

    const tally = buildCommitmentsSearchTally({
      isOn: true,
      heroMode: 'figures',
      total: build(rows, { today: TODAY, liveRate: RATE }).tally,
    });

    expect(tally.count).toBe('5');
    expect(tally.sum?.text).toBe('10,817');
    expect(tally.accessibilityLabel).toBe('5 payments 10,817 EGP');
  });
});
