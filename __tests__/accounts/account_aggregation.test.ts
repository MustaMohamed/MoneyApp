import { AccountType, Currency } from '@/constants/enums';
import {
  AccountAggregationError,
  assertSupportedCurrency,
  countForeignAccounts,
  isRateUsable,
  isSupportedCurrency,
  normalizeNegativeZero,
  type RateProvenance,
  resolveAccountAggregationSign,
} from '@/modules/accounts/domain/account_aggregation';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { makeTestAccount } from '@/test_helpers/transaction';

// Time is an input, never `new Date()`. The gate reads only whether this marker
// is null — a non-null value means a fetch or a manual save actually wrote this
// rate. It is one of two provenance sources; `isManualOverride` is the other.
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

// A `Record<AccountType, …>` rather than a hand-written array of rows, for the
// reason `isSupportedCurrency` below states about `CURRENCY_CONFIG`: a
// member added to the enum must be a TYPE ERROR, not a runtime surprise. An
// array compiles unchanged when a sixth `AccountType` appears, leaves this table
// green, and lets the new member sign +1 in both `computeNetWorth` and
// `resolveStartingNetPosition` — one implicit default, now two callers.
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

// All four provenance combinations, then the numeric cases along BOTH provenance
// paths. The second half is what stops the widened gate from becoming
// "an override skips the validation": an override carrying NaN is still refused.
const RATE_USABLE_ROWS: readonly RateUsableRow[] = [
  {
    // The fresh install. `INITIAL_STATE` is `rate: 50, rate_updated_at: null,
    // isManualOverride: false` — 50 > 0, so a bare `rate > 0` check calls the
    // placeholder usable, and accepting the override flag must not. That the
    // constant really is that triple is asserted against the store itself in
    // `__tests__/currency.store.test.ts`, not copied here.
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
    // The population ADR 2026-08-19 §4 describes: `currency.store.ts` shipped in
    // #23 writing the rate and the override flag with no marker, which arrived
    // in #85. `shouldRefreshRate` returns false on its first line for an
    // override, so no background fetch ever backfills the marker — refused
    // forever under the narrow gate, and the user's own rate sits in Settings
    // the whole time.
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

// Moved here from `__tests__/starting_net_position.test.ts` with the function
// itself (#255 chunk 2): `computeNetWorth` consumes it now, so it lives in the
// accounts domain and the onboarding suite no longer owns its coverage.
describe('countForeignAccounts', () => {
  it('counts every account whose currency differs from the base, not just the first', () => {
    // A `count > 0 ? 1 : 0` implementation passes every single-foreign fixture,
    // so two USD accounts is what separates the two.
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
    // The regression signal for the inline `is_archived` filter that replaced
    // the `selectActiveAccounts` call this function could not bring with it.
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

  // The prototype-chain hole. `CURRENCY_CONFIG[currency] !== undefined` answers
  // "supported" for every `Object.prototype` member, so a row carrying
  // `constructor` walked past the guard and into the conversion below it.
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
