import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { mergeAccountsById } from '@/modules/accounts/store/account_lookup.helpers';

function makeAccount(id: string, overrides: Partial<Account> = {}): Account {
  return {
    id,
    name: id,
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
    balance_review_required: 0,
    is_deleted: 0,
    is_archived: 0,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mergeAccountsById', () => {
  it('lets the active list win over a cached row with the same id', () => {
    const cached = makeAccount('a', { name: 'Old name', is_archived: 1 });
    const active = makeAccount('a', { name: 'Restored name' });

    const merged = mergeAccountsById([active], [], { a: cached });

    expect(merged.get('a')?.name).toBe('Restored name');
  });

  it('lets the archived list win over a cached row with the same id', () => {
    const cached = makeAccount('a', { name: 'Old name' });
    const archived = makeAccount('a', { name: 'Archived name', is_archived: 1 });

    const merged = mergeAccountsById([], [archived], { a: cached });

    expect(merged.get('a')?.name).toBe('Archived name');
  });

  it('keeps a row only the cache holds', () => {
    const deleted = makeAccount('gone', { name: '', is_deleted: 1, is_archived: 1 });

    const merged = mergeAccountsById([makeAccount('a')], [makeAccount('b')], { gone: deleted });

    expect([...merged.keys()].sort()).toEqual(['a', 'b', 'gone']);
    expect(merged.get('gone')).toBe(deleted);
  });

  it('yields an empty map from empty inputs', () => {
    expect(mergeAccountsById([], [], {}).size).toBe(0);
  });
});
