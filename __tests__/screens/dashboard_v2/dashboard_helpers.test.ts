import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/store/account.store';
import {
  computeLiquidityBreakdown,
  computeLiabilitiesBreakdown,
} from '@/screens/dashboard/dashboard.helpers';

function mkAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'Account',
    type: AccountType.Bank,
    currency: Currency.EGP,
    current_balance: 0,
    opening_balance: 0,
    is_archived: 0,
    created_at: '2026-05-16T00:00:00.000Z',
    updated_at: '2026-05-16T00:00:00.000Z',
    ...overrides,
  } as Account;
}

describe('computeLiquidityBreakdown', () => {
  it('splits accounts into liquid and reserve tiers (L-01 canonical)', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.Bank, current_balance: 27000 }),
      mkAccount({ id: '2', type: AccountType.SmartWallet, current_balance: 3500 }),
      mkAccount({ id: '3', type: AccountType.PhysicalWallet, current_balance: 2000 }),
      mkAccount({ id: '4', type: AccountType.PhysicalSavings, current_balance: 10000 }),
      mkAccount({ id: '5', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(32500);
    expect(result.liquidCount).toBe(3);
    expect(result.reserveEgp).toBe(10000);
    expect(result.reserveCount).toBe(1);
  });

  it('excludes credit cards from both tiers', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(0);
    expect(result.reserveEgp).toBe(0);
  });

  it('excludes archived accounts (L-07)', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.Bank, current_balance: 1000, is_archived: 1 }),
      mkAccount({ id: '2', type: AccountType.Bank, current_balance: 2000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(2000);
    expect(result.liquidCount).toBe(1);
  });

  it('converts USD accounts via the rate (L-03)', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.Bank, currency: Currency.USD, current_balance: 100 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBeCloseTo(4885, 0);
  });

  it('returns zeros for empty input (L-02)', () => {
    const result = computeLiquidityBreakdown([], 48.85);
    expect(result).toEqual({
      liquidEgp: 0,
      liquidCount: 0,
      liquidAccounts: [],
      reserveEgp: 0,
      reserveCount: 0,
      reserveAccounts: [],
    });
  });

  it('includes per-tier accounts ordered by balance descending', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', name: 'CIB', type: AccountType.Bank, current_balance: 5000 }),
      mkAccount({ id: '2', name: 'Cash', type: AccountType.PhysicalWallet, current_balance: 2000 }),
      mkAccount({ id: '3', name: 'QNB', type: AccountType.Bank, current_balance: 10000 }),
      mkAccount({ id: '4', name: 'Savings', type: AccountType.PhysicalSavings, current_balance: 3000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidAccounts.map((a) => a.name)).toEqual(['QNB', 'CIB', 'Cash']);
    expect(result.reserveAccounts.map((a) => a.name)).toEqual(['Savings']);
  });

  it('returns zero reserve when no PhysicalSavings present', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.Bank, current_balance: 1000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.reserveEgp).toBe(0);
    expect(result.reserveCount).toBe(0);
  });

  it('returns zero liquid when only PhysicalSavings present (L-05)', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.PhysicalSavings, current_balance: 1000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(0);
    expect(result.reserveEgp).toBe(1000);
  });
});

describe('computeLiabilitiesBreakdown', () => {
  it('returns one row per credit card, ordered by balance descending (L-08)', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', name: 'Visa A', type: AccountType.CreditCard, current_balance: 1000 }),
      mkAccount({ id: '2', name: 'Visa B', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(result).toEqual([
      { id: '2', name: 'Visa B', balanceEgp: 4080, statementDueDay: null },
      { id: '1', name: 'Visa A', balanceEgp: 1000, statementDueDay: null },
    ]);
  });

  it('carries statement_due_day through to the row', () => {
    const accounts: Account[] = [
      mkAccount({
        id: '1',
        name: 'Visa',
        type: AccountType.CreditCard,
        current_balance: 1000,
        statement_due_day: 28,
      } as never),
    ];
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(row.statementDueDay).toBe(28);
  });

  it('returns an empty array when no credit cards', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.Bank, current_balance: 1000 }),
    ];
    expect(computeLiabilitiesBreakdown(accounts, 48.85)).toEqual([]);
  });

  it('excludes archived credit cards (L-07)', () => {
    const accounts: Account[] = [
      mkAccount({
        id: '1',
        name: 'Old Visa',
        type: AccountType.CreditCard,
        current_balance: 1000,
        is_archived: 1,
      }),
    ];
    expect(computeLiabilitiesBreakdown(accounts, 48.85)).toEqual([]);
  });

  it('converts USD credit card balance to EGP via the rate (L-03)', () => {
    const accounts: Account[] = [
      mkAccount({
        id: '1',
        name: 'USD Card',
        type: AccountType.CreditCard,
        currency: Currency.USD,
        current_balance: 100,
      }),
    ];
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(row.balanceEgp).toBeCloseTo(4885, 0);
  });

  it('uses absolute value if a card balance is stored as negative (defensive)', () => {
    const accounts: Account[] = [
      mkAccount({
        id: '1',
        name: 'Visa',
        type: AccountType.CreditCard,
        current_balance: -1000,
      }),
    ];
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(row.balanceEgp).toBe(1000);
  });
});
