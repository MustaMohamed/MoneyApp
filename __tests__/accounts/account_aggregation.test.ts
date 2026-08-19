import { AccountType, Currency } from '@/constants/enums';
import {
  countForeignAccounts,
  isRateUsable,
  normalizeNegativeZero,
  resolveAccountAggregationSign,
} from '@/modules/accounts/domain/account_aggregation';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { makeTestAccount } from '@/test_helpers/transaction';

// Time is an input, never `new Date()`. The gate reads only whether this marker
// is null — a non-null value means the stored rate was actually verified.
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
// reason `starting_net_position.ts:44-54` states about `CURRENCY_CONFIG`: a
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

describe('isRateUsable — the one site that owns the rate-provenance gate', () => {
  it('refuses a rate whose marker was never set, however plausible the number', () => {
    // `INITIAL_STATE.rate` is 50 and 50 > 0, so a bare `rate > 0` check opens
    // the gate on the placeholder. The marker is the whole point.
    expect(isRateUsable(50, null)).toBe(false);
  });

  it('refuses a zero rate', () => {
    expect(isRateUsable(0, RATE_VERIFIED_AT)).toBe(false);
  });

  it('refuses a negative rate', () => {
    expect(isRateUsable(-1, RATE_VERIFIED_AT)).toBe(false);
  });

  it('refuses NaN', () => {
    expect(isRateUsable(NaN, RATE_VERIFIED_AT)).toBe(false);
  });

  it('refuses Infinity', () => {
    expect(isRateUsable(Infinity, RATE_VERIFIED_AT)).toBe(false);
  });

  it('accepts a finite positive rate carrying a marker', () => {
    expect(isRateUsable(48.6, RATE_VERIFIED_AT)).toBe(true);
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
