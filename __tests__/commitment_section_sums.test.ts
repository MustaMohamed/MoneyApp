import { Currency } from '@/constants/enums';
import { CommitmentMonthTotalsError } from '@/modules/commitments/domain/commitment_month_totals';
import {
  type CommitmentSumRow,
  resolveCommitmentRowLegEgp,
  sumCommitmentRowsEgp,
} from '@/modules/commitments/domain/commitment_section_sums';
import type { CommitmentMonthPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { makeTestMonthPayment } from '@/test_helpers/commitment';

const RATE = 50.5;
const PAID = { paid_date: '2026-09-02' } as const;
const SKIPPED = { skipped_date: '2026-09-02' } as const;

function row(
  overrides: Partial<CommitmentMonthPayment> = {},
  isVariable = false,
): CommitmentSumRow {
  return { payment: makeTestMonthPayment(overrides), isVariable };
}

describe('sumCommitmentRowsEgp — paid rows', () => {
  it.each<[string, Partial<CommitmentMonthPayment>, number]>([
    [
      'EGP commitment paid from an EGP account',
      { currency: Currency.EGP, amount_due: 8000, amount_paid: 8200, paid_egp_amount: 8200 },
      8200,
    ],
    [
      'EGP commitment paid from a USD account',
      { currency: Currency.EGP, amount_due: 5050, amount_paid: 5050, paid_egp_amount: 5049.75 },
      5049.75,
    ],
    [
      'USD commitment paid from an EGP account',
      { currency: Currency.USD, amount_due: 10, amount_paid: 10, paid_egp_amount: 505 },
      505,
    ],
    [
      'USD commitment paid from a USD account',
      { currency: Currency.USD, amount_due: 15, amount_paid: 15.5, paid_egp_amount: 782.75 },
      782.75,
    ],
  ])('%s counts its paid_egp_amount, with no rate loaded', (_pair, overrides, egp) => {
    expect(sumCommitmentRowsEgp([row({ ...PAID, ...overrides })], undefined)).toEqual({
      egp,
      count: 1,
      showTilde: false,
    });
  });

  it('sums the four pairs at their paid_egp_amount and never their amount_due', () => {
    const rows = [
      row({ ...PAID, currency: Currency.EGP, amount_due: 8000, paid_egp_amount: 8200 }),
      row({ ...PAID, currency: Currency.EGP, amount_due: 5050, paid_egp_amount: 5049.75 }),
      row({ ...PAID, currency: Currency.USD, amount_due: 10, paid_egp_amount: 505 }),
      row({ ...PAID, currency: Currency.USD, amount_due: 15, paid_egp_amount: 782.75 }),
    ];

    expect(sumCommitmentRowsEgp(rows, RATE)).toEqual({ egp: 14537.5, count: 4, showTilde: false });
  });

  it('a paid variable row counts its transaction amount and flags nothing', () => {
    expect(
      sumCommitmentRowsEgp(
        [row({ ...PAID, amount_due: 600, amount_paid: 640, paid_egp_amount: 640 }, true)],
        RATE,
      ),
    ).toEqual({ egp: 640, count: 1, showTilde: false });
  });
});

describe('sumCommitmentRowsEgp — unpaid and skipped rows', () => {
  it('adds the EGP leg and the USD leg converted at the rate', () => {
    const rows = [
      row({ currency: Currency.EGP, amount_due: 8000 }),
      row({ currency: Currency.USD, amount_due: 15.5 }),
      row({ ...SKIPPED, currency: Currency.USD, amount_due: 10 }),
    ];

    expect(sumCommitmentRowsEgp(rows, RATE)).toEqual({ egp: 9287.75, count: 3, showTilde: false });
  });

  it('rounds the converted total to 2 dp', () => {
    expect(
      sumCommitmentRowsEgp([row({ currency: Currency.USD, amount_due: 12.34 })], 48.37),
    ).toEqual({ egp: 596.89, count: 1, showTilde: false });
  });

  it('a variable unpaid row adds its estimate and flags the sum', () => {
    expect(sumCommitmentRowsEgp([row({ amount_due: 600 }, true)], RATE)).toEqual({
      egp: 600,
      count: 1,
      showTilde: true,
    });
  });

  it('a variable unpaid row with no estimate adds 0 and flags the sum', () => {
    const rows = [row({ amount_due: 8000 }), row({ amount_due: null }, true)];

    expect(sumCommitmentRowsEgp(rows, RATE)).toEqual({ egp: 8000, count: 2, showTilde: true });
  });

  it('a skipped variable row adds its estimate and flags the sum', () => {
    expect(sumCommitmentRowsEgp([row({ ...SKIPPED, amount_due: 600 }, true)], RATE)).toEqual({
      egp: 600,
      count: 1,
      showTilde: true,
    });
  });

  it('an empty set is zero with no flag, with or without a rate', () => {
    const empty = { egp: 0, count: 0, showTilde: false };

    expect(sumCommitmentRowsEgp([], RATE)).toEqual(empty);
    expect(sumCommitmentRowsEgp([], undefined)).toEqual(empty);
  });
});

describe('sumCommitmentRowsEgp — the rate', () => {
  it('returns undefined for a USD unpaid row before the rate loads', () => {
    expect(
      sumCommitmentRowsEgp(
        [row({ amount_due: 8000 }), row({ currency: Currency.USD, amount_due: 10 })],
        undefined,
      ),
    ).toBeUndefined();
  });

  it('still sums a USD row with no amount due before the rate loads', () => {
    expect(
      sumCommitmentRowsEgp([row({ currency: Currency.USD, amount_due: null }, true)], undefined),
    ).toEqual({ egp: 0, count: 1, showTilde: true });
  });

  it('still sums EGP rows before the rate loads', () => {
    expect(sumCommitmentRowsEgp([row({ amount_due: 8000 })], undefined)).toEqual({
      egp: 8000,
      count: 1,
      showTilde: false,
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'throws CommitmentMonthTotalsError at rate %p with a USD leg',
    (rate) => {
      expect(() =>
        sumCommitmentRowsEgp([row({ currency: Currency.USD, amount_due: 10 })], rate),
      ).toThrow(CommitmentMonthTotalsError);
    },
  );
});

describe('resolveCommitmentRowLegEgp', () => {
  const usd = { currency: Currency.USD } as const;

  it('gives no leg on an EGP row', () => {
    expect(
      resolveCommitmentRowLegEgp({ payment: makeTestMonthPayment(), amount: 8000, rate: RATE }),
    ).toBeUndefined();
  });

  it.each([RATE, undefined])('a paid USD row takes its paid_egp_amount at rate %p', (rate) => {
    expect(
      resolveCommitmentRowLegEgp({
        payment: makeTestMonthPayment({ ...usd, ...PAID, paid_egp_amount: 782.75 }),
        amount: 15.5,
        rate,
      }),
    ).toBe(782.75);
  });

  it('a paid USD row with no transaction gives no leg', () => {
    expect(
      resolveCommitmentRowLegEgp({
        payment: makeTestMonthPayment({ ...usd, ...PAID, paid_egp_amount: null }),
        amount: 15.5,
        rate: RATE,
      }),
    ).toBeUndefined();
  });

  it.each<[string, Partial<CommitmentMonthPayment>]>([
    ['unpaid', {}],
    ['skipped', SKIPPED],
  ])('an %s USD row converts the amount it prints at the rate', (_state, overrides) => {
    expect(
      resolveCommitmentRowLegEgp({
        payment: makeTestMonthPayment({ ...usd, ...overrides }),
        amount: 15.5,
        rate: RATE,
      }),
    ).toBe(782.75);
    expect(
      resolveCommitmentRowLegEgp({
        payment: makeTestMonthPayment({ ...usd, ...overrides }),
        amount: 12.34,
        rate: 48.37,
      }),
    ).toBe(596.89);
  });

  it.each<[string, Partial<CommitmentMonthPayment>]>([
    ['unpaid', {}],
    ['skipped', SKIPPED],
  ])('an %s USD row gives no leg before the rate loads', (_state, overrides) => {
    expect(
      resolveCommitmentRowLegEgp({
        payment: makeTestMonthPayment({ ...usd, ...overrides }),
        amount: 15.5,
        rate: undefined,
      }),
    ).toBeUndefined();
  });

  it('an unpaid USD row with no amount gives no leg', () => {
    expect(
      resolveCommitmentRowLegEgp({
        payment: makeTestMonthPayment({ ...usd, amount_due: null }),
        amount: undefined,
        rate: RATE,
      }),
    ).toBeUndefined();
  });
});
