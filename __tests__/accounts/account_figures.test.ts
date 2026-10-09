import { Currency } from '@/constants/enums';
import { AccountAggregationError } from '@/modules/accounts/domain/account_aggregation';
import {
  availableCredit,
  baseEquivalent,
  creditUtilization,
  dailyAverage,
  hasFlow,
  netFlow,
  savingsMonthStart,
} from '@/modules/accounts/domain/account_figures';

describe('availableCredit', () => {
  it('is the limit less the balance owed', () => {
    expect(availableCredit(4080, 50000)).toBe(45920);
  });

  it('is 0 when the balance is exactly at the limit', () => {
    expect(availableCredit(1000, 1000)).toBe(0);
  });

  it('clamps at 0 when the balance is over the limit', () => {
    expect(availableCredit(1500, 1000)).toBe(0);
  });

  it('adds a balance in credit to the limit', () => {
    expect(availableCredit(-100, 1000)).toBe(1100);
  });
});

describe('dailyAverage', () => {
  it('divides the month outflow by the days elapsed, unrounded', () => {
    expect(dailyAverage(640.25, 20)).toBe(32.0125);
  });

  it('floors the divisor at one day when no day has elapsed', () => {
    expect(dailyAverage(640.25, 0)).toBe(640.25);
  });
});

describe('netFlow', () => {
  it('is inflow less outflow for the savings month change', () => {
    expect(netFlow(1250.75, 640.25)).toBe(610.5);
  });

  it('is inflow less outflow for the week net', () => {
    expect(netFlow(90.5, 12.05)).toBe(78.45);
  });

  it('is negative when outflow exceeds inflow', () => {
    expect(netFlow(12.05, 90.5)).toBe(-78.45);
  });

  it('is 0 for a net under half a cent on either side of zero, and keeps a net of 0.3', () => {
    expect(netFlow(0.6, 0.3)).toBe(0.3);
    expect(netFlow(0.1 + 0.2, 0.3)).toBe(0);
    expect(netFlow(0.3, 0.1 + 0.2)).toBe(0);
  });
});

describe('creditUtilization', () => {
  it.each([
    ['at the limit', 1000, 1000, 1],
    ['over the limit', 1500, 1000, 1],
    ['at a zero balance', 0, 1000, 0],
    ['with no limit', 500, 0, 0],
    ['at 80% of the limit', 800, 1000, 0.8],
  ] as const)('%s, %p of %p, is %p', (_case, balance, limit, expected) => {
    expect(creditUtilization(balance, limit)).toBe(expected);
  });

  it('is positive zero for a balance a float leftover below zero', () => {
    expect(Object.is(creditUtilization(-7.105427357601002e-15, 1000), 0)).toBe(true);
  });
});

describe('hasFlow', () => {
  it.each([
    [0, false],
    [0.004, false],
    [0.005, true],
    [0.3, true],
  ] as const)('%p is %p', (amount, expected) => {
    expect(hasFlow(amount)).toBe(expected);
  });
});

describe('savingsMonthStart', () => {
  it('takes the month net flow back off the balance', () => {
    expect(savingsMonthStart(1000, 1250.75, 640.25)).toBe(389.5);
  });

  it('clamps at 0 when the month net flow exceeds the balance', () => {
    expect(savingsMonthStart(100, 1250.75, 640.25)).toBe(0);
  });
});

describe('baseEquivalent', () => {
  it('multiplies USD to EGP by the rate and rounds to 2dp', () => {
    expect(
      baseEquivalent({ amount: 100.25, from: Currency.USD, to: Currency.EGP, rate: 48.6 }),
    ).toBe(4872.15);
  });

  it('divides EGP to USD by the rate and rounds to 2dp', () => {
    expect(
      baseEquivalent({ amount: 1000, from: Currency.EGP, to: Currency.USD, rate: 48.85 }),
    ).toBe(20.47);
  });

  it('returns an EGP amount unchanged on an EGP base, whatever the rate', () => {
    expect(baseEquivalent({ amount: 1000, from: Currency.EGP, to: Currency.EGP, rate: 999 })).toBe(
      1000,
    );
  });

  it('returns a USD amount unchanged on a USD base, whatever the rate', () => {
    expect(
      baseEquivalent({ amount: 100.25, from: Currency.USD, to: Currency.USD, rate: 999 }),
    ).toBe(100.25);
  });

  it('rounds an exact half to the even cent', () => {
    expect(baseEquivalent({ amount: 0.0425, from: Currency.USD, to: Currency.EGP, rate: 50 })).toBe(
      2.12,
    );
  });

  it('throws AccountAggregationError on an unsupported currency', () => {
    expect(() =>
      baseEquivalent({ amount: 100, from: 'XXX' as Currency, to: Currency.EGP, rate: 48.6 }),
    ).toThrow(AccountAggregationError);
  });
});
