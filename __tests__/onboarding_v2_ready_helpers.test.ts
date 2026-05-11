import { computeTotalBalance } from '@/screens/onboarding_v2/ready/ready.helpers';
import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/store/account.store';

const account = (current_balance: number): Account => ({
  id: '1',
  name: 'Test',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: current_balance,
  current_balance,
  color: null,
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  is_archived: 0,
  sort_order: 0,
  created_at: '2026-04-30T00:00:00.000Z',
  updated_at: '2026-04-30T00:00:00.000Z',
});

describe('computeTotalBalance (onboarding_v2)', () => {
  it('returns 0 for an empty account list', () => {
    expect(computeTotalBalance([])).toBe(0);
  });

  it('returns current_balance of a single account', () => {
    expect(computeTotalBalance([account(5000)])).toBe(5000);
  });

  it('sums current_balance across multiple accounts', () => {
    expect(computeTotalBalance([account(1000), account(500)])).toBe(1500);
  });

  it('handles negative balances (credit card liabilities)', () => {
    expect(computeTotalBalance([account(2000), account(-500)])).toBe(1500);
  });
});
