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

describe('resolveAccountAggregationSign — the one site that owns the credit-card sign', () => {
  it.each([
    [AccountType.Bank, 1],
    [AccountType.SmartWallet, 1],
    [AccountType.PhysicalWallet, 1],
    [AccountType.PhysicalSavings, 1],
    [AccountType.CreditCard, -1],
  ])('%s → %p', (type, expected) => {
    expect(resolveAccountAggregationSign(type)).toBe(expected);
  });
});
