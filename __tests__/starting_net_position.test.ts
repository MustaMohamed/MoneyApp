import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import {
  type StartingNetPosition,
  StartingNetPositionError,
  resolveStartingNetPosition,
  selectActiveAccounts,
} from '@/modules/onboarding/domain/starting_net_position';
import { makeTestAccount } from '@/test_helpers/transaction';
import { formatCurrencyAmount } from '@/utils/format_amount';

// The gate reads only whether this marker is null; non-null means the rate was verified.
const RATE_VERIFIED_AT = '2026-08-01T09:00:00.000Z';

// `makeTestAccount` defaults to EGP, `is_archived: 0` and both balances 0.
const bank = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.Bank, currency, opening_balance: openingBalance });

const sav = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.PhysicalSavings, currency, opening_balance: openingBalance });

const wal = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.SmartWallet, currency, opening_balance: openingBalance });

const cc = (openingBalance: number, currency: Currency = Currency.EGP): Account =>
  makeTestAccount({ type: AccountType.CreditCard, currency, opening_balance: openingBalance });

const archived = (account: Account): Account => ({ ...account, is_archived: 1 });

function amountValue(outcome: StartingNetPosition): number {
  if (outcome.kind !== 'amount') {
    throw new Error(`expected an amount outcome, got "${outcome.kind}"`);
  }
  return outcome.value;
}

interface ResolverRow {
  case: string;
  accounts: readonly Account[];
  base: Currency;
  rate: number;
  rateUpdatedAt: string | null;
  expected: StartingNetPosition;
}

