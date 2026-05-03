import {
  computeTotalBalance,
  resolveSecurityLabel,
} from '@/screens/onboarding/ready/ready.helpers';
import { AccountType, Currency, SecurityChoice } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/store/account.store';

const account = (opening_balance: number): Account => ({
  id: '1',
  name: 'Test',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance,
  current_balance: opening_balance,
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

describe('computeTotalBalance', () => {
  it('returns 0 for an empty account list', () => {
    expect(computeTotalBalance([])).toBe(0);
  });

  it('returns the opening_balance of a single account', () => {
    expect(computeTotalBalance([account(5000)])).toBe(5000);
  });

  it('sums opening_balance across multiple accounts', () => {
    expect(computeTotalBalance([account(1000), account(500)])).toBe(1500);
  });
});

describe('resolveSecurityLabel', () => {
  it('undefined → Strings.o6SecuritySkipped', () => {
    expect(resolveSecurityLabel(undefined)).toBe(Strings.o6SecuritySkipped);
  });

  it('SecurityChoice.Skip → Strings.o6SecuritySkipped', () => {
    expect(resolveSecurityLabel(SecurityChoice.Skip)).toBe(Strings.o6SecuritySkipped);
  });

  it('SecurityChoice.Pin → Strings.o6SecurityEnabled', () => {
    expect(resolveSecurityLabel(SecurityChoice.Pin)).toBe(Strings.o6SecurityEnabled);
  });

  it('SecurityChoice.Biometric → Strings.o6SecurityEnabled', () => {
    expect(resolveSecurityLabel(SecurityChoice.Biometric)).toBe(Strings.o6SecurityEnabled);
  });
});
