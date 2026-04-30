import { computeTotalBalance, resolveSecurityLabel } from '@/app/(onboarding)/ready/ready.helpers';
import { Strings } from '@/constants/strings';
import type { Account } from '@/store/account.store';

const account = (opening_balance: number): Account => ({
  id: '1',
  name: 'Test',
  type: 'bank',
  currency: 'EGP',
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
  it('null → Strings.o6SecuritySkipped', () => {
    expect(resolveSecurityLabel(null)).toBe(Strings.o6SecuritySkipped);
  });

  it('"skip" → Strings.o6SecuritySkipped', () => {
    expect(resolveSecurityLabel('skip')).toBe(Strings.o6SecuritySkipped);
  });

  it('"pin" → Strings.o6SecurityEnabled', () => {
    expect(resolveSecurityLabel('pin')).toBe(Strings.o6SecurityEnabled);
  });

  it('"biometric" → Strings.o6SecurityEnabled', () => {
    expect(resolveSecurityLabel('biometric')).toBe(Strings.o6SecurityEnabled);
  });
});
