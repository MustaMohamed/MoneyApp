import { AccountType } from '@/constants/enums';
import {
  normalizeNegativeZero,
  resolveAccountAggregationSign,
} from '@/modules/accounts/domain/account_aggregation';

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
