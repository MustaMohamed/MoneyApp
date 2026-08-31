import { AccountType, Currency } from '@/constants/enums';
import {
  AccountAggregationError,
  assertSupportedCurrency,
  convertCurrency,
  countForeignAccounts,
  isRateUsable,
  isSupportedCurrency,
  normalizeNegativeZero,
  type RateProvenance,
  resolveAccountAggregationSign,
} from '@/modules/accounts/domain/account_aggregation';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { makeTestAccount } from '@/test_helpers/transaction';

// The gate reads only whether this marker is null, never the timestamp itself.
const RATE_VERIFIED_AT = '2026-08-01T09:00:00.000Z';

const bank = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.Bank, currency, opening_balance: openingBalance });

const wal = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.SmartWallet, currency, opening_balance: openingBalance });

const archived = (account: Account): Account => ({ ...account, is_archived: 1 });

describe('normalizeNegativeZero', () => {
  it('maps -0 to +0', () => {
    expect(Object.is(normalizeNegativeZero(-0), 0)).toBe(true);
  });

  it('leaves +0 alone', () => {
    expect(Object.is(normalizeNegativeZero(0), 0)).toBe(true);
  });

  it('passes every other value through untouched', () => {
    expect(normalizeNegativeZero(-1234.56)).toBe(-1234.56);
    expect(normalizeNegativeZero(148250)).toBe(148250);
  });
});

// Total, so a new `AccountType` member is a type error here rather than an untested row.
const EXPECTED_SIGNS: Record<AccountType, 1 | -1> = {
  [AccountType.Bank]: 1,
  [AccountType.SmartWallet]: 1,
  [AccountType.PhysicalWallet]: 1,
  [AccountType.PhysicalSavings]: 1,
  [AccountType.CreditCard]: -1,
};

describe('resolveAccountAggregationSign — the one site that owns the credit-card sign', () => {
  it.each(Object.entries(EXPECTED_SIGNS))('%s → %p', (type, expected) => {
    expect(resolveAccountAggregationSign(type as AccountType)).toBe(expected);
  });
});

interface RateUsableRow {
  case: string;
  provenance: RateProvenance;
  expected: boolean;
}

const RATE_USABLE_ROWS: readonly RateUsableRow[] = [
  {
    // 50 is `INITIAL_STATE.rate`: greater than zero, so a bare `rate > 0` check would accept it.
    case: 'no marker and no override — the unverified placeholder',
    provenance: { rate: 50, rateUpdatedAt: null, isManualOverride: false },
    expected: false,
  },
  {
    case: 'a marker and no override — a fetched rate',
    provenance: { rate: 48.6, rateUpdatedAt: RATE_VERIFIED_AT, isManualOverride: false },
    expected: true,
  },
  {
    // `shouldRefreshRate` returns false for an override, so no fetch ever backfills the marker.
    case: 'an override with no marker — a manual rate saved before the marker existed',
    provenance: { rate: 48, rateUpdatedAt: null, isManualOverride: true },
    expected: true,
  },
  {
    case: 'both — a manual rate saved since #85',
    provenance: { rate: 48, rateUpdatedAt: RATE_VERIFIED_AT, isManualOverride: true },
    expected: true,
  },
  ...([0, -1, NaN, Infinity] as const).flatMap((rate) => [
    {
      case: `a marked rate of ${String(rate)} — provenance known, number unusable`,
      provenance: { rate, rateUpdatedAt: RATE_VERIFIED_AT, isManualOverride: false },
      expected: false,
    },
    {
      case: `an overridden rate of ${String(rate)} — the override does not skip the number`,
      provenance: { rate, rateUpdatedAt: null, isManualOverride: true },
      expected: false,
    },
  ]),
];

describe('isRateUsable — the one site that owns the rate-provenance gate', () => {
  it.each(RATE_USABLE_ROWS)('$case → $expected', ({ provenance, expected }) => {
    expect(isRateUsable(provenance)).toBe(expected);
  });
});

