import {
  findMissingAccountIds,
  getTransactionAccountIds,
  mergeAccountsById,
} from '@/modules/accounts/store/account_lookup.helpers';
import { makeTestAccount, makeTestTransaction } from '@/test_helpers/transaction';

describe('mergeAccountsById', () => {
  it('lets the active list win over a cached row with the same id', () => {
    const cached = makeTestAccount({ id: 'a', name: 'Old name', is_archived: 1 });
    const active = makeTestAccount({ id: 'a', name: 'Restored name' });

    const merged = mergeAccountsById([active], [], { a: cached });

    expect(merged.get('a')?.name).toBe('Restored name');
  });

  it('lets the archived list win over a cached row with the same id', () => {
    const cached = makeTestAccount({ id: 'a', name: 'Old name' });
    const archived = makeTestAccount({ id: 'a', name: 'Archived name', is_archived: 1 });

    const merged = mergeAccountsById([], [archived], { a: cached });

    expect(merged.get('a')?.name).toBe('Archived name');
  });

  it('keeps a row only the cache holds', () => {
    const deleted = makeTestAccount({ id: 'gone', name: '', is_deleted: 1, is_archived: 1 });

    const merged = mergeAccountsById(
      [makeTestAccount({ id: 'a' })],
      [makeTestAccount({ id: 'b' })],
      { gone: deleted },
    );

    expect([...merged.keys()].sort()).toEqual(['a', 'b', 'gone']);
    expect(merged.get('gone')).toBe(deleted);
  });

  it('yields an empty map from empty inputs', () => {
    expect(mergeAccountsById([], [], {}).size).toBe(0);
  });
});

describe('getTransactionAccountIds', () => {
  it('returns the source and the destination of a transfer', () => {
    const transfer = makeTestTransaction({ account_id: 'source', to_account_id: 'destination' });

    expect(getTransactionAccountIds(transfer)).toEqual(['source', 'destination']);
  });

  it('returns only the account of a transaction with no destination', () => {
    const expense = makeTestTransaction({ account_id: 'source', to_account_id: null });

    expect(getTransactionAccountIds(expense)).toEqual(['source']);
  });
});

describe('findMissingAccountIds', () => {
  it('returns the ids the map does not hold, in request order', () => {
    const accountsById = mergeAccountsById([makeTestAccount({ id: 'a' })], [], {
      c: makeTestAccount({ id: 'c' }),
    });

    expect(findMissingAccountIds(['b', 'a', 'c', 'd'], accountsById)).toEqual(['b', 'd']);
  });

  it('returns nothing when the map holds every id', () => {
    const accountsById = mergeAccountsById([makeTestAccount({ id: 'a' })], [], {});

    expect(findMissingAccountIds(['a'], accountsById)).toEqual([]);
  });
});
