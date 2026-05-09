import { computeNetWorth, groupAccountsByType } from '@/screens/dashboard/dashboard.helpers';
import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/store/account.store';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Test',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 0,
  current_balance: 0,
  color: null,
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  is_archived: 0,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('computeNetWorth', () => {
  it('returns all zeros for empty accounts', () => {
    expect(computeNetWorth([], 50)).toEqual({
      assetsEgp: 0,
      assetsUsd: 0,
      liabilitiesEgp: 0,
      netWorthEgp: 0,
      netWorthUsd: 0,
    });
  });

  it('adds EGP non-CC account balance to assets', () => {
    const result = computeNetWorth([makeAccount({ current_balance: 10000 })], 50);
    expect(result.assetsEgp).toBe(10000);
    expect(result.liabilitiesEgp).toBe(0);
    expect(result.netWorthEgp).toBe(10000);
  });

  it('converts USD account to EGP using rate', () => {
    const result = computeNetWorth(
      [makeAccount({ current_balance: 100, currency: Currency.USD })],
      50,
    );
    expect(result.assetsEgp).toBe(5000);
  });

  it('adds credit card balance to liabilities, not assets', () => {
    const result = computeNetWorth(
      [makeAccount({ type: AccountType.CreditCard, current_balance: 2000 })],
      50,
    );
    expect(result.liabilitiesEgp).toBe(2000);
    expect(result.assetsEgp).toBe(0);
    expect(result.netWorthEgp).toBe(-2000);
  });

  it('computes net worth = assets − liabilities across mixed accounts', () => {
    const accounts = [
      makeAccount({ id: 'a1', current_balance: 10000 }),
      makeAccount({ id: 'a2', type: AccountType.CreditCard, current_balance: 3000 }),
    ];
    const result = computeNetWorth(accounts, 50);
    expect(result.netWorthEgp).toBe(7000);
    expect(result.netWorthUsd).toBeCloseTo(140, 1);
  });

  it('returns netWorthUsd=0 when rate=0 to avoid division by zero', () => {
    const result = computeNetWorth([makeAccount({ current_balance: 5000 })], 0);
    expect(result.netWorthUsd).toBe(0);
  });
});

describe('groupAccountsByType', () => {
  it('returns empty object for empty accounts', () => {
    expect(groupAccountsByType([])).toEqual({});
  });

  it('groups accounts by type', () => {
    const accounts = [
      makeAccount({ id: 'a1', type: AccountType.Bank }),
      makeAccount({ id: 'a2', type: AccountType.Bank }),
      makeAccount({ id: 'a3', type: AccountType.CreditCard }),
    ];
    const groups = groupAccountsByType(accounts);
    expect(groups[AccountType.Bank]).toHaveLength(2);
    expect(groups[AccountType.CreditCard]).toHaveLength(1);
    expect(groups[AccountType.SmartWallet]).toBeUndefined();
  });

  it('preserves order within each group', () => {
    const a1 = makeAccount({ id: 'a1', name: 'First', type: AccountType.Bank });
    const a2 = makeAccount({ id: 'a2', name: 'Second', type: AccountType.Bank });
    const groups = groupAccountsByType([a1, a2]);
    expect(groups[AccountType.Bank]![0].name).toBe('First');
    expect(groups[AccountType.Bank]![1].name).toBe('Second');
  });
});