describe('countForeignAccounts', () => {
  it('counts every account whose currency differs from the base, not just the first', () => {
    // Two USD accounts, because a `count > 0 ? 1 : 0` body passes every single-foreign fixture.
    expect(
      countForeignAccounts(
        [bank(48250), wal(1000, Currency.USD), wal(350, Currency.USD)],
        Currency.EGP,
      ),
    ).toBe(2);
  });

  it('counts base-currency accounts as foreign when the base flips', () => {
    expect(countForeignAccounts([bank(48250), wal(1000, Currency.USD)], Currency.USD)).toBe(1);
  });

  it('never counts an archived account', () => {
    expect(countForeignAccounts([bank(1000), archived(wal(500, Currency.USD))], Currency.EGP)).toBe(
      0,
    );
  });
});

describe('isSupportedCurrency — the one encoding of the supported vocabulary', () => {
  it('accepts every configured code', () => {
    expect(isSupportedCurrency(Currency.EGP)).toBe(true);
    expect(isSupportedCurrency(Currency.USD)).toBe(true);
  });

  it('rejects a code the schema should never have allowed', () => {
    expect(isSupportedCurrency('GBP' as unknown as Currency)).toBe(false);
  });

  // `CURRENCY_CONFIG[currency] !== undefined` is true for every `Object.prototype` member.
  it.each(['constructor', 'toString', 'valueOf', 'hasOwnProperty'])(
    'rejects the Object.prototype member %s',
    (member) => {
      expect(isSupportedCurrency(member as unknown as Currency)).toBe(false);
    },
  );
});

describe('assertSupportedCurrency — the accounts domain throws its own type', () => {
  it('lets a configured code through', () => {
    expect(() => assertSupportedCurrency(Currency.USD)).not.toThrow();
  });

  it('throws AccountAggregationError on an Object.prototype member', () => {
    expect(() => assertSupportedCurrency('constructor' as unknown as Currency)).toThrow(
      AccountAggregationError,
    );
  });
});

interface ConversionCase {
  case: string;
  amount: number;
  rate: number;
  expected: number;
}

// The identity pairs carry an absurd rate of 999, which is what asserts the rate is ignored.
const CONVERSION_CASES: Record<Currency, Record<Currency, ConversionCase>> = {
  [Currency.EGP]: {
    [Currency.EGP]: {
      case: 'EGP -> EGP returns the amount and never reads the rate',
      amount: 1234.56,
      rate: 999,
      expected: 1234.56,
    },
    [Currency.USD]: {
      case: 'EGP -> USD divides, because exchange_rate is EGP per USD',
      amount: 4885,
      rate: 48.85,
      expected: 100,
    },
  },
  [Currency.USD]: {
    [Currency.EGP]: {
      case: 'USD -> EGP multiplies',
      amount: 100,
      rate: 48.85,
      expected: 4885,
    },
    [Currency.USD]: {
      case: 'USD -> USD returns the amount and never reads the rate',
      amount: 100.5,
      rate: 999,
      expected: 100.5,
    },
  },
};

describe('convertCurrency — the one bidirectional conversion both resolvers share', () => {
  it.each(
    Object.entries(CONVERSION_CASES).flatMap(([from, row]) =>
      Object.entries(row).map(([to, entry]) => [from, to, entry] as const),
    ),
  )('%s -> %s', (from, to, entry) => {
    expect(
      convertCurrency({
        amount: entry.amount,
        from: from as Currency,
        to: to as Currency,
        rate: entry.rate,
      }),
    ).toBe(entry.expected);
  });

  it('does not round — the caller owns that, at the fold', () => {
    expect(convertCurrency({ amount: 100, from: Currency.EGP, to: Currency.USD, rate: 3 })).toBe(
      33.333333333333336,
    );
  });

  it('throws on an unsupported source currency', () => {
    expect(() =>
      convertCurrency({
        amount: 100,
        from: 'GBP' as unknown as Currency,
        to: Currency.EGP,
        rate: 48.85,
      }),
    ).toThrow(AccountAggregationError);
  });

  it('throws on an unsupported destination currency', () => {
    expect(() =>
      convertCurrency({
        amount: 100,
        from: Currency.EGP,
        to: 'GBP' as unknown as Currency,
        rate: 48.85,
      }),
    ).toThrow(AccountAggregationError);
  });

  it('throws on an Object.prototype member masquerading as a currency', () => {
    expect(() =>
      convertCurrency({
        amount: 100,
        from: 'constructor' as unknown as Currency,
        to: Currency.EGP,
        rate: 48.85,
      }),
    ).toThrow(AccountAggregationError);
  });
});