// Every `expected` is a literal; an assertion re-derived through the code under test cannot fail.
const RESOLVER_ROWS: readonly ResolverRow[] = [
  {
    case: '1 — two EGP accounts, base EGP; an unusable rate is irrelevant',
    accounts: [bank(48250), sav(100000)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    expected: { kind: 'amount', value: 148250 },
  },
  {
    case: '2 — one USD account converted into EGP, one card subtracted',
    accounts: [bank(48250), wal(1350, Currency.USD), cc(8450)],
    base: Currency.EGP,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { kind: 'amount', value: 105410 },
  },
  {
    case: '3 — conversion required, rate never verified; refuses (the unverified-fallback catcher)',
    accounts: [bank(48250), wal(1350, Currency.USD), cc(8450)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    expected: { kind: 'rate-needed', foreignCount: 1 },
  },
  {
    case: '4 — the card is bigger than the bank; a negative total is a valid outcome',
    accounts: [bank(1000), cc(2234.56)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    expected: { kind: 'amount', value: -1234.56 },
  },
  {
    case: '5 — cash and card cancel out exactly',
    accounts: [bank(5000), cc(5000)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    expected: { kind: 'amount', value: 0 },
  },
  {
    case: '6 — a single bank account',
    accounts: [bank(12000)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    expected: { kind: 'amount', value: 12000 },
  },
  {
    case: '7 — a single credit card, so the whole position is owed',
    accounts: [cc(8450)],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    expected: { kind: 'amount', value: -8450 },
  },
  {
    case: '8 — base USD: the EGP account DIVIDES by the rate',
    accounts: [bank(1000, Currency.USD), sav(4860)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { kind: 'amount', value: 1100 },
  },
  {
    case: '9 — 100 / 48.6 = 2.0576…, half-even to 2.06 (the multiply-instead-of-divide catcher)',
    accounts: [bank(100)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { kind: 'amount', value: 2.06 },
  },
  {
    case: '10 — base USD makes every EGP account foreign, so a null marker refuses',
    accounts: [bank(100)],
    base: Currency.USD,
    rate: 48.6,
    rateUpdatedAt: null,
    expected: { kind: 'rate-needed', foreignCount: 1 },
  },
  {
    case: '11 — a zero rate is not usable, verified or not',
    accounts: [bank(100, Currency.USD)],
    base: Currency.EGP,
    rate: 0,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { kind: 'rate-needed', foreignCount: 1 },
  },
  {
    case: '12 — a NaN rate is not usable, verified or not',
    accounts: [bank(100, Currency.USD)],
    base: Currency.EGP,
    rate: Number.NaN,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { kind: 'rate-needed', foreignCount: 1 },
  },
  {
    case: '13 — an archived card never contributes',
    accounts: [bank(1000), archived(cc(500))],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    expected: { kind: 'amount', value: 1000 },
  },
  {
    case: '14 — two 0.005 USD wallets convert to 0.01 each, summing to 0.02 (the round-then-sum catcher)',
    accounts: [wal(0.005, Currency.USD), wal(0.005, Currency.USD)],
    base: Currency.EGP,
    rate: 2,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { kind: 'amount', value: 0.02 },
  },
  {
    case: '15 — a converted card cancels an EGP bank exactly',
    accounts: [cc(100, Currency.USD), bank(4860)],
    base: Currency.EGP,
    rate: 48.6,
    rateUpdatedAt: RATE_VERIFIED_AT,
    expected: { kind: 'amount', value: 0 },
  },
  {
    case: '16 — no accounts at all; the resolver is total',
    accounts: [],
    base: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    expected: { kind: 'amount', value: 0 },
  },
];

describe('resolveStartingNetPosition — the scope spec table, all 16 rows', () => {
  it.each(RESOLVER_ROWS)('$case', ({ accounts, base, rate, rateUpdatedAt, expected }) => {
    expect(
      resolveStartingNetPosition({
        accounts,
        baseCurrency: base,
        rate,
        rateUpdatedAt,
        isManualOverride: false,
      }),
    ).toStrictEqual(expected);
  });
});

describe('resolveStartingNetPosition — round-then-sum, with a fixture that can tell them apart', () => {
  // 0.502 USD at rate 2 converts to 1.004, so round-then-sum gives 2.00 and sum-then-round 2.01.
  it('rounds each converted value before summing, not the sum alone', () => {
    expect(
      resolveStartingNetPosition({
        accounts: [wal(0.502, Currency.USD), wal(0.502, Currency.USD)],
        baseCurrency: Currency.EGP,
        rate: 2,
        rateUpdatedAt: RATE_VERIFIED_AT,
        isManualOverride: false,
      }),
    ).toStrictEqual({ kind: 'amount', value: 2 });
  });
});

describe('resolveStartingNetPosition — a manual rate carrying no marker', () => {
  // A manual override carries no marker, and no background fetch will ever write one.
  const accounts = [bank(1000), wal(100, Currency.USD)];

  it('states the position, because the user supplied the rate', () => {
    expect(
      resolveStartingNetPosition({
        accounts,
        baseCurrency: Currency.EGP,
        rate: 48,
        rateUpdatedAt: null,
        isManualOverride: true,
      }),
    ).toStrictEqual({ kind: 'amount', value: 5800 });
  });

  it('refuses the identical rate when nothing says where it came from', () => {
    expect(
      resolveStartingNetPosition({
        accounts,
        baseCurrency: Currency.EGP,
        rate: 48,
        rateUpdatedAt: null,
        isManualOverride: false,
      }),
    ).toStrictEqual({ kind: 'rate-needed', foreignCount: 1 });
  });
});

describe('resolveStartingNetPosition — negative zero (spec §1.1)', () => {
  // The fixture order produces the residue: 0.30 - 0.10 - 0.20 in array order rounds to -0.
  const NEGATIVE_ZERO_INPUT = {
    accounts: [bank(0.3), cc(0.1), cc(0.2)],
    baseCurrency: Currency.EGP,
    rate: 50,
    rateUpdatedAt: null,
    isManualOverride: false,
  };

  it('normalises the resolver value to +0', () => {
    expect(Object.is(amountValue(resolveStartingNetPosition(NEGATIVE_ZERO_INPUT)), 0)).toBe(true);
  });

  it('and therefore renders "0.00 EGP", which is what the user sees', () => {
    // The bug is Intl's; it only appears once the number reaches the formatter.
    expect(
      formatCurrencyAmount(
        amountValue(resolveStartingNetPosition(NEGATIVE_ZERO_INPUT)),
        Currency.EGP,
        2,
      ),
    ).toBe('0.00 EGP');
  });

  it('while a raw -0 still renders "-0.00 EGP" — the tripwire proving the two above can fail', () => {
    expect(formatCurrencyAmount(-0, Currency.EGP, 2)).toBe('-0.00 EGP');
  });
});

describe('selectActiveAccounts', () => {
  it('drops archived rows, whatever their currency or type', () => {
    const active = selectActiveAccounts([bank(1000), archived(cc(500)), archived(wal(7))]);
    expect(active).toHaveLength(1);
    expect(active[0]?.opening_balance).toBe(1000);
  });
});

describe('resolveStartingNetPosition — archived rows the SQL filter would not have removed', () => {
  it('excludes an archived account that would otherwise change the answer', () => {
    // Case 13 proves the filter exists; here the archived row is large enough to flip the sign.
    expect(
      resolveStartingNetPosition({
        accounts: [bank(1000), archived(cc(50000))],
        baseCurrency: Currency.EGP,
        rate: 50,
        rateUpdatedAt: null,
        isManualOverride: false,
      }),
    ).toStrictEqual({ kind: 'amount', value: 1000 });
  });
});

describe('resolveStartingNetPosition — currencies outside EGP | USD throw', () => {
  const unsupported = 'GBP' as unknown as Currency;

  it('throws on an account currency the schema should never have allowed', () => {
    expect(() =>
      resolveStartingNetPosition({
        accounts: [bank(1000, unsupported)],
        baseCurrency: Currency.EGP,
        rate: 48.6,
        rateUpdatedAt: RATE_VERIFIED_AT,
        isManualOverride: false,
      }),
    ).toThrow(StartingNetPositionError);
  });

  it('throws on an unsupported base currency', () => {
    expect(() =>
      resolveStartingNetPosition({
        accounts: [bank(1000)],
        baseCurrency: unsupported,
        rate: 48.6,
        rateUpdatedAt: RATE_VERIFIED_AT,
        isManualOverride: false,
      }),
    ).toThrow(StartingNetPositionError);
  });

  // A prototype-chain lookup lets `toString` pass a currency guard, so it must still throw.
  it('throws on an Object.prototype member masquerading as a currency', () => {
    expect(() =>
      resolveStartingNetPosition({
        accounts: [bank(1000, 'toString' as unknown as Currency)],
        baseCurrency: Currency.EGP,
        rate: 48.6,
        rateUpdatedAt: RATE_VERIFIED_AT,
        isManualOverride: false,
      }),
    ).toThrow(StartingNetPositionError);
  });
});
